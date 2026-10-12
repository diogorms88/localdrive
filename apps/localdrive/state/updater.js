import {formatBytes} from './size.js';

const SECTOR = 512;

const MIN_IMAGE_BYTES = 1024 ** 2;

const MIB = 1024 ** 2;

const MTIME_SLACK_MS = 2e3;

const STUCK_LAUNCHES = 2;

const BUDGET_MS = 8;

const REMOVALS_PER_FRAME = 2;

const CHANGES_PER_FRAME = 8;

const log = message => console.log(`localdrive: update ${message}`);

export const ImageReplaceError = class extends Error {};

function newer(a, b) {
  const parts = version => version.replace(/^v/, '').split('.').map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

export function createUpdater({
  http,
  downloads,
  archives,
  fs,
  version: version,
  feed,
  asset,
  installDir,
  image,
  workDir,
  marker,
  now = Date.now
}) {
  async function check() {
    const installed = installedImage();
    if (installed) return installed;
    const response = await http.request(feed, {
      headers: {Accept: 'application/vnd.github+json', 'User-Agent': 'LocalDrive'},
      maxBytes: 1024 ** 2
    });
    if (!response.ok) throw new Error(`Update feed ${feed} answered HTTP ${response.status}`);
    const release = await response.json();
    if (!release.tag_name || !newer(release.tag_name, version)) return null;
    const file = (release.assets || []).find(item => item.name === asset);
    const sha256 = /^sha256:([0-9a-f]{64})$/i.exec(file?.digest || '')?.[1];
    if (!file || !sha256) return null;
    return {
      version: release.tag_name.replace(/^v/, ''),
      notes: release.body || '',
      url: file.browser_download_url,
      size: file.size,
      sha256
    };
  }
  const entriesOf = dir => fs.readDir(dir).filter(entry => !entry.name.startsWith('.ps5-react-'));
  function contentOf(dir) {
    const entries = entriesOf(dir);
    return entries.length === 1 && entries[0].isDirectory ? contentOf(`${dir}/${entries[0].name}`) : dir;
  }
  function pacer(perFrame) {
    let since = now(),
      steps = 0;
    async function frame() {
      await new Promise(resolve => setTimeout(resolve, 0));
      since = now();
      steps = 0;
    }
    async function step() {
      if (steps >= perFrame || now() - since >= BUDGET_MS) await frame();
      steps++;
    }
    return {step, frame};
  }
  async function openUp(path, pace) {
    await pace.step();
    fs.chmod(path, 511);
    const entries = fs.readDir(path);
    await pace.frame();
    for (const entry of entries) {
      if (entry.isDirectory) await openUp(`${path}/${entry.name}`, pace);
      else {
        await pace.step();
        fs.chmod(`${path}/${entry.name}`, 511);
      }
    }
  }
  async function swap(staged, backup, pace) {
    fs.mkdir(backup, {recursive: true});
    const done = [];
    try {
      for (const {name} of entriesOf(staged)) {
        await pace.step();
        const replaced = fs.exists(`${installDir}/${name}`);
        if (replaced) fs.rename(`${installDir}/${name}`, `${backup}/${name}`);
        done.push({name, replaced});
        fs.rename(`${staged}/${name}`, `${installDir}/${name}`);
      }
    } catch (error) {
      for (const {name, replaced} of done.reverse()) {
        if (fs.exists(`${installDir}/${name}`)) fs.rename(`${installDir}/${name}`, `${staged}/${name}`);
        if (replaced) fs.rename(`${backup}/${name}`, `${installDir}/${name}`);
      }
      throw error;
    }
  }
  function ensureRoomForImage(update) {
    const needed = Math.ceil(fs.stat(image).size * 1.1) + update.size + 64 * MIB;
    const {free} = fs.diskUsage(workDir);
    if (free < needed)
      throw new Error(
        `The update needs ${formatBytes(needed)} free next to ${image}; ${formatBytes(free)} is`
      );
  }
  function installedImage() {
    if (!fs.exists(marker)) return null;
    let pending;
    try {
      const recorded = JSON.parse(fs.readFile(marker));
      const file = fs.stat(recorded.image);
      if (
        newer(recorded.version, version) &&
        file?.size === recorded.size &&
        Math.abs(file.modified - recorded.modified) < MTIME_SLACK_MS
      )
        pending = recorded;
    } catch (error) {
      log(`marker ignored: ${error.message}`);
    }
    if (!pending) {
      try {
        fs.remove(marker);
      } catch (error) {
        log(`marker kept: ${error.message}`);
      }
      return null;
    }
    const launches = (pending.launches || 0) + 1;
    log(`v${pending.version} is installed but v${version} runs (launch ${launches} since)`);
    try {
      fs.writeFile(marker, JSON.stringify({...pending, launches}));
    } catch (error) {
      log(`marker not counted: ${error.message}`);
    }
    return {version: pending.version, installed: true, stuck: launches >= STUCK_LAUNCHES};
  }
  function replaceImage(extracted, update) {
    const entries = entriesOf(extracted);
    const [entry] = entries;
    if (
      entries.length !== 1 ||
      !entry.isFile ||
      !entry.name.endsWith('.exfat') ||
      entry.size < MIN_IMAGE_BYTES ||
      entry.size % SECTOR
    )
      throw new Error(
        `The update holds ${entries.map(item => item.name).join(', ') || 'nothing'} instead of one exFAT image`
      );
    const file = `${extracted}/${entry.name}`;
    try {
      fs.chmod(file, 511);
    } catch (error) {
      log(`image left closed: ${error.message}`);
    }
    try {
      const {size, modified} = fs.stat(file);
      fs.mkdir(marker.slice(0, marker.lastIndexOf('/')), {recursive: true});
      fs.writeFile(marker, JSON.stringify({version: update.version, image, size, modified}));
      log(`marker written: ${marker}`);
    } catch (error) {
      log(`marker not written: ${error.message}`);
    }
    try {
      fs.rename(file, image);
    } catch (error) {
      log(`rename over ${image} failed: ${error.message}`);
      throw new ImageReplaceError(error.message);
    }
    log(`renamed over ${image}`);
  }
  async function clear() {
    if (fs.exists(workDir)) await removeGradually(workDir);
  }
  async function tidy() {
    try {
      await clear();
    } catch (error) {
      log(`leftovers kept: ${error.message}`);
    }
  }
  async function fetchRelease(update, onProgress) {
    const zip = `${workDir}/${update.version}.zip`;
    const download = downloads.enqueue({
      url: update.url,
      destination: zip,
      sha256: update.sha256,
      expectedBytes: update.size,
      rejectHtml: true
    });
    const off = download.subscribe(({written}) =>
      onProgress({state: 'downloading', written: written || 0, total: update.size})
    );
    try {
      await download.done;
    } finally {
      off();
    }
    log(`v${update.version} downloaded and verified (${update.size} bytes, sha256 ${update.sha256})`);
    onProgress({state: 'installing', written: update.size, total: update.size});
    const extracted = `${workDir}/${update.version}`;
    await archives.extract({sources: [zip], destination: extracted, maxBytes: 4 * 1024 ** 3}).done;
    log(`extracted to ${extracted}`);
    return extracted;
  }
  async function install(update, onProgress = () => {}) {
    const target = image ?? installDir;
    if (!fs.exists(target)) throw new Error(`The app is not installed at ${target}`);
    await cleaning;
    await clear();
    fs.mkdir(workDir, {recursive: true});
    let extracted;
    try {
      if (image) ensureRoomForImage(update);
      extracted = await fetchRelease(update, onProgress);
      if (image) replaceImage(extracted, update);
    } catch (error) {
      log(`v${update.version} failed: ${error.message}`);
      await tidy();
      throw error;
    }
    if (image) {
      await tidy();
      return {relaunch: false};
    }
    const staged = contentOf(extracted);
    const pace = pacer(CHANGES_PER_FRAME);
    await openUp(staged, pace);
    await pace.step();
    fs.chmod(installDir, 511);
    await swap(staged, `${workDir}/previous`, pace);
    log(`v${update.version} moved into ${installDir}`);
    await tidy();
    return {relaunch: true};
  }
  async function removeGradually(path) {
    const pace = pacer(REMOVALS_PER_FRAME);
    async function visit(dir) {
      const entries = fs.readDir(dir);
      await pace.frame();
      for (const entry of entries) {
        await pace.step();
        const child = `${dir}/${entry.name}`;
        if (!entry.isDirectory) fs.remove(child);
        else {
          try {
            fs.remove(child);
          } catch {
            await visit(child);
          }
        }
      }
      await pace.step();
      fs.remove(dir);
    }
    await visit(path);
  }
  let cleaning = Promise.resolve();
  function cleanup() {
    cleaning = cleaning
      .then(() => fs.exists(workDir) && removeGradually(workDir))
      .catch(error => log(`leftovers kept: ${error.message}`));
    return cleaning;
  }
  return {check, install, cleanup};
}

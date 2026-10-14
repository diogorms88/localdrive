import {readJSON} from './read-json.js';
import {t} from '../i18n/core.js';
import {archivePassword} from './archive-password.js';
import {createSourceResolver, sourceKind, cancellation, webURL, BrowserRequired} from './download-sources.js';
import {describeVikingCapture, VIKING_PREFIX, validateVikingCapture} from './viking-capture.js';
import {stillNeeded, MARGIN, spaceShortfall} from './space.js';
import {cause, STALE_PARTIAL} from '../downloads/errors.js';

const ACTIVE = ['resolving', 'connecting', 'downloading', 'verifying', 'extracting', 'installing', 'pausing'];

const MAX_PARALLEL_DOWNLOADS = 3;

export const BUSY = ['queued', ...ACTIVE];

// Tasks the console's background downloader can carry on: still transferring, nothing to extract or install yet.
const HANDOFF = ['queued', 'resolving', 'connecting', 'downloading', 'verifying'];

// How long a background downloader that stopped reporting is waited for before the app takes its files back.
const BACKGROUND_SILENCE_MS = 30000;

// Payload Manager scans /data/pldmgr and its subfolders for .elf and .bin payloads.
export const payloadDir = root => `${root.replace(/\/+$/, '')}/pldmgr/payloads`;

export const COMPLETE = [
  'downloaded',
  'file-downloaded',
  'installer-required',
  'installed',
  'extraction-required',
  'extracted'
];

const ADOPTED =
  'A partial download from another source holds this name. Resume it from its original source, or delete it in Files.';

const DELETED = 'Its partial files were deleted. Restart to download it again, or remove it.';

function durable(fs, stateDir) {
  try {
    fs.mkdir(stateDir, {recursive: true});
    fs.exists(`${stateDir}/downloads.json`);
    return true;
  } catch (error) {
    console.log(`[download-queue] ${stateDir} unavailable, queue kept in the app data: ${error.message}`);
    return false;
  }
}

function restore(saved) {
  return saved.jobs
    .slice(0, 32)
    .filter(job => {
      const valid = job?.release?.id && job.root && job.artifact?.destination;
      if (!valid) console.log(`[download-queue] dropped an invalid queue entry ${job?.id ?? ''}`);
      return valid;
    })
    .map(job => {
      delete job.captureState;
      delete job.captureError;
      if (job.state === 'installing') return {...job, state: 'installer-required'};
      if (job.state === 'extracting') job.written = job.total;
      const interrupted = BUSY.includes(job.state);
      return {
        ...job,
        state: interrupted ? 'paused' : job.state,
        error: interrupted ? 'Interrupted. Resume to continue.' : job.error,
        ...(interrupted &&
          job.state !== 'pausing' && {restore: job.state === 'queued' ? 'queued' : 'running'})
      };
    });
}

export function createDownloadQueue({
  fs,
  downloads,
  http,
  formats,
  dataDir,
  stateDir = `${dataDir}/localdrive`,
  platform,
  notifications,
  power,
  linking,
  sources,
  archives,
  packages,
  releasesOf,
  browserCapture
}) {
  const legacy = [`${dataDir}/overdrive/downloads.json`, '/data/ps5-react/PPSA99058/queue/downloads.json'];
  const directory =
    stateDir === `${dataDir}/localdrive` || durable(fs, stateDir) ? stateDir : `${dataDir}/localdrive`;
  const file = `${directory}/downloads.json`;
  const listeners = new Set();
  sources ?? (sources = createSourceResolver({http}));
  const captures = new Map();
  let jobs = [];
  const active = new Map();
  const workerFor = job => active.get(job.id);
  let ticks = 0;
  let awake = false;
  // Set once the queue handed its downloads to the background downloader: nothing starts until the app closes.
  let toBackground = false;
  const modified = path => {
    try {
      return fs.stat(path)?.modified ?? 0;
    } catch {
      return 0;
    }
  };
  const candidates = [...new Set([file, `${file}.tmp`, ...legacy])]
    .filter(path => {
      try {
        return fs.exists(path);
      } catch {
        return false;
      }
    })
    .sort((a, b) => modified(b) - modified(a));
  let stored = null;
  for (const path of candidates) {
    const saved = readJSON(
      fs,
      path,
      null,
      value => value?.version === 1 && Array.isArray(value.jobs),
      message => console.log(`[download-queue] ${message}`)
    );
    if (saved) {
      jobs = restore(saved);
      stored = path;
      break;
    }
  }
  const snapshot = () => jobs.map(job => ({...job}));
  const emit = () => {
    const busy = captures.size > 0 || jobs.some(job => BUSY.includes(job.state));
    if (busy !== awake) {
      awake = busy;
      power.keepAwake(busy);
    }
    const value = snapshot();
    for (const listener of listeners) listener(value);
  };
  const save = () => {
    fs.mkdir(directory, {recursive: true});
    fs.writeFile(`${file}.tmp`, JSON.stringify({version: 1, jobs}), {sync: true});
    fs.rename(`${file}.tmp`, file);
  };
  const change = () => {
    save();
    emit();
  };
  for (const oldPath of legacy) {
    if (oldPath === file || !fs.exists(oldPath)) continue;
    try {
      if (stored === oldPath) save();
      fs.rename(oldPath, `${oldPath}.moved`);
    } catch (error) {
      console.log(`[download-queue] queue not moved to ${file}: ${error.message}`);
    }
  }
  if (stored === `${file}.tmp`) {
    try {
      save();
    } catch (error) {
      console.log(`[download-queue] queue not saved to ${file}: ${error.message}`);
    }
  }
  // The background downloader's report (native/ps5/payloads/download_daemon.cpp).
  const statusFile = `${directory}/background-status`;
  function readBackground() {
    let text;
    try {
      if (!fs.exists(statusFile)) return null;
      text = fs.readFile(statusFile);
    } catch {
      return null;
    }
    const [head = '', ...lines] = text.split('\n').filter(Boolean);
    const [magic, state, seconds] = head.split(' ');
    if (magic !== 'LDS1') return null;
    const files = [];
    for (const line of lines) {
      const [index, fileState, written, total, speed, ...error] = line.split(' ');
      files[Number(index)] = {
        state: fileState,
        written: Number(written) || 0,
        total: total === '-' ? null : Number(total),
        bytesPerSecond: Number(speed) || 0,
        error: error.join(' ')
      };
    }
    return {state, heartbeat: Number(seconds) * 1000, files};
  }
  // While the background downloader still holds files, shows its progress; once it stopped (the app
  // opening stops it) or went silent, the queue takes the tasks back. Finished files then recover
  // from their completion receipts and unfinished ones resume from their checkpoints.
  function followBackground(since = Date.now()) {
    const held = jobs.filter(job => job.state === 'background');
    if (!held.length) return;
    const status = readBackground();
    for (const job of held) {
      for (const {file, part} of job.background || []) {
        const report = status?.files[file];
        if (!report) continue;
        if (part === void 0) {
          job.written = report.written;
          job.total = report.total ?? job.total;
        } else {
          job.parts[part].written = report.written;
          job.written = job.parts.reduce((sum, item) => sum + item.written, 0);
        }
      }
      job.bytesPerSecond = (job.background || []).reduce(
        (sum, {file}) => sum + (status?.files[file]?.bytesPerSecond || 0),
        0
      );
    }
    const now = Date.now();
    const over = status
      ? ['stopped', 'finished'].includes(status.state) || now - status.heartbeat > BACKGROUND_SILENCE_MS
      : now - since > BACKGROUND_SILENCE_MS / 2;
    if (!over) {
      emit();
      setTimeout(() => followBackground(since), 1000);
      return;
    }
    console.log(`[download-queue] background downloader ${status?.state ?? 'silent'}; taking ${held.length} back`);
    for (const job of held) {
      delete job.background;
      job.state = 'queued';
      job.bytesPerSecond = 0;
      job.message = '';
    }
    try {
      if (fs.exists(statusFile)) fs.remove(statusFile);
    } catch {}
    change();
    pump();
  }
  const find = id => {
    const job = jobs.find(item => item.id === id);
    if (!job) throw new Error('Download is no longer in the queue.');
    return job;
  };
  // `saveTo`, a folder under the storage root, takes a plain file there and an archive's contents
  // there once extracted (homebrew payloads, emulator BIOS); the shared classifier still checks names.
  const savedTo = (release, root) => {
    const folder = release.saveTo;
    if (!folder.startsWith(`${root.replace(/\/+$/, '')}/`) || folder.split('/').includes('..'))
      throw new Error(`Downloads: saveTo ${folder} is outside ${root}`);
    const checked = formats.artifact(release, root);
    if (checked.nextAction !== 'downloaded') return checked;
    return {...checked, directory: folder, destination: `${folder}/${release.filename}`};
  };
  const artifactFor = (release, root) =>
    release.parts
      ? {
          directory: `${root}/downloads/sets/${release.filename}`,
          destination: `${root}/downloads/extracted/${release.filename}`,
          nextAction: 'extracted'
        }
      : release.saveTo
        ? savedTo(release, root)
        : formats.artifact(release, root);
  function failOver(job, error) {
    if (
      job.written ||
      job.parts?.some(part => part.written) ||
      /space|storage|drive|disconnected/i.test(cause(error.message))
    )
      return false;
    while (job.fallbacks?.length) {
      const next = job.fallbacks.shift();
      const artifact = artifactFor(next, job.root);
      if (
        fs.exists(artifact.destination) ||
        fs.exists(`${artifact.destination}.part`) ||
        jobs.some(other => other !== job && other.artifact.destination === artifact.destination)
      )
        continue;
      job.message = t('downloads.switchedSource', {failed: job.release.provider, next: next.provider});
      job.release = {...next};
      job.artifact = artifact;
      job.total = next.sizeBytes || null;
      for (const key of [
        'options',
        'browserUrl',
        'directURL',
        'parts',
        'partIndex',
        'currentSource',
        'downloadDestination',
        'inspected',
        'adopted'
      ])
        delete job[key];
      job.error = '';
      job.state = 'queued';
      return true;
    }
    return false;
  }
  function reresolve(job) {
    const source = job.parts ? job.currentSource : job.release;
    if (
      (job.reresolved || 0) >= 2 ||
      ['direct', 'browser', 'datanodes', 'manifest', 'unavailable'].includes(sourceKind(source))
    )
      return false;
    job.reresolved = (job.reresolved || 0) + 1;
    delete job.options;
    if (job.parts) delete job.parts[job.partIndex].options;
    job.error = '';
    job.state = 'queued';
    return true;
  }
  async function installNow(job) {
    const paths = job.packages ?? [job.downloadDestination || job.artifact.destination];
    try {
      for (const path of paths) {
        job.state = 'installing';
        job.written = 0;
        job.total = null;
        job.error = '';
        change();
        const task = packages.install({path, name: job.title});
        workerFor(job).task = task;
        const off = task.subscribe(progress => {
          job.written = progress.written || 0;
          job.total = progress.total ?? null;
          emit();
        });
        try {
          await task.done;
        } finally {
          off();
        }
      }
      job.state = 'installed';
      job.message = t('downloads.installed');
      notifications.show(t('downloads.notice.installed'), job.title);
    } catch (error) {
      job.state = 'installer-required';
      job.error = error.message;
      job.message = t('downloads.installFailed');
    }
    job.bytesPerSecond = 0;
    delete job.install;
    change();
  }
  let postprocess = Promise.resolve();
  function exclusivePostprocess(work) {
    const previous = postprocess;
    let release;
    postprocess = new Promise(resolve => {
      release = resolve;
    });
    return previous.then(async () => {
      try {
        return await work();
      } finally {
        release();
      }
    });
  }
  const install = job => exclusivePostprocess(() => installNow(job));
  const extractExclusive = (job, files, streamed) =>
    exclusivePostprocess(() => extract(job, files, streamed));
  const canInstall = () => Boolean(packages) && platform === 'ps5';
  // `sharing`: downloads running at once, which split the connections between them.
  const fileOptions = (job, sharing) => ({
    ...job.options,
    rejectHtml: true,
    mirrors: void 0,
    // A release may cap its connections when the host refuses parallel ranges (CDRomance allows one per IP).
    connections: job.release.connections || Math.max(8, Math.floor(64 / Math.max(1, sharing))),
    adaptive: true,
    rangeBytes: 32 * 1024 * 1024,
    destination: job.downloadDestination,
    storageRoot: job.root,
    recoverCompleted: true
  });
  const partOptions = (job, part, sharing) => ({
    ...part.options,
    rejectHtml: true,
    connections: Math.max(8, Math.floor(64 / Math.max(1, sharing))),
    adaptive: true,
    destination: part.destination,
    storageRoot: job.root,
    recoverCompleted: true
  });
  async function resolveFile(job, signal) {
    if (job.release.manifestUrl) {
      const response = await http.request(job.release.manifestUrl, {maxBytes: 4 * 1024 * 1024, signal});
      if (!response.ok) throw new Error(`Manifest HTTP ${response.status}. Choose another source or retry.`);
      job.options = formats.manifest(await response.json());
    } else {
      if (!job.release.url && !job.release.browserUrl) throw new Error('This release has no download URL.');
      const resolved =
        job.directURL || sourceKind(job.release) !== 'direct'
          ? await sources.resolve(job.release, {signal, directURL: job.directURL})
          : {url: webURL(job.release.url).url};
      job.options = {
        ...resolved,
        rejectHtml: true,
        expectedBytes: job.release.sizeBytes || void 0,
        sha256: job.release.sha256 || void 0
      };
      delete job.directURL;
    }
    job.total = job.options.expectedBytes || null;
    change();
  }
  async function resolvePart(job, index, signal) {
    const part = job.parts[index];
    const source = job.release.parts[index].sources[part.sourceIndex || 0];
    job.currentSource = source;
    const resolved = await sources.resolve(source, {signal, directURL: job.directURL});
    part.options = {
      ...resolved,
      expectedBytes: source.sizeBytes || void 0,
      sha256: source.sha256 || void 0
    };
    delete job.directURL;
    change();
  }
  const setParts = job =>
    job.parts ||
    (job.parts = job.release.parts.map(part => ({
      number: part.number,
      destination: `${job.artifact.directory}/part-${part.number}.bin`,
      written: 0,
      completed: false
    })));
  async function execute(job) {
    let task;
    let unsubscribe;
    const worker = workerFor(job);
    try {
      if (job.install) {
        await install(job);
        return;
      }
      worker.cancel = cancellation();
      const signal = worker.cancel.signal;
      job.state = 'resolving';
      job.error = '';
      change();
      if (job.release.parts) {
        await executeSet(job, signal);
        return;
      }
      job.downloadDestination || (job.downloadDestination = job.artifact.destination);
      if (job.routing) finishRouting(job);
      if (!job.options) await resolveFile(job, signal);
      if (job.state === 'pausing') return;
      const root = storageIdentity(job);
      if (!job.rootIdentity) {
        job.rootIdentity = root;
        change();
      }
      const held = Math.max(job.written, fs.stat(`${job.downloadDestination}.part`)?.size || 0);
      if (
        !fs.exists(job.downloadDestination) &&
        fs.diskUsage(job.root).free < stillNeeded({...job, written: held}) + MARGIN
      )
        throw new Error('Not enough space on the selected drive. Free space and retry.');
      fs.mkdir(job.artifact.directory, {recursive: true});
      worker.transferring = true;
      task = downloads.enqueue(fileOptions(job, active.size));
      worker.task = task;
      unsubscribe = task.subscribe(progress => {
        if (job.state === 'pausing') return;
        if (ACTIVE.includes(progress.state)) job.state = progress.state;
        job.written = progress.written || 0;
        job.total = progress.total ?? job.total;
        job.received = progress.received || 0;
        job.connections = progress.connections || 0;
        job.bytesPerSecond = progress.bytesPerSecond || 0;
        if (job.written > 0) delete job.adopted;
        if (++ticks % 20 === 0) {
          delete job.launches;
          try {
            save();
          } catch (error) {
            job.error = `Queue save failed: ${error.message}`;
            task.cancel();
          }
          if (['extraction-required', 'downloaded'].includes(job.artifact.nextAction))
            checkHeaders(job, `${job.downloadDestination}.part`, task);
        }
        emit();
      });
      await task.done;
      if (job.artifact.nextAction === 'downloaded') route(job);
      job.state =
        job.artifact.nextAction === 'shadowmount'
          ? 'downloaded'
          : job.artifact.nextAction === 'downloaded'
            ? 'file-downloaded'
            : job.artifact.nextAction;
      job.written = job.total || job.written;
      job.bytesPerSecond = 0;
      if ((job.artifact.nextAction === 'extraction-required' || job.output) && archives)
        await extractExclusive(job, [job.downloadDestination]);
      delete job.reresolved;
      notifications.show(t('downloads.notice.complete'), job.title);
      if (job.state === 'installer-required' && canInstall()) await install(job);
    } catch (error) {
      console.log('[download-queue] transfer stopped:', error.message);
      const browser =
        error instanceof BrowserRequired || /browser verification required/i.test(cause(error.message));
      const retried =
        job.state !== 'pausing' && !job.cancelling && browser && worker.transferring && reresolve(job);
      const switched = !retried && job.state !== 'pausing' && !job.cancelling && failOver(job, error);
      if (!retried && !switched && job.state !== 'pausing') {
        job.state = browser ? 'awaiting-browser' : 'failed';
        job.error ||
          (job.error = job.adopted && STALE_PARTIAL.test(cause(error.message)) ? ADOPTED : error.message);
        if (browser) {
          job.browserUrl =
            error.url ||
            job.currentSource?.browserUrl ||
            job.currentSource?.url ||
            job.release.browserUrl ||
            job.release.url;
          delete job.options;
          if (job.parts) delete job.parts[job.partIndex].options;
        } else if (!job.cancelling) notifications.show(t('downloads.notice.failed'), job.title);
      }
    } finally {
      unsubscribe?.();
      if (job.state === 'pausing') job.state = 'paused';
      if (COMPLETE.includes(job.state)) delete job.launches;
      active.delete(job.id);
      if (job.cancelling) {
        try {
          forget(job);
        } catch (error) {
          delete job.cancelling;
          job.error = error.message;
        }
      }
      try {
        change();
      } catch (error) {
        job.error = `Queue save failed: ${error.message}`;
        emit();
      }
      pump();
    }
  }
  function checkHeaders(job, path, task) {
    if (job.inspected || !archives?.inspect || !fs.exists(path)) return;
    const {kind, refusal} = archives.inspect([path]);
    if (!kind) return;
    job.inspected = kind;
    if (refusal) {
      job.error = refusal;
      task.cancel();
    }
  }
  function route(job) {
    if (!archives?.inspect) return;
    const {kind, refusal} = archives.inspect([job.downloadDestination]);
    if (refusal) throw new Error(refusal);
    if (!kind) return;
    const artifact = formats.detected(job.release, job.root, kind);
    if (artifact.nextAction === 'extraction-required') {
      job.artifact = {...job.artifact, format: kind, nextAction: artifact.nextAction};
      return;
    }
    if (fs.exists(artifact.destination))
      throw new Error('Destination already exists. Choose another release or inspect the existing file.');
    fs.mkdir(artifact.directory, {recursive: true});
    job.routing = artifact;
    change();
    finishRouting(job);
  }
  function finishRouting(job) {
    const from = job.downloadDestination,
      to = job.routing.destination;
    if (fs.exists(from)) fs.rename(from, to);
    if (fs.exists(`${from}.complete`)) fs.rename(`${from}.complete`, `${to}.complete`);
    job.artifact = job.routing;
    job.downloadDestination = to;
    delete job.routing;
    change();
  }
  function gameFolder(output) {
    for (let depth = 0; depth <= 16; depth++) {
      if (fs.exists(`${output}/eboot.bin`) && fs.exists(`${output}/sce_sys/param.json`)) return output;
      let children;
      try {
        children = fs
          .readDir(output)
          .filter(entry => entry.isDirectory && !entry.name.startsWith('.ps5-react'));
      } catch {
        return null;
      }
      if (children.length !== 1) return null;
      output = `${output}/${children[0].name}`;
    }
    return null;
  }
  function extraction(job, files) {
    if (!archives) throw new Error('Archive extraction requires the updated PS5 React runtime.');
    if (releasesOf) {
      const stored = job.release.parts ? job.release.parts.flatMap(part => part.sources) : [job.release];
      const current = releasesOf(job.gameId).flatMap(release =>
        release.parts ? release.parts.flatMap(part => part.sources) : [release]
      );
      for (const source of stored) {
        const match = current.find(
          item => item.url && item.url === source.url && item.browserUrl === source.browserUrl
        );
        if (source.archivePassword == null && match?.archivePassword)
          source.archivePassword = match.archivePassword;
      }
    }
    const password = archivePassword(job.release);
    storageIdentity(job);
    const directory = `${job.root}/downloads/extracted`;
    fs.mkdir(directory, {recursive: true});
    // An archive bound for `saveTo` is staged here first: extraction only publishes a folder it creates,
    // and the target folder may already exist (a job queued by 0.0.7 recorded it as its output).
    if (job.release.saveTo && job.output === job.release.saveTo) job.output = null;
    job.output || (job.output = `${directory}/${job.release.filename.replace(/[^a-z0-9_.-]/gi, '_')}`);
    if (job.publishTo && fs.exists(job.publishTo)) job.output = job.publishTo;
    return {
      sources: files,
      destination: job.output,
      ...(password !== void 0 ? {password} : {}),
      maxBytes: fs.exists(job.output)
        ? 1024 ** 4
        : Math.min(1024 ** 4, Math.max(1, fs.diskUsage(job.root).free - MARGIN))
    };
  }
  async function extract(job, files, streamed) {
    const options = extraction(job, files);
    const downloaded = {written: job.written, total: job.total};
    const estimate = files.reduce((sum, path) => sum + (fs.stat(path)?.size || 0), 0) || null;
    job.state = 'extracting';
    job.written = 0;
    job.total = estimate;
    job.bytesPerSecond = 0;
    change();
    let sample = {at: Date.now(), bytes: 0};
    const report = bytes => {
      const now = Date.now();
      job.written = estimate ? Math.min(bytes, estimate * 0.99) : bytes;
      if (now - sample.at >= 1e3) {
        const speed = ((bytes - sample.bytes) * 1e3) / (now - sample.at);
        job.bytesPerSecond = job.bytesPerSecond ? job.bytesPerSecond * 0.7 + speed * 0.3 : speed;
        sample = {at: now, bytes};
      }
      emit();
    };
    let result;
    try {
      if (streamed) {
        workerFor(job).task = streamed.task;
        sample = {at: Date.now(), bytes: streamed.written};
        report(streamed.written);
        const off = streamed.task.subscribe(progress => report(progress.written || 0));
        const outcome = await streamed.done;
        off();
        if (outcome.error && (job.state === 'pausing' || job.cancelling)) throw outcome.error;
        if (outcome.error) {
          console.log(
            '[download-queue] extraction during download stopped, extracting again:',
            outcome.error.message
          );
          job.written = 0;
          sample = {at: Date.now(), bytes: 0};
          emit();
        }
        result = outcome.result;
      }
      if (!result) {
        if (!fs.exists(job.output) && fs.diskUsage(job.root).free < (estimate || 0) + MARGIN)
          throw new Error('Not enough space to extract this download. Free space and retry.');
        const task = archives.extract(options);
        workerFor(job).task = task;
        const off = task.subscribe(progress => report(progress.written || 0));
        try {
          result = await task.done;
        } finally {
          off();
        }
      }
    } finally {
      Object.assign(job, downloaded, {bytesPerSecond: 0});
    }
    const images = (result.artifacts || []).filter(path => /\.(ffpfsc|ffpfs|ffpkg|exfat)$/i.test(path));
    if (images.length) {
      const destination = `${job.root}/homebrew/${job.release.filename.replace(/[^a-z0-9_.-]/gi, '_')}-extracted`;
      fs.mkdir(`${job.root}/homebrew`, {recursive: true});
      job.publishTo = destination;
      change();
      if (job.output !== destination) {
        if (fs.exists(destination))
          throw new Error('Extracted destination already exists; preserve it and inspect before retrying.');
        storageIdentity(job);
        fs.rename(job.output, destination);
        job.output = destination;
      }
      job.artifact.nextAction = 'shadowmount';
      job.artifact.destination = `${job.output}/${images[0]}`;
      job.state = 'downloaded';
      job.message = t('downloads.extractedReady', {parts: job.parts ? 'all' : 'one'});
    } else if (job.release.saveTo) {
      deliver(job);
    } else {
      job.state = 'extracted';
      job.message = t('downloads.extractedTo', {path: job.output});
      const packaged = (result.artifacts || []).filter(path => /\.(pkg|fpkg)$/i.test(path));
      const folder = packaged.length ? null : gameFolder(job.output);
      if (packaged.length) {
        job.packages = packaged.map(path => `${job.output}/${path}`);
        job.state = 'installer-required';
        job.message = t('downloads.packagesExtracted', {path: job.output});
      } else if (folder) {
        const destination = `${job.root}/homebrew/${job.release.filename.replace(/[^a-z0-9_.-]/gi, '_')}-app`;
        fs.mkdir(`${job.root}/homebrew`, {recursive: true});
        if (fs.exists(destination))
          throw new Error('Extracted destination already exists; preserve it and inspect before retrying.');
        storageIdentity(job);
        fs.rename(folder, destination);
        if (folder !== job.output && fs.exists(job.output)) fs.removeTree(job.output);
        job.output = destination;
        job.publishTo = destination;
        job.artifact.nextAction = 'shadowmount';
        job.artifact.destination = destination;
        job.state = 'downloaded';
        job.message = t('downloads.extractedReady', {parts: job.parts ? 'all' : 'one'});
      }
    }
    change();
    try {
      for (const path of files)
        for (const suffix of ['', '.complete']) if (fs.exists(path + suffix)) fs.remove(path + suffix);
      if (job.release.parts && fs.exists(setDirectory(job))) fs.removeTree(setDirectory(job));
    } catch (error) {
      job.message = `${job.message} ${t('downloads.archiveNotDeleted', {error: error.message})}`;
    }
  }
  // Moves a staged extraction into `saveTo`, which may already hold other files: a single top-level
  // folder in the archive is unwrapped, and a file that already exists there is kept, not replaced.
  function deliver(job) {
    const folder = job.release.saveTo;
    const visible = path => fs.readDir(path).filter(entry => !entry.name.startsWith('.ps5-react-'));
    let from = job.output;
    let entries = visible(from);
    while (entries.length === 1 && entries[0].isDirectory) {
      from = `${from}/${entries[0].name}`;
      entries = visible(from);
    }
    fs.mkdir(folder, {recursive: true});
    const kept = [];
    for (const {name} of entries) {
      if (fs.exists(`${folder}/${name}`)) kept.push(name);
      else fs.rename(`${from}/${name}`, `${folder}/${name}`);
    }
    if (!kept.length) {
      fs.removeTree(job.output);
      job.output = null;
    }
    job.state = 'extracted';
    job.message = kept.length
      ? t('downloads.extractedKept', {path: folder, files: kept.join(', '), staged: from})
      : t('downloads.extractedTo', {path: folder});
  }
  function streamSet(job) {
    const first = job.parts[0].destination;
    if (!archives?.streams || job.parts.length < 2 || archives.inspect([first]).kind !== 'rar') return null;
    let task;
    try {
      const options = extraction(
        job,
        job.parts.map(part => part.destination)
      );
      if (fs.exists(options.destination)) return null;
      change();
      task = archives.extract({...options, stream: true});
    } catch (error) {
      console.log('[download-queue] extraction during download not started:', error.message);
      return null;
    }
    const streamed = {task, written: 0};
    const off = task.subscribe(progress => {
      streamed.written = progress.written || 0;
    });
    streamed.done = task.done
      .then(
        result => ({result}),
        error => ({error: error})
      )
      .finally(off);
    return streamed;
  }
  const setDirectory = job => `${job.root}/downloads/sets/${job.release.filename}`;
  function setNeed(job, extracted = 0) {
    const sizes = job.parts.map(item => item.total ?? item.options?.expectedBytes ?? null);
    const largest = Math.max(0, ...sizes.filter(Boolean));
    const size = index => sizes[index] ?? largest;
    return Math.max(
      0,
      job.parts.reduce(
        (sum, item, index) =>
          sum + size(index) + (item.completed ? 0 : Math.max(0, size(index) - item.written)),
        0
      ) - extracted
    );
  }
  function ownedPaths(job) {
    const managed = path => {
      const parts = path.startsWith(`${job.root}/`) ? path.slice(job.root.length + 1).split('/') : [];
      return (
        !parts.some(part => ['', '.', '..'].includes(part)) &&
        ((parts[0] === 'homebrew' && parts.length >= 2) || (parts[0] === 'downloads' && parts.length >= 3))
      );
    };
    const paths = [
      job.artifact.destination,
      job.downloadDestination,
      job.output,
      job.publishTo,
      job.release.parts && setDirectory(job)
    ]
      .filter(Boolean)
      .flatMap(path => [path, `${path}.complete`, `${path}.complete.tmp`]);
    return [...new Set(paths)].filter(managed);
  }
  async function executeSet(job, signal) {
    if (job.release.unavailableReason) throw new Error(job.release.unavailableReason);
    const root = storageIdentity(job);
    if (!job.rootIdentity) job.rootIdentity = root;
    fs.mkdir(job.artifact.directory, {recursive: true});
    setParts(job);
    let streamed = null;
    try {
      for (let index = 0; index < job.parts.length; index++) {
        if (!streamed && index > 0 && job.parts[0].completed && fs.exists(job.parts[0].destination))
          streamed = workerFor(job).streamed = streamSet(job);
        job.partIndex = index;
        const part = job.parts[index];
        if (job.state === 'pausing') return;
        if (part.completed && fs.exists(part.destination)) continue;
        if (part.completed) {
          part.completed = false;
          part.written = 0;
          delete part.options;
        }
        job.state = 'resolving';
        job.message = t('downloads.part', {part: index + 1, parts: job.parts.length});
        workerFor(job).transferring = false;
        change();
        job.currentSource = job.release.parts[index].sources[part.sourceIndex || 0];
        if (!part.options) await resolvePart(job, index, signal);
        if (job.state === 'pausing') return;
        storageIdentity(job);
        if (
          !fs.exists(part.destination) &&
          fs.diskUsage(job.root).free < setNeed(job, streamed?.written) + MARGIN
        )
          throw new Error(
            'Not enough space for the remaining volumes and their extraction. Free space and resume.'
          );
        workerFor(job).transferring = true;
        const task = downloads.enqueue(partOptions(job, part, active.size));
        workerFor(job).task = task;
        const off = task.subscribe(progress => {
          if (job.state === 'pausing') return;
          if (ACTIVE.includes(progress.state)) job.state = progress.state;
          part.written = progress.written || 0;
          part.total = progress.total;
          job.written = job.parts.reduce((sum, item) => sum + item.written, 0);
          job.total = job.parts.every(item => item.total != null)
            ? job.parts.reduce((sum, item) => sum + item.total, 0)
            : null;
          job.received = progress.received || 0;
          job.connections = progress.connections || 0;
          job.bytesPerSecond = progress.bytesPerSecond || 0;
          if (++ticks % 20 === 0) {
            delete job.launches;
            try {
              save();
            } catch (error) {
              job.error = `Queue save failed: ${error.message}`;
              task.cancel();
            }
            if (index === 0) checkHeaders(job, `${part.destination}.part`, task);
          }
          emit();
        });
        let result;
        try {
          result = await task.done;
        } finally {
          off();
        }
        part.written = result.written ?? part.total ?? part.written;
        job.written = job.parts.reduce((sum, item) => sum + item.written, 0);
        part.completed = true;
        change();
        const refusal = index === 0 && archives?.inspect([part.destination]).refusal;
        if (refusal) throw new Error(refusal);
      }
    } finally {
      delete workerFor(job).streamed;
      if (streamed && (job.state === 'pausing' || job.parts.some(part => !part.completed))) {
        streamed.task.cancel();
        await streamed.done;
        streamed = null;
      }
    }
    if (job.state === 'pausing') return;
    await extractExclusive(
      job,
      job.parts.map(part => part.destination),
      streamed
    );
    notifications.show(t('downloads.notice.complete'), job.title);
    if (job.state === 'installer-required' && canInstall()) await install(job);
  }
  function lostPartial(job) {
    const kept = path => fs.exists(path) || fs.exists(`${path}.part`);
    if (job.parts) return job.parts.some(part => (part.written || part.completed) && !kept(part.destination));
    return job.written > 0 && !kept(job.downloadDestination || job.artifact.destination);
  }
  function holding(root) {
    const lost = jobs.filter(
      job => job.root === root && ['paused', 'failed'].includes(job.state) && lostPartial(job)
    );
    const unmarked = lost.filter(job => job.error !== DELETED);
    for (const job of unmarked) job.error = DELETED;
    if (unmarked.length) change();
    return jobs.filter(
      job => job.root === root && (BUSY.includes(job.state) || job.state === 'paused') && !lost.includes(job)
    );
  }
  function pump(first) {
    if (captures.size || toBackground) return;
    while (active.size < MAX_PARALLEL_DOWNLOADS) {
      const workers = [...active.values()];
      if (workers.some(worker => worker.job.release.parts)) return;
      const queued = jobs.filter(item => item.state === 'queued');
      const preferred = first?.state === 'queued' && !active.has(first.id) ? first : null;
      const job =
        preferred && (!preferred.release.parts || active.size === 0)
          ? preferred
          : queued.find(item => !active.has(item.id) && (!item.release.parts || active.size === 0));
      first = null;
      if (!job) return;
      const worker = {job: job, task: null};
      active.set(job.id, worker);
      worker.done = execute(job);
      if (job.release.parts) return;
    }
  }
  function storageIdentity(job) {
    const info = fs.stat(job.root);
    if (!info?.isDirectory) throw new Error('Storage disconnected. Reconnect the selected drive.');
    if (typeof info.device !== 'string' || typeof info.inode !== 'string')
      throw new Error('Storage identity is unavailable. Update the runtime.');
    const identity = `${info.device}:${info.inode}`;
    if (job.rootIdentity && job.rootIdentity !== identity) {
      if (job.root !== '/data') throw new Error('Storage changed. Reconnect the original drive.');
      job.rootIdentity = identity;
    }
    return identity;
  }
  function discardPartial(job) {
    storageIdentity(job);
    if (!job.rootIdentity)
      throw new Error('This older task has no storage identity. Preserve and inspect its partial files.');
    if (
      fs.exists(
        job.parts?.[job.partIndex]?.destination || job.downloadDestination || job.artifact.destination
      )
    )
      throw new Error('A final file exists. Retry to verify and recover it.');
    const destination =
      job.parts?.[job.partIndex]?.destination || job.downloadDestination || job.artifact.destination;
    const paths = ['.part', '.resume', '.resume.tmp', '.complete', '.complete.tmp'].map(
      suffix => destination + suffix
    );
    for (const path of paths) {
      const info = fs.stat(path);
      if (info && !info.isFile) throw new Error(`Cannot discard a non-file: ${path}`);
    }
    for (const path of paths) if (fs.exists(path)) fs.remove(path);
  }
  const onOriginalStorage = job => {
    try {
      storageIdentity(job);
      return true;
    } catch {
      return false;
    }
  };
  function forget(job) {
    if (
      (job.rootIdentity || job.written) &&
      !job.adopted &&
      !job.parts?.[job.partIndex]?.completed &&
      onOriginalStorage(job)
    )
      discardPartial(job);
    const previous = jobs;
    jobs = jobs.filter(item => item !== job);
    try {
      save();
    } catch (error) {
      jobs = previous;
      throw error;
    }
  }
  async function shadowRequest(route, body = {}) {
    if (platform !== 'ps5') throw new Error('ShadowMount registration requires a PS5.');
    const response = await http.request(`http://127.0.0.1:10101/api/v1/${route}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
      maxBytes: 1024 * 1024
    });
    if (!response.ok) {
      const reason = await response.json().then(
        reply => reply?.error,
        () => ''
      );
      throw new Error(`ShadowMount HTTP ${response.status}${reason ? `: ${reason}` : ''}.`);
    }
    return response.json();
  }
  async function registered(job) {
    let game;
    try {
      game = await shadowRequest('games/info', {title_id: job.titleId});
    } catch (error) {
      if (/HTTP 404/.test(error.message)) return null;
      throw error;
    }
    if (game.path?.replace(/\/+$/, '') === job.artifact.destination) return game;
    return !fs.exists(job.artifact.destination) && game.managed ? game : null;
  }
  async function markInstalled(candidates) {
    let found = false;
    for (const job of candidates) {
      const game = await registered(job);
      if (!game?.installed || !jobs.includes(job) || job.state !== 'downloaded') continue;
      job.state = 'installed';
      job.message = t('downloads.installed');
      job.error = '';
      job.installedTitleId = game.title_id;
      found = true;
    }
    if (found) change();
    return found;
  }
  async function checkInstalls(id) {
    const candidates = jobs.filter(
      job =>
        job.state === 'downloaded' &&
        job.artifact.nextAction === 'shadowmount' &&
        (id === void 0 || job.id === id)
    );
    if (platform !== 'ps5' || !candidates.length) return false;
    try {
      return await markInstalled(candidates);
    } catch (error) {
      console.log('[download-queue] ShadowMount install check failed:', error.message);
      return false;
    }
  }
  let syncing = null;
  const syncInstalls = id =>
    syncing ??
    (syncing = checkInstalls(id).finally(() => {
      syncing = null;
    }));
  let running;
  for (const job of jobs.filter(item => item.restore)) {
    const was = job.restore;
    delete job.restore;
    try {
      storageIdentity(job);
      fs.diskUsage(job.root);
    } catch {
      continue;
    }
    if (was === 'running' && (job.launches || 0) >= 2) continue;
    if (was === 'running') {
      job.launches = (job.launches || 0) + 1;
      running = job;
    }
    job.state = 'queued';
    job.error = '';
  }
  if (jobs.some(job => job.state === 'queued')) {
    change();
    pump(running);
  }
  followBackground();
  function stopCapture(job) {
    const session = captures.get(job.id);
    if (session) {
      captures.delete(job.id);
      session.cancel.cancel();
      session.task?.cancel();
    }
    delete job.captureState;
    delete job.captureError;
  }
  function continueJob(job, url, verifiedOptions) {
    if (job.state !== 'awaiting-browser' || active.has(job.id)) return;
    webURL(url);
    if (!(job.parts?.[job.partIndex]?.written ?? job.written) && job.rootIdentity && !job.adopted)
      discardPartial(job);
    if (job.parts) job.parts[job.partIndex].options = verifiedOptions;
    job.options = job.parts ? void 0 : verifiedOptions;
    job.directURL = verifiedOptions ? void 0 : url;
    stopCapture(job);
    delete job.reresolved;
    job.message = '';
    job.error = '';
    job.state = 'queued';
    change();
    pump(job);
  }
  async function captureBrowser(job, source, session) {
    const current = () =>
      captures.get(job.id) === session && jobs.includes(job) && job.state === 'awaiting-browser';
    let handingOff = false;
    try {
      console.log('[browser-capture] reading public file metadata');
      const metadata = await describeVikingCapture(http, source, session.cancel.signal);
      if (!current()) return;
      session.task = browserCapture.capture({
        prefix: VIKING_PREFIX,
        suffix: `/${metadata.filename}`,
        timeoutSeconds: 180
      });
      job.captureState = 'capturing';
      change();
      console.log('[browser-capture] capture submitted; opening browser');
      if (!linking?.openURL(webURL(job.browserUrl).url))
        throw new Error('The browser could not open. Retry or enter the final file link.');
      const result = await session.task.done;
      if (!current()) return;
      job.captureState = 'validating';
      change();
      console.log('[browser-capture] link captured; validating one-byte range');
      const validated = await validateVikingCapture(http, result.url, metadata, session.cancel.signal);
      if (!current()) return;
      source.sizeBytes = validated.expectedBytes;
      if (!job.parts) job.total = validated.expectedBytes;
      console.log('[browser-capture] file validated; handing off to queue');
      handingOff = true;
      continueJob(job, validated.url, {
        url: validated.url,
        expectedBytes: validated.expectedBytes,
        sha256: source.sha256 || void 0,
        rejectHtml: true
      });
      console.log('[browser-capture] handoff finished; state:', job.state);
    } catch (error) {
      if (!current() && !(handingOff && jobs.includes(job) && job.state === 'queued' && !active.has(job.id)))
        return;
      console.log('[browser-capture] failed:', error.message);
      session.cancel.cancel();
      session.task?.cancel();
      captures.delete(job.id);
      job.state = 'awaiting-browser';
      job.captureState = 'failed';
      job.captureError = error.message;
      change();
      pump();
    }
  }
  return {
    snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    /** `alternatives`: other sources of the game, best first, tried in order if this one can't start. */
    enqueue(game, release, root, alternatives = []) {
      const id = `${game.id}/${release.id}`;
      const existing = jobs.find(job => job.id === id);
      if (existing) return existing.id;
      // PS2 backup downloads always go to PCSX2's games folder; other platforms retain their
      // selected storage root and their existing install flow.
      const queueRoot = game.platform === 'ps2' && platform === 'ps5' ? '/data' : root;
      const ps2Folder = `${queueRoot}/PCSX2/games`;
      const queuedRelease = game.platform === 'ps2' ? {...release, saveTo: ps2Folder} : release;
      const queuedAlternatives = alternatives.map(item =>
        game.platform === 'ps2' ? {...item, saveTo: ps2Folder} : item
      );
      if (queuedRelease.unavailableReason) throw new Error(queuedRelease.unavailableReason);
      const artifact = artifactFor(queuedRelease, queueRoot);
      if (fs.exists(artifact.destination))
        throw new Error('Destination already exists. Choose another release or inspect the existing file.');
      if (jobs.some(job => job.artifact.destination === artifact.destination))
        throw new Error('Another queued release owns this filename.');
      const orphan = fs.exists(`${artifact.destination}.part`);
      if (jobs.length === 32) jobs = jobs.filter(job => !COMPLETE.includes(job.state));
      if (jobs.length === 32)
        throw new Error('Queue has 32 unfinished downloads. Finish or remove one first.');
      if (queuedRelease.sizeBytes) {
        const pending = holding(queueRoot);
        const held = orphan
          ? Math.min(fs.stat(`${artifact.destination}.part`)?.size || 0, queuedRelease.sizeBytes)
          : 0;
        const need = stillNeeded({release: queuedRelease, artifact: artifact, total: queuedRelease.sizeBytes, written: held});
        const shortfall = spaceShortfall(queueRoot, need, fs.diskUsage(queueRoot).free, pending);
        if (shortfall) throw new Error(shortfall);
      }
      jobs.push({
        id,
        gameId: game.id,
        titleId: game.titleId || game.id,
        title: game.title,
        release: {...queuedRelease},
        requestedId: release.id,
        fallbacks: queuedAlternatives.slice(0, 4).map(item => ({...item})),
        root: queueRoot,
        artifact: artifact,
        state: 'queued',
        written: 0,
        total: release.sizeBytes || null,
        error: ''
      });
      try {
        if (orphan) Object.assign(jobs.at(-1), {rootIdentity: storageIdentity(jobs.at(-1)), adopted: true});
        change();
      } catch (error) {
        jobs.pop();
        throw error;
      }
      pump();
      return id;
    },
    pause(id) {
      const job = find(id);
      if (job.state === 'queued') job.state = 'paused';
      else if (active.has(job.id) && ACTIVE.includes(job.state)) {
        job.state = 'pausing';
        const worker = workerFor(job);
        worker.cancel?.cancel();
        worker.task?.cancel();
      }
      change();
    },
    /** Installs a downloaded PKG again, after the console refused it or the app closed while installing. */
    install(id) {
      const job = find(id);
      if (job.state !== 'installer-required' || !canInstall()) return;
      job.install = true;
      job.state = 'queued';
      job.error = '';
      change();
      pump();
    },
    get installs() {
      return canInstall();
    },
    resume(id) {
      const job = find(id);
      if (job.state !== 'paused' && job.state !== 'failed') return;
      delete job.reresolved;
      job.state = 'queued';
      job.error = '';
      change();
      pump();
    },
    restart(id) {
      const job = find(id);
      if (!['paused', 'failed', 'awaiting-browser'].includes(job.state) || active.has(job.id)) return;
      if (job.adopted) throw new Error(ADOPTED);
      if (
        !job.parts?.[job.partIndex]?.completed &&
        (job.options ||
          job.rootIdentity ||
          job.written ||
          fs.exists(job.artifact.destination + '.part') ||
          fs.exists(job.artifact.destination + '.resume'))
      )
        discardPartial(job);
      stopCapture(job);
      delete job.directURL;
      delete job.reresolved;
      if (job.parts?.[job.partIndex] && !job.parts[job.partIndex].completed) {
        job.parts[job.partIndex].written = 0;
        delete job.parts[job.partIndex].options;
      }
      job.written = job.parts ? job.parts.reduce((sum, part) => sum + part.written, 0) : 0;
      job.bytesPerSecond = 0;
      delete job.options;
      delete job.inspected;
      job.state = 'queued';
      job.error = '';
      change();
      pump();
    },
    remove(id) {
      const job = find(id);
      if (!['paused', 'failed', 'awaiting-browser', ...COMPLETE].includes(job.state) || active.has(job.id))
        return;
      stopCapture(job);
      const previous = jobs;
      jobs = jobs.filter(item => item !== job);
      try {
        save();
      } catch (error) {
        jobs = previous;
        throw error;
      }
      emit();
      pump();
    },
    /** Uninstalls a finished game from ShadowMount, then deletes everything the task put on its drive and forgets it. */
    async deleteFromDisk(id) {
      const job = find(id);
      if (!COMPLETE.includes(job.state)) return;
      storageIdentity(job);
      let uninstall = null;
      if (job.artifact.nextAction === 'shadowmount' && platform === 'ps5') {
        const game = await registered(job).catch(() => void 0);
        if (game !== null) {
          try {
            await shadowRequest('games/uninstall', {
              title_id: game?.title_id ?? job.installedTitleId ?? job.titleId
            });
          } catch (error) {
            const unknown = /HTTP 404/.test(error.message);
            if (game?.installed || (game === void 0 && !unknown))
              throw new Error(`ShadowMount did not uninstall it, so its files were kept: ${error.message}`);
            if (!unknown) uninstall = error;
          }
        }
      }
      for (const path of ownedPaths(job)) if (fs.exists(path)) fs.removeTree(path);
      const previous = jobs;
      jobs = jobs.filter(item => item !== job);
      try {
        save();
      } catch (error) {
        jobs = previous;
        throw error;
      }
      emit();
      if (uninstall)
        throw new Error(`Deleted from disk, but ShadowMount did not uninstall it: ${uninstall.message}`);
    },
    openBrowser(id) {
      const job = find(id);
      if (job.state !== 'awaiting-browser') return;
      const source = job.parts ? job.currentSource : job.release;
      if (browserCapture && sourceKind(source) === 'vikingfile') {
        if (captures.has(id)) return;
        if (captures.size || active.size)
          throw new Error(
            'Wait for the current queue tasks before opening Vikingfile, so its captured link can start immediately.'
          );
        const session = {cancel: cancellation(), task: null};
        captures.set(id, session);
        job.captureState = 'preparing';
        delete job.captureError;
        change();
        void captureBrowser(job, source, session);
        return;
      }
      if (!linking?.openURL(webURL(job.browserUrl).url))
        throw new Error('The browser could not open. Open this source on another device.');
      job.message = t('downloads.afterVerification');
      change();
    },
    cancelBrowserCapture(id, {manual = false} = {}) {
      const job = find(id);
      stopCapture(job);
      if (manual) job.captureState = 'failed';
      change();
      pump();
    },
    continueWithURL(id, url) {
      continueJob(find(id), url);
    },
    /** Marks finished images (all, or job `id`'s) ShadowMount has installed since as installed; false when none or it can't be asked. */
    syncInstalls,
    /** Frees the engine's one archive task, for the updater: a set extracting while it downloads extracts after its download instead. */
    async yieldArchives() {
      const streamed = [...active.values()].find(worker => worker.streamed)?.streamed;
      if (streamed) {
        streamed.task.cancel();
        await streamed.done;
      }
    },
    /** Whether the queue keeps the console awake: some download is queued or running. */
    get awake() {
      return awake;
    },
    /** Whether `background` has something to hand over: a queued or running download on a PS5. */
    get backgroundable() {
      return (
        platform === 'ps5' &&
        Boolean(downloads.background) &&
        !toBackground &&
        jobs.some(job => HANDOFF.includes(job.state) && !job.install && !job.routing)
      );
    },
    /**
     * Hands the queued and running downloads to the console's background downloader, which carries
     * them on while LocalDrive is closed (a game may run). True once it holds them: close the app now,
     * since it starts when LocalDrive has closed. Opening LocalDrive again takes them back.
     */
    async background() {
      if (toBackground) return true;
      if (captures.size || jobs.some(job => ['extracting', 'installing', 'pausing'].includes(job.state)))
        throw new Error(t('downloads.background.busy'));
      const chosen = jobs.filter(job => HANDOFF.includes(job.state) && !job.install && !job.routing);
      if (!chosen.length) throw new Error(t('downloads.background.none'));
      toBackground = true;
      const stopping = [];
      for (const job of chosen) {
        const worker = workerFor(job);
        if (worker) {
          job.state = 'pausing';
          worker.cancel?.cancel();
          worker.task?.cancel();
          stopping.push(worker.done);
        } else job.state = 'paused';
      }
      change();
      await Promise.all(stopping);
      // A download that finished or failed while stopping keeps that outcome.
      const stopped = chosen.filter(job => job.state === 'paused');
      const sharing = Math.min(MAX_PARALLEL_DOWNLOADS, stopped.length);
      const signal = cancellation().signal;
      const tasks = [],
        files = [],
        handed = [];
      for (const job of stopped) {
        // A task that cannot be prepared now (a source that needs the browser, a full drive) stays queued.
        try {
          if (!job.rootIdentity) job.rootIdentity = storageIdentity(job);
          else storageIdentity(job);
          fs.mkdir(job.artifact.directory, {recursive: true});
          const task = tasks.length;
          const mine = [];
          if (job.release.parts) {
            if (job.release.unavailableReason) throw new Error(job.release.unavailableReason);
            setParts(job);
            if (fs.diskUsage(job.root).free < setNeed(job) + MARGIN) throw new Error('Not enough space.');
            for (let index = 0; index < job.parts.length; index++) {
              const part = job.parts[index];
              if (part.completed && fs.exists(part.destination)) continue;
              if (!part.options) await resolvePart(job, index, signal);
              mine.push({file: files.length + mine.length, part: index});
            }
            files.push(
              ...mine.map(({part}) => ({...partOptions(job, job.parts[part], sharing), task}))
            );
            tasks.push({
              title: job.title,
              done: job.parts.reduce((sum, part) => sum + (part.completed ? part.written : 0), 0),
              total: job.total || 0
            });
          } else {
            job.downloadDestination || (job.downloadDestination = job.artifact.destination);
            if (!job.options) await resolveFile(job, signal);
            const held = Math.max(job.written, fs.stat(`${job.downloadDestination}.part`)?.size || 0);
            if (
              !fs.exists(job.downloadDestination) &&
              fs.diskUsage(job.root).free < stillNeeded({...job, written: held}) + MARGIN
            )
              throw new Error('Not enough space.');
            mine.push({file: files.length});
            files.push({...fileOptions(job, sharing), task});
            tasks.push({title: job.title, done: 0, total: job.total || 0});
          }
          if (mine.length) handed.push([job, mine]);
        } catch (error) {
          console.log(`[download-queue] ${job.title} stays in the queue: ${error.message}`);
        }
      }
      const giveBack = () => {
        toBackground = false;
        for (const job of stopped) job.state = 'queued';
        change();
        pump();
      };
      if (!handed.length) {
        giveBack();
        throw new Error(t('downloads.background.none'));
      }
      try {
        if (fs.exists(statusFile)) fs.remove(statusFile);
      } catch {}
      const placeholders = {title: '{title}', percent: '{percent}'};
      let result;
      try {
        result = downloads.background({
          files,
          tasks,
          status: statusFile,
          texts: {
            progress: t('downloads.background.progress', placeholders),
            complete: t('downloads.background.complete', placeholders),
            failed: t('downloads.background.failed', placeholders)
          }
        });
      } catch (error) {
        result = error.message;
      }
      if (result !== true) {
        giveBack();
        throw new Error(result);
      }
      // Tasks left out stay queued: the next launch starts them again.
      for (const job of stopped) job.state = 'queued';
      for (const [job, mine] of handed) {
        job.state = 'background';
        job.background = mine;
        job.bytesPerSecond = 0;
        job.error = '';
        job.message = '';
      }
      change();
      return true;
    },
    /** Discards the partial file and forgets the task; an active one is paused first. */
    cancel(id) {
      const job = find(id);
      if (COMPLETE.includes(job.state) || job.state === 'background') return;
      if (active.has(job.id)) {
        job.cancelling = true;
        this.pause(id);
        return;
      }
      stopCapture(job);
      forget(job);
      emit();
      pump();
    },
    async register(id) {
      const job = find(id);
      if (job.artifact.nextAction !== 'shadowmount' || !COMPLETE.includes(job.state)) return;
      try {
        if (await markInstalled([job]).catch(() => false)) return;
        const version = await shadowRequest('version');
        if (!version.capabilities?.includes('rescan'))
          throw new Error('This ShadowMount version has no rescan API. Use its automatic scan.');
        await shadowRequest('scan', {reset_attempts: false});
        job.message = t('downloads.installRequested');
        job.error = '';
      } catch (error) {
        job.error = error.message;
      }
      change();
    }
  };
}

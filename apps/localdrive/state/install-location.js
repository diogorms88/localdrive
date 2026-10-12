const SHADOWMOUNT = 'http://127.0.0.1:10101/api/v1/games/info';

const STORAGE_ROOT = /^(\/data|\/mnt\/(?:usb|ext)\d+)\//;

export async function locateInstall({http, fs, roots, title}) {
  const found = await registeredInstall({http, title});
  const install = found ? fromShadowMount(found) : inHomebrew({fs, roots, title});
  if (install.installDir && !fs.exists(`${install.installDir}/eboot.bin`))
    throw new Error(`LocalDrive install folder ${install.installDir} has no eboot.bin`);
  if (install.image && !fs.exists(install.image))
    throw new Error(`LocalDrive image ${install.image} is missing`);
  const path = install.installDir ?? install.image;
  const root = STORAGE_ROOT.exec(path)?.[1] ?? path.replace(/\/[^/]+\/[^/]+$/, '');
  return {...install, workDir: `${root}/localdrive-update`};
}

async function registeredInstall({http, title}) {
  try {
    const response = await http.request(SHADOWMOUNT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({title_id: title}),
      maxBytes: 64 * 1024
    });
    if (!response.ok) return null;
    const info = await response.json();
    return info?.path ? {path: info.path, type: info.source_type} : null;
  } catch {
    return null;
  }
}

function fromShadowMount({path, type}) {
  if (type === 'folder') return {installDir: path};
  if (type === 'image' && path.endsWith('.exfat')) return {image: path};
  throw new Error(`ShadowMount runs the app from ${path}, an install of type ${type}`);
}

const imagesIn = ({fs, dir: dir, title}) =>
  fs.exists(dir)
    ? fs
        .readDir(dir)
        .filter(
          entry => !entry.isDirectory && new RegExp(`^LocalDrive-${title}.*\\.exfat$`, 'i').test(entry.name)
        )
        .map(entry => ({image: `${dir}/${entry.name}`}))
    : [];

function inHomebrew({fs, roots, title}) {
  const found = roots().flatMap(root => [
    ...(fs.exists(`${root}/homebrew/${title}/eboot.bin`) ? [{installDir: `${root}/homebrew/${title}`}] : []),
    ...imagesIn({fs, dir: `${root}/homebrew`, title})
  ]);
  if (found.length !== 1)
    throw new Error(
      found.length
        ? `LocalDrive is installed twice: ${found.map(item => item.installDir ?? item.image).join(' and ')}`
        : 'LocalDrive install was not found'
    );
  return found[0];
}

export const KINDS = [
  {key: 'packages', icon: 'package', folders: ['downloads/packages']},
  {key: 'images', icon: 'disc', folders: ['homebrew']},
  {key: 'archives', icon: 'archive', folders: ['downloads/archives', 'downloads/sets']},
  {key: 'extracted', icon: 'folder', folders: ['downloads/extracted']},
  {key: 'other', icon: 'file', folders: ['downloads/files']}
];

const SIDECAR = /\.(?:complete|part|resume|tmp)$|^\.ps5-react-/;

const TITLE_ID = /\b(CUSA|PPSA)\d{5}\b/;

const DEPTH = 4;

const ENTRIES = 4e3;

export const isPackage = name => /\.f?pkg$/i.test(name);

function folderSize(fs, path, depth, budget) {
  let total = 0;
  let entries;
  try {
    entries = fs.readDir(path);
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (--budget.left < 0) return total;
    if (entry.isDirectory) {
      if (depth > 0) total += folderSize(fs, `${path}/${entry.name}`, depth - 1, budget);
    } else total += entry.size || 0;
  }
  return total;
}

export function scanDrive(fs, root) {
  const files = [];
  for (const kind of KINDS) {
    for (const folder of kind.folders) {
      let entries;
      try {
        entries = fs.readDir(`${root}/${folder}`);
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (SIDECAR.test(entry.name)) continue;
        const path = `${root}/${folder}/${entry.name}`;
        const titleId = TITLE_ID.exec(entry.name)?.[0] ?? null;
        files.push({
          kind: kind.key,
          path,
          name: entry.name,
          isDirectory: entry.isDirectory,
          modified: entry.modified,
          size: entry.isDirectory ? folderSize(fs, path, DEPTH, {left: ENTRIES}) : entry.size || 0,
          titleId,
          platform: titleId ? (titleId.startsWith('CUSA') ? 'ps4' : 'ps5') : null
        });
      }
    }
  }
  return files.sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));
}

export function totals(files) {
  const out = Object.fromEntries([
    ['all', {count: 0, size: 0}],
    ...KINDS.map(kind => [kind.key, {count: 0, size: 0}])
  ]);
  for (const file of files)
    for (const key of ['all', file.kind]) {
      out[key].count++;
      out[key].size += file.size;
    }
  return out;
}

export const deletionTargets = file =>
  file.isDirectory
    ? [file.path]
    : [file.path, ...['.complete', '.resume', '.part'].map(suffix => file.path + suffix)];

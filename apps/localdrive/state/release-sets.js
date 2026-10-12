import {archivePassword} from './archive-password.js';

function stableKey(value) {
  let first = 2166136261,
    second = 5381;
  for (let index = 0; index < value.length; index++) {
    first = Math.imul(first ^ value.charCodeAt(index), 16777619);
    second = Math.imul(second, 33) ^ value.charCodeAt(index);
  }
  return `${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
}

export function releaseSets(releases) {
  const groups = new Map();
  const output = [];
  for (const release of releases) {
    const match = /\bpart\s*(\d+)\b/i.exec(release.label || release.volume || '');
    if (!match) {
      output.push(release);
      continue;
    }
    const number = Number(match[1]);
    if (!Number.isSafeInteger(number) || number < 1 || number > 1024) {
      output.push({...release, unavailableReason: 'Invalid volume number.'});
      continue;
    }
    const label = (release.label || '').replace(/\bpart\s*\d+\b/i, '').trim();
    const record = release.record ?? release.id.replace(/-\d+$/, '');
    const key = `${record}/${release.provider}/${label.toLowerCase()}`;
    let group = groups.get(key);
    const first = group?.parts.find(part => part.number === 1);
    if (
      number === 1 &&
      first &&
      !first.sources.some(source => source.url === release.url && source.browserUrl === release.browserUrl)
    )
      group = void 0;
    if (!group) {
      group = {
        ...release,
        label,
        format: 'archive-set',
        parts: [],
        sizeBytes: null,
        sha256: void 0,
        volume: void 0
      };
      delete group.url;
      delete group.browserUrl;
      delete group.manifestUrl;
      groups.set(key, group);
      output.push(group);
    }
    let part = group.parts.find(part => part.number === number);
    if (!part) {
      part = {number: number, sources: []};
      group.parts.push(part);
    }
    if (!part.sources.some(source => source.url === release.url && source.browserUrl === release.browserUrl))
      if (part.sources.length)
        group.unavailableReason = 'Ambiguous duplicate volume. Choose another complete set.';
      else part.sources.push(release);
  }
  for (const group of output.filter(release => release.parts)) {
    group.parts.sort((a, b) => a.number - b.number);
    group.id =
      group.filename = `set-${stableKey(`${group.provider}/${group.label.toLowerCase()}/${group.parts[0].sources[0].id}`)}`;
    if (group.parts.some((part, index) => part.number !== index + 1))
      group.unavailableReason = 'This source has missing volumes. Choose another complete set.';
    try {
      const password = archivePassword(group);
      if (password !== void 0) group.archivePassword = password;
    } catch (error) {
      group.unavailableReason = error.message;
    }
    group.label = `${group.label} \xB7 ${group.parts.length} parts`;
  }
  return output;
}

const link = release => {
  const first = release.parts?.[0]?.sources[0] ?? release;
  return first.manifestUrl || first.url || first.browserUrl;
};

export const sameRelease = (saved, release) =>
  saved.id === release.id ||
  (Boolean(link(saved)) && link(saved) === link(release) && saved.parts?.length === release.parts?.length);

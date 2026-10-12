import {t} from '../i18n/core.js';
import {formatBytes} from '../state/size.js';
import {sourceKind} from '../state/download-sources.js';

const KIND = {
  ffpfsc: 'sources.kind.image',
  ffpfs: 'sources.kind.image',
  ffpkg: 'sources.kind.image',
  exfat: 'sources.kind.image',
  pkg: 'sources.kind.package',
  fpkg: 'sources.kind.package',
  'archive-set': 'sources.kind.archive'
};

function edition({label, provider}) {
  const text = (label || '').replace(/\s*·\s*\d+ parts$/, '').trim();
  const split = text.lastIndexOf(' - ');
  const host = provider
    .toLowerCase()
    .replace(/^www\./, '')
    .slice(0, 4);
  const edition2 =
    split >= 0 &&
    text
      .slice(split + 3)
      .toLowerCase()
      .startsWith(host)
      ? text.slice(0, split)
      : text;
  return provider.toLowerCase().startsWith(edition2.toLowerCase()) ? '' : edition2;
}

const GATED = new Set(['akirabox', 'vikingfile', 'buzzheavier']);

function access(release) {
  const first = release.parts?.[0]?.sources[0] ?? release;
  let kind;
  try {
    kind = sourceKind(first);
  } catch {
    return 'browser';
  }
  if (kind === 'direct' || kind === 'manifest') return 'direct';
  return kind === 'browser' || kind === 'datanodes' || kind === 'unavailable' || GATED.has(kind)
    ? 'browser'
    : 'page';
}

const SPEED = {
  'archive.org': 'sources.speed.archive',
  mediafire: 'sources.speed.mediafire',
  'overdrive cdn': 'sources.cdnFastest'
};

export const isLocalDriveCdn = provider => /^overdrive\s*cdn$/i.test(provider ?? '');

export function describeSource(release) {
  const parts = release.parts?.length;
  const detail = [
    edition(release),
    release.version ? `v${release.version.replace(/^v/i, '')}` : null,
    KIND[release.format] && t(KIND[release.format]),
    parts ? t('sources.parts', {count: parts}) : null
  ]
    .filter(Boolean)
    .join(' \xB7 ');
  const reach = access(release);
  const speed = SPEED[release.provider.toLowerCase()];
  return {
    name: release.provider.replace(/^www\./, ''),
    detail: speed ? [detail, t(speed)].filter(Boolean).join(' \xB7 ') : detail,
    size: release.sizeBytes ? formatBytes(release.sizeBytes) : null,
    group: release.unavailableReason ? 'unavailable' : reach,
    reason: release.unavailableReason ?? null
  };
}

const version = value => {
  const parts = (value || '').replace(/^v/i, '').split('.').map(Number);
  while (parts.length > 1 && parts.at(-1) === 0) parts.pop();
  return parts.join('.');
};

const sameSize = (a, b) => Boolean(a && b) && Math.abs(a - b) <= a * 0.01;

const partOf = ({label, filename}) => /\bpart\s*(\d+)\b/i.exec(`${label || ''} ${filename || ''}`)?.[1] ?? '';

const recordOf = release => (release.parts?.[0].sources[0] ?? release).record;

const sameFormat = (a, b) => a.format === b.format || a.format === 'binary' || b.format === 'binary';

function equivalent(a, b) {
  if (Boolean(a.parts) !== Boolean(b.parts) || a.parts?.length !== b.parts?.length || isDlc(a) !== isDlc(b))
    return false;
  if (a.sha256 && b.sha256) return a.sha256 === b.sha256;
  const [ea, eb] = [edition(a).toLowerCase(), edition(b).toLowerCase()];
  if (ea && eb && ea !== eb) return false;
  if (a.version && b.version && version(a.version) !== version(b.version)) return false;
  if (a.sizeBytes && b.sizeBytes && !sameSize(a.sizeBytes, b.sizeBytes)) return false;
  if (!a.parts && (!sameFormat(a, b) || partOf(a) !== partOf(b))) return false;
  return (
    sameSize(a.sizeBytes, b.sizeBytes) ||
    (Boolean(ea) && ea === eb && recordOf(a) !== void 0 && recordOf(a) === recordOf(b))
  );
}

const isDlc = ({label}) =>
  /\bDLCs?\b/i.test(label || '') &&
  !/\b(?:game|full)\b|\+\s*(?:all\s+)?DLCs?\b|\bwith\s+(?:all\s+)?DLCs?\b|\bincl/i.test(label);

const GROUP_RANK = {direct: 0, page: 1, browser: 2, unavailable: 3};

const HEALTH_RANK = {ok: 0, flaky: 2};

const isBackport = ({label}) => /\bback\s*port\b/i.test(label || '');

const hostRank = ({provider}) =>
  isLocalDriveCdn(provider)
    ? 0
    : provider.toLowerCase() === 'archive.org'
      ? 1
      : provider.toLowerCase() === 'mediafire'
        ? 2
        : 3;

const ranked = (release, index) => ({
  release,
  index,
  rank: [
    isDlc(release) ? 1 : 0,
    release.unavailableReason ? 1 : 0,
    hostRank(release),
    GROUP_RANK[describeSource(release).group],
    HEALTH_RANK[release.health] ?? 1,
    isBackport(release) ? 1 : 0,
    release.source === 'orbit' ? 0 : 1,
    release.requiresBrowser ? 1 : 0
  ]
});

const compare = (a, b) =>
  a.rank.reduce((order, value, i) => order || value - b.rank[i], 0) || a.index - b.index;

export function preferredRelease(releases) {
  return releases.map(ranked).sort(compare)[0]?.index ?? 0;
}

export function fallbacks(releases, selected) {
  return releases
    .map(ranked)
    .filter(
      ({release, index, rank}) =>
        index !== selected && rank[3] <= GROUP_RANK.page && equivalent(releases[selected], release)
    )
    .sort(compare)
    .map(({release}) => release);
}

export function sourceSections(releases) {
  const sections = ['direct', 'page', 'browser', 'dlc', 'unavailable'].map(group => ({group, items: []}));
  releases.forEach((release, index) => {
    const {group} = describeSource(release);
    const into = group !== 'unavailable' && isDlc(release) ? 'dlc' : group;
    sections.find(section => section.group === into).items.push({release, index});
  });
  const links = ({release}) => release.parts?.length ?? 1;
  sections[2].items.sort((a, b) => links(a) - links(b));
  return sections.filter(section => section.items.length);
}

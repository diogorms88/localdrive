import {t} from '../i18n/core.js';

export const STALE_PARTIAL = /partial file|checkpoint/i;

const TASK = /^\w+\.\w+ \/.*?: /;

export const cause = message => message.replace(TASK, '');

const SHORTFALL =
  /^Not enough space on (\S+): needs (.+?), (.+?) free(?:( after queued downloads)(?:: (.+))?)?$/;

const CASES = [
  // Before STALE_PARTIAL: a full disk fails "write partial file".
  [/no space left|ENOSPC/i, 'noSpace', 'freeThenResume'],
  [/partial files were deleted/i, 'partialDeleted', 'restart'],
  [STALE_PARTIAL, 'staleProgress', 'restart'],
  [/file changed since this partial/i, 'fileChanged', 'restart'],
  [/needs more memory to extract/i, 'archiveTooLarge', 'otherSource'],
  [/browser verification/i, 'needsBrowser', 'openSource'],
  [/interrupted/i, 'interrupted', 'resume'],
  [/space/i, 'noSpace', 'freeThenRetry'],
  [
    /storage (disconnected|changed|identity)|reconnect|original storage root/i,
    'driveDisconnected',
    'reconnect'
  ],
  [/HTTP (404|410|403|401)\b/, 'linkGone', 'otherSource'],
  [/HTTP (429|5\d\d)\b/, 'serverBusy', 'retryLater'],
  [
    /resolve|connect|timeout|timed out|unreachable|receiving data|SSL|network/i,
    'noConnection',
    'checkConnection'
  ],
  [/SHA|hash|verification|mismatch|changed the resource|truncated/i, 'damaged', 'restartFromZero']
];

const PLAIN = /ShadowMount|from another source holds this name/;

export function explainError(error) {
  const message = cause(error);
  if (PLAIN.test(message)) return {title: message, action: ''};
  const shortfall = SHORTFALL.exec(message);
  if (shortfall) {
    const [, root, need, free, queued, holders] = shortfall;
    const action = t('errors.action.freeOrOtherDrive');
    return {
      title: t('errors.noSpaceOn', {root: root, need, free, queued: queued ? 'yes' : 'no'}),
      action: holders ? `${action} ${holders}` : action
    };
  }
  const known = CASES.find(([pattern]) => pattern.test(message));
  if (!known) return {title: message, action: t('errors.action.retryOrOtherSource')};
  return {title: t(`errors.${known[1]}`), action: t(`errors.action.${known[2]}`)};
}

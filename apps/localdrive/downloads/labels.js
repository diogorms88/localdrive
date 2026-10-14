import {t} from '../i18n/core.js';

const LABELED = new Set([
  'awaiting-browser',
  'background',
  'queued',
  'resolving',
  'connecting',
  'downloading',
  'verifying',
  'pausing',
  'extracting',
  'extracted',
  'paused',
  'failed',
  'file-downloaded',
  'downloaded',
  'installer-required',
  'installing',
  'installed',
  'extraction-required'
]);

export const WAITING = ['resolving', 'connecting', 'verifying', 'pausing', 'background'];

export const hasStateLabel = state => LABELED.has(state);

export const stateLabel = state => t(`downloadState.${state}`);

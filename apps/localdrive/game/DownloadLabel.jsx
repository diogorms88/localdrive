import {View, Text} from '@ps5-react/core';
import {t} from '../i18n/core.js';
import {useT} from '../i18n/index.js';
import {formatSize} from '../state/size.js';
import {COMPLETE, BUSY} from '../state/download-queue.js';
import {colors} from '../ui/colors.js';
import {Icon} from '../ui/Icon.jsx';
import {stateLabel, hasStateLabel} from '../downloads/labels.js';
import '../assets/Inter-Regular.ttf';

export const DISABLED = ['unavailable', 'no-space'];

const CONTENT = {
  idle: {icon: 'download', text: 'download.button.idle'},
  unavailable: {icon: 'download', text: 'download.button.unavailable'},
  'awaiting-browser': {icon: 'external', text: 'download.button.awaiting-browser'},
  'no-space': {icon: 'download', text: 'download.button.no-space'},
  queued: {icon: 'pause', text: 'download.button.queued'},
  resolving: {icon: 'pause', text: 'download.button.pause'},
  connecting: {icon: 'pause', text: 'download.button.pause'},
  downloading: {icon: 'pause', text: 'download.button.pause'},
  verifying: {icon: 'pause', text: 'download.button.verifying'},
  pausing: {icon: 'pause', text: 'download.button.pausing'},
  extracting: {icon: 'pause', text: 'download.button.extracting'},
  extracted: {icon: 'circleCheck', text: 'download.button.extracted'},
  paused: {icon: 'play', text: 'download.button.paused'},
  failed: {icon: 'download', text: 'download.button.failed'},
  // A failure whose saved progress no longer matches the file: only starting over recovers it.
  stale: {icon: 'download', text: 'download.button.stale'},
  'file-downloaded': {icon: 'circleCheck', text: 'download.button.file-downloaded'},
  downloaded: {icon: 'circleCheck', text: 'download.button.downloaded'},
  'installer-required': {icon: 'download', text: 'download.button.installer-required'},
  installing: {icon: 'download', text: 'download.button.installing'},
  installed: {icon: 'circleCheck', text: 'download.button.installed'},
  'extraction-required': {icon: 'circleCheck', text: 'download.button.extraction-required'}
};

const INK = {dark: {color: '#0d0d0f'}, light: {color: '#f2f2f3'}, disabled: {color: '#a3a3ab'}};

export function statusLine(status, progress, sizeGb) {
  if (status === 'unavailable') return [t('download.status.unavailable'), null];
  if (status === 'awaiting-browser') return [t('download.status.awaitingLink'), null];
  if (status === 'no-space')
    return [t('download.status.noSpace'), sizeGb && t('download.status.needs', {size: formatSize(sizeGb)})];
  if (COMPLETE.includes(status)) return [stateLabel(status), sizeGb && formatSize(sizeGb)];
  const of =
    sizeGb && t('download.status.progress', {done: formatSize(sizeGb * progress), total: formatSize(sizeGb)});
  if (hasStateLabel(status)) return [stateLabel(status), of];
  return [t('download.status.ready'), sizeGb && formatSize(sizeGb)];
}

export function DownloadLabel({status, amount, dark}) {
  const t = useT();
  const {icon, text} = CONTENT[status];
  const inProgress = BUSY.includes(status) || status === 'paused';
  const disabled = DISABLED.includes(status);
  const ink = dark ? INK.dark : disabled ? INK.disabled : INK.light;
  return (
    <View
      style={[
        {height: 72, width: 408, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 30},
        inProgress ? {justifyContent: 'space-between'} : {justifyContent: 'center'}
      ]}
    >
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <Icon name={icon} size={16} color={dark ? colors.accentFg : disabled ? colors.muted : colors.fg} />
        <Text style={[{fontFamily: 'Inter-Regular', fontSize: 23}, ink]}>{t(text)}</Text>
      </View>
      {inProgress && <Text style={[{fontFamily: 'Inter-Regular', fontSize: 23}, ink]}>{amount}</Text>}
    </View>
  );
}

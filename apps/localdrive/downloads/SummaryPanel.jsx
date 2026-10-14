import {View, Text, FileSystem, ScrollView} from '@ps5-react/core';
import {formatNumber} from '../i18n/core.js';
import {useT} from '../i18n/index.js';
import {formatBytes} from '../state/size.js';
import {downloadQueue, driveName, storageRoots} from '../state/downloads.js';
import {useActivity} from './useQueue.js';
import {ProgressBar} from '../ui/ProgressBar.jsx';
import {Button} from '../ui/Button.jsx';
import {formatSpeed, formatDuration} from './format.js';
import '../assets/Inter-Regular.ttf';

const WIDTH = 280;

const INSET = 8;

const INNER = {width: WIDTH - 2 * INSET};

export const PANEL_KEY = 'downloads:panel';

function awake() {
  try {
    return downloadQueue().awake;
  } catch {
    return false;
  }
}

function Block({title, children}) {
  return (
    <View style={{gap: 18, borderBottomWidth: 2, borderColor: '#2a2a2f', paddingBottom: 30}}>
      <Text
        style={{
          paddingHorizontal: 12,
          fontFamily: 'Inter-Regular',
          fontSize: 20,
          fontWeight: 600,
          color: '#8a8a94',
          letterSpacing: 1
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Figure({label, value}) {
  return (
    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
        {label}
      </Text>
      <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', lineHeight: 30}}>
        {value}
      </Text>
    </View>
  );
}

function Activity({onFocus}) {
  const t = useT();
  const {active: active, speed, left, connections, peak, low, mean} = useActivity();
  return (
    <Block title={t('downloads.panel.activity')}>
      <View
        focusable
        focusKey={PANEL_KEY}
        onFocus={onFocus}
        style={_state => [
          {gap: 18, borderRadius: 12, padding: 12},
          _state.focused ? {backgroundColor: '#212125'} : null
        ]}
      >
        <Text
          style={{
            fontFamily: 'Inter-Regular',
            fontSize: 45,
            fontWeight: 600,
            color: '#f2f2f3',
            lineHeight: 54,
            letterSpacing: -1.13
          }}
        >
          {active ? formatSpeed(speed) : t('downloads.panel.idle')}
        </Text>
        <View style={{gap: 9}}>
          <Figure
            label={t('downloads.panel.downloading')}
            value={active ? t('catalog.gameCount', {count: active}) : t('downloads.panel.none')}
          />
          <Figure
            label={t('downloads.panel.timeLeft')}
            value={active && speed && left ? formatDuration(left / speed) : '\u2014'}
          />
          <Figure label={t('downloads.panel.peak')} value={peak ? formatSpeed(peak) : '\u2014'} />
          <Figure label={t('downloads.panel.low')} value={low ? formatSpeed(low) : '\u2014'} />
          <Figure label={t('downloads.panel.average')} value={mean ? formatSpeed(mean) : '\u2014'} />
          <Figure
            label={t('downloads.panel.connections')}
            value={connections ? formatNumber(connections) : '\u2014'}
          />
        </View>
        <Text style={[{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}, INNER]}>
          {awake() ? t('downloads.panel.awake') : ' '}
        </Text>
      </View>
    </Block>
  );
}

function Drive({root: root, focusKey, onFocus}) {
  const t = useT();
  let usage = null;
  try {
    usage = FileSystem.diskUsage(root);
  } catch {}
  return (
    <View
      focusable
      focusKey={focusKey}
      onFocus={onFocus}
      style={_state => [
        {gap: 12, borderRadius: 12, padding: 12},
        _state.focused ? {backgroundColor: '#212125'} : null
      ]}
    >
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3', lineHeight: 30}}>
          {driveName(root)}
        </Text>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
          {usage ? t('download.free', {size: formatBytes(usage.free)}) : t('downloads.panel.unavailable')}
        </Text>
      </View>
      <ProgressBar
        fraction={usage?.total ? 1 - usage.free / usage.total : 0}
        width={INNER.width}
        active={false}
      />
      {usage ? (
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
          {t('downloads.panel.used', {
            used: formatBytes(usage.total - usage.free),
            total: formatBytes(usage.total)
          })}
        </Text>
      ) : null}
    </View>
  );
}

// Closes LocalDrive and lets the console's background downloader carry the queue on while a game plays.
function Background({preparing, onPress, onFocus}) {
  const t = useT();
  return (
    <Block title={t('downloads.background.title')}>
      <View style={{gap: 18, paddingHorizontal: 12}}>
        <Button
          variant="primary"
          icon="download"
          label={t(preparing ? 'downloads.background.preparing' : 'downloads.background.button')}
          onFocus={onFocus}
          onPress={onPress}
        />
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
          {t('downloads.background.note')}
        </Text>
      </View>
    </Block>
  );
}

export function SummaryPanel({error: error, background, onFocus}) {
  const t = useT();
  return (
    <ScrollView style={{width: 420}}>
      <View style={{gap: 30, paddingBottom: 36}}>
        {background ? <Background {...background} onFocus={onFocus} /> : null}
        {error ? null : <Activity onFocus={onFocus} />}
        <Block title={t('downloads.panel.storage')}>
          {storageRoots().map((root, index) => (
            <Drive key={root} root={root} onFocus={onFocus} focusKey={error && !index ? PANEL_KEY : void 0} />
          ))}
        </Block>
        <View
          focusable
          onFocus={onFocus}
          style={_state => [
            {gap: 12, borderRadius: 12, padding: 12},
            _state.focused ? {backgroundColor: '#212125'} : null
          ]}
        >
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 20,
              fontWeight: 600,
              color: '#8a8a94',
              letterSpacing: 1
            }}
          >
            {t('downloads.panel.installing')}
          </Text>
          <Text
            style={[{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}, INNER]}
          >
            {t('downloads.panel.installNote')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

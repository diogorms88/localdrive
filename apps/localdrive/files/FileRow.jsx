import {memo} from 'react';
import {View, useIsFocused, Text} from '@ps5-react/core';
import {formatPercent} from '../i18n/core.js';
import {useT} from '../i18n/index.js';
import {formatBytes} from '../state/size.js';
import {colors} from '../ui/colors.js';
import {px} from '../ui/scale.js';
import {Cover} from '../ui/Cover.jsx';
import {FocusRing} from '../ui/FocusRing.jsx';
import {PlatformBadge} from '../ui/PlatformBadge.jsx';
import {Icon} from '../ui/Icon.jsx';
import {ButtonGlyph} from '../ui/ButtonHints.jsx';
import {ProgressBar} from '../ui/ProgressBar.jsx';
import {KINDS, isPackage} from './scan.js';
import '../assets/Inter-Regular.ttf';

const COVER = {width: px(36), height: px(48), borderRadius: px(4)};

const TEXT_WIDTH = 560;

const ICON_OF = Object.fromEntries(KINDS.map(kind => [kind.key, kind.icon]));

function typeOf(file) {
  if (isPackage(file.name)) return 'files.type.package';
  if (file.kind === 'images') return 'files.type.image';
  if (file.kind === 'archives') return 'files.type.archive';
  return file.isDirectory ? 'files.type.folder' : 'files.type.file';
}

function Thumb({file, dark}) {
  if (file.game?.art?.cover) return <Cover game={file.game} label={false} style={COVER} />;
  return (
    <View
      style={[
        {
          height: 72,
          width: 54,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          backgroundColor: '#212125'
        },
        dark ? {backgroundColor: '#dcdce0'} : null
      ]}
    >
      <Icon name={ICON_OF[file.kind]} size={18} color={dark ? colors.canvas : colors.muted} />
    </View>
  );
}

function detail(t, file, shadowMount) {
  const parts = [t(typeOf(file))];
  if (file.titleId) parts.push(file.titleId);
  if (file.installed) parts.push(t('files.installed'));
  else if (file.kind === 'images')
    parts.push(t(shadowMount ? 'files.byShadowMount' : 'files.waitingShadowMount'));
  else if (isPackage(file.name)) parts.push(t('files.notInstalled'));
  return parts.join(' \xB7 ');
}

function Face({file, armed, installing, shadowMount}) {
  const t = useT();
  const focused = useIsFocused();
  const busy = installing && !installing.done && !installing.error;
  return (
    <>
      {armed ? null : <FocusRing />}
      <Thumb file={file} dark={armed} />
      <View style={[{gap: 9}, {width: px(TEXT_WIDTH)}]}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
          {file.platform ? <PlatformBadge platforms={[file.platform]} /> : null}
          <Text
            style={[
              armed
                ? {
                    fontFamily: 'Inter-Regular',
                    fontSize: 23,
                    fontWeight: 600,
                    color: '#000000',
                    numberOfLines: 1,
                    ellipsizeMode: 'tail'
                  }
                : {
                    fontFamily: 'Inter-Regular',
                    fontSize: 23,
                    fontWeight: 600,
                    color: '#f2f2f3',
                    numberOfLines: 1,
                    ellipsizeMode: 'tail'
                  },
              {width: px(file.platform ? TEXT_WIDTH - 54 : TEXT_WIDTH)}
            ]}
          >
            {file.game?.title ?? file.name}
          </Text>
        </View>
        {armed ? (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
            <ButtonGlyph button="square" size={14} />
            <Text style={{fontFamily: 'Inter-Regular', fontSize: 20, fontWeight: 600, color: '#000000'}}>
              {t('files.confirmDelete', {size: formatBytes(file.size)})}
            </Text>
          </View>
        ) : busy ? (
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 18}}>
            <ProgressBar fraction={installing.fraction} width={240} active />
            <Text style={{fontFamily: 'Inter-Regular', fontSize: 20, color: '#f2f2f3'}}>
              {t('files.installing', {percent: formatPercent(Math.round(installing.fraction * 100))})}
            </Text>
          </View>
        ) : (
          <Text
            style={[
              installing?.error
                ? {
                    fontFamily: 'Inter-Regular',
                    fontSize: 20,
                    color: '#f2f2f3',
                    numberOfLines: 1,
                    ellipsizeMode: 'tail'
                  }
                : focused
                  ? {
                      fontFamily: 'Inter-Regular',
                      fontSize: 20,
                      color: '#a3a3ab',
                      numberOfLines: 1,
                      ellipsizeMode: 'tail'
                    }
                  : {
                      fontFamily: 'Inter-Regular',
                      fontSize: 20,
                      color: '#8a8a94',
                      numberOfLines: 1,
                      ellipsizeMode: 'tail'
                    },
              {width: px(TEXT_WIDTH)}
            ]}
          >
            {installing?.error
              ? t('files.installFailed')
              : installing?.done
                ? t('files.installDone')
                : file.game
                  ? `${file.name} \xB7 ${detail(t, file, shadowMount)}`
                  : detail(t, file, shadowMount)}
          </Text>
        )}
      </View>
      <View style={{flex: 1}} />
      <Text
        style={
          armed
            ? {fontFamily: 'Inter-Regular', fontSize: 23, fontWeight: 600, color: '#000000'}
            : {fontFamily: 'Inter-Regular', fontSize: 23, color: '#f2f2f3'}
        }
      >
        {formatBytes(file.size)}
      </Text>
    </>
  );
}

export const FileRow = memo(function FileRow({
  file,
  armed,
  installing,
  shadowMount,
  autoFocus,
  focusKey,
  onPress,
  onFocus
}) {
  return (
    <View
      focusKey={focusKey}
      autoFocus={autoFocus}
      onPress={onPress}
      onFocus={onFocus}
      style={_state =>
        armed
          ? {
              height: 102,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 24,
              borderRadius: 12,
              backgroundColor: '#f2f2f3',
              paddingHorizontal: 24
            }
          : [
              {
                height: 102,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 24,
                borderRadius: 12,
                paddingHorizontal: 24
              },
              _state.focused ? {backgroundColor: '#212125'} : null
            ]
      }
    >
      <Face file={file} armed={armed} installing={installing} shadowMount={shadowMount} />
    </View>
  );
});

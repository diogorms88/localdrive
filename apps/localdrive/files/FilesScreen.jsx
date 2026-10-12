import {useEffect, useMemo, useState} from 'react';
import {useIsFocused, View, Text, FileSystem, FocusScope, ScrollView} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {formatBytes} from '../state/size.js';
import {storageRoots, driveName} from '../state/downloads.js';
import {colors} from '../ui/colors.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import {useNavActions} from '../state/nav.jsx';
import {ButtonHints} from '../ui/ButtonHints.jsx';
import {HINT} from '../ui/Legend.jsx';
import {totals, isPackage, KINDS} from './scan.js';
import {FileRow} from './FileRow.jsx';
import {StorageBar} from './StorageBar.jsx';
import {useFiles} from './useFiles.js';
import '../assets/Inter-Regular.ttf';

const LIST_WIDTH = 904;

const ARM_MS = 4e3;

const RAIL_HINTS = [HINT.select, HINT.back];

const PACKAGE_HINTS = [
  {button: 'cross', label: 'hints.install'},
  {button: 'square', label: 'hints.delete'},
  HINT.back
];

const FILE_HINTS = [{button: 'square', label: 'hints.delete'}, HINT.back];

const ARMED_HINTS = [{button: 'square', label: 'hints.confirmDelete'}, HINT.back];

const fileKey = path => `files:${path}`;

function RailFace({icon, label, detail: detail, current}) {
  const focused = useIsFocused();
  return (
    <>
      <FocusRing />
      <Icon name={icon} size={18} color={current || focused ? colors.fg : colors.subtle} />
      <View style={{flex: 1, gap: 3}}>
        <Text
          style={
            current
              ? {
                  fontFamily: 'Inter-Regular',
                  fontSize: 23,
                  fontWeight: 600,
                  color: '#f2f2f3',
                  numberOfLines: 1,
                  ellipsizeMode: 'tail'
                }
              : {
                  fontFamily: 'Inter-Regular',
                  fontSize: 23,
                  color: '#a3a3ab',
                  numberOfLines: 1,
                  ellipsizeMode: 'tail'
                }
          }
        >
          {label}
        </Text>
        {detail ? (
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 20,
              color: '#8a8a94',
              numberOfLines: 1,
              ellipsizeMode: 'tail'
            }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      {current ? (
        <View style={{height: 9, width: 9, borderRadius: 14999, backgroundColor: '#f2f2f3'}} />
      ) : null}
    </>
  );
}

function RailItem({onPress, focusKey, autoFocus, onFocus, ...face}) {
  return (
    <View
      focusKey={focusKey}
      autoFocus={autoFocus}
      onPress={onPress}
      onFocus={onFocus}
      style={_state =>
        face.current
          ? {
              height: 84,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 18,
              borderRadius: 12,
              backgroundColor: '#17171a',
              paddingHorizontal: 18
            }
          : [
              {
                height: 84,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 18,
                borderRadius: 12,
                paddingHorizontal: 18
              },
              _state.focused ? {backgroundColor: '#212125'} : null
            ]
      }
    >
      <RailFace {...face} />
    </View>
  );
}

function Label({children}) {
  return (
    <Text
      style={{
        paddingHorizontal: 18,
        paddingBottom: 6,
        fontFamily: 'Inter-Regular',
        fontSize: 20,
        fontWeight: 600,
        color: '#8a8a94',
        letterSpacing: 1
      }}
    >
      {children}
    </Text>
  );
}

function ShadowMountStatus({up}) {
  const t = useT();
  return (
    <View style={{flexDirection: 'row', gap: 18, paddingHorizontal: 18, paddingTop: 6}}>
      <View
        style={
          up
            ? {marginTop: 9, height: 12, width: 12, borderRadius: 14999, backgroundColor: '#f2f2f3'}
            : {
                marginTop: 9,
                height: 12,
                width: 12,
                borderRadius: 14999,
                borderWidth: 2,
                borderColor: '#8a8a94'
              }
        }
      />
      <View style={{flex: 1, gap: 3}}>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 20, color: '#a3a3ab'}}>
          {t(up ? 'files.shadowMountOn' : 'files.shadowMountOff')}
        </Text>
        {up ? null : (
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 20,
              color: '#8a8a94',
              numberOfLines: 3,
              ellipsizeMode: 'tail'
            }}
          >
            {t('shadowMount.offAction')}
          </Text>
        )}
      </View>
    </View>
  );
}

function Empty() {
  const t = useT();
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 96}}>
      <Icon name="folder" size={32} color={colors.subtle} />
      <Text
        style={{
          marginTop: 24,
          fontFamily: 'Inter-Regular',
          fontSize: 27,
          fontWeight: 600,
          color: '#f2f2f3',
          lineHeight: 42
        }}
      >
        {t('files.empty')}
      </Text>
      <Text
        style={{
          marginTop: 6,
          width: 660,
          textAlign: 'center',
          fontFamily: 'Inter-Regular',
          fontSize: 24,
          color: '#a3a3ab',
          numberOfLines: 2,
          ellipsizeMode: 'tail',
          lineHeight: 36
        }}
      >
        {t('files.emptyDetail')}
      </Text>
    </View>
  );
}

export function FilesScreen({onBack}) {
  const t = useT();
  const [roots] = useState(storageRoots);
  const [drive, setDrive] = useState(0);
  const [kind, setKind] = useState('all');
  const root = roots[drive];
  const {files, installing, install, remove, shadowMount} = useFiles(root);
  const sums = useMemo(() => totals(files), [files]);
  const shown = kind === 'all' ? files : files.filter(file => file.kind === kind);
  const usage = useMemo(() => {
    try {
      return FileSystem.diskUsage(root);
    } catch {
      return null;
    }
  }, [root, files]);
  const [focused, setFocused] = useState(null);
  const [armed, setArmed] = useState(null);
  const [notice, setNotice] = useState('');
  const {focusLater} = useNavActions();
  useEffect(() => {
    if (!armed) return void 0;
    const timer = setTimeout(() => setArmed(null), ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);
  const focusFile = file => {
    setFocused(file);
    if (armed && armed !== file.path) setArmed(null);
  };
  const onAction = action => {
    if (action !== 'square' || !focused) return false;
    if (armed !== focused.path) {
      setArmed(focused.path);
      return true;
    }
    setArmed(null);
    const index = shown.indexOf(focused);
    const next = shown[index + 1] ?? shown[index - 1];
    try {
      remove(focused);
      focusLater(next ? fileKey(next.path) : `files-kind:${kind}`);
      setNotice(t('files.deleted', {name: focused.game?.title ?? focused.name}));
    } catch {
      setNotice(t('files.deleteFailed'));
    }
    return true;
  };
  const back = () => {
    if (armed) setArmed(null);
    else onBack();
    return true;
  };
  const hints = !focused
    ? RAIL_HINTS
    : armed === focused.path
      ? ARMED_HINTS
      : isPackage(focused.name)
        ? PACKAGE_HINTS
        : FILE_HINTS;
  const free = usage ? t('files.free', {free: formatBytes(usage.free), total: formatBytes(usage.total)}) : '';
  return (
    <FocusScope autoFocus onBack={back} onAction={onAction}>
      <View style={{flex: 1}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            paddingHorizontal: 48,
            paddingTop: 48,
            paddingBottom: 36
          }}
        >
          <Text
            style={{
              width: 1140,
              fontFamily: 'Inter-Regular',
              fontSize: 30,
              fontWeight: 600,
              color: '#f2f2f3',
              numberOfLines: 1,
              ellipsizeMode: 'tail',
              lineHeight: 42,
              letterSpacing: -0.75
            }}
          >
            {t('files.title')}
            <Text style={{fontWeight: 400, color: '#8a8a94'}}>{`  ${t('files.summary', {
              count: sums.all.count,
              size: formatBytes(sums.all.size)
            })}`}</Text>
          </Text>
          <Text
            style={{
              width: 600,
              textAlign: 'end',
              fontFamily: 'Inter-Regular',
              fontSize: 21,
              color: '#a3a3ab',
              numberOfLines: 1,
              ellipsizeMode: 'tail',
              lineHeight: 30
            }}
          >
            {notice}
          </Text>
        </View>
        <View style={{flex: 1, flexDirection: 'row', gap: 48, paddingHorizontal: 48}}>
          <View style={{width: 372, gap: 6}}>
            <Label>{t('files.drives')}</Label>
            {roots.map((path, index) => (
              <RailItem
                key={path}
                icon="hardDrive"
                label={driveName(path)}
                current={index === drive}
                detail={index === drive ? free : null}
                focusKey={`files-drive:${path}`}
                onFocus={() => setFocused(null)}
                onPress={() => {
                  setDrive(index);
                  setArmed(null);
                }}
              />
            ))}
            <ShadowMountStatus up={shadowMount} />
            <View style={{height: 30}} />
            <Label>{t('files.kinds')}</Label>
            {[{key: 'all', icon: 'layers'}, ...KINDS].map(item => (
              <RailItem
                key={item.key}
                icon={item.icon}
                label={t(`files.kind.${item.key}`)}
                current={kind === item.key}
                detail={sums[item.key].count ? formatBytes(sums[item.key].size) : null}
                focusKey={`files-kind:${item.key}`}
                onFocus={() => setFocused(null)}
                onPress={() => setKind(item.key)}
                autoFocus={!files.length && item.key === 'all'}
              />
            ))}
          </View>
          <View style={{flex: 1, gap: 36}}>
            <StorageBar
              usage={usage}
              sums={sums}
              focus={focused?.kind ?? (kind === 'all' ? null : kind)}
              width={LIST_WIDTH}
            />
            {shown.length ? (
              <ScrollView style={{flex: 1}}>
                <View style={{gap: 6, paddingBottom: 48}}>
                  {shown.map((file, index) => (
                    <FileRow
                      key={file.path}
                      file={file}
                      focusKey={fileKey(file.path)}
                      autoFocus={index === 0}
                      armed={armed === file.path}
                      installing={installing?.path === file.path ? installing : null}
                      shadowMount={shadowMount}
                      onFocus={() => focusFile(file)}
                      onPress={isPackage(file.name) ? () => install(file) : void 0}
                    />
                  ))}
                </View>
              </ScrollView>
            ) : (
              <Empty />
            )}
          </View>
        </View>
        <ButtonHints hints={hints} />
      </View>
    </FocusScope>
  );
}

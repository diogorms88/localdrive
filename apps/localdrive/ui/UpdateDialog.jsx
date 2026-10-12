import {useEffect, useState} from 'react';
import {BackHandler, FocusScope, View, Image, Text} from '@ps5-react/core';
import {formatPercent} from '../i18n/core.js';
import {useT} from '../i18n/index.js';
import {formatBytes} from '../state/size.js';
import {VERSION} from '../version.js';
import {ImageReplaceError} from '../state/updater.js';
import {useAvailableUpdate, installUpdate} from '../state/update.js';
import {px} from './scale.js';
import {Button} from './Button.jsx';
import {ProgressBar} from './ProgressBar.jsx';
import {ShimmerText} from './ShimmerText.jsx';
import asciiDial from '../assets/ascii-dial.png';
import '../assets/Inter-Regular.ttf';
import '../assets/JetBrainsMono-Regular.ttf';

const CLOSE_DELAY_MS = 2e3;

const REOPEN_DELAY_MS = 11e3;

const DIAL = 324;

const STATUS = {fontFamily: 'JetBrainsMono-Regular', fontSize: 23};

export function UpdateDialog() {
  const t = useT();
  const update = useAvailableUpdate();
  const [dismissed, setDismissed] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const state = progress?.state;
  const relaunch = progress?.relaunch;
  useEffect(() => {
    if (state !== 'done') return;
    const id = setTimeout(() => BackHandler.exitApp({relaunch}), relaunch ? CLOSE_DELAY_MS : REOPEN_DELAY_MS);
    return () => clearTimeout(id);
  }, [state, relaunch]);
  if (!update || dismissed) return null;
  const install = async () => {
    setError(null);
    setProgress({state: 'downloading', written: 0, total: update.size});
    try {
      const {relaunch: relaunch} = await installUpdate(update, setProgress);
      setProgress({state: 'done', relaunch: relaunch});
    } catch (failure) {
      setProgress(null);
      setError(
        failure instanceof ImageReplaceError
          ? [t('update.replaceFailed'), t('update.replaceByHand')]
          : [failure.message]
      );
    }
  };
  const close = () => {
    if (!progress) setDismissed(true);
    return true;
  };
  const fraction =
    state === 'downloading' && progress.total ? progress.written / progress.total : state ? 1 : 0;
  const installed = update.installed;
  const paragraphs = installed
    ? [
        t('update.reopenInstalled', {version: update.version}),
        ...(update.stuck ? [t('update.restartConsole')] : [])
      ]
    : (error ?? [update.notes || t('update.detail')]);
  const label = error
    ? t('update.failed')
    : state === 'done' || installed
      ? t('update.done')
      : state
        ? t('update.updating')
        : t('update.available');
  const status =
    state === 'downloading'
      ? `${formatPercent(Math.round(fraction * 100)).replace(/\u202f/g, '\xA0')}  \xB7  ${formatBytes(progress.written)} / ${formatBytes(progress.total)}`
      : state === 'installing'
        ? t('update.installing')
        : state === 'done'
          ? t(relaunch ? 'update.restarting' : 'update.reopen')
          : null;
  return (
    // A modal: the page's actions stop here, and nothing leaves it while it installs.
    <FocusScope trap autoFocus onBack={close} onAction={() => true}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000e6'
        }}
      >
        <View
          style={{
            width: 1410,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 72,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: '#2a2a2f',
            backgroundColor: '#000000',
            paddingHorizontal: 72,
            paddingVertical: 60
          }}
        >
          <View style={{gap: 24}}>
            <Image source={asciiDial} resizeMode="contain" style={{width: px(DIAL), height: px(DIAL)}} />
            {state ? <ProgressBar fraction={fraction} width={DIAL} active /> : null}
          </View>
          <View style={{flex: 1, gap: 36}}>
            <View style={{gap: 18}}>
              <Text
                style={{
                  fontFamily: 'JetBrainsMono-Regular',
                  fontSize: 20,
                  color: '#8a8a94',
                  letterSpacing: 3
                }}
              >
                {label}
              </Text>
              <Text
                style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 66,
                  fontWeight: 600,
                  color: '#f2f2f3',
                  letterSpacing: -1.65
                }}
              >{`v${update.version}`}</Text>
              <Text
                style={{fontFamily: 'JetBrainsMono-Regular', fontSize: 23, color: '#a3a3ab'}}
              >{`v${VERSION}  \u2192  v${update.version}`}</Text>
            </View>
            {state ? null : (
              <View style={{width: 690, gap: 12}}>
                {paragraphs.map(text => (
                  <Text
                    key={text}
                    style={{
                      fontFamily: 'Inter-Regular',
                      fontSize: 24,
                      color: '#a3a3ab',
                      numberOfLines: 4,
                      ellipsizeMode: 'tail',
                      lineHeight: 36
                    }}
                  >
                    {text}
                  </Text>
                ))}
              </View>
            )}
            {status ? (
              <View focusable>
                <ShimmerText textStyle={STATUS}>{status}</ShimmerText>
              </View>
            ) : installed ? (
              <View style={{flexDirection: 'row', gap: 18}}>
                <Button
                  variant="primary"
                  size="lg"
                  label={t('update.quit')}
                  autoFocus
                  onPress={() => BackHandler.exitApp({relaunch: false})}
                />
                <Button variant="outline" size="lg" label={t('update.later')} onPress={close} />
              </View>
            ) : (
              <View style={{flexDirection: 'row', gap: 18}}>
                <Button
                  variant="primary"
                  size="lg"
                  icon="download"
                  label={t(error ? 'update.retry' : 'update.install')}
                  autoFocus
                  onPress={install}
                />
                <Button
                  variant="outline"
                  size="lg"
                  label={t(error ? 'update.close' : 'update.later')}
                  onPress={close}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </FocusScope>
  );
}

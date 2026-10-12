import {FocusScope, View, Text} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {downloadQueue} from '../state/downloads.js';
import {colors} from '../ui/colors.js';
import {Button} from '../ui/Button.jsx';
import {ShimmerText} from '../ui/ShimmerText.jsx';
import {URLDialog} from './URLDialog.jsx';
import '../assets/Inter-Regular.ttf';

const INSTRUCTION = {fontFamily: 'Inter-Regular', fontSize: 24, lineHeight: 36};

export function BrowserCaptureDialog({job: job}) {
  const t = useT();
  const close = () => downloadQueue().cancelBrowserCapture(job.id);
  if (job.captureState === 'failed')
    return (
      <URLDialog
        title={t('download.fileLink')}
        detail={job.captureError || t('download.fileLinkDetail')}
        submit={url => downloadQueue().continueWithURL(job.id, url)}
        onClose={close}
      />
    );
  return (
    <FocusScope
      trap
      autoFocus
      onBack={() => {
        close();
        return true;
      }}
    >
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
          backgroundColor: '#000000f2'
        }}
      >
        <View
          style={{
            width: 1380,
            gap: 30,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: '#2a2a2f',
            backgroundColor: '#17171a',
            padding: 48
          }}
        >
          <Text style={{fontFamily: 'Inter-Regular', fontSize: 36, color: '#f2f2f3', lineHeight: 48}}>
            {t('capture.title')}
          </Text>
          <Text
            style={{
              width: 1260,
              fontFamily: 'Inter-Regular',
              fontSize: 24,
              color: '#a3a3ab',
              numberOfLines: 2,
              ellipsizeMode: 'tail',
              lineHeight: 36
            }}
          >
            {job.title}
          </Text>
          <ShimmerText textStyle={INSTRUCTION} background={colors.surface}>
            {t(`capture.${job.captureState}`)}
          </ShimmerText>
          <Text
            style={{
              width: 1260,
              fontFamily: 'Inter-Regular',
              fontSize: 24,
              color: '#a3a3ab',
              numberOfLines: 3,
              ellipsizeMode: 'tail',
              lineHeight: 36
            }}
          >
            {t('capture.detail')}
          </Text>
          <Button
            label={t('download.enterLink')}
            variant="outline"
            onPress={() => {
              downloadQueue().cancelBrowserCapture(job.id, {manual: true});
            }}
          />
          <Button label={t('urlDialog.cancel')} variant="outline" onPress={close} />
        </View>
      </View>
    </FocusScope>
  );
}

import {motion, View, Text} from '@ps5-react/core';
import {useLocale} from '../i18n/index.js';
import {colors} from './colors.js';
import {px} from './scale.js';
import {Cover} from './Cover.jsx';
import {Icon} from './Icon.jsx';
import {EASE_OUT} from './ease.js';
import {ButtonGlyph} from './ButtonHints.jsx';
import '../assets/Inter-Regular.ttf';

const WIDTH = 400;

const THUMB = {width: px(56), height: px(75), borderRadius: px(6)};

const enter = {duration: 0.45, ease: EASE_OUT};

const leave = {opacity: 0, x: 24, transition: {duration: 0.25, ease: 'easeIn'}};

const leaveRtl = {...leave, x: -24};

export function Toast({
  game,
  icon,
  status,
  title,
  action,
  detail: detail,
  failed = false,
  duration,
  inPage = false
}) {
  const {rtl} = useLocale();
  const side = rtl ? 'left-8' : 'right-8';
  return (
    <motion.View
      style={[
        {position: 'absolute', zIndex: 50, width: 600},
        rtl ? {left: 48} : {right: 48},
        inPage ? {top: 18} : {top: 114}
      ]}
      initial={{opacity: 0, x: rtl ? -40 : 40}}
      animate={{opacity: 1, x: 0}}
      transition={enter}
      exit={rtl ? leaveRtl : leave}
    >
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 24,
            overflow: 'hidden',
            borderRadius: 18,
            borderWidth: 2,
            backgroundColor: '#17171a',
            padding: 18
          },
          rtl ? {paddingLeft: 30} : {paddingRight: 30},
          failed ? {borderColor: '#f2f2f399'} : {borderColor: '#2a2a2f'}
        ]}
      >
        {game ? <Cover game={game} label={false} style={THUMB} /> : null}
        <View style={{flex: 1, gap: 6}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 9}}>
            <Icon name={icon} size={16} color={failed ? colors.fg : colors.muted} />
            <Text
              style={
                failed
                  ? {
                      fontFamily: 'Inter-Regular',
                      fontSize: 21,
                      fontWeight: 600,
                      color: '#f2f2f3',
                      numberOfLines: 1,
                      ellipsizeMode: 'tail',
                      lineHeight: 30
                    }
                  : {
                      fontFamily: 'Inter-Regular',
                      fontSize: 21,
                      color: '#a3a3ab',
                      numberOfLines: 1,
                      ellipsizeMode: 'tail',
                      lineHeight: 30
                    }
              }
            >
              {status}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 26,
              fontWeight: 600,
              color: '#f2f2f3',
              numberOfLines: 2,
              ellipsizeMode: 'tail',
              lineHeight: 36
            }}
          >
            {title}
          </Text>
          {action ? (
            <View style={{marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 9}}>
              <ButtonGlyph button={action.button} />
              <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3d9', lineHeight: 30}}>
                {action.label}
              </Text>
            </View>
          ) : detail ? (
            <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
              {detail}
            </Text>
          ) : null}
        </View>
        {duration ? (
          <motion.View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 3,
              backgroundColor: '#f2f2f380'
            }}
            initial={{x: 0}}
            animate={{x: rtl ? WIDTH : -WIDTH}}
            transition={{duration: duration / 1e3, ease: 'linear'}}
          />
        ) : null}
      </View>
    </motion.View>
  );
}

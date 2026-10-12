import {View, motion, FocusScope, Text, ScrollView} from '@ps5-react/core';
import {useLocale} from '../i18n/index.js';
import {EASE_OUT} from './ease.js';
import {HINT, useHints} from './Legend.jsx';
import '../assets/Inter-Regular.ttf';

const enter = {type: 'tween', duration: 0.28, ease: EASE_OUT};

const PANEL = {
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  borderLeftWidth: 2,
  borderColor: '#2a2a2f',
  backgroundColor: '#000000'
};

const PANEL_RTL = {
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  borderRightWidth: 2,
  borderColor: '#2a2a2f',
  backgroundColor: '#000000'
};

const HINTS = [HINT.select, HINT.close];

export function SheetPanel({style, children, initial, animate, exit, ...animation}) {
  const {rtl} = useLocale();
  const mirror = values => (rtl && values?.x ? {...values, x: -values.x} : values);
  return (
    <View style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}>
      <View
        style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#000000cc'}}
      />
      <motion.View
        style={[rtl ? PANEL_RTL : PANEL, style]}
        initial={mirror(initial)}
        animate={mirror(animate)}
        exit={mirror(exit)}
        {...animation}
      >
        {children}
      </motion.View>
    </View>
  );
}

export function SideSheet({title, subtitle, onClose, children}) {
  useHints(HINTS);
  return (
    <FocusScope
      trap
      autoFocus
      onBack={() => {
        onClose();
        return true;
      }}
      onAction={() => true}
    >
      <View style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 50}}>
        <SheetPanel
          style={{width: 810, gap: 30, paddingHorizontal: 36, paddingTop: 42, paddingBottom: 72}}
          initial={{opacity: 0, x: 48}}
          animate={{opacity: 1, x: 0}}
          transition={enter}
        >
          <View style={{gap: 6, paddingHorizontal: 18}}>
            <Text
              style={{
                fontFamily: 'Inter-Regular',
                fontSize: 30,
                fontWeight: 600,
                color: '#f2f2f3',
                lineHeight: 42,
                letterSpacing: -0.75
              }}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 21,
                  color: '#a3a3ab',
                  numberOfLines: 1,
                  ellipsizeMode: 'tail',
                  lineHeight: 30
                }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          <ScrollView style={{flex: 1}}>{children}</ScrollView>
        </SheetPanel>
      </View>
    </FocusScope>
  );
}

import {useState} from 'react';
import {motion, Image, Text, View} from '@ps5-react/core';
import icon from '../assets/splash-icon.png';
import {colors} from './colors.js';
import '../assets/Inter-Regular.ttf';

// The app icon (sce_sys/icon0.png), baked at its drawn size of 240 px.
const ICON = 240;

const GLOW = 420;

// The icon springs in, the name rises under it, both hold briefly, then the splash fades away.
const STEPS = [
  {
    icon: {opacity: 1, scale: 1, transition: {type: 'spring', stiffness: 220, damping: 16, delay: 0.1}},
    name: {opacity: 0, y: 18}
  },
  {
    icon: {opacity: 1, scale: 1},
    name: {opacity: 1, y: 0, transition: {type: 'tween', duration: 0.35, ease: 'easeOut'}}
  },
  // Hold the finished logo for a moment.
  {icon: {opacity: 1, scale: 1.02, transition: {type: 'tween', duration: 0.5, ease: 'easeInOut'}}, name: {opacity: 1, y: 0}}
];

export function Splash() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  if (done) return null;
  const leaving = step === STEPS.length;
  const current = STEPS[Math.min(step, STEPS.length - 1)];
  const next = () => setStep(s => Math.min(s + 1, STEPS.length));
  return (
    <motion.View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000'
      }}
      initial={false}
      animate={{opacity: leaving ? 0 : 1}}
      transition={{duration: 0.35, ease: 'easeIn', delay: 0.1}}
      onAnimationComplete={() => leaving && setDone(true)}
    >
      <motion.View
        style={{alignItems: 'center', gap: 36}}
        initial={false}
        animate={{scale: leaving ? 0.92 : 1}}
        transition={{duration: 0.45, ease: 'easeIn'}}
      >
        <View style={{width: ICON, height: ICON, alignItems: 'center', justifyContent: 'center'}}>
          <motion.View
            style={{
              position: 'absolute',
              left: (ICON - GLOW) / 2,
              top: (ICON - GLOW) / 2,
              width: GLOW,
              height: GLOW,
              borderRadius: GLOW / 2,
              backgroundGradient: {
                type: 'radial',
                stops: [
                  {color: '#2f7bff55', offset: 0},
                  {color: 'transparent', offset: 1}
                ]
              }
            }}
            initial={{opacity: 0}}
            animate={{opacity: step >= 1 ? 1 : 0}}
            transition={{type: 'tween', duration: 0.6, ease: 'easeOut'}}
          />
          <motion.View
            style={{width: ICON, height: ICON}}
            initial={{opacity: 0, scale: 0.6}}
            animate={current.icon}
            onAnimationComplete={() => step !== 1 && next()}
          >
            <Image source={icon} resizeMode="cover" style={{width: ICON, height: ICON, borderRadius: 48}} />
          </motion.View>
        </View>
        <motion.View
          initial={{opacity: 0, y: 18}}
          animate={current.name}
          onAnimationComplete={() => step === 1 && next()}
        >
          <Text
            style={{
              fontFamily: 'Inter-Regular',
              fontSize: 58,
              fontWeight: 600,
              letterSpacing: -1.5,
              color: colors.fg
            }}
          >
            LocalDrive
          </Text>
        </motion.View>
      </motion.View>
    </motion.View>
  );
}

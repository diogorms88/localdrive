import {useIsFocused, Text, motion} from '@ps5-react/core';
import {colors} from './colors.js';
import {FocusRing} from './FocusRing.jsx';
import {Icon} from './Icon.jsx';
import '../assets/Inter-Regular.ttf';

const BASE = {
  flexDirection: 'row',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 12,
  borderRadius: 9
};

const SIZE = {
  sm: {height: 48, paddingHorizontal: 18},
  md: {height: 60, paddingHorizontal: 24},
  lg: {height: 72, paddingHorizontal: 30},
  icon: {width: 60, height: 60}
};

const BOX = {
  primary: {backgroundColor: '#f2f2f3'},
  secondary: {backgroundColor: '#212125'},
  // Over light art a bare line vanishes: the translucent fill keeps the button readable anywhere.
  outline: {borderWidth: 2, borderColor: '#ffffff33', backgroundColor: '#00000099'},
  ghost: null
};

const FOCUSED_BOX = {
  primary: {backgroundColor: '#fff'},
  secondary: {backgroundColor: '#2b2b30'},
  outline: {backgroundColor: '#17171a'},
  ghost: null
};

const TEXT = {
  primary: {fontFamily: 'Inter-Regular', color: '#0d0d0f'},
  secondary: {fontFamily: 'Inter-Regular', color: '#f2f2f3'},
  outline: {fontFamily: 'Inter-Regular', color: '#f2f2f3'},
  ghost: {fontFamily: 'Inter-Regular', color: '#a3a3ab'}
};

const TEXT_SIZE = {
  sm: {fontSize: 21, lineHeight: 30},
  md: {fontSize: 21, lineHeight: 30},
  lg: {fontSize: 23},
  icon: {fontSize: 21, lineHeight: 30}
};

const press = {scale: 0.95};

const pressMotion = {type: 'tween', duration: 0.12, ease: 'easeOut'};

const ink = (variant, focused) =>
  variant === 'primary' ? colors.accentFg : variant === 'ghost' && !focused ? colors.muted : colors.fg;

function Content({variant, size, label, icon, iconFill}) {
  const focused = useIsFocused();
  const color = ink(variant, focused);
  return (
    <>
      {icon && (
        <Icon name={icon} size={size === 'icon' ? 20 : 16} color={color} fill={iconFill ? color : 'none'} />
      )}
      {label && (
        <Text style={[TEXT[variant], TEXT_SIZE[size], focused && variant === 'ghost' && {color: '#f2f2f3'}]}>
          {label}
        </Text>
      )}
    </>
  );
}

export function Button({
  variant = 'secondary',
  size = 'md',
  label,
  icon,
  iconFill,
  children,
  onPress,
  style,
  ...rest
}) {
  return (
    <motion.View
      {...rest}
      onPress={onPress}
      whilePress={press}
      transition={pressMotion}
      style={({focused}) => [BASE, SIZE[size], BOX[variant], focused && FOCUSED_BOX[variant], style]}
    >
      {variant === 'primary' ? <FocusRing halo radius={6} /> : <FocusRing />}
      {children}
      <Content variant={variant} size={size} label={label} icon={icon} iconFill={iconFill} />
    </motion.View>
  );
}

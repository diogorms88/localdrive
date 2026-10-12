import {memo} from 'react';
import {useIsFocused, Text, View} from '@ps5-react/core';
import {colors} from './colors.js';
import {FocusRing} from './FocusRing.jsx';
import {Icon} from './Icon.jsx';
import '../assets/Inter-Regular.ttf';

function Content({label, icon, iconFill, trailing, current}) {
  const focused = useIsFocused();
  const color = current || focused ? colors.fg : '#f2f2f3a6';
  return (
    <>
      <FocusRing round="full" />
      {icon && <Icon name={icon} size={18} color={color} fill={iconFill ? color : 'none'} />}
      {label && <Text style={[{fontFamily: 'Inter-Regular', fontSize: 23}, {color}]}>{label}</Text>}
      {trailing && <Icon name={trailing} size={14} color={color} />}
    </>
  );
}

export const NavItem = memo(function NavItem({
  label,
  icon,
  iconFill,
  trailing,
  current = false,
  children,
  ...rest
}) {
  return (
    <View
      {...rest}
      style={{
        position: 'relative',
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        borderRadius: 14999,
        paddingHorizontal: 24
      }}
    >
      <Content label={label} icon={icon} iconFill={iconFill} trailing={trailing} current={current} />
      {children}
    </View>
  );
});

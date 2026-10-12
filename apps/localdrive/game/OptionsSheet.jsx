import {useEffect, useState} from 'react';
import {useIsFocused, View, Text} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {colors} from '../ui/colors.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import {SideSheet} from '../ui/SideSheet.jsx';
import '../assets/Inter-Regular.ttf';

function OptionFace({icon, label, detail: detail}) {
  const focused = useIsFocused();
  const ink = focused ? colors.fg : colors.muted;
  return (
    <>
      <FocusRing />
      <Icon name={icon} size={18} color={ink} />
      <View style={{flex: 1, gap: 3}}>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 23, fontWeight: 600, color: '#f2f2f3'}}>
          {label}
        </Text>
        <Text
          style={[
            {
              width: 600,
              fontFamily: 'Inter-Regular',
              fontSize: 21,
              numberOfLines: 2,
              ellipsizeMode: 'tail',
              lineHeight: 30
            },
            {color: ink}
          ]}
        >
          {detail}
        </Text>
      </View>
    </>
  );
}

const ARM_MS = 3e3;

function Option({item, autoFocus, onClose}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return void 0;
    const timer = setTimeout(() => setArmed(false), ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);
  const press = () => {
    if (item.armed && !armed) {
      setArmed(true);
      return;
    }
    if (!item.next) onClose();
    item.onSelect();
  };
  const face = armed ? {...item, ...item.armed} : item;
  return (
    <View
      autoFocus={autoFocus}
      onPress={press}
      onBlur={() => setArmed(false)}
      style={_state => [
        {
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 18,
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 18
        },
        _state.focused ? {backgroundColor: '#212125'} : null
      ]}
    >
      <OptionFace icon={face.icon} label={face.label} detail={face.detail} />
    </View>
  );
}

export function OptionsSheet({title, items, onClose}) {
  const t = useT();
  return (
    <SideSheet title={t('download.optionsTitle')} subtitle={title} onClose={onClose}>
      <View style={{gap: 6, padding: 9}}>
        {items.map((item, index) => (
          <Option key={item.label} item={item} autoFocus={index === 0} onClose={onClose} />
        ))}
      </View>
    </SideSheet>
  );
}

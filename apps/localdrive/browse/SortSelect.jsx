import {memo, useState} from 'react';
import {useIsFocused, Text, motion, View} from '@ps5-react/core';
import {fitBytes, SPAN_MAX} from '../i18n/fit.js';
import {useT, useLocale} from '../i18n/index.js';
import {sortLabel, SORTS} from '../state/catalog.js';
import {useStoreState, useStoreActions} from '../state/store.jsx';
import {colors} from '../ui/colors.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {Icon} from '../ui/Icon.jsx';
import {Menu, MenuItem} from '../ui/Menu.jsx';
import '../assets/Inter-Regular.ttf';

function Trigger({sort, open}) {
  const t = useT();
  const focused = useIsFocused();
  return (
    <>
      <FocusRing round="full" />
      <Text
        focused={focused}
        style={[
          {fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30},
          focused ? {color: '#f2f2f3d9'} : null
        ]}
      >
        {fitBytes(t('sort.label'), SPAN_MAX)}
        <Text style={{color: '#f2f2f3'}}>{fitBytes(`  ${sortLabel(sort)}`, SPAN_MAX)}</Text>
      </Text>
      <motion.View
        initial={false}
        animate={{rotate: open ? 180 : 0}}
        transition={{type: 'tween', duration: 0.2, ease: 'easeOut'}}
      >
        <Icon name="chevronDown" color={focused ? colors.fg : colors.muted} />
      </motion.View>
    </>
  );
}

export const SortSelect = memo(function SortSelect() {
  const {rtl} = useLocale();
  const {sort} = useStoreState();
  const {setSort} = useStoreActions();
  const [open, setOpen] = useState(false);
  return (
    <View style={{position: 'relative', zIndex: 10}}>
      <View
        focusKey="catalog:sort"
        selected={open}
        onPress={() => setOpen(value => !value)}
        style={_state => [
          {
            height: 60,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            borderRadius: 14999,
            backgroundColor: '#17171a'
          },
          rtl ? {paddingRight: 24, paddingLeft: 18} : {paddingLeft: 24, paddingRight: 18},
          open ? {backgroundColor: '#2b2b30'} : null,
          _state.focused ? {backgroundColor: '#2b2b30'} : null
        ]}
      >
        <Trigger sort={sort} open={open} />
      </View>
      <Menu open={open} onClose={() => setOpen(false)} align="left" rows={SORTS.length}>
        {SORTS.map(option => (
          <MenuItem
            key={option.id}
            label={sortLabel(option.id)}
            checked={sort === option.id}
            onSelect={() => setSort(option.id)}
          />
        ))}
      </Menu>
    </View>
  );
});

import {memo} from 'react';
import {useIsFocused, Text, View} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {FACETS, facetLabel} from '../state/catalog.js';
import {useStoreState, useQuery, useStoreActions} from '../state/store.jsx';
import {FocusRing} from '../ui/FocusRing.jsx';
import {useNavActions} from '../state/nav.jsx';
import {Chip} from '../ui/Chip.jsx';
import '../assets/Inter-Regular.ttf';

function ClearAll() {
  const t = useT();
  const focused = useIsFocused();
  return (
    <Text
      focused={focused}
      style={[
        {fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30},
        focused ? {color: '#f2f2f3'} : null
      ]}
    >
      {t('filters.clearAll')}
    </Text>
  );
}

export const ActiveFilters = memo(function ActiveFilters() {
  const t = useT();
  const {filters} = useStoreState();
  const query = useQuery();
  const {setFilters, toggleFilter, setQuery, clearFilters} = useStoreActions();
  const {focusLater} = useNavActions();
  const chips = [
    query && {label: t('filters.queryChip', {query}), remove: () => setQuery('')},
    filters.wishlist && {
      label: t('filters.favorites'),
      remove: () => setFilters({...filters, wishlist: false})
    },
    ...FACETS.flatMap(({key}) =>
      filters[key].map(value => ({label: facetLabel(key, value), remove: () => toggleFilter(key, value)}))
    )
  ].filter(Boolean);
  if (!chips.length) return null;
  const remove = (index, action) => {
    const neighbour = chips[index + 1] ?? chips[index - 1];
    action();
    focusLater(neighbour ? `chip:${neighbour.label}` : 'catalog:filters');
  };
  return (
    <>
      {chips.map((chip, index) => (
        <Chip
          key={chip.label}
          focusKey={`chip:${chip.label}`}
          label={chip.label}
          onPress={() => remove(index, chip.remove)}
        />
      ))}
      {chips.length > 1 && (
        <View
          onPress={() => {
            clearFilters();
            focusLater('catalog:filters');
          }}
          style={_state => [
            {height: 60, justifyContent: 'center', borderRadius: 14999, paddingHorizontal: 24},
            _state.focused ? {backgroundColor: '#2b2b30'} : null
          ]}
        >
          <FocusRing round="full" />
          <ClearAll />
        </View>
      )}
    </>
  );
});

import {View, Text} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {colors} from '../ui/colors.js';
import {Icon} from '../ui/Icon.jsx';
import {Button} from '../ui/Button.jsx';
import '../assets/Inter-Regular.ttf';

function copy(t, query, onlyWishlist) {
  if (query) return {title: t('catalog.empty.queryTitle', {query}), hint: t('catalog.empty.queryHint')};
  if (onlyWishlist) return {title: t('catalog.empty.wishlistTitle'), hint: t('catalog.empty.wishlistHint')};
  return {title: t('catalog.empty.filtersTitle'), hint: t('catalog.empty.filtersHint')};
}

export function EmptyState({query, onlyWishlist, onClear}) {
  const t = useT();
  const {title, hint} = copy(t, query, onlyWishlist);
  return (
    <View style={{marginTop: 36, alignItems: 'center', paddingHorizontal: 36, paddingVertical: 120}}>
      <Icon name={onlyWishlist ? 'heart' : 'searchX'} size={32} color={colors.subtle} />
      <Text
        style={{
          marginTop: 24,
          fontFamily: 'Inter-Regular',
          fontSize: 27,
          fontWeight: 600,
          color: '#f2f2f3',
          lineHeight: 42
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          marginTop: 6,
          width: 720,
          textAlign: 'center',
          fontFamily: 'Inter-Regular',
          fontSize: 24,
          color: '#a3a3ab',
          lineHeight: 36
        }}
      >
        {hint}
      </Text>
      <View style={{marginTop: 36}}>
        <Button
          variant="outline"
          label={t('catalog.empty.browseAll')}
          focusKey="catalog:empty"
          onPress={onClear}
        />
      </View>
    </View>
  );
}

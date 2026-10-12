import {useIsFocused, View, Text} from '@ps5-react/core';
import {LOCALES} from '../i18n/locales.js';
import {useT, languageChoice, chooseLanguage, systemLocale} from '../i18n/index.js';
import {colors} from './colors.js';
import {FocusRing} from './FocusRing.jsx';
import {Icon} from './Icon.jsx';
import {SideSheet} from './SideSheet.jsx';
import '../assets/Inter-Regular.ttf';

const nameOf = code => LOCALES.find(locale => locale.code === code).name;

function LanguageFace({name, detail: detail, checked}) {
  const focused = useIsFocused();
  return (
    <>
      <FocusRing />
      <View style={{flex: 1, gap: 3}}>
        <Text style={{fontFamily: 'Inter-Regular', fontSize: 23, fontWeight: 600, color: '#f2f2f3'}}>
          {name}
        </Text>
        <Text
          style={[
            {fontFamily: 'Inter-Regular', fontSize: 21, lineHeight: 30},
            {color: focused ? colors.fg : colors.muted}
          ]}
        >
          {detail}
        </Text>
      </View>
      {checked ? <Icon name="check" color={colors.fg} /> : <View style={{width: 24, height: 24}} />}
    </>
  );
}

function Row({code, name, detail: detail, checked, onPress}) {
  return (
    <View
      focusKey={`language:${code}`}
      autoFocus={checked}
      onPress={onPress}
      style={_state => [
        {
          position: 'relative',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 24,
          borderRadius: 12,
          paddingHorizontal: 18,
          paddingVertical: 18
        },
        _state.focused ? {backgroundColor: '#212125'} : null
      ]}
    >
      <LanguageFace name={name} detail={detail} checked={checked} />
    </View>
  );
}

export function LanguageSheet({onClose}) {
  const t = useT();
  const choice = languageChoice();
  const pick = code => {
    chooseLanguage(code);
    onClose();
  };
  return (
    <SideSheet title={t('language.title')} subtitle={t('language.subtitle')} onClose={onClose}>
      <View style={{gap: 6, padding: 9, paddingBottom: 48}}>
        <Row
          code="system"
          name={t('language.system')}
          detail={nameOf(systemLocale())}
          checked={choice === null}
          onPress={() => pick(null)}
        />
        {LOCALES.map(({code, name}) => (
          <Row
            key={code}
            code={code}
            name={name}
            detail={t(`language.name.${code}`)}
            checked={choice === code}
            onPress={() => pick(code)}
          />
        ))}
      </View>
    </SideSheet>
  );
}

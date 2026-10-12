import {memo, useCallback, useState} from 'react';
import {useIsFocused, View, Text, motion, FocusScope} from '@ps5-react/core';
import {useLocale, focusEnd, useT} from '../i18n/index.js';
import {colors} from '../ui/colors.js';
import {Icon} from '../ui/Icon.jsx';
import {ButtonGlyph} from '../ui/ButtonHints.jsx';
import {HINT, useHints} from '../ui/Legend.jsx';
import {edit} from './edit.js';
import '../assets/Inter-Regular.ttf';

const COLUMNS = 6;

const LTR = {direction: 'ltr'};

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');

const MAX_QUERY = 40;

const TO_RESULTS = 'search-results';

const TYPE = {button: 'cross', label: 'hints.type'};

const DELETE = {button: 'square', label: 'hints.delete'};

const URL_HINTS = [TYPE, DELETE, {button: 'r2', label: 'hints.confirm'}, HINT.back];

const HINTS = [
  TYPE,
  DELETE,
  {button: 'triangle', label: 'hints.space'},
  {button: 'r2', label: 'hints.search'},
  HINT.clear,
  HINT.back
];

function KeyFace({label, icon, button, url}) {
  const focused = useIsFocused();
  useHints(focused ? (url ? URL_HINTS : HINTS) : null);
  return (
    <>
      {button ? (
        <View style={{position: 'absolute', right: 15}}>
          <ButtonGlyph button={button} size={18} />
        </View>
      ) : null}
      {icon ? <Icon name={icon} size={20} color={focused ? colors.accentFg : colors.fg} /> : null}
      {label ? (
        <Text
          focused={focused}
          style={[
            {fontFamily: 'Inter-Regular', fontSize: 27, color: '#f2f2f3', lineHeight: 36},
            focused ? {color: '#0d0d0f'} : null
          ]}
        >
          {label}
        </Text>
      ) : null}
    </>
  );
}

const Key = memo(function Key({label, icon, button, wide, value, onKey, toResults, compact}) {
  const {rtl} = useLocale();
  return (
    <motion.View
      onPress={() => onKey(value)}
      {...focusEnd(rtl, toResults)}
      style={_state => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          borderRadius: 9,
          backgroundColor: '#17171a'
        },
        wide ? {width: 276} : {width: 84},
        compact ? {height: 60} : {height: 84},
        _state.focused ? {backgroundColor: '#f2f2f3'} : null
      ]}
      initial={false}
      animate={{scale: 1}}
      transition={{type: 'tween', duration: 0.1, ease: [0.4, 0, 0.2, 1]}}
      whilePress={{scale: 0.95}}
    >
      <KeyFace label={label} icon={icon} button={button} url={compact} />
    </motion.View>
  );
});

export const Keyboard = memo(function Keyboard({onChange, onSubmit, url = false}) {
  const t = useT();
  const {rtl} = useLocale();
  const edge = rtl ? 0 : COLUMNS - 1;
  const [upper, setUpper] = useState(false);
  const characters = url ? [...CHARACTERS, ...':/._-?=&%+#@~'.split('')] : CHARACTERS;
  const onKey = useCallback(
    value =>
      value === 'case'
        ? setUpper(value => !value)
        : value === 'done'
          ? onSubmit()
          : onChange(query => edit(query, value, url ? 8192 : MAX_QUERY)),
    [onChange, onSubmit, url]
  );
  const onAction = action => {
    if (action === 'square') onKey('delete');
    else if (action === 'triangle' && !url) onKey(' ');
    else return false;
    return true;
  };
  return (
    <FocusScope wrap onAction={onAction}>
      <View style={[{width: 564, flexDirection: 'row', flexWrap: 'wrap', gap: 12}, LTR]}>
        {characters.map((character, i) => (
          <Key
            key={character}
            label={url && !upper ? character.toLowerCase() : character}
            value={url && upper ? character : character.toLowerCase()}
            onKey={onKey}
            compact={url}
            toResults={!url && i % COLUMNS === edge ? TO_RESULTS : void 0}
          />
        ))}
        <Key
          wide
          compact={url}
          label={url ? (upper ? t('keyboard.lowercase') : t('keyboard.uppercase')) : t('keyboard.space')}
          value={url ? 'case' : ' '}
          button={url ? void 0 : 'triangle'}
          onKey={onKey}
          toResults={url || !rtl ? void 0 : TO_RESULTS}
        />
        <Key
          wide
          compact={url}
          label={t('keyboard.delete')}
          icon="delete"
          button="square"
          value="delete"
          onKey={onKey}
          toResults={url || rtl ? void 0 : TO_RESULTS}
        />
        <Key
          wide
          compact={url}
          label={t('keyboard.clear')}
          icon="x"
          button={url ? void 0 : 'l2'}
          value="clear"
          onKey={onKey}
          toResults={url || !rtl ? void 0 : TO_RESULTS}
        />
        <Key
          wide
          compact={url}
          label={t('keyboard.done')}
          button="r2"
          value="done"
          onKey={onKey}
          toResults={url || rtl ? void 0 : TO_RESULTS}
        />
      </View>
    </FocusScope>
  );
});

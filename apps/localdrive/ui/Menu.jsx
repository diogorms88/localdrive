import {createContext, useContext} from 'react';
import {AnimatePresence, motion, FocusScope, ScrollView, useIsFocused, Text, View} from '@ps5-react/core';
import {useLocale} from '../i18n/index.js';
import {colors} from './colors.js';
import {canScale} from './scale.js';
import {Icon} from './Icon.jsx';
import {EASE_OUT} from './ease.js';
import '../assets/Inter-Regular.ttf';

const CloseContext = createContext(null);

const MAX_HEIGHT = 512;

export function Menu({open, onClose, align = 'left', rows, children}) {
  const {rtl} = useLocale();
  const left = (align === 'left') !== rtl;
  const pop = canScale(240, Math.min(rows * 36 + 8, MAX_HEIGHT)) ? 0.98 : 1;
  const close = () => {
    onClose();
    return true;
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.View
          key={'menu'}
          style={
            left
              ? {
                  position: 'absolute',
                  left: 0,
                  top: '100%',
                  zIndex: 50,
                  marginTop: 9,
                  width: 360,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: '#2a2a2f',
                  backgroundColor: '#17171a',
                  padding: 6,
                  transformOrigin: [0, 0]
                }
              : {
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  zIndex: 50,
                  marginTop: 9,
                  width: 360,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: '#2a2a2f',
                  backgroundColor: '#17171a',
                  padding: 6,
                  transformOrigin: [1, 0]
                }
          }
          initial={{opacity: 0, y: -6, scale: pop}}
          animate={{opacity: 1, y: 0, scale: 1}}
          exit={{opacity: 0, y: -4, transition: {type: 'tween', duration: 0.1, ease: 'easeIn'}}}
          transition={{type: 'tween', duration: 0.18, ease: EASE_OUT}}
        >
          <FocusScope trap onBack={close}>
            <ScrollView style={{maxHeight: 768}}>
              <CloseContext.Provider value={onClose}>{children}</CloseContext.Provider>
            </ScrollView>
          </FocusScope>
        </motion.View>
      )}
    </AnimatePresence>
  );
}

function ItemContent({label, checked}) {
  const focused = useIsFocused();
  return (
    <>
      <Text
        focused={focused}
        selected={checked}
        style={[
          {
            flex: 1,
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            color: '#a3a3ab',
            numberOfLines: 1,
            ellipsizeMode: 'tail',
            lineHeight: 30
          },
          checked ? {color: '#f2f2f3'} : null,
          focused ? {color: '#f2f2f3'} : null
        ]}
      >
        {label}
      </Text>
      {checked && <Icon name="check" color={colors.fg} />}
    </>
  );
}

export function MenuItem({label, checked = false, autoFocus = false, onSelect}) {
  const close = useContext(CloseContext);
  return (
    <View
      autoFocus={checked || autoFocus}
      onPress={() => {
        onSelect();
        close();
      }}
      style={_state => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 36,
          borderRadius: 9,
          paddingHorizontal: 18,
          paddingVertical: 12
        },
        _state.focused ? {backgroundColor: '#2b2b30'} : null
      ]}
    >
      <ItemContent label={label} checked={checked} />
    </View>
  );
}

export const MenuDivider = () => <View style={{marginVertical: 6, height: 2, backgroundColor: '#2a2a2f'}} />;

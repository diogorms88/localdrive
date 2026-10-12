import {useState} from 'react';
import {FocusScope, View, Text} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {Button} from '../ui/Button.jsx';
import {Keyboard} from '../search/Keyboard.jsx';
import '../assets/Inter-Regular.ttf';

export function URLDialog({title, detail: detail, initial = 'https://', submit, onClose}) {
  const t = useT();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState('');
  const done = () => {
    try {
      submit(value);
      onClose();
    } catch (failure) {
      setError(failure.message);
    }
  };
  return (
    // A modal: actions the keyboard leaves (L1/R1, Square outside it) stop here instead of reaching the page.
    <FocusScope
      trap
      autoFocus
      onBack={() => {
        onClose();
        return true;
      }}
      onAction={action => {
        if (action === 'r2') done();
        return true;
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000000f2'
        }}
      >
        <View
          style={{
            width: 1380,
            gap: 30,
            borderRadius: 18,
            borderWidth: 2,
            borderColor: '#2a2a2f',
            backgroundColor: '#17171a',
            padding: 48
          }}
        >
          <Text style={{fontFamily: 'Inter-Regular', fontSize: 36, color: '#f2f2f3', lineHeight: 48}}>
            {title}
          </Text>
          <View style={{flexDirection: 'row', gap: 48}}>
            <Keyboard url onChange={setValue} onSubmit={done} />
            <View style={{width: 600, gap: 30}}>
              <Text
                style={{
                  width: 600,
                  fontFamily: 'Inter-Regular',
                  fontSize: 24,
                  color: '#a3a3ab',
                  numberOfLines: 5,
                  ellipsizeMode: 'tail',
                  lineHeight: 36
                }}
              >
                {detail}
              </Text>
              <Text
                style={{
                  width: 600,
                  fontFamily: 'Inter-Regular',
                  fontSize: 24,
                  color: '#f2f2f3',
                  numberOfLines: 5,
                  ellipsizeMode: 'tail',
                  lineHeight: 36
                }}
              >
                {value.slice(-180) || t('urlDialog.empty')}
              </Text>
              {error ? (
                <Text
                  style={{
                    width: 600,
                    fontFamily: 'Inter-Regular',
                    fontSize: 21,
                    color: '#f2f2f3',
                    numberOfLines: 3,
                    ellipsizeMode: 'tail',
                    lineHeight: 30
                  }}
                >
                  {error}
                </Text>
              ) : null}
              <Button label={t('urlDialog.confirm')} onPress={done} />
              <Button label={t('urlDialog.cancel')} variant="outline" onPress={onClose} />
              <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#a3a3ab', lineHeight: 30}}>
                {t('urlDialog.controls')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </FocusScope>
  );
}

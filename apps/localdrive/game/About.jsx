import {useState} from 'react';
import {useIsFocused, Text, LayoutAnimation, View, motion} from '@ps5-react/core';
import {useT, useLocale, LATIN_IN_RTL} from '../i18n/index.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import '../assets/Inter-Regular.ttf';

const isHeading = line => line.length < 70 && line === line.toUpperCase() && line !== line.toLowerCase();

function ToggleLabel({expanded}) {
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
      {t(expanded ? 'game.showLess' : 'game.showMore')}
    </Text>
  );
}

export function About({paragraphs}) {
  const t = useT();
  const {rtl} = useLocale();
  const latin = rtl ? LATIN_IN_RTL : void 0;
  const [expanded, setExpanded] = useState(false);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(value => !value);
  };
  return (
    <View scrollAnchor>
      <Text
        style={{
          fontFamily: 'Inter-Regular',
          fontSize: 30,
          fontWeight: 600,
          color: '#f2f2f3',
          lineHeight: 42,
          letterSpacing: -0.75
        }}
      >
        {t('game.about')}
      </Text>
      <View
        style={[{position: 'relative', marginTop: 24, overflow: 'hidden'}, expanded ? null : {height: 288}]}
      >
        <View style={{width: 900, gap: 18}}>
          {paragraphs.map((paragraph, i) =>
            isHeading(paragraph) ? (
              <Text
                key={i}
                style={[
                  {
                    paddingTop: 18,
                    fontFamily: 'Inter-Regular',
                    fontSize: 21,
                    fontWeight: 600,
                    color: '#f2f2f3',
                    lineHeight: 30,
                    letterSpacing: 1.26
                  },
                  latin
                ]}
              >
                {paragraph}
              </Text>
            ) : (
              <Text
                key={i}
                style={[
                  {width: 900, fontFamily: 'Inter-Regular', fontSize: 23, color: '#a3a3ab', lineHeight: 37},
                  latin
                ]}
              >
                {paragraph}
              </Text>
            )
          )}
        </View>
        <motion.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 120,
            backgroundGradient: {
              type: 'linear',
              to: 'top',
              stops: [
                {color: '#000000', offset: 0},
                {color: '#00000000', offset: 1}
              ]
            }
          }}
          pointerEvents="none"
          initial={false}
          animate={{opacity: expanded ? 0 : 1}}
        />
      </View>
      <View
        focusKey="game:about"
        onPress={toggle}
        style={{position: 'relative', marginTop: 18, alignSelf: 'flex-start', borderRadius: 6}}
      >
        <ToggleLabel expanded={expanded} />
        <FocusRing />
      </View>
    </View>
  );
}

import {View, Text} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {formatBytes, formatSize} from '../state/size.js';
import {formatDate} from '../state/catalog.js';
import {preferredRelease} from './sources.js';
import {PlatformBadge} from '../ui/PlatformBadge.jsx';
import '../assets/Inter-Regular.ttf';

export function GameFacts({game}) {
  const t = useT();
  const releases = game.releases || [];
  const bytes = releases[preferredRelease(releases)]?.sizeBytes;
  const size = bytes
    ? [t('game.facts.downloadSize'), formatBytes(bytes)]
    : [t('game.facts.installSize'), game.sizeGb ? formatSize(game.sizeGb) : '\u2014'];
  const platform = <PlatformBadge platforms={game.platforms} />;
  const rows = [
    [t('game.facts.platform'), platform],
    [t('game.facts.publisher'), game.publisher || '\u2014'],
    [t('game.facts.releaseDate'), formatDate(game.releaseDate)],
    size
  ];
  return (
    <View style={{width: 432}}>
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
        {t('game.details')}
      </Text>
      <View style={{marginTop: 24, borderBottomWidth: 2, borderColor: '#2a2a2f'}}>
        {rows.map(([label, value]) => (
          <View
            key={label}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 24,
              borderTopWidth: 2,
              borderColor: '#2a2a2f',
              paddingVertical: 18
            }}
          >
            <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
              {label}
            </Text>
            {typeof value === 'string' ? (
              <Text
                style={{
                  width: 264,
                  fontFamily: 'Inter-Regular',
                  fontSize: 21,
                  color: '#f2f2f3',
                  textAlign: 'end',
                  numberOfLines: 1,
                  ellipsizeMode: 'tail',
                  lineHeight: 30
                }}
              >
                {value}
              </Text>
            ) : (
              value
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

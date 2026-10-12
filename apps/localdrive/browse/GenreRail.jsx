import {useState} from 'react';
import {View, ScrollView} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {games} from '../data/catalog.js';
import {genres} from '../state/catalog.js';
import {useStoreState, useStoreActions} from '../state/store.jsx';
import {SectionHeader} from '../ui/SectionHeader.jsx';
import {GenreCard} from './GenreCard.jsx';

const used = new Set();

const RAIL = genres
  .map(genre => ({
    genre,
    matches: games
      .filter(game => game.genres.includes(genre))
      .sort((a, b) => b.recommendations - a.recommendations)
  }))
  .filter(({matches}) => matches.length >= 3)
  .sort((a, b) => b.matches.length - a.matches.length)
  .map(({genre, matches}) => {
    const covers = [
      ...matches.filter(game => !used.has(game.id)),
      ...matches.filter(game => used.has(game.id))
    ].slice(0, 3);
    covers.forEach(game => used.add(game.id));
    return {genre, count: matches.length, covers};
  });

export function GenreRail() {
  const t = useT();
  const {filters} = useStoreState();
  const {toggleFilter} = useStoreActions();
  const [toggleGenre] = useState(() => genre => toggleFilter('genre', genre));
  return (
    <View scrollAnchor>
      <SectionHeader title={t('browse.popularGenres')} />
      <View style={{position: 'relative', marginHorizontal: -9, marginVertical: -30}}>
        <ScrollView
          style={[
            {flexDirection: 'row', gap: 18, paddingHorizontal: 9, paddingVertical: 30},
            {direction: 'ltr'}
          ]}
        >
          {RAIL.map(({genre, count, covers}) => (
            <GenreCard
              key={genre}
              genre={genre}
              count={count}
              covers={covers}
              active={filters.genre.includes(genre)}
              onToggle={toggleGenre}
            />
          ))}
        </ScrollView>
        <View
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 96,
            backgroundGradient: {
              type: 'linear',
              to: 'right',
              stops: [
                {color: 'transparent', offset: 0},
                {color: '#000000', offset: 1}
              ]
            }
          }}
        />
      </View>
    </View>
  );
}

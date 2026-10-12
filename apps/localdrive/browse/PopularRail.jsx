import {memo} from 'react';
import {useT} from '../i18n/index.js';
import {games} from '../data/catalog.js';
import {showcase, sortGames, NO_FILTERS} from '../state/catalog.js';
import {useStoreActions} from '../state/store.jsx';
import {GameCard} from '../ui/GameCard.jsx';
import {useNavActions} from '../state/nav.jsx';
import {GameRail} from './GameRail.jsx';

const WIDTH = 152;

const POPULAR = showcase(sortGames(games, 'relevance'), 15);

export const FIRST_POPULAR = `popular:${POPULAR[0].id}`;

export const PopularRail = memo(function PopularRail() {
  const t = useT();
  const {openGame, focusLater} = useNavActions();
  const {setFilters, setQuery, setSort} = useStoreActions();
  const seeAll = () => {
    setFilters(NO_FILTERS);
    setQuery('');
    setSort('relevance');
    focusLater('catalog:sort');
  };
  return (
    <GameRail title={t('browse.popularNow')} onSeeAll={seeAll} seeAllKey="popular:all">
      {POPULAR.map((game, index) => {
        const key = `popular:${game.id}`;
        return (
          <GameCard
            key={game.id}
            game={game}
            width={WIDTH}
            detailed
            focusKey={key}
            rowEnd={index === POPULAR.length - 1}
            onPress={() => openGame(game.id, key)}
          />
        );
      })}
    </GameRail>
  );
});

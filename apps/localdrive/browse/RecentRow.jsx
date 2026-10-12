import {memo, useRef} from 'react';
import {useT} from '../i18n/index.js';
import {listedId, getGame} from '../state/catalog.js';
import {GameCard} from '../ui/GameCard.jsx';
import {useRecent} from '../state/recent.js';
import {useNavState, useNavActions} from '../state/nav.jsx';
import {GameRail} from './GameRail.jsx';

export function RecentRow() {
  return <Recent shown={useNavState().top.name === 'browse'} />;
}

const Recent = memo(function Recent({shown}) {
  const t = useT();
  const recent = useRecent();
  const kept = useRef(recent);
  if (shown) kept.current = recent;
  const {openGame} = useNavActions();
  const games = [...new Set(kept.current.map(listedId))].map(getGame).filter(Boolean);
  if (!games.length) return null;
  return (
    <GameRail title={t('browse.recentlyViewed')}>
      {games.map((game, index) => {
        const key = `recent:${game.id}`;
        return (
          <GameCard
            key={game.id}
            game={game}
            width={152}
            detailed
            focusKey={key}
            rowEnd={index === games.length - 1}
            onPress={() => openGame(game.id, key)}
          />
        );
      })}
    </GameRail>
  );
});

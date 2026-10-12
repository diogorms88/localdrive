import {memo} from 'react';
import {useIsFocused, Text, View} from '@ps5-react/core';
import {formatPercent} from '../i18n/core.js';
import {useT} from '../i18n/index.js';
import {getGame} from '../state/catalog.js';
import {BUSY} from '../state/download-queue.js';
import {GameCard} from '../ui/GameCard.jsx';
import {useNavActions} from '../state/nav.jsx';
import {WAITING, stateLabel} from '../downloads/labels.js';
import {useProgress, fractionOf, useJobs} from '../downloads/useQueue.js';
import {ProgressBar} from '../ui/ProgressBar.jsx';
import {ShimmerText} from '../ui/ShimmerText.jsx';
import {GameRail} from './GameRail.jsx';
import '../assets/Inter-Regular.ttf';

const UNFINISHED = [...BUSY, 'paused', 'failed'];

const WIDTH = 152;

const STATE = {fontFamily: 'Inter-Regular', fontSize: 21};

function JobCaption({job: job}) {
  const t = useT();
  const focused = useIsFocused();
  const progress = useProgress(job.id);
  const fraction = fractionOf(progress);
  const percent =
    progress?.total && job.state !== 'failed' ? ` \xB7 ${formatPercent(Math.floor(fraction * 100))}` : '';
  return (
    <>
      <Text
        focused={focused}
        style={[
          {
            marginTop: 18,
            width: 225,
            fontFamily: 'Inter-Regular',
            fontSize: 23,
            color: '#f2f2f3d9',
            numberOfLines: 1,
            ellipsizeMode: 'tail'
          },
          focused ? {color: '#f2f2f3'} : null
        ]}
      >
        {job.title}
      </Text>
      <View style={{marginTop: 12}}>
        <ProgressBar fraction={fraction} width={WIDTH} active={job.state === 'downloading'} />
      </View>
      {WAITING.includes(job.state) ? (
        <View style={{marginTop: 9, width: 225}}>
          <ShimmerText textStyle={STATE}>{stateLabel(job.state)}</ShimmerText>
        </View>
      ) : (
        <Text
          style={
            job.state === 'failed'
              ? {
                  marginTop: 9,
                  width: 225,
                  fontFamily: 'Inter-Regular',
                  fontSize: 21,
                  color: '#f2f2f3',
                  numberOfLines: 1,
                  ellipsizeMode: 'tail'
                }
              : {
                  marginTop: 9,
                  width: 225,
                  fontFamily: 'Inter-Regular',
                  fontSize: 21,
                  color: '#8a8a94',
                  numberOfLines: 1,
                  ellipsizeMode: 'tail'
                }
          }
        >
          {job.state === 'failed' ? t('browse.continueFailed') : `${stateLabel(job.state)}${percent}`}
        </Text>
      )}
    </>
  );
}

export const ContinueRow = memo(function ContinueRow() {
  const t = useT();
  const {jobs} = useJobs();
  const {push, openGame} = useNavActions();
  const entries = jobs
    .filter(job => UNFINISHED.includes(job.state))
    .map(job => ({job: job, game: getGame(job.gameId)}))
    .filter(entry => entry.game);
  if (!entries.length) return null;
  return (
    <GameRail
      title={t('browse.continueDownloading')}
      seeAllKey="continue:all"
      onSeeAll={() => push({name: 'downloads'}, 'continue:all')}
    >
      {entries.map(({job: job, game}, index) => {
        const key = `continue:${job.id}`;
        return (
          <GameCard
            key={job.id}
            game={game}
            width={WIDTH}
            detailed
            focusKey={key}
            rowEnd={index === entries.length - 1}
            onPress={() => openGame(game.id, key)}
            caption={<JobCaption job={job} />}
          />
        );
      })}
    </GameRail>
  );
});

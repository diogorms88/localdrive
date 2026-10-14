import {useEffect, useRef, useState} from 'react';
import {View, Text, FocusScope, ScrollView, BackHandler} from '@ps5-react/core';
import {fitBytes, SPAN_MAX} from '../i18n/fit.js';
import {t, formatNumber} from '../i18n/core.js';
import {useT} from '../i18n/index.js';
import {getGame} from '../state/catalog.js';
import {HOMEBREW} from '../homebrew/catalog.js';
import {PS2_GAMES} from '../ps2/catalog.js';
import {BUSY, COMPLETE} from '../state/download-queue.js';
import {downloadQueue} from '../state/downloads.js';
import {colors} from '../ui/colors.js';
import {Icon} from '../ui/Icon.jsx';
import {useNavActions} from '../state/nav.jsx';
import {ButtonHints} from '../ui/ButtonHints.jsx';
import {Button} from '../ui/Button.jsx';
import {useJobs} from './useQueue.js';
import {HINT} from '../ui/Legend.jsx';
import {SummaryPanel} from './SummaryPanel.jsx';
import {DownloadRow, primaryKey} from './DownloadRow.jsx';
import '../assets/Inter-Regular.ttf';

const LIST_HINTS = [
  HINT.select,
  {button: 'square', label: 'hints.pauseResume'},
  {button: 'triangle', label: 'hints.gamePage'},
  HINT.back
];

const EMPTY_HINTS = [HINT.select, HINT.back];

const EMPTY_KEY = 'downloads:empty';


const ps2ById = new Map(PS2_GAMES.map(game => [game.id, game]));

// PS2 and HomeBrew downloads are not in the PS4/PS5 catalog: take their cover from their own lists.
// HomeBrew and BIOS jobs are `local-<homebrew id>` or `local-<homebrew id>-bios-<region>`.
function rowGame(job) {
  const game = getGame(job.gameId) ?? ps2ById.get(job.gameId);
  if (game) return game;
  const item = HOMEBREW.find(
    entry => job.gameId === `local-${entry.id}` || job.gameId?.startsWith(`local-${entry.id}-bios-`)
  );
  return {title: job.title, art: item ? {asset: item.cover} : {}};
}

function summary(jobs) {
  const count = states => jobs.filter(job => states.includes(job.state)).length;
  return [
    [count([...BUSY, 'background']), 'inProgress'],
    [count(['paused', 'awaiting-browser']), 'paused'],
    [count(['failed']), 'failed'],
    [count(COMPLETE), 'completed']
  ]
    .filter(([n]) => n > 0)
    .map(([n, key]) => t(`downloads.summary.${key}`, {count: n}))
    .join(' \xB7 ');
}

function Section({title, jobs, first, handlers}) {
  const t = useT();
  if (!jobs.length) return null;
  return (
    <View style={{gap: 18}}>
      <Text
        style={{
          paddingHorizontal: 6,
          fontFamily: 'Inter-Regular',
          fontSize: 20,
          fontWeight: 600,
          color: '#8a8a94',
          letterSpacing: 1
        }}
      >{`${t(title)}  ${formatNumber(jobs.length)}`}</Text>
      {jobs.map(job => (
        <DownloadRow
          key={job.id}
          job={job}
          game={rowGame(job)}
          autoFocus={job === first}
          run={handlers.run}
          onOpenGame={handlers.openGame}
          onFocusRow={handlers.focusRow}
        />
      ))}
    </View>
  );
}

function Empty({error: error, onBack}) {
  const t = useT();
  return (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 144}}>
      <Icon name="download" size={32} color={colors.subtle} />
      <Text
        style={{
          marginTop: 24,
          fontFamily: 'Inter-Regular',
          fontSize: 27,
          fontWeight: 600,
          color: '#f2f2f3',
          lineHeight: 42
        }}
      >
        {t(error ? 'downloads.unavailable' : 'downloads.empty')}
      </Text>
      <Text
        style={{
          marginTop: 6,
          width: 720,
          textAlign: 'center',
          fontFamily: 'Inter-Regular',
          fontSize: 24,
          color: '#a3a3ab',
          numberOfLines: 3,
          ellipsizeMode: 'tail',
          lineHeight: 36
        }}
      >
        {error || t('downloads.emptyDetail')}
      </Text>
      <View style={{marginTop: 36}}>
        <Button
          variant="outline"
          label={t('downloads.browseGames')}
          focusKey={EMPTY_KEY}
          autoFocus
          onPress={onBack}
        />
      </View>
    </View>
  );
}

export function DownloadsScreen({onBack, onOpenGame}) {
  const t = useT();
  const {jobs, error: error} = useJobs();
  useEffect(() => {
    try {
      void downloadQueue().syncInstalls();
    } catch {}
  }, []);
  const [failure, setFailure] = useState('');
  const [preparing, setPreparing] = useState(false);
  // Hands the downloads to the console's background downloader, which starts once LocalDrive has closed.
  const toBackground = () => {
    if (preparing) return;
    setFailure('');
    setPreparing(true);
    downloadQueue()
      .background()
      .then(
        () => BackHandler.exitApp(),
        caught => {
          setPreparing(false);
          setFailure(caught.message);
        }
      );
  };
  let backgroundable = false;
  try {
    backgroundable = downloadQueue().backgroundable;
  } catch {}
  const {focusLater} = useNavActions();
  const focused = useRef(null);
  const latest = useRef(jobs);
  latest.current = jobs;
  const neighbor = job => {
    const index = latest.current.findIndex(item => item.id === job.id);
    const next = latest.current[index + 1] ?? latest.current[index - 1];
    return next ? primaryKey(next.id) : EMPTY_KEY;
  };
  const [handlers] = useState(() => ({
    run(job, name) {
      setFailure('');
      const target = ['remove', 'cancel', 'deleteFromDisk'].includes(name) ? neighbor(job) : null;
      try {
        void Promise.resolve(downloadQueue()[name](job.id)).catch(caught => setFailure(caught.message));
        if (target) focusLater(target);
      } catch (caught) {
        setFailure(caught.message);
      }
    },
    openGame: job => {
      if (getGame(job.gameId)) onOpenGame(job.gameId, primaryKey(job.id));
    },
    focusRow: job => {
      focused.current = job;
    }
  }));
  const back = () => {
    onBack();
    return true;
  };
  const onAction = action => {
    const job = focused.current && jobs.find(item => item.id === focused.current.id);
    if (!job) return false;
    if (action === 'triangle') handlers.openGame(job);
    else if (action === 'square' && BUSY.includes(job.state)) handlers.run(job, 'pause');
    else if (action === 'square' && ['paused', 'failed'].includes(job.state)) handlers.run(job, 'resume');
    else return false;
    return true;
  };
  const active = jobs.filter(job => BUSY.includes(job.state) || job.state === 'background');
  const stopped = jobs.filter(job => ['paused', 'failed', 'awaiting-browser'].includes(job.state));
  const done = jobs.filter(job => COMPLETE.includes(job.state));
  const first = active[0] ?? stopped[0] ?? done[0];
  return (
    <FocusScope autoFocus onBack={back} onAction={onAction}>
      <View style={{flex: 1}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: 48,
            paddingHorizontal: 48,
            paddingTop: 48,
            paddingBottom: 36
          }}
        >
          <Text
            style={{
              width: 1356,
              fontFamily: 'Inter-Regular',
              fontSize: 30,
              fontWeight: 600,
              color: '#f2f2f3',
              numberOfLines: 1,
              ellipsizeMode: 'tail',
              lineHeight: 42,
              letterSpacing: -0.75
            }}
          >
            {fitBytes(t('downloads.title'), SPAN_MAX)}
            <Text style={{fontWeight: 400, color: '#8a8a94'}}>
              {jobs.length ? fitBytes(`  ${summary(jobs)}`, SPAN_MAX) : ''}
            </Text>
          </Text>
          <Text
            style={{
              width: 420,
              fontFamily: 'Inter-Regular',
              fontSize: 21,
              color: '#f2f2f3',
              numberOfLines: 2,
              ellipsizeMode: 'tail',
              lineHeight: 30
            }}
          >
            {failure}
          </Text>
        </View>
        <View style={{flex: 1, flexDirection: 'row', gap: 48, paddingHorizontal: 48}}>
          {jobs.length > 0 ? (
            <ScrollView style={{flex: 1}}>
              <View style={{gap: 60, paddingBottom: 60}}>
                <Section title="downloads.section.active" jobs={active} first={first} handlers={handlers} />
                <Section title="downloads.section.stopped" jobs={stopped} first={first} handlers={handlers} />
                <Section title="downloads.section.completed" jobs={done} first={first} handlers={handlers} />
              </View>
            </ScrollView>
          ) : (
            <Empty error={error} onBack={onBack} />
          )}
          <SummaryPanel
            error={error}
            background={backgroundable || preparing ? {preparing, onPress: toBackground} : null}
            onFocus={() => {
              focused.current = null;
            }}
          />
        </View>
        <ButtonHints hints={jobs.length > 0 ? LIST_HINTS : EMPTY_HINTS} />
      </View>
    </FocusScope>
  );
}

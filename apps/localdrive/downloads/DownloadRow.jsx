import {memo, useEffect, useState} from 'react';
import {View, Text, Image} from '@ps5-react/core';
import {useLocale, focusEnd, useT} from '../i18n/index.js';
import {STALE_PARTIAL, cause, explainError} from './errors.js';
import {BUSY, COMPLETE} from '../state/download-queue.js';
import {isLocalDriveCdn} from '../game/sources.js';
import {px} from '../ui/scale.js';
import {CdnAura, CdnSpark} from '../ui/CdnAura.jsx';
import {Cover} from '../ui/Cover.jsx';
import {Button} from '../ui/Button.jsx';
import {stateLabel, WAITING} from './labels.js';
import {shapeOf} from './useQueue.js';
import {RowProgress} from './RowProgress.jsx';
import {StatsStrip} from './StatsStrip.jsx';
import {PANEL_KEY} from './SummaryPanel.jsx';
import '../assets/Inter-Regular.ttf';

const THUMB = {width: px(54), height: px(72), borderRadius: px(4)};

const PRIMARY = {width: 198};

const ARM_MS = 3e3;

export const primaryKey = id => `downloads:${id}`;

function primary({state, error: error}, run, openGame) {
  if (state === 'pausing') return {icon: 'pause', label: 'downloads.action.pausing', onPress: () => {}};
  if (BUSY.includes(state))
    return {icon: 'pause', label: 'downloads.action.pause', onPress: () => run('pause')};
  if (['paused', 'failed'].includes(state) && STALE_PARTIAL.test(cause(error)))
    return {icon: 'download', label: 'downloads.action.restart', onPress: () => run('restart')};
  if (state === 'paused')
    return {icon: 'play', label: 'downloads.action.resume', onPress: () => run('resume')};
  if (state === 'failed')
    return {icon: 'download', label: 'downloads.action.retry', onPress: () => run('resume')};
  if (state === 'awaiting-browser')
    return {icon: 'play', label: 'downloads.action.continueOnPage', onPress: openGame};
  if (state === 'downloaded')
    return {icon: 'circleCheck', label: 'downloads.action.install', onPress: () => run('register')};
  return {icon: 'chevronRight', label: 'downloads.action.gamePage', onPress: openGame};
}

function DeleteButton({id, action, run, onFocus}) {
  const {rtl} = useLocale();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return void 0;
    const timer = setTimeout(() => setArmed(false), ARM_MS);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <Button
      variant={armed ? 'primary' : 'secondary'}
      size="icon"
      icon={armed ? 'delete' : 'x'}
      focusKey={`downloads-cancel:${id}`}
      {...focusEnd(rtl, PANEL_KEY)}
      onFocus={onFocus}
      onBlur={() => setArmed(false)}
      onPress={() => {
        if (action === 'remove') {
          run(action);
          return;
        }
        setArmed(!armed);
        if (armed) run(action);
      }}
    />
  );
}

function DownloadRowView({job: job, game, autoFocus, run, onOpenGame, onFocusRow}) {
  const t = useT();
  const {state, release} = job;
  const complete = COMPLETE.includes(state);
  const openGame = () => onOpenGame(job);
  const main = primary(job, name => run(job, name), openGame);
  const onFocus = () => onFocusRow(job);
  const meta = [
    (job.artifact.format || release.format).toUpperCase(),
    `${release.provider} ${release.version || ''}`.trim(),
    job.root
  ].join(' \xB7 ');
  const problem = job.error && explainError(job.error);
  const note = problem
    ? problem.action
      ? t('downloads.problem', {title: problem.title, action: problem.action})
      : problem.title
    : state === 'downloaded'
      ? job.message || t('downloads.installHint')
      : '';
  const cdn = isLocalDriveCdn(release.provider);
  const clear = !complete
    ? 'cancel'
    : state === 'installed' && job.artifact.nextAction === 'shadowmount'
      ? 'remove'
      : 'deleteFromDisk';
  return (
    <View
      style={
        cdn
          ? {position: 'relative', borderRadius: 18, backgroundColor: '#17171a'}
          : {
              overflow: 'hidden',
              borderRadius: 18,
              borderWidth: 2,
              borderColor: '#2a2a2f',
              backgroundColor: '#17171a'
            }
      }
    >
      {cdn ? <CdnAura radius={12} width={904} /> : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 30,
          paddingHorizontal: 30,
          paddingVertical: 24
        }}
      >
        {game.art.asset ? (
          <Image source={game.art.asset} resizeMode="cover" style={THUMB} />
        ) : (
          <Cover game={game} label={false} style={THUMB} />
        )}
        <View style={{flex: 1, gap: 15}}>
          <View
            style={{
              width: 870,
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between'
            }}
          >
            <Text
              style={{
                width: 540,
                fontFamily: 'Inter-Regular',
                fontSize: 27,
                fontWeight: 600,
                color: '#f2f2f3',
                numberOfLines: 1,
                ellipsizeMode: 'tail',
                lineHeight: 42,
                letterSpacing: -0.68
              }}
            >
              {job.title}
            </Text>
            <View
              style={{
                width: 315,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 9
              }}
            >
              {cdn ? <CdnSpark size={13} /> : null}
              <Text
                style={
                  cdn
                    ? {
                        maxWidth: 285,
                        fontFamily: 'Inter-Regular',
                        fontSize: 21,
                        color: '#f2f2f3',
                        numberOfLines: 1,
                        ellipsizeMode: 'tail',
                        lineHeight: 30
                      }
                    : {
                        width: 315,
                        textAlign: 'end',
                        fontFamily: 'Inter-Regular',
                        fontSize: 21,
                        color: '#8a8a94',
                        numberOfLines: 1,
                        ellipsizeMode: 'tail',
                        lineHeight: 30
                      }
                }
              >
                {meta}
              </Text>
            </View>
          </View>
          <RowProgress
            id={job.id}
            label={stateLabel(state)}
            moving={BUSY.includes(state) && state !== 'pausing'}
            waiting={WAITING.includes(state)}
            complete={complete}
          />
          {note ? (
            <Text
              style={
                problem
                  ? {
                      width: 870,
                      fontFamily: 'Inter-Regular',
                      fontSize: 21,
                      color: '#f2f2f3',
                      numberOfLines: 1,
                      ellipsizeMode: 'tail',
                      lineHeight: 30
                    }
                  : {
                      width: 870,
                      fontFamily: 'Inter-Regular',
                      fontSize: 21,
                      color: '#a3a3ab',
                      numberOfLines: 1,
                      ellipsizeMode: 'tail',
                      lineHeight: 30
                    }
              }
            >
              {note}
            </Text>
          ) : null}
        </View>
        <View style={{flexDirection: 'row', gap: 12}}>
          <Button
            variant="secondary"
            icon={main.icon}
            label={t(main.label)}
            style={PRIMARY}
            autoFocus={autoFocus}
            focusKey={primaryKey(job.id)}
            onFocus={onFocus}
            onPress={main.onPress}
          />
          <DeleteButton id={job.id} action={clear} run={name => run(job, name)} onFocus={onFocus} />
        </View>
      </View>
      {state === 'downloading' ? <StatsStrip id={job.id} /> : null}
    </View>
  );
}

export const DownloadRow = memo(
  DownloadRowView,
  (a, b) => shapeOf(a.job) === shapeOf(b.job) && a.autoFocus === b.autoFocus
);

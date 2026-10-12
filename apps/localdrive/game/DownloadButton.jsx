import {useEffect, useMemo, useRef, useState} from 'react';
import {DownloadFormats, View, motion, Text} from '@ps5-react/core';
import {formatPercent} from '../i18n/core.js';
import {useT} from '../i18n/index.js';
import {formatBytes} from '../state/size.js';
import {editionsOf} from '../state/catalog.js';
import {MARGIN} from '../state/space.js';
import {STALE_PARTIAL, cause, explainError} from '../downloads/errors.js';
import {BUSY, COMPLETE} from '../state/download-queue.js';
import {preferredRelease, fallbacks, isLocalDriveCdn} from './sources.js';
import {spaceNeeded, spaceAdvice, canDownload} from './releases.js';
import {downloadQueue, storageRoots, freeBytes, driveName} from '../state/downloads.js';
import {FocusRing} from '../ui/FocusRing.jsx';
import {EASE_OUT} from '../ui/ease.js';
import {useNavActions} from '../state/nav.jsx';
import {WAITING} from '../downloads/labels.js';
import {glide} from '../ui/ProgressBar.jsx';
import {ShimmerText} from '../ui/ShimmerText.jsx';
import {Shine} from '../ui/Shine.jsx';
import {Choice, TextAction} from './Choice.jsx';
import {ProblemNote, MoreOptions} from './DownloadProblem.jsx';
import {statusLine, DISABLED, DownloadLabel} from './DownloadLabel.jsx';
import {useDownload} from './useDownload.js';
import {useFreeSpace} from './useFreeSpace.js';
import {useShadowMount} from './useShadowMount.js';
import '../assets/Inter-Regular.ttf';

const WIDTH = 272;

const GB2 = 1024 ** 3;

const STATUS = {fontFamily: 'Inter-Regular', fontSize: 21, lineHeight: 30};

export function DownloadButton({game, start, onDownloaded, nextDown, onRequestDialog}) {
  const t = useT();
  const releases = game.releases || [];
  const [selected, setSelected] = useState(() => {
    let jobs = [];
    try {
      jobs = downloadQueue()
        .snapshot()
        .filter(job => job.gameId === game.id);
    } catch {}
    const owned = jobs
      .map(job => releases.findIndex(release => release.id === (job.requestedId ?? job.release.id)))
      .find(index => index >= 0);
    return owned ?? preferredRelease(releases);
  });
  const [roots] = useState(() => {
    try {
      return storageRoots();
    } catch {
      return ['/data'];
    }
  });
  const [storage, setStorage] = useState(() => {
    const first = releases[preferredRelease(releases)];
    return Math.max(
      0,
      roots.findIndex(root => {
        const need = spaceNeeded(first, root);
        return !need || freeBytes(root) >= need + MARGIN;
      })
    );
  });
  const release = releases[selected];
  const alternatives = useMemo(() => fallbacks(releases, selected), [releases, selected]);
  const download = useDownload(game, release, roots[storage], alternatives);
  const {progress, restart, remove, deleteFromDisk, job: job, error: error} = download;
  const free = useFreeSpace(roots, download.status, !job);
  const need = spaceNeeded(release, roots[storage]);
  const lacking =
    download.status === 'idle' && need && free[storage] !== null && free[storage] < need + MARGIN;
  const stale = ['paused', 'failed'].includes(download.status) && STALE_PARTIAL.test(cause(error));
  const status = lacking ? 'no-space' : stale ? 'stale' : download.status;
  const begin = () => {
    if (stale) restart();
    else if (!lacking) download.advance();
  };
  const {openEdition, focusLater, push} = useNavActions();
  const editions = editionsOf(game);
  const advance = () => {
    if (status !== 'idle' || editions.length < 2) {
      begin();
      return;
    }
    onRequestDialog({
      kind: 'version',
      title: game.title,
      editions,
      current: game.id,
      submit: edition => {
        if (edition.id === game.id) begin();
        else openEdition(edition.id, true);
      }
    });
  };
  const latest = useRef(null);
  latest.current = {status, begin};
  useEffect(() => {
    if (!start) return void 0;
    const id = setTimeout(() => {
      if (latest.current.status === 'idle') latest.current.begin();
    }, 0);
    return () => clearTimeout(id);
  }, []);
  const shadowMount = useShadowMount(DownloadFormats.images.includes(release?.format));
  const browser = status === 'awaiting-browser';
  const step = job?.parts ? {part: job.partIndex + 1, parts: job.parts.length} : null;
  const requestFile = () =>
    onRequestDialog({
      title: step ? t('download.partFileLink', step) : t('download.fileLink'),
      detail: t('download.fileLinkDetail'),
      submit: url => downloadQueue().continueWithURL(job.id, url)
    });
  const written = (job?.parts?.[job.partIndex]?.written ?? job?.written) > 0;
  const recoverable = ['paused', 'failed', 'stale'].includes(status) || browser;
  const choosing = !job || (browser && !written);
  const sizeGb = job?.total ? job.total / GB2 : release?.sizeBytes ? release.sizeBytes / GB2 : game.sizeGb;
  const inProgress = BUSY.includes(status) || status === 'paused';
  const sizeless = inProgress && !job?.total;
  const amount = sizeless ? formatBytes(job?.written || 0) : formatPercent(Math.round(progress * 100));
  const [state, line] = statusLine(stale ? download.status : status, progress, sizeGb);
  const detail = sizeless ? t('download.soFar', {size: formatBytes(job?.written || 0)}) : line;
  const problem = browser
    ? {
        title: step ? t('download.browser.partTitle', step) : t('download.browser.title'),
        action: t('download.browser.action')
      }
    : error
      ? explainError(error)
      : lacking
        ? {title: t('download.noFit'), action: spaceAdvice(roots, free, storage, need)}
        : shadowMount || status === 'installed'
          ? null
          : {title: t('shadowMount.offTitle'), action: t('shadowMount.offAction')};
  const notice = job?.message;
  const pick = index => {
    if (index !== selected && job && !written && ['awaiting-browser', 'failed', 'paused'].includes(job.state))
      downloadQueue().remove(job.id);
    setSelected(index);
  };
  const chooseSource = from =>
    onRequestDialog({
      kind: 'source',
      title: game.title,
      releases,
      selected,
      submit: pick,
      from,
      editions,
      current: game.id,
      onEdition: id => openEdition(id)
    });
  const saved = job?.written ? formatBytes(job.written) : null;
  const removal = {
    icon: 'x',
    label: t('download.remove.label'),
    detail: t('download.remove.detail'),
    onSelect: remove
  };
  const deletion = job && {
    icon: 'trash',
    label: t('hints.delete'),
    detail: job.artifact.destination,
    onSelect: deleteFromDisk,
    armed: {
      label: t('hints.confirmDelete'),
      detail: t('files.confirmDelete', {size: formatBytes(job.total || 0)})
    }
  };
  const options =
    status === 'installed'
      ? [removal, job.artifact.nextAction === 'shadowmount' ? deletion : null].filter(Boolean)
      : recoverable
        ? [
            stale
              ? null
              : {
                  icon: 'restart',
                  label: t('download.restart.label'),
                  detail: saved
                    ? t('download.restart.detailSaved', {size: saved})
                    : t('download.restart.detail'),
                  onSelect: restart
                },
            removal,
            releases.length > 1
              ? {
                  icon: 'list',
                  label: t('download.otherSource.label'),
                  detail: t('download.otherSource.detail'),
                  onSelect: () => chooseSource(),
                  next: true
                }
              : null
          ].filter(Boolean)
        : [];
  const openOptions = () => onRequestDialog({kind: 'options', title: game.title, items: options});
  const [pulse, setPulse] = useState(false);
  const hidden = (1 - progress) * WIDTH;
  const sourceFocus = `download-source:${game.id}`;
  const storageFocus = `download-storage:${game.id}`;
  const moreFocus = `download-more:${game.id}`;
  const browserFocus = `download-continue:${game.id}`;
  const queueFocus = `download-queue:${game.id}`;
  const mainFocus = `download:${game.id}`;
  const disabled = DISABLED.includes(status);
  const sourceChoice = releases.length > 1 || editions.length > 1;
  const chain = [
    mainFocus,
    choosing && release && sourceChoice && sourceFocus,
    !job && roots.length > 1 && storageFocus,
    browser && browserFocus,
    job && queueFocus,
    options.length > 0 && moreFocus
  ].filter(Boolean);
  const after = key => chain[chain.indexOf(key) + 1] ?? nextDown;
  useEffect(() => {
    if (canDownload(game) && disabled) focusLater(`favorite:${game.id}`);
  }, []);
  useEffect(() => {
    if (!COMPLETE.includes(status)) return;
    setPulse(true);
    onDownloaded();
  }, [status]);
  return (
    <View style={{width: 408, gap: 12}}>
      <View
        onPress={advance}
        autoFocus={canDownload(game) && !disabled}
        focusKey={mainFocus}
        nextFocusDown={after(mainFocus)}
        style={_state => [
          {position: 'relative', height: 72, width: 408, borderRadius: 9},
          disabled
            ? {borderWidth: 2, borderColor: '#2a2a2f'}
            : inProgress
              ? {backgroundColor: '#212125'}
              : [{backgroundColor: '#f2f2f3'}, _state.focused ? {backgroundColor: '#fff'} : null]
        ]}
      >
        <motion.View
          style={{overflow: 'hidden', borderRadius: 9}}
          initial={false}
          animate={{scale: pulse ? 1.035 : 1}}
          transition={{duration: 0.225, ease: EASE_OUT}}
          onAnimationComplete={() => setPulse(false)}
        >
          <DownloadLabel status={status} amount={amount} dark={!inProgress && !disabled} />
          {inProgress && (
            <motion.View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                overflow: 'hidden',
                backgroundColor: '#f2f2f3'
              }}
              initial={{x: -WIDTH}}
              animate={{x: -hidden}}
              transition={glide}
            >
              <motion.View initial={{x: WIDTH}} animate={{x: hidden}} transition={glide}>
                <DownloadLabel status={status} amount={amount} dark />
              </motion.View>
            </motion.View>
          )}
          <Shine width={WIDTH} />
        </motion.View>
        <FocusRing />
      </View>
      <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
        {WAITING.includes(status) ? (
          <ShimmerText textStyle={STATUS}>{state}</ShimmerText>
        ) : (
          <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
            {state}
          </Text>
        )}
        {detail ? (
          <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#8a8a94', lineHeight: 30}}>
            {detail}
          </Text>
        ) : null}
      </View>
      {problem ? (
        <ProblemNote title={problem.title} action={problem.action} />
      ) : notice ? (
        <Text
          style={{
            width: 408,
            fontFamily: 'Inter-Regular',
            fontSize: 21,
            color: '#a3a3ab',
            numberOfLines: 3,
            ellipsizeMode: 'tail',
            lineHeight: 30
          }}
        >
          {notice.slice(0, 160)}
        </Text>
      ) : null}
      {choosing && release ? (
        <Choice
          focusKey={sourceFocus}
          nextFocusDown={after(sourceFocus)}
          onPress={sourceChoice ? () => chooseSource(sourceFocus) : null}
          magic={
            isLocalDriveCdn(release.provider)
              ? {
                  name: release.provider,
                  detail: [t('sources.cdnFastest'), release.sizeBytes && formatBytes(release.sizeBytes)]
                    .filter(Boolean)
                    .join(' \xB7 ')
                }
              : null
          }
          text={[
            t('download.source', {source: release.provider}),
            release.sizeBytes && formatBytes(release.sizeBytes)
          ]
            .filter(Boolean)
            .join(' \xB7 ')}
        />
      ) : null}
      {!job ? (
        <Choice
          focusKey={storageFocus}
          nextFocusDown={after(storageFocus)}
          onPress={roots.length > 1 ? () => setStorage(index => (index + 1) % roots.length) : null}
          text={[
            t('download.saveTo', {drive: driveName(roots[storage])}),
            free[storage] !== null && t('download.free', {size: formatBytes(free[storage])})
          ]
            .filter(Boolean)
            .join(' \xB7 ')}
        />
      ) : null}
      {browser ? (
        <TextAction
          focusKey={browserFocus}
          nextFocusDown={after(browserFocus)}
          onPress={requestFile}
          text={step ? t('download.enterPartLink', step) : t('download.enterLink')}
        />
      ) : null}
      {job ? (
        <TextAction
          focusKey={queueFocus}
          nextFocusDown={after(queueFocus)}
          text={t('download.openQueue')}
          onPress={() => push({name: 'downloads'}, queueFocus)}
        />
      ) : null}
      {options.length ? (
        <MoreOptions focusKey={moreFocus} nextFocusDown={nextDown} onPress={openOptions} />
      ) : null}
    </View>
  );
}

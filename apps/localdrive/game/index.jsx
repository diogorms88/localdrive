import {useEffect, useState} from 'react';
import {View, Text, FocusScope, ScrollView, AnimatePresence} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {featureLabel, relatedGames} from '../state/catalog.js';
import {downloadQueue} from '../state/downloads.js';
import {lightGame, unlight} from '../ui/lightBar.js';
import {GameCard, useFavoriteAction} from '../ui/GameCard.jsx';
import {useNavActions} from '../state/nav.jsx';
import {SectionHeader} from '../ui/SectionHeader.jsx';
import {About} from './About.jsx';
import {GameFacts} from './GameFacts.jsx';
import {URLDialog} from '../downloads/URLDialog.jsx';
import {BrowserCaptureDialog} from '../downloads/BrowserCaptureDialog.jsx';
import {OptionsSheet} from './OptionsSheet.jsx';
import {VersionSheet} from './VersionSheet.jsx';
import {SourcePicker} from './SourcePicker.jsx';
import {GameHero} from './GameHero.jsx';
import {TOAST_MS, InstallToast} from './InstallToast.jsx';
import {ShotViewer} from './ShotViewer.jsx';
import {MediaGallery} from './MediaGallery.jsx';
import {playNotify} from '../ui/sounds.js';
import '../assets/Inter-Regular.ttf';

const CARD_WIDTH = 189;

function Features({features: features}) {
  const t = useT();
  return (
    <View>
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
        {t('game.features')}
      </Text>
      <View style={{marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
        {features.map(feature => (
          <View
            key={feature}
            style={{borderRadius: 9, backgroundColor: '#212125', paddingHorizontal: 18, paddingVertical: 9}}
          >
            <Text style={{fontFamily: 'Inter-Regular', fontSize: 21, color: '#f2f2f3e6', lineHeight: 30}}>
              {featureLabel(feature)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Related({games: games, onOpenGame}) {
  const t = useT();
  return (
    <View scrollAnchor style={{marginTop: 120}}>
      <SectionHeader title={t('game.moreLikeThis')} />
      <View style={{flexDirection: 'row', columnGap: 24}}>
        {games.map(other => (
          <GameCard key={other.id} game={other} width={CARD_WIDTH} onPress={() => onOpenGame(other)} />
        ))}
      </View>
    </View>
  );
}

export function GameScreen({game, download, onBack, onOpenGame}) {
  const [dialog, setDialog] = useState(null);
  const [captureJob, setCaptureJob] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewing, setViewing] = useState(null);
  const {focusLater} = useNavActions();
  const Dialog =
    {source: SourcePicker, options: OptionsSheet, version: VersionSheet}[dialog?.kind] ?? URLDialog;
  const related = relatedGames(game);
  const about = game.about.filter(text => text.trim());
  useEffect(() => {
    const key = `page:${game.id}`;
    lightGame(key, game);
    return () => unlight(key);
  }, [game.id]);
  useEffect(() => {
    if (!toast) return void 0;
    playNotify();
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    let known;
    const queued = jobs => jobs.filter(job => job.gameId === game.id).length;
    try {
      return downloadQueue().subscribe(jobs => {
        setCaptureJob(jobs.find(job => job.gameId === game.id && job.captureState) || null);
        const count = queued(jobs);
        if (known !== void 0 && count > known) setToast('started');
        known = count;
      });
    } catch {
      return void 0;
    }
  }, [game.id]);
  const onAction = useFavoriteAction(game);
  const back = () => {
    onBack();
    return true;
  };
  return (
    <FocusScope trap autoFocus onBack={back} onAction={onAction}>
      <View style={{position: 'relative', flex: 1}}>
        <ScrollView style={{flex: 1}}>
          <GameHero
            onRequestDialog={setDialog}
            game={game}
            download={download}
            onBack={onBack}
            onDownloaded={() => setToast('complete')}
          />
          <View style={{paddingHorizontal: 48, paddingTop: 60, paddingBottom: 96}}>
            <View style={{flexDirection: 'row', gap: 84}}>
              <View style={{width: 1308, gap: 84}}>
                {game.shots.length > 0 ? (
                  <MediaGallery
                    shots={game.shots}
                    nextDown={about.length > 0 ? 'game:about' : void 0}
                    onOpen={setViewing}
                  />
                ) : null}
                {about.length > 0 ? <About paragraphs={about} /> : null}
                {game.features.length > 0 ? <Features features={game.features} /> : null}
              </View>
              <GameFacts game={game} />
            </View>
            {related.length > 0 ? <Related games={related} onOpenGame={onOpenGame} /> : null}
          </View>
        </ScrollView>
        {viewing === null ? null : (
          <ShotViewer
            shots={game.shots}
            start={viewing}
            onClose={index => {
              setViewing(null);
              focusLater(`game:shot:${index}`);
            }}
          />
        )}
        {captureJob ? <BrowserCaptureDialog key={captureJob.id} job={captureJob} /> : null}
        {dialog ? (
          <Dialog
            {...dialog}
            onClose={() => {
              setDialog(null);
              focusLater(dialog.from ?? `download:${game.id}`);
            }}
          />
        ) : null}
        <AnimatePresence>
          {toast ? <InstallToast key={toast} game={game} started={toast === 'started'} /> : null}
        </AnimatePresence>
      </View>
    </FocusScope>
  );
}

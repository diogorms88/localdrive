import {useState} from 'react';
import {FileSystem, View, Text, Image, ScrollView} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {useNavActions} from '../state/nav.jsx';
import {colors} from '../ui/colors.js';
import {Button} from '../ui/Button.jsx';
import {ProgressBar} from '../ui/ProgressBar.jsx';
import {BackLink} from '../game/BackLink.jsx';
import {URLDialog} from '../downloads/URLDialog.jsx';
import {useJobs, useProgress, fractionOf} from '../downloads/useQueue.js';
import {homebrewById} from './catalog.js';
import {savedLink, saveLink} from './links.js';
import {
  payloadPath,
  biosFolder,
  biosFiles,
  downloadHomebrew,
  downloadBios,
  homebrewGameId,
  biosGameId,
  latestJob
} from './download.js';
import '../assets/Inter-Regular.ttf';

const COVER = {width: 840, height: 280};

const BAR = 400;

const heading = {
  fontFamily: 'Inter-Regular',
  fontSize: 30,
  fontWeight: 600,
  color: colors.fg,
  lineHeight: 39
};

const body = {fontFamily: 'Inter-Regular', fontSize: 21, color: colors.muted, lineHeight: 30};

const note = {fontFamily: 'Inter-Regular', fontSize: 20, color: colors.subtle, lineHeight: 27};

// The state of a download, in words: the running step, the error of a failed one, or nothing.
function jobLine(t, entry) {
  if (!entry) return null;
  const {job, busy} = entry;
  if (busy) return t(job.state === 'extracting' ? 'homebrew.state.extracting' : 'homebrew.state.downloading');
  if (job.state === 'failed') return t('homebrew.state.failed', {error: job.error || ''});
  if (job.state === 'paused') return t('homebrew.state.paused');
  // Some files were already in the BIOS folder: the message names them and where the new copies are.
  if (job.state === 'extracted' && job.output) return job.message;
  return null;
}

function Progress({entry}) {
  const t = useT();
  const progress = useProgress(entry?.job.id);
  const line = jobLine(t, entry);
  if (!line) return null;
  return (
    <View style={{gap: 9}}>
      {entry.busy ? <ProgressBar fraction={fractionOf(progress ?? entry.job)} width={BAR} active /> : null}
      <Text style={note}>{line}</Text>
    </View>
  );
}

function Payload({item, jobs, onError}) {
  const t = useT();
  const entry = latestJob(jobs, homebrewGameId(item));
  const path = payloadPath(item);
  const done = !entry?.busy && FileSystem.exists(path);
  return (
    <View style={{gap: 18}}>
      <View style={{flexDirection: 'row'}}>
        <Button
          variant="primary"
          size="lg"
          icon={done ? 'circleCheck' : 'download'}
          label={t(done ? 'homebrew.downloaded.short' : 'homebrew.download')}
          autoFocus
          onPress={() => {
            if (done || entry?.busy) return;
            try {
              downloadHomebrew(item);
            } catch (failure) {
              onError(failure.message);
            }
          }}
        />
      </View>
      <Progress entry={entry} />
      <Text style={note}>
        {done ? t('homebrew.savedTo', {path}) : `${item.filename} \xB7 ${item.source}`}
      </Text>
    </View>
  );
}

function Bios({item, jobs, onAsk, onError}) {
  const t = useT();
  const [, recheck] = useState(0);
  const folder = biosFolder(item);
  const files = biosFiles(item);
  return (
    <View style={{gap: 18, maxWidth: 1400}}>
      <Text style={heading}>{t('homebrew.bios.title')}</Text>
      <Text style={body}>{t('homebrew.bios.detail', {path: folder})}</Text>
      {item.bios.regions.map(region => {
        const entry = latestJob(jobs, biosGameId(item, region));
        return (
          <View key={region.id} style={{gap: 12}}>
            <View style={{flexDirection: 'row'}}>
              <Button
                variant="secondary"
                size="lg"
                icon="download"
                label={region.name}
                onPress={() => {
                  if (entry?.busy) return;
                  if (!region.url) {
                    onAsk(region);
                    return;
                  }
                  try {
                    downloadBios(item, region, region.url);
                  } catch (failure) {
                    onError(failure.message);
                  }
                }}
              />
            </View>
            <Progress entry={entry} />
          </View>
        );
      })}
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 24}}>
        <Text style={note}>
          {files === null
            ? t('homebrew.bios.noFolder')
            : files.length
              ? t('homebrew.bios.found', {files: files.join(', ')})
              : t('homebrew.bios.none')}
        </Text>
        <Button
          variant="ghost"
          size="sm"
          label={t('homebrew.bios.recheck')}
          onPress={() => recheck(n => n + 1)}
        />
      </View>
    </View>
  );
}

export function HomebrewPage({id}) {
  const t = useT();
  const {pop} = useNavActions();
  const item = homebrewById(id);
  const {jobs} = useJobs();
  const [asking, setAsking] = useState(null);
  const [error, setError] = useState('');
  if (!item) return null;
  const key = region => `${item.id}:bios:${region.id}`;
  return (
    <View style={{flex: 1}}>
      <ScrollView style={{flex: 1}}>
        <View style={{paddingHorizontal: 96, paddingTop: 36, paddingBottom: 72, gap: 48}}>
          <BackLink onPress={pop} />
          <View style={{flexDirection: 'row', gap: 60}}>
            <Image source={item.cover} resizeMode="cover" style={[COVER, {borderRadius: 12}]} />
            <View style={{flex: 1, gap: 18, justifyContent: 'center'}}>
              <Text
                style={{
                  fontFamily: 'Inter-Regular',
                  fontSize: 48,
                  fontWeight: 600,
                  color: colors.fg,
                  lineHeight: 60
                }}
              >
                {item.name}
              </Text>
              <Text style={body}>{t(item.description)}</Text>
              <Payload item={item} jobs={jobs} onError={setError} />
              {error ? <Text style={[note, {color: '#ff8a80'}]}>{error}</Text> : null}
            </View>
          </View>
          {item.bios ? <Bios item={item} jobs={jobs} onAsk={setAsking} onError={setError} /> : null}
        </View>
      </ScrollView>
      {asking ? (
        <URLDialog
          title={t('homebrew.bios.link', {region: asking.name})}
          detail={t('homebrew.bios.linkDetail', {path: biosFolder(item)})}
          initial={savedLink(key(asking)) || 'https://'}
          submit={url => {
            downloadBios(item, asking, url);
            saveLink(key(asking), url);
          }}
          onClose={() => setAsking(null)}
        />
      ) : null}
    </View>
  );
}

import {useEffect, useState} from 'react';
import {AnimatePresence} from '@ps5-react/core';
import {useT} from '../i18n/index.js';
import {getGame} from '../state/catalog.js';
import {useNavState, useNavActions} from '../state/nav.jsx';
import {Toast} from './Toast.jsx';
import {useDownloadAlerts} from '../downloads/useDownloadAlerts.js';
import {pulseNotice} from './haptics.js';

const TOAST_MS = 6e3;

export function DownloadToast({actionRef}) {
  const t = useT();
  const [alert, setAlert] = useState(null);
  useDownloadAlerts(next => {
    pulseNotice();
    setAlert(last => ({...next, n: (last?.n ?? 0) + 1}));
  });
  const {top} = useNavState();
  const nav = useNavActions();
  const quiet = top.name === 'downloads' || (top.name === 'game' && top.id === alert?.gameId);
  const shown = alert && !quiet ? alert : null;
  const game = shown && getGame(shown.gameId);
  const failed = shown?.kind === 'failed';
  useEffect(() => {
    if (!alert) return void 0;
    const id = setTimeout(() => setAlert(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [alert]);
  actionRef.current =
    shown &&
    (() => {
      setAlert(null);
      if (failed || !game) nav.push({name: 'downloads'});
      else nav.openGame(game.id);
    });
  return (
    <AnimatePresence>
      {shown && (
        <Toast
          key={shown.n}
          game={game}
          icon={failed ? 'alert' : 'circleCheck'}
          status={shown.message}
          title={shown.title}
          failed={failed}
          action={{button: 'r2', label: t(failed ? 'toast.openDownloads' : 'toast.viewGame')}}
          duration={TOAST_MS}
        />
      )}
    </AnimatePresence>
  );
}

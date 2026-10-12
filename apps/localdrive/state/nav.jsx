import {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {useFocus} from '@ps5-react/core';
import {recordVisit} from './recent.js';

const StateContext = createContext(null);

const ActionsContext = createContext(null);

const ImmersiveContext = createContext(false);

const RETRY_MS = 50;

const GIVE_UP_MS = 1500;

function FocusRequest({target}) {
  const {focus: focus} = useFocus();
  useEffect(() => {
    let waited = 0;
    let id = 0;
    const attempt = () => {
      if (focus(target) || waited >= GIVE_UP_MS) return;
      waited += RETRY_MS;
      id = setTimeout(attempt, RETRY_MS);
    };
    id = setTimeout(attempt, 0);
    return () => clearTimeout(id);
  }, []);
  return null;
}

export function NavProvider({children}) {
  const [stack, setStack] = useState([{name: 'browse'}]);
  const [request, setRequest] = useState(null);
  const [immersive, setImmersive] = useState(0);
  const current = useRef(stack);
  current.current = stack;
  const [actions] = useState(() => {
    const focusLater = target => setRequest(last => ({target, n: (last?.n ?? 0) + 1}));
    const push = (screen, from) => {
      if (screen.name === 'game') recordVisit(screen.id);
      setStack(list => [...list.slice(0, -1), {...list[list.length - 1], from}, screen]);
    };
    return {
      focusLater,
      immerse: delta => setImmersive(count => count + delta),
      push,
      openGame: (id, from) => push({name: 'game', id}, from),
      // Another edition of the open game takes its place, so Back still leaves the title.
      openEdition: (id, download) => {
        recordVisit(id);
        setStack(list => [...list.slice(0, -1), {name: 'game', id, download}]);
      },
      pop: () => {
        const list = current.current;
        if (list.length === 1) return false;
        const back = list[list.length - 2];
        setStack(list.slice(0, -1));
        if (back.from) focusLater(back.from);
        return true;
      },
      home: target => {
        setStack(list => list.slice(0, 1));
        if (target) focusLater(target);
      }
    };
  });
  const state = useMemo(() => ({stack, top: stack[stack.length - 1]}), [stack]);
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={state}>
        <ImmersiveContext.Provider value={immersive > 0}>
          {children}
          {request && <FocusRequest key={request.n} target={request.target} />}
        </ImmersiveContext.Provider>
      </StateContext.Provider>
    </ActionsContext.Provider>
  );
}

export const useNavActions = () => useContext(ActionsContext);

export const useNavState = () => useContext(StateContext);

export function useImmersive(active) {
  const {immerse} = useContext(ActionsContext);
  useEffect(() => {
    if (!active) return void 0;
    immerse(1);
    return () => immerse(-1);
  }, [active]);
}

export const useIsImmersive = () => useContext(ImmersiveContext);

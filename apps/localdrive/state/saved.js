import {useEffect, useState} from 'react';
import {FileSystem} from '@ps5-react/core';
import {SAVED_FILES, isStringList, readJSON, isRecord} from './read-json.js';

const dir = `${FileSystem.dataDir}/localdrive`;

const legacyDir = `${FileSystem.dataDir}/overdrive`;

export function loadList(name, what) {
  const valid = SAVED_FILES[name] ?? isStringList;
  return readJSON(
    FileSystem,
    `${FileSystem.exists(`${dir}/${name}`) ? dir : legacyDir}/${name}`,
    valid === isRecord ? {} : [],
    valid,
    message => console.log(`localdrive: ${what}: ${message}`)
  );
}

export function saveList(name, what, list) {
  try {
    FileSystem.mkdir(dir, {recursive: true});
    FileSystem.writeFile(`${dir}/${name}.tmp`, JSON.stringify(list), {sync: true});
    FileSystem.rename(`${dir}/${name}.tmp`, `${dir}/${name}`);
  } catch (error) {
    console.log(`localdrive: ${what} not saved: ${error.message}`);
  }
}

export function savedList(name, what) {
  let list = loadList(name, what);
  const listeners = new Set();
  return {
    get: () => list,
    set: next => {
      list = next;
      saveList(name, what, list);
      for (const listener of listeners) listener(list);
    },
    useList: () => {
      const [value, setValue] = useState(list);
      useEffect(() => {
        listeners.add(setValue);
        setValue(list);
        return () => {
          listeners.delete(setValue);
        };
      }, []);
      return value;
    }
  };
}

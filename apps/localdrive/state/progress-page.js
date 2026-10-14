import {Platform, FileSystem, Http} from '@ps5-react/core';
import {t} from '../i18n/core.js';

// download-daemon.elf serves the background downloads' progress here while it runs, on 127.0.0.1 only.
export const PAGE_PORT = 10159;

// A home-screen shortcut to that page. Its param.json declares a web-shell app with a deep link, like
// ShadowMountPlus's own launcher: the system opens it in a web view over a running game instead of
// closing the game. ShadowMountPlus registers homebrew folders whose title ID starts with FAKE, so the
// app lays the folder out and asks it to scan; the console's registration stays ShadowMountPlus's job.
const SHORTCUT_ID = 'FAKE99059';
const SHORTCUT_DIR = `/data/homebrew/${SHORTCUT_ID}`;
const WEB_SHELL_APP = 66048;

/** The page's texts in the app's language, for Downloads.background. */
export const pageTexts = () => ({
  heading: t('downloads.page.heading'),
  queued: t('downloadState.queued'),
  connecting: t('downloadState.connecting'),
  downloading: t('downloadState.downloading'),
  verifying: t('downloadState.verifying'),
  retrying: t('downloads.page.retrying'),
  completed: t('downloads.page.completed'),
  failed: t('downloadState.failed'),
  cancelled: t('downloads.page.cancelled'),
  left: t('downloads.page.left', {time: '{time}'})
});

/** Lays out the shortcut once (again when its texts change) and asks ShadowMountPlus to register it. */
export async function ensureProgressShortcut() {
  if (Platform.OS !== 'ps5') return;
  const name = t('downloads.page.shortcut');
  const param = `${JSON.stringify(
    {
      applicationCategoryType: WEB_SHELL_APP,
      titleId: SHORTCUT_ID,
      deeplinkUri: `http://127.0.0.1:${PAGE_PORT}/`,
      localizedParameters: {defaultLanguage: 'en-US', 'en-US': {titleName: name}}
    },
    null,
    2
  )}\n`;
  const paramPath = `${SHORTCUT_DIR}/sce_sys/param.json`;
  try {
    if (FileSystem.exists(paramPath) && FileSystem.readFile(paramPath) === param) return;
    FileSystem.mkdir(`${SHORTCUT_DIR}/sce_sys`, {recursive: true});
    FileSystem.copyFile(`${FileSystem.appDir}/sce_sys/icon0.png`, `${SHORTCUT_DIR}/sce_sys/icon0.png`);
    // ShadowMountPlus expects a folder app to carry an eboot.bin; the web view never runs it.
    if (!FileSystem.exists(`${SHORTCUT_DIR}/eboot.bin`)) FileSystem.writeFile(`${SHORTCUT_DIR}/eboot.bin`, '');
    FileSystem.writeFile(paramPath, param, {sync: true});
    const response = await Http.request('http://127.0.0.1:10101/api/v1/scan', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({reset_attempts: false}),
      maxBytes: 64 * 1024
    });
    console.log(`[progress-page] shortcut ${SHORTCUT_ID} laid out; ShadowMount scan HTTP ${response.status}`);
  } catch (error) {
    // ShadowMountPlus also finds the folder on its own next scan.
    console.log(`[progress-page] shortcut ${SHORTCUT_ID}: ${error.message}`);
  }
}

/* global chrome, globalThis */
/* eslint-disable import/unambiguous */

let scriptsLoadInitiated = false;

function tryImport(...fileNames) {
  try {
    // eslint-disable-next-line
    importScripts(...fileNames);

    return true;
  } catch (e) {
    console.error(e);
  }

  return false;
}

function importAllScripts() {
  // Bail if we've already imported scripts
  if (scriptsLoadInitiated) {
    return;
  }
  scriptsLoadInitiated = true;

  const files = [];

  const loadFile = (fileName) => {
    files.push(fileName);
  };

  loadFile('./globalthis.js');
  // loadFile('./initSentry.js');

  loadFile('./init-globals.js');
  // loadFile('./lockdown.js');
  // loadFile('./runLockdown.js');
  // loadFile('./chromereload.js');
  loadFile('./background.js');
  tryImport(...files);
}

const unregisterDynamicInPageContentScript = async () => {
  if (!chrome.scripting?.unregisterContentScripts) {
    return;
  }

  try {
    await chrome.scripting.unregisterContentScripts({ ids: ['inpages'] });
  } catch (_) {
    // Best-effort cleanup for old dynamic registration; manifest injection is authoritative.
  }
};

unregisterDynamicInPageContentScript();

importAllScripts();

chrome.runtime.onStartup.addListener(() => {
  globalThis.isFirstTimeProfileLoaded = true;
});

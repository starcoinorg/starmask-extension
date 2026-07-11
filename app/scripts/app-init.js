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

importAllScripts();

chrome.runtime.onStartup.addListener(() => {
  globalThis.isFirstTimeProfileLoaded = true;
});


const registerInPageContentScript = async () => {
  try {
    const registeredScripts = await chrome.scripting.getRegisteredContentScripts({
      ids: ['inpages'],
    });
    if (registeredScripts.length > 0) {
      return;
    }

    await chrome.scripting.registerContentScripts([
      {
        id: 'inpages',
        matches: ['file://*/*', 'http://*/*', 'https://*/*'],
        js: ['inpage.js'],
        runAt: 'document_start',
        world: 'MAIN',
      },
    ]);
  } catch (err) {
    console.error(`Failed to register inpage content script. ${err}`);
  }
};

registerInPageContentScript();

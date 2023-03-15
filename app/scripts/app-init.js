

function importAllScripts() {
  const files = [];
  const loadTimeLogs = [];
  function tryImport(...fileNames) {
    try {
      const startTime = new Date().getTime();
      // eslint-disable-next-line
      importScripts(...fileNames);
      const endTime = new Date().getTime();
      loadTimeLogs.push({
        name: fileNames[0],
        value: endTime - startTime,
        children: [],
        startTime,
        endTime,
      });

      return true;
    } catch (e) {
      console.error(e);
    }

    return false;
  }

  const loadFile = (fileName) => {
    files.push(fileName);
  };

  loadFile('./globalthis.js');
  loadFile('./initSentry.js');

  loadFile('./init-globals.js');
  loadFile('./lockdown.js');
  loadFile('./runLockdown.js');
  loadFile('./chromereload.js');
  loadFile('./background.js');
  tryImport(...files);
}

self.addEventListener('install', importAllScripts);

chrome.runtime.onMessage.addListener(() => {
  importAllScripts();
  return false;
});

chrome.runtime.onStartup.addListener(() => {
  globalThis.isFirstTimeProfileLoaded = true;
});

const registerInPageContentScript = async () => {
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: 'inpage',
        matches: ['file://*/*', 'http://*/*', 'https://*/*'],
        js: ['inpage.js'],
        runAt: 'document_start',
        world: 'MAIN',
      },
    ]);
  } catch (err) {
    /**
     * An error occurs when app-init.js is reloaded. Attempts to avoid the duplicate script error:
     * 1. registeringContentScripts inside runtime.onInstalled - This caused a race condition
     *    in which the provider might not be loaded in time.
     * 2. await chrome.scripting.getRegisteredContentScripts() to check for an existing
     *    inpage script before registering - The provider is not loaded on time.
     */
    console.warn(`Dropped attempt to register inpage content script. ${err}`);
  }
};

registerInPageContentScript();
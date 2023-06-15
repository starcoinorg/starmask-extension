// polyfills
import 'abortcontroller-polyfill/dist/polyfill-patch-fetch';
import '@formatjs/intl-relativetimeformat/polyfill';

import PortStream from 'extension-port-stream';

import Eth from 'ethjs';
import StcQuery from '@starcoin/stc-query';
import StreamProvider from 'web3-stream-provider';
import log from 'loglevel';
import {
  ENVIRONMENT_TYPE_FULLSCREEN,
  ENVIRONMENT_TYPE_POPUP,
} from '../../shared/constants/app';
import ExtensionPlatform from './platforms/extension';
import { setupMultiplex } from './lib/stream-utils';
import { getEnvironmentType } from './lib/util';
import metaRPCClientFactory from './lib/metaRPCClientFactory';
import browser from 'webextension-polyfill';
import launchMetaMaskUi, { updateBackgroundConnection } from '../../ui';


const ONE_SECOND_IN_MILLISECONDS = 1_000;

// Service Worker Keep Alive Message Constants
const WORKER_KEEP_ALIVE_INTERVAL = ONE_SECOND_IN_MILLISECONDS;
const WORKER_KEEP_ALIVE_MESSAGE = 'WORKER_KEEP_ALIVE_MESSAGE';
const ACK_KEEP_ALIVE_WAIT_TIME = 60_000; // 1 minute
const ACK_KEEP_ALIVE_MESSAGE = 'ACK_KEEP_ALIVE_MESSAGE';

let lastMessageReceivedTimestamp = Date.now();

let extensionPort;
let ackTimeoutToDisplayError;

const ackKeepAliveListener = (message) => {
  if (message.name === ACK_KEEP_ALIVE_MESSAGE) {
    lastMessageReceivedTimestamp = Date.now();
    clearTimeout(ackTimeoutToDisplayError);
  }
};

function displayCriticalError(container, err) {
  container.innerHTML =
    '<div class="critical-error">The StarMask app failed to load: please open and close StarMask again to restart.</div>';
  container.style.height = '80px';
  log.error(err.stack);
  throw err;
}

const keepAliveInterval = setInterval(() => {
  browser.runtime.sendMessage({ name: WORKER_KEEP_ALIVE_MESSAGE });

  if (extensionPort !== null && extensionPort !== undefined) {
    extensionPort.postMessage({ name: WORKER_KEEP_ALIVE_MESSAGE });

    if (extensionPort.onMessage.hasListener(ackKeepAliveListener) === false) {
      extensionPort.onMessage.addListener(ackKeepAliveListener);
    }
  }

  ackTimeoutToDisplayError = setTimeout(() => {
    if (
      Date.now() - lastMessageReceivedTimestamp >
      ACK_KEEP_ALIVE_WAIT_TIME
    ) {
      clearInterval(keepAliveInterval);
      displayCriticalError(
        'somethingIsWrong',
        new Error("Something's gone wrong. Try reloading the page."),
      );
    }
  }, ACK_KEEP_ALIVE_WAIT_TIME);
}, WORKER_KEEP_ALIVE_INTERVAL);

start().catch(log.error);

async function start() {
  // create platform global
  global.platform = new ExtensionPlatform();

  // identify window type (popup, notification)
  const windowType = getEnvironmentType();

  let isUIInitialised = false;

  // setup stream to background
  extensionPort = browser.runtime.connect({ name: windowType });
  let connectionStream = new PortStream(extensionPort);

  const activeTab = await queryCurrentActiveTab(windowType);
  // initializeUiWithTab(activeTab);

  const messageListener = async (message) => {
    console.log('message listener', message, 'isUIInitialised', isUIInitialised)
    if (message?.data?.method === 'startUISync') {
      if (isUIInitialised) {
        // Currently when service worker is revived we create new streams
        // in later version we might try to improve it by reviving same streams.
        updateUiStreams();
      } else {
        initializeUiWithTab(activeTab);
      }
    }
  };

  const resetExtensionStreamAndListeners = () => {
    extensionPort.onMessage.removeListener(messageListener);
    extensionPort.onDisconnect.removeListener(
      resetExtensionStreamAndListeners,
    );

    // message below will try to activate service worker
    // in MV3 is likely that reason of stream closing is service worker going in-active
    browser.runtime.sendMessage({ name: WORKER_KEEP_ALIVE_MESSAGE });

    extensionPort = browser.runtime.connect({ name: windowType });
    connectionStream = new PortStream(extensionPort);
    extensionPort.onMessage.addListener(messageListener);
    extensionPort.onDisconnect.addListener(resetExtensionStreamAndListeners);
  };

  extensionPort.onMessage.addListener(messageListener);
  extensionPort.onDisconnect.addListener(resetExtensionStreamAndListeners);

  // initializeUiWithTab(activeTab);

  function initializeUiWithTab(tab) {
    const container = document.getElementById('app-content');
    initializeUi(tab, container, connectionStream, (err, store) => {
      if (err) {
        displayCriticalError(container, err);
        return;
      }

      isUIInitialised = true;

      const state = store.getState();
      const { starmask: { completedOnboarding } = {} } = state;

      if (!completedOnboarding && windowType !== ENVIRONMENT_TYPE_FULLSCREEN) {
        global.platform.openExtensionInBrowser();
      }
    });
  }

  // Function to update new backgroundConnection in the UI
  function updateUiStreams() {
    connectToAccountManager(connectionStream, (err, backgroundConnection) => {
      if (err) {
        displayCriticalError(
          'troubleStarting',
          err,
          ///: BEGIN:ONLY_INCLUDE_IN(flask)
          undefined,
          backgroundConnection,
          ///: END:ONLY_INCLUDE_IN
        );
        return;
      }

      updateBackgroundConnection(backgroundConnection);
    });
  }
}

 

async function queryCurrentActiveTab(windowType) {
  return new Promise((resolve) => {
    // At the time of writing we only have the `activeTab` permission which means
    // that this query will only succeed in the popup context (i.e. after a "browserAction")
    if (windowType !== ENVIRONMENT_TYPE_POPUP) {
      resolve({});
      return;
    }

    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const [activeTab] = tabs;
      const { id, title, url } = activeTab;
      const { origin, protocol } = url ? new URL(url) : {};

      if (!origin || origin === 'null') {
        resolve({});
        return;
      }

      resolve({ id, title, origin, protocol, url });
    });
  });
}

function initializeUi(activeTab, container, connectionStream, cb) {
  connectToAccountManager(connectionStream, (err, backgroundConnection) => {
    if (err) {
      cb(err);
      return;
    }

    launchMetaMaskUi(
      {
        activeTab,
        container,
        backgroundConnection,
      },
      cb,
    );
  });
}

/**
 * Establishes a connection to the background and a Web3 provider
 *
 * @param {PortDuplexStream} connectionStream - PortStream instance establishing a background connection
 * @param {Function} cb - Called when controller connection is established
 */
function connectToAccountManager(connectionStream, cb) {
  const mx = setupMultiplex(connectionStream);
  setupControllerConnection(mx.createStream('controller'), cb);
  setupWeb3Connection(mx.createStream('provider'));
}

/**
 * Establishes a streamed connection to a Web3 provider
 *
 * @param {PortDuplexStream} connectionStream - PortStream instance establishing a background connection
 */
function setupWeb3Connection(connectionStream) {
  const providerStream = new StreamProvider();
  providerStream.pipe(connectionStream).pipe(providerStream);
  connectionStream.on('error', console.error.bind(console));
  providerStream.on('error', console.error.bind(console));
  global.ethereumProvider = providerStream;
  global.stcQuery = new StcQuery(providerStream);
  global.eth = new Eth(providerStream);
}

/**
 * Establishes a streamed connection to the background account manager
 *
 * @param {PortDuplexStream} connectionStream - PortStream instance establishing a background connection
 * @param {Function} cb - Called when the remote account manager connection is established
 */
function setupControllerConnection(connectionStream, cb) {
  const backgroundRPC = metaRPCClientFactory(connectionStream);
  cb(null, backgroundRPC);
}

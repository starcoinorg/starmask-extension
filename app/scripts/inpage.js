// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
let __define;

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
const cleanContextForImports = () => {
  __define = global.define;
  try {
    global.define = undefined;
  } catch (_) {
    console.warn('StarMask - global.define could not be deleted.');
  }
};

/**
 * Restores global define object from cached reference
 */
const restoreContextAfterImports = () => {
  try {
    global.define = __define;
  } catch (_) {
    console.warn('StarMask - global.define could not be overwritten.');
  }
};

cleanContextForImports();

/* eslint-disable import/first */
import log from 'loglevel';
import LocalMessageDuplexStream from 'post-message-stream';
import { initializeProvider } from '@starcoin/stc-inpage-provider';
import shouldInjectProvider from '../../shared/modules/provider-injection';

restoreContextAfterImports();

log.setDefaultLevel(process.env.STARMASK_DEBUG ? 'debug' : 'warn');

//
// setup plugin communication
//

if (shouldInjectProvider()) {
  // setup background connection
const starmaskStream = new LocalMessageDuplexStream({
  name: 'starmask-inpage',
  target: 'starmask-contentscript',
});

  initializeProvider({
    connectionStream: starmaskStream,
    jsonRpcStreamName: 'starmask-provider',
    logger: log,
    shouldSendMetadata: false,
  });  
}


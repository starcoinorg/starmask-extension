import ObjectMultiplex from 'obj-multiplex';
import pump from 'pump';

import { EXTENSION_MESSAGES } from '../../../shared/constants/app';


/**
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @returns {stream.Stream} the multiplexed stream
 */
export function setupMultiplex(connectionStream) {
  const mux = new ObjectMultiplex();
  mux.ignoreStream(EXTENSION_MESSAGES.CONNECTION_READY);
  mux.ignoreStream('ACK_KEEP_ALIVE_MESSAGE');
  mux.ignoreStream('WORKER_KEEP_ALIVE_MESSAGE');
  pump(connectionStream, mux, connectionStream, (err) => {
    if (err) {
      console.error(err);
    }
  });
  return mux;
}

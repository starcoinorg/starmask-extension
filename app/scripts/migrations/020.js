/*

This migration ensures previous installations
get a `firstTimeInfo` key on the starmask state,
so that we can version notices in the future.

*/

import { cloneDeep } from 'lodash';

const version = 20;

export default {
  version,

  migrate(originalVersionedData) {
    const versionedData = cloneDeep(originalVersionedData);
    versionedData.meta.version = version;
    try {
      const state = versionedData.data;
      const newState = transformState(state);
      versionedData.data = newState;
    } catch (err) {
      console.warn(`MetaMask Migration #${version}${err.stack}`);
    }
    return Promise.resolve(versionedData);
  },
};

function transformState(state) {
  const newState = state;
  if ('starmask' in newState && !('firstTimeInfo' in newState.starmask)) {
    newState.starmask.firstTimeInfo = {
      version: '0.5.0',
      date: Date.now(),
    };
  }
  return newState;
}

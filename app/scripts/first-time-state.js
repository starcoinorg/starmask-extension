/**
 * @typedef {Object} FirstTimeState
 * @property {Object} config Initial configuration parameters
 * @property {Object} NetworkController Network controller state
 */

/**
 * @type {FirstTimeState}
 */
const initialState = {
  config: {},
  PreferencesController: {
    frequentRpcListDetail: [
      {
        rpcUrl: 'http://localhost:9850',
        chainId: '0xfe',
        ticker: 'STC',
        nickname: 'Localhost 9850',
        rpcPrefs: {},
      },
    ],
  },
};

export default initialState;

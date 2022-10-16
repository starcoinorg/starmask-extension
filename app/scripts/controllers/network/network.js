import assert from 'assert';
import EventEmitter from 'events';
import { ComposedStore, ObservableStore } from '@metamask/obs-store';
import { JsonRpcEngine } from 'json-rpc-engine';
import providerFromEngine from '@starcoin/stc-json-rpc-middleware/providerFromEngine';
import log from 'loglevel';
import {
  createSwappableProxy,
  createEventEmitterProxy,
} from 'swappable-obj-proxy';
import StcQuery from '@starcoin/stc-query';
import {
  BARNARD,
  MAINNET,
  INFURA_PROVIDER_TYPES,
  NETWORK_TYPE_RPC,
  NETWORK_TYPE_TO_ID_MAP,
  MAINNET_CHAIN_ID,
  BARNARD_CHAIN_ID,
  DEVNET,
  DEVNET_CHAIN_ID,
} from '../../../../shared/constants/network';
import {
  isPrefixedFormattedHexString,
  isSafeChainId,
} from '../../../../shared/modules/network.utils';
import createMetamaskMiddleware from './createMetamaskMiddleware';
import createInfuraClient from './createInfuraClient';
import createJsonRpcClient from './createJsonRpcClient';
import { chain } from 'lodash';
import { defaultNetworksData } from '../../../../ui/app/pages/settings/networks-tab/networks-tab.constants';


const env = process.env.METAMASK_ENV;

let defaultProviderConfigOpts;
if (process.env.IN_TEST === 'true') {
  defaultProviderConfigOpts = {
    ticker: 'STC',
    type: NETWORK_TYPE_RPC,
    rpcUrl: 'http://localhost:9850',
    chainId: '0xfe',
    nickname: 'Localhost 9850',
  };
} else if (process.env.STARMASK_DEBUG || env === 'test') {
  // defaultProviderConfigOpts = {
  //   type: NETWORK_TYPE_RPC,
  //   rpcUrl: 'http://localhost:9850',
  //   chainId: '0xfe',
  //   nickname: 'Localhost 9850',
  // };

  defaultProviderConfigOpts = { ticker: 'STC', type: BARNARD, chainId: BARNARD_CHAIN_ID };
  // defaultProviderConfigOpts = { ticker: 'APT', type: DEVNET, chainId: DEVNET_CHAIN_ID };
} else {
  defaultProviderConfigOpts = { ticker: 'STC', type: MAINNET, chainId: MAINNET_CHAIN_ID };
}

const defaultProviderConfig = {
  ...defaultProviderConfigOpts,
};

export const NETWORK_EVENTS = {
  // Fired after the actively selected network is changed
  NETWORK_DID_CHANGE: 'networkDidChange',
  // Fired when the actively selected network *will* change
  NETWORK_WILL_CHANGE: 'networkWillChange',
};

export default class NetworkController extends EventEmitter {
  constructor(opts = {}) {
    super();

    // create stores
    this.providerStore = new ObservableStore(
      opts.provider || { ...defaultProviderConfig },
    );
    this.previousProviderStore = new ObservableStore(
      this.providerStore.getState(),
    );
    this.networkStore = new ObservableStore('loading');
    this.store = new ComposedStore({
      provider: this.providerStore,
      previousProviderStore: this.previousProviderStore,
      network: this.networkStore,
    });

    // provider and block tracker
    this._provider = null;
    this._blockTracker = null;

    // provider and block tracker proxies - because the network changes
    this._providerProxy = null;
    this._blockTrackerProxy = null;

    this.on(NETWORK_EVENTS.NETWORK_DID_CHANGE, this.lookupNetwork);
  }

  /**
   * Sets the Infura project ID
   *
   * @param {string} projectId - The Infura project ID
   * @throws {Error} if the project ID is not a valid string
   * @return {void}
   */
  setInfuraProjectId(projectId) {
    if (!projectId || typeof projectId !== 'string') {
      throw new Error('Invalid Infura project ID');
    }

    this._infuraProjectId = projectId;
  }

  initializeProvider(providerParams) {
    this._baseProviderParams = providerParams;
    const { type, rpcUrl, chainId } = this.getProviderConfig();
    this._configureProvider({ type, rpcUrl, chainId });
    this.lookupNetwork();
  }

  // return the proxies so the references will always be good
  getProviderAndBlockTracker() {
    const provider = this._providerProxy;
    const blockTracker = this._blockTrackerProxy;
    return { provider, blockTracker };
  }

  verifyNetwork() {
    // Check network when restoring connectivity:
    if (this.isNetworkLoading()) {
      this.lookupNetwork();
    }
  }

  getNetworkState() {
    return this.networkStore.getState();
  }

  setNetworkState(network) {
    this.networkStore.putState(network);
  }

  isNetworkLoading() {
    return this.getNetworkState() === 'loading';
  }

  lookupNetwork() {
    // Prevent firing when provider is not defined.
    if (!this._provider) {
      log.warn(
        'NetworkController - lookupNetwork aborted due to missing provider',
      );
      return;
    }

    const chainId = this.getCurrentChainId();
    if (!chainId) {
      log.warn(
        'NetworkController - lookupNetwork aborted due to missing chainId',
      );
      this.setNetworkState('loading');
      return;
    }
    // Ping the RPC endpoint so we can confirm that it works
    const stcQuery = new StcQuery(this._provider);
    const initialNetwork = this.getNetworkState();

    stcQuery.sendAsync({ method: 'chain.id' }, (err, networkVersion) => {
      const currentNetwork = this.getNetworkState();
      if (initialNetwork === currentNetwork) {
        if (err) {
          this.setNetworkState('loading');
          return;
        }

        this.setNetworkState(networkVersion);
      }
    });
  }

  getCurrentChainId() {
    const { type, chainId: configChainId } = this.getProviderConfig();
    return NETWORK_TYPE_TO_ID_MAP[type]?.chainId || configChainId;
  }

  getCurrentNetworkTicker() {
    const { ticker } = this.getProviderConfig();
    return ticker;
  }

  getPreviousNetworkTicker() {
    const { ticker } = this.getPreviousProviderConfig();
    return ticker;
  }

  setRpcTarget(rpcUrl, chainId, ticker = 'STC', nickname = '', rpcPrefs) {
    assert.ok(
      isPrefixedFormattedHexString(chainId),
      `Invalid chain ID "${ chainId }": invalid hex string.`,
    );
    assert.ok(
      isSafeChainId(parseInt(chainId, 16)),
      `Invalid chain ID "${ chainId }": numerical value greater than max safe value.`,
    );
    this.setProviderConfig({
      type: NETWORK_TYPE_RPC,
      rpcUrl,
      chainId,
      ticker,
      nickname,
      rpcPrefs,
    });
  }

  async setProviderType(type, rpcUrl = '', ticker = 'STC', nickname = '') {
    const network = defaultNetworksData.filter(item => item.providerType === type)[0]
    if (network) {
      rpcUrl = network.rpcUrl
      ticker = network.ticker
    }
    assert.notStrictEqual(
      type,
      NETWORK_TYPE_RPC,
      `NetworkController - cannot call "setProviderType" with type "${ NETWORK_TYPE_RPC }". Use "setRpcTarget"`,
    );
    assert.ok(
      INFURA_PROVIDER_TYPES.includes(type),
      `Unknown Infura provider type "${ type }".`,
    );
    const { chainId } = NETWORK_TYPE_TO_ID_MAP[type];
    this.setProviderConfig({ type, rpcUrl, chainId, ticker, nickname });
  }

  resetConnection() {
    this.setProviderConfig(this.getProviderConfig());
  }

  /**
   * Sets the provider config and switches the network.
   */
  setProviderConfig(config) {
    const configPreviousProviderStore = this.previousProviderStore.getState();
    this.previousProviderStore.updateState(this.getProviderConfig());
    this.providerStore.updateState(config);
    this._switchNetwork(config);
  }

  rollbackToPreviousProvider() {
    const config = this.previousProviderStore.getState();
    this.providerStore.updateState(config);
    this._switchNetwork(config);
  }

  getPreviousProviderConfig() {
    return this.previousProviderStore.getState();
  }

  getProviderConfig() {
    return this.providerStore.getState();
  }

  getNetworkIdentifier() {
    const provider = this.providerStore.getState();
    return provider.type === NETWORK_TYPE_RPC ? provider.rpcUrl : provider.type;
  }

  //
  // Private
  //

  _switchNetwork(opts) {
    this.emit(NETWORK_EVENTS.NETWORK_WILL_CHANGE);
    this.setNetworkState('loading');
    this._configureProvider(opts);
    this.emit(NETWORK_EVENTS.NETWORK_DID_CHANGE, opts.type);
  }

  _configureProvider({ type, rpcUrl, chainId }) {
    // infura type-based endpoints
    const isInfura = INFURA_PROVIDER_TYPES.includes(type);
    if (isInfura) {
      this._configureInfuraProvider(type, this._infuraProjectId);
      // url-based rpc endpoints
    } else if (type === NETWORK_TYPE_RPC) {
      this._configureStandardProvider(rpcUrl, chainId);
    } else {
      throw new Error(
        `NetworkController - _configureProvider - unknown type "${ type }"`,
      );
    }
  }

  _configureInfuraProvider(type, projectId) {
    log.info('NetworkController - configureInfuraProvider', type);
    const networkClient = createInfuraClient({
      network: type,
      projectId,
    });
    this._setNetworkClient(networkClient);
  }

  _configureStandardProvider(rpcUrl, chainId) {
    log.info('NetworkController - configureStandardProvider', rpcUrl);
    const networkClient = createJsonRpcClient({ rpcUrl, chainId });
    this._setNetworkClient(networkClient);
  }

  _setNetworkClient({ networkMiddleware, blockTracker }) {
    const metamaskMiddleware = createMetamaskMiddleware(
      this._baseProviderParams,
    );
    const engine = new JsonRpcEngine();
    engine.push(metamaskMiddleware);
    engine.push(networkMiddleware);
    const provider = providerFromEngine(engine);
    this._setProviderAndBlockTracker({ provider, blockTracker });
  }

  _setProviderAndBlockTracker({ provider, blockTracker }) {
    // update or intialize proxies
    if (this._providerProxy) {
      this._providerProxy.setTarget(provider);
    } else {
      this._providerProxy = createSwappableProxy(provider);
    }
    if (this._blockTrackerProxy) {
      this._blockTrackerProxy.setTarget(blockTracker);
    } else {
      this._blockTrackerProxy = createEventEmitterProxy(blockTracker, {
        eventFilter: 'skipInternal',
      });
    }
    // set new provider and blockTracker
    this._provider = provider;
    this._blockTracker = blockTracker;
  }
}

import Web3 from 'web3';
import contracts from '@starcoin-org/contract-metadata';
import { warn } from 'loglevel';
// import SINGLE_CALL_BALANCES_ABI from 'single-call-balance-checker-abi';
import { MAINNET_CHAIN_ID } from '../../../shared/constants/network';
// import { SINGLE_CALL_BALANCES_ADDRESS } from '../constants/contracts';
// import { LOG_IGNORE_METHODS } from './permissions/enums';

// By default, poll every 3 minutes
const DEFAULT_INTERVAL = 180 * 1000;

/**
 * A controller that polls for token exchange
 * rates based on a user's current token list
 */
export default class DetectTokensController {
  /**
   * Creates a DetectTokensController
   *
   * @param {Object} [config] - Options to configure controller
   */
  constructor({
    interval = DEFAULT_INTERVAL,
    preferences,
    network,
    keyringMemStore,
  } = {}) {
    this.preferences = preferences;
    this.interval = interval;
    this.network = network;
    this.keyringMemStore = keyringMemStore;
  }

  /**
   * For each token in @starcoin-org/contract-metadata, find check selectedAddress balance.
   */
  async detectNewTokens() {
    if (!this.isActive) {
      return;
    }
    if (this._network.store.getState().provider.chainId !== MAINNET_CHAIN_ID) {
      return;
    }

    const tokensToDetect = [];
    this.web3.setProvider(this._network._provider);
    for (const contractAddress in contracts) {
      if (
        contracts[contractAddress].erc20 &&
        !this.tokenAddresses.includes(contractAddress.toLowerCase()) &&
        !this.hiddenTokens.includes(contractAddress.toLowerCase())
      ) {
        tokensToDetect.push(contractAddress);
      }
    }

    let result;
    try {
      result = await this._getTokenBalances(tokensToDetect);
    } catch (error) {
      warn(
        `StarMask - DetectTokensController single call balance fetch failed`,
        error,
      );
      return;
    }

    tokensToDetect.forEach((tokenAddress, index) => {
      const balance = result[index];
      if (balance && !balance.isZero()) {
        this._preferences.addToken(
          tokenAddress,
          contracts[tokenAddress].symbol,
          contracts[tokenAddress].decimals,
        );
      }
    });
  }

  async _getTokenBalances(tokens) {
    return [];
    // const ethContract = this.web3.eth
    //   .contract(SINGLE_CALL_BALANCES_ABI)
    //   .at(SINGLE_CALL_BALANCES_ADDRESS);
    // return new Promise((resolve, reject) => {
    //   ethContract.balances([this.selectedAddress], tokens, (error, result) => {
    //     if (error) {
    //       return reject(error);
    //     }
    //     return resolve(result);
    //   });
    // });
  }

  /**
   * Restart token detection polling period and call detectNewTokens
   * in case of address change or user session initialization.
   *
   */
  restartTokenDetection() {
    if (!(this.isActive && this.selectedAddress)) {
      return;
    }
    this.detectNewTokens();
    this.interval = DEFAULT_INTERVAL;
  }

  /* eslint-disable accessor-pairs */
  /**
   * @type {Number}
   */
  set interval(interval) {
    this._handle && clearInterval(this._handle);
    if (!interval) {
      return;
    }
    this._handle = setInterval(() => {
      this.detectNewTokens();
    }, interval);
  }

  /**
   * In setter when selectedAddress is changed, detectNewTokens and restart polling
   * @type {Object}
   */
  set preferences(preferences) {
    if (!preferences) {
      return;
    }
    this._preferences = preferences;
    const currentTokens = preferences.store.getState().tokens;
    this.tokenAddresses = currentTokens
      ? currentTokens.map((token) => token.address)
      : [];
    this.hiddenTokens = preferences.store.getState().hiddenTokens;
    preferences.store.subscribe(({ tokens = [], hiddenTokens = [] }) => {
      this.tokenAddresses = tokens.map((token) => {
        return token.address;
      });
      this.hiddenTokens = hiddenTokens;
    });
    preferences.store.subscribe(({ selectedAddress }) => {
      if (this.selectedAddress !== selectedAddress) {
        this.selectedAddress = selectedAddress;
        this.restartTokenDetection();
      }
    });
  }

  /**
   * @type {Object}
   */
  set network(network) {
    if (!network) {
      return;
    }
    this._network = network;
    this.web3 = new Web3(network._provider);
  }

  /**
   * In setter when isUnlocked is updated to true, detectNewTokens and restart polling
   * @type {Object}
   */
  set keyringMemStore(keyringMemStore) {
    if (!keyringMemStore) {
      return;
    }
    this._keyringMemStore = keyringMemStore;
    this._keyringMemStore.subscribe(({ isUnlocked }) => {
      if (this.isUnlocked !== isUnlocked) {
        this.isUnlocked = isUnlocked;
        if (isUnlocked) {
          this.restartTokenDetection();
        }
      }
    });
  }

  /**
   * Internal isActive state
   * @type {Object}
   */
  get isActive() {
    return this.isOpen && this.isUnlocked;
  }
  /* eslint-enable accessor-pairs */
}

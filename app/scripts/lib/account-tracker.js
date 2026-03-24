/* Account Tracker
 *
 * This module is responsible for tracking any number of accounts
 * and caching their current balances & transaction counts.
 *
 * It also tracks transaction hashes, and checks their inclusion status
 * on each new block.
 */

import StcQuery from '@starcoin/stc-query';
import { addHexPrefix } from '@starcoin/stc-util';
import { ObservableStore } from '@metamask/obs-store';
import log from 'loglevel';
import pify from 'pify';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import SINGLE_CALL_BALANCES_ABI from 'single-call-balance-checker-abi';
// import {
//   MAINNET_CHAIN_ID,
//   RINKEBY_CHAIN_ID,
//   ROPSTEN_CHAIN_ID,
//   KOVAN_CHAIN_ID,
// } from '../../../shared/constants/network';

// import {
//   SINGLE_CALL_BALANCES_ADDRESS,
//   SINGLE_CALL_BALANCES_ADDRESS_RINKEBY,
//   SINGLE_CALL_BALANCES_ADDRESS_ROPSTEN,
//   SINGLE_CALL_BALANCES_ADDRESS_KOVAN,
// } from '../constants/contracts';
import { decodeNFTMeta } from '../../../ui/app/helpers/utils/nft-util';
import { bnToHex } from './util';
import { stripHexPrefix } from 'ethereumjs-util';

/**
 * This module is responsible for tracking any number of accounts and caching their current balances & transaction
 * counts.
 *
 * It also tracks transaction hashes, and checks their inclusion status on each new block.
 *
 * @typedef {Object} AccountTracker
 * @property {Object} store The stored object containing all accounts to track, as well as the current block's gas limit.
 * @property {Object} store.accounts The accounts currently stored in this AccountTracker
 * @property {string} store.currentBlockGasLimit A hex string indicating the gas limit of the current block
 * @property {Object} _provider A provider needed to create the StcQuery instance used within this AccountTracker.
 * @property {StcQuery} _query An StcQuery instance used to access account information from the blockchain
 * @property {BlockTracker} _blockTracker A BlockTracker instance. Needed to ensure that accounts and their info updates
 * when a new block is created.
 * @property {Object} _currentBlockNumber Reference to a property on the _blockTracker: the number (i.e. an id) of the the current block
 *
 */
export default class AccountTracker {
  /**
   * @param {Object} opts - Options for initializing the controller
   * @param {Object} opts.provider - An EIP-1193 provider instance that uses the current global network
   * @param {Object} opts.blockTracker - A block tracker, which emits events for each new block
   * @param {Function} opts.getCurrentChainId - A function that returns the `chainId` for the current global network
   * @param {Function} opts.getCurrentNetworkTicker - A function that returns the `ticker` for the current global network
   */
  constructor(opts = {}) {
    const initState = {
      assets: {},
      accounts: {},
      nfts: {},
      nftIdentifier: {},
      nftMetas: {},
      tokenHandles: {},
      currentBlockGasLimit: '',
    };
    this.store = new ObservableStore(initState);

    this._provider = opts.provider;
    this._query = pify(new StcQuery(this._provider));
    this._blockTracker = opts.blockTracker;
    // blockTracker.currentBlock may be null
    this._currentBlockNumber = this._blockTracker.getCurrentBlock();
    this._blockTracker.once('latest', (blockNumber) => {
      this._currentBlockNumber = blockNumber;
    });
    // bind function for easier listener syntax
    this._updateForBlock = this._updateForBlock.bind(this);
    this.getCurrentChainId = opts.getCurrentChainId;
    this.getCurrentNetworkTicker = opts.getCurrentNetworkTicker;

    this.web3 = new Web3(this._provider);
    console.warn('[AccountTracker] constructor called - DEBUG BUILD v2');
  }

  start() {
    console.warn('[AccountTracker] start() called');
    // remove first to avoid double add
    this._blockTracker.removeListener('latest', this._updateForBlock);
    // add listener
    this._blockTracker.addListener('latest', this._updateForBlock);
    // fetch account balances
    this._updateAccounts();
  }

  stop() {
    // remove listener
    this._blockTracker.removeListener('latest', this._updateForBlock);
  }

  /**
   * Ensures that the locally stored accounts are in sync with a set of accounts stored externally to this
   * AccountTracker.
   *
   * Once this AccountTracker's accounts are up to date with those referenced by the passed addresses, each
   * of these accounts are given an updated balance via StcQuery.
   *
   * @param {Array} address - The array of hex addresses for accounts with which this AccountTracker's accounts should be
   * in sync
   *
   */
  syncWithAddresses(addresses) {
    const { accounts } = this.store.getState();
    const locals = Object.keys(accounts);

    const accountsToAdd = [];
    addresses.forEach((upstream) => {
      if (!locals.includes(upstream)) {
        accountsToAdd.push(upstream);
      }
    });

    const accountsToRemove = [];
    locals.forEach((local) => {
      if (!addresses.includes(local)) {
        accountsToRemove.push(local);
      }
    });

    this.addAccounts(accountsToAdd);
    this.removeAccount(accountsToRemove);
  }

  /**
   * Adds new addresses to track the balances of
   * given a balance as long this._currentBlockNumber is defined.
   *
   * @param {Array} addresses - An array of hex addresses of new accounts to track
   *
   */
  addAccounts(addresses) {
    const { accounts } = this.store.getState();
    // add initial state for addresses
    addresses.forEach((address) => {
      accounts[address] = {};
    });
    // save accounts state
    this.store.updateState({ accounts });
    // fetch balances for the accounts if there is block number ready
    if (!this._currentBlockNumber) {
      return;
    }
    this._updateAccounts();
  }

  /**
   * Removes accounts from being tracked
   *
   * @param {Array} an - array of hex addresses to stop tracking
   *
   */
  removeAccount(addresses) {
    const { accounts } = this.store.getState();
    // remove each state object
    addresses.forEach((address) => {
      delete accounts[address];
    });
    // save accounts state
    this.store.updateState({ accounts });
  }

  /**
   * Removes all addresses and associated balances
   */

  clearAccounts() {
    this.store.updateState({ accounts: {} });
  }

  /**
   * Given a block, updates this AccountTracker's currentBlockGasLimit, and then updates each local account's balance
   * via StcQuery
   *
   * @private
   * @param {number} blockNumber - the block number to update to.
   * @fires 'block' The updated state, if all account updates are successful
   *
   */
  async _updateForBlock(blockNumber) {
    this._currentBlockNumber = parseInt(blockNumber, 10);
    // block gasLimit polling shouldn't be in account-tracker shouldn't be here...
    const currentBlock = await this._query.getBlockByNumber(this._currentBlockNumber);
    if (!currentBlock) {
      return;
    }
    const currentBlockGasLimit = currentBlock.gasLimit;
    this.store.updateState({ currentBlockGasLimit });

    try {
      await this._updateAccounts();
    } catch (err) {
      log.error(err);
    }
  }

  /**
   * balanceChecker is deployed on main eth (test)nets and requires a single call
   * for all other networks, calls this._updateAccount for each account in this.store
   *
   * @returns {Promise} after all account balances updated
   *
   */
  async _updateAccounts() {
    const { accounts } = this.store.getState();
    const addresses = Object.keys(accounts);
    console.warn('[AccountTracker] _updateAccounts() addresses:', addresses);
    // const chainId = this.getCurrentChainId();

    // switch (chainId) {
    //   case MAINNET_CHAIN_ID:
    //     await this._updateAccountsViaBalanceChecker(
    //       addresses,
    //       SINGLE_CALL_BALANCES_ADDRESS,
    //     );
    //     break;

    //   case RINKEBY_CHAIN_ID:
    //     await this._updateAccountsViaBalanceChecker(
    //       addresses,
    //       SINGLE_CALL_BALANCES_ADDRESS_RINKEBY,
    //     );
    //     break;

    //   case ROPSTEN_CHAIN_ID:
    //     await this._updateAccountsViaBalanceChecker(
    //       addresses,
    //       SINGLE_CALL_BALANCES_ADDRESS_ROPSTEN,
    //     );
    //     break;

    //   case KOVAN_CHAIN_ID:
    //     await this._updateAccountsViaBalanceChecker(
    //       addresses,
    //       SINGLE_CALL_BALANCES_ADDRESS_KOVAN,
    //     );
    //     break;

    //   default:
    //     await Promise.all(addresses.map(this._updateAccount.bind(this)));
    // }
    await Promise.all(addresses.map(this._updateAccount.bind(this)));
  }

  /**
   * Updates the current balance of an account.
   *
   * @private
   * @param {string} address - A hex address of a the account to be updated
   * @returns {Promise} after the account balance is updated
   *
   */
  async _updateAccount(address) {
    const ticker = this.getCurrentNetworkTicker()
    const accountLength = stripHexPrefix(address).length
    console.warn('_updateAccount: address', address, 'ticker', ticker, 'accountLength', accountLength)

    if (accountLength === 64 && ticker === 'APT') {
      await this._updateAccountAptos(address)
    } else if (accountLength === 32) {
      await this._updateAccountStarcoin(address)
    }
  }

  async _updateAccountStarcoin(address) {
    const accountLength = stripHexPrefix(address).length
    if (accountLength !== 32) {
      return
    }
    const ticker = 'STC'
    const { accounts, assets, nfts, nftIdentifier } = this.store.getState();
    const currentTokens = {};
    const currentNFTGallery = [];
    const currentNFTIdentifier = [];
    let balanceDecimal = 0;
    // do not update HD Key account
    if (address.length !== 42) {
      try {
        // query balance
        const res = await this._query.listResource(address, { decode: true });
        const { resources } = res;
        const ACCOUNT_BALANCE = '0x00000000000000000000000000000001::Account::Balance';
        const balanceKeys = [];
        const NFT_GALLERY = '0x00000000000000000000000000000001::NFTGallery::NFTGallery';
        const nftKeys = [];
        const NFT_IDENTIFIER = '0x00000000000000000000000000000001::IdentifierNFT::IdentifierNFT';
        const identifierNFTKeys = [];
        Object.keys(resources).forEach((key) => {
          if (key.startsWith(ACCOUNT_BALANCE)) {
            balanceKeys.push(key);
          } else if (key.startsWith(NFT_GALLERY)) {
            nftKeys.push(key);
          } else if (key.startsWith(NFT_IDENTIFIER)) {
            identifierNFTKeys.push(key);
          }
        });
        if (balanceKeys.length === 0) {
          accounts[address] = { address, balance: '0x0', ticker };
        } else {
          balanceKeys.forEach((key) => {
            balanceDecimal = resources[key].json.token.value;
            const token = key.substr(
              ACCOUNT_BALANCE.length + 1,
              key.length - ACCOUNT_BALANCE.length - 2,
            );
            const balanceHex = new BigNumber(balanceDecimal, 10).toString(16);
            const balance = addHexPrefix(balanceHex);
            if (token === '0x00000000000000000000000000000001::STC::STC') {
              const result = { address, balance, ticker };
              accounts[address] = result;
            } else {
              currentTokens[token] = balance;
            }
          });
        }
        assets[address] = currentTokens;
        nftKeys.forEach((key) => {
          const T2 = key.substr(
            NFT_GALLERY.length + 1,
            key.length - NFT_GALLERY.length - 2,
          );
          const T2Arr = T2.split(',');
          const meta = T2Arr[0].trim();
          const body = T2Arr[1].trim();
          const items = resources[key].json.items.map((item) => {
            return {
              id: item.id,
              name: decodeNFTMeta(item.base_meta.name),
              description: decodeNFTMeta(item.base_meta.description),
              image: decodeNFTMeta(item.base_meta.image),
              imageData: decodeNFTMeta(item.base_meta.image_data),
            };
          });
          currentNFTGallery.push({
            meta,
            body,
            items,
          });
        });
        nfts[address] = currentNFTGallery;

        identifierNFTKeys.forEach((key) => {
          const T2 = key.substr(
            NFT_IDENTIFIER.length + 1,
            key.length - NFT_IDENTIFIER.length - 2,
          );
          const T2Arr = T2.split(',');
          const meta = T2Arr[0].trim();
          const body = T2Arr[1].trim();
          const items = resources[key].json.nft.vec.map((item) => {
            return {
              id: item.id,
              name: decodeNFTMeta(item.base_meta.name),
              description: decodeNFTMeta(item.base_meta.description),
              image: decodeNFTMeta(item.base_meta.image),
              imageData: decodeNFTMeta(item.base_meta.image_data),
            };
          });
          currentNFTIdentifier.push({
            meta,
            body,
            items,
          });
        });
        nftIdentifier[address] = currentNFTIdentifier;
      } catch (error) {
        log.info('_updateAccountStarcoin error', error);
        // HD account will get error: Invalid params: unable to parse AccoutAddress
        accounts[address] = { address, balance: '0x0', ticker };
        assets[address] = currentTokens;
        nfts[address] = [];
        nftIdentifier[address] = [];
      }
    }
    // update accounts state

    // only populate if the entry is still present
    // if (!accounts[address]) {
    //   return;
    // }
    this.store.updateState({ accounts, assets, nfts, nftIdentifier });

    // Also query VM2 STC balance for this address
    try {
      await this._updateVM2Resources(address);
    } catch (err) {
      console.warn('_updateVM2Resources skipped', err.message || err);
    }
  }

  /**
   * Queries VM2 resources via state2.list_resource and stores VM2 balance, tokens, and NFTs
   * @param {string} address - the account address
   */
  async _updateVM2Resources(address) {
    const { accounts, assets, nfts, nftIdentifier } = this.store.getState();
    const resourceType = '0x00000000000000000000000000000001::account::Account';

    try {
      // First check if account exists on VM2
      console.warn('_updateVM2Resources: checking account', address);
      const accountRes = await new Promise((resolve, reject) => {
        this._query.sendAsync(
          { method: 'state2.get_resource', params: [address, resourceType] },
          (err, res) => {
            if (err) {
              console.warn('_updateVM2Resources: state2.get_resource error', err.message || err);
              return reject(err);
            }
            console.warn('_updateVM2Resources: state2.get_resource result', typeof res, res ? 'truthy' : 'falsy');
            return resolve(res);
          },
        );
      });

      if (!accountRes) {
        console.warn('_updateVM2Resources: no account found, setting vm2Balance=0x0');
        if (accounts[address]) {
          accounts[address].vm2Balance = '0x0';
        }
        this.store.updateState({ accounts });
        return;
      }

      // Query real VM2 STC balance via contract2.call_v2 (coin::balance)
      // This is needed because CoinStore uses aggregators and raw decode shows 0
      try {
        const balResult = await new Promise((resolve, reject) => {
          this._query.sendAsync(
            {
              method: 'contract2.call_v2',
              params: [{
                function_id: '0x1::coin::balance',
                type_args: ['0x1::starcoin_coin::STC'],
                args: [address],
              }],
            },
            (err, res2) => {
              if (err) return reject(err);
              return resolve(res2);
            },
          );
        });
        if (balResult && Array.isArray(balResult) && balResult.length > 0) {
          const balanceDecimal = balResult[0];
          const balanceHex = new BigNumber(balanceDecimal, 10).toString(16);
          if (accounts[address]) {
            accounts[address].vm2Balance = addHexPrefix(balanceHex);
          }
          console.warn('_updateVM2Resources: coin::balance =', balanceDecimal, '-> hex', addHexPrefix(balanceHex));
        }
      } catch (balErr) {
        console.warn('_updateVM2Resources: contract2.call_v2 coin::balance error', balErr.message || balErr);
      }

      // Query all VM2 resources via state2.list_resource
      // Include primary_fungible_store to get FungibleStore balance for STC
      console.warn('_updateVM2Resources: querying list_resource');
      const res = await new Promise((resolve, reject) => {
        this._query.sendAsync(
          {
            method: 'state2.list_resource',
            params: [address, {
              decode: true,
              primary_fungible_store: { token_code: '0x1::starcoin_coin::STC' },
            }],
          },
          (err, listRes) => {
            if (err) {
              console.warn('_updateVM2Resources: state2.list_resource error', err.message || err);
              return reject(err);
            }
            console.warn('_updateVM2Resources: state2.list_resource result keys', listRes ? Object.keys(listRes) : 'null');
            return resolve(listRes);
          },
        );
      });

      if (!res || !res.resources) {
        console.warn('_updateVM2Resources: no resources found');
        // Only set vm2Balance=0x0 if coin::balance didn't already set it
        if (accounts[address] && !accounts[address].vm2Balance) {
          accounts[address].vm2Balance = '0x0';
        }
        this.store.updateState({ accounts });
        return;
      }

      const { resources } = res;
      console.warn('_updateVM2Resources: resource keys', Object.keys(resources));
      const ACCOUNT_BALANCE = '0x00000000000000000000000000000001::Account::Balance';
      const FUNGIBLE_STORE = '0x00000000000000000000000000000001::fungible_asset::FungibleStore';
      const NFT_GALLERY = '0x00000000000000000000000000000001::NFTGallery::NFTGallery';
      const NFT_ID = '0x00000000000000000000000000000001::IdentifierNFT::IdentifierNFT';

      const vm2Tokens = {};
      const vm2NFTGallery = [];
      const vm2NFTIdentifier = [];

      // Track whether coin::balance already set the balance
      const hasBalanceFromCallV2 = accounts[address] && accounts[address].vm2Balance && accounts[address].vm2Balance !== '0x0';

      Object.keys(resources).forEach((key) => {
        if (key === FUNGIBLE_STORE) {
          // VM2 primary fungible store balance - only use if coin::balance didn't set it
          if (!hasBalanceFromCallV2) {
            const balanceDecimal = resources[key].json.balance;
            console.warn('_updateVM2Resources: FungibleStore balance decimal', balanceDecimal);
            const balanceHex = new BigNumber(balanceDecimal, 10).toString(16);
            const balance = addHexPrefix(balanceHex);
            if (accounts[address]) {
              accounts[address].vm2Balance = balance;
            }
          }
        } else if (key.startsWith(ACCOUNT_BALANCE)) {
          const balanceDecimal = resources[key].json.token.value;
          const token = key.substr(
            ACCOUNT_BALANCE.length + 1,
            key.length - ACCOUNT_BALANCE.length - 2,
          );
          const balanceHex = new BigNumber(balanceDecimal, 10).toString(16);
          const balance = addHexPrefix(balanceHex);
          if (token === '0x00000000000000000000000000000001::STC::STC') {
            // Only use if coin::balance didn't set it
            if (!hasBalanceFromCallV2 && accounts[address]) {
              accounts[address].vm2Balance = balance;
            }
          } else {
            vm2Tokens[`vm2::${token}`] = balance;
          }
        } else if (key.startsWith(NFT_GALLERY)) {
          try {
            const T2 = key.substr(
              NFT_GALLERY.length + 1,
              key.length - NFT_GALLERY.length - 2,
            );
            const T2Arr = T2.split(',');
            const meta = T2Arr[0].trim();
            const body = T2Arr[1].trim();
            const items = resources[key].json.items.map((item) => ({
              id: item.id,
              name: decodeNFTMeta(item.base_meta.name),
              description: decodeNFTMeta(item.base_meta.description),
              image: decodeNFTMeta(item.base_meta.image),
              imageData: decodeNFTMeta(item.base_meta.image_data),
            }));
            vm2NFTGallery.push({ meta, body, items, vmType: 'vm2' });
          } catch (e) {
            log.info('VM2 NFT gallery parse error', e);
          }
        } else if (key.startsWith(NFT_ID)) {
          try {
            const T2 = key.substr(
              NFT_ID.length + 1,
              key.length - NFT_ID.length - 2,
            );
            const T2Arr = T2.split(',');
            const meta = T2Arr[0].trim();
            const body = T2Arr[1].trim();
            const items = resources[key].json.nft.vec.map((item) => ({
              id: item.id,
              name: decodeNFTMeta(item.base_meta.name),
              description: decodeNFTMeta(item.base_meta.description),
              image: decodeNFTMeta(item.base_meta.image),
              imageData: decodeNFTMeta(item.base_meta.image_data),
            }));
            vm2NFTIdentifier.push({ meta, body, items, vmType: 'vm2' });
          } catch (e) {
            log.info('VM2 NFT identifier parse error', e);
          }
        }
      });

      // Merge VM2 tokens into assets (prefixed with vm2:: to distinguish)
      if (assets[address]) {
        Object.assign(assets[address], vm2Tokens);
      }

      // Merge VM2 NFTs
      if (nfts[address]) {
        nfts[address] = nfts[address].filter((n) => n.vmType !== 'vm2').concat(vm2NFTGallery);
      }
      if (nftIdentifier[address]) {
        nftIdentifier[address] = nftIdentifier[address].filter((n) => n.vmType !== 'vm2').concat(vm2NFTIdentifier);
      }

      // Set default vm2Balance if not found
      if (accounts[address] && !accounts[address].vm2Balance) {
        accounts[address].vm2Balance = '0x0';
      }

      this.store.updateState({ accounts, assets, nfts, nftIdentifier });
      console.warn('_updateVM2Resources: completed successfully, vm2Balance=', accounts[address] && accounts[address].vm2Balance);
    } catch (err) {
      console.warn('_updateVM2Resources: caught error', err.message || err);
      if (accounts[address]) {
        accounts[address].vm2Balance = '0x0';
      }
      this.store.updateState({ accounts });
    }
  }

  async _updateAccountAptos(address) {
    const accountLength = stripHexPrefix(address).length
    if (accountLength !== 64) {
      return
    }
    const ticker = 'APT'
    const { accounts, assets, tokenHandles, nftIdentifier } = this.store.getState();
    const currentTokens = {};
    const currentNFTGallery = [];
    const currentNFTIdentifier = [];
    let balanceDecimal = 0;

    try {
      // query balance
      const res = await this._query.listResource(address);
      const ACCOUNT_BALANCE = '0x1::coin::CoinStore';
      const balanceKeys = [];
      const TOKEN_COLLECTIONS = '0x3::token::Collections';
      const NFT_IDENTIFIER = '0x00000000000000000000000000000001::IdentifierNFT::IdentifierNFT';
      const identifierNFTKeys = [];
      res.forEach((item) => {
        const key = item.type
        if (key.startsWith(ACCOUNT_BALANCE)) {
          balanceKeys.push(key);
        } else if (key.startsWith(TOKEN_COLLECTIONS)) {
          tokenHandles[address] = item.data?.token_data?.handle;
        } else if (key.startsWith(NFT_IDENTIFIER)) {
          identifierNFTKeys.push(key);
        }
      });
      if (balanceKeys.length === 0) {
        accounts[address] = { address, balance: '0x0', ticker };
      } else {
        balanceKeys.forEach((key) => {
          balanceDecimal = res.filter((item) => item.type === key)[0].data.coin.value;
          const token = key.substr(
            ACCOUNT_BALANCE.length + 1,
            key.length - ACCOUNT_BALANCE.length - 2,
          );
          const balanceHex = new BigNumber(balanceDecimal, 10).toString(16);
          const balance = addHexPrefix(balanceHex);
          if (token === '0x1::aptos_coin::AptosCoin') {
            const result = { address, balance, ticker };
            accounts[address] = result;
          } else {
            currentTokens[token] = balance;
          }
        });
      }
      assets[address] = currentTokens;

      identifierNFTKeys.forEach((key) => {
        const T2 = key.substr(
          NFT_IDENTIFIER.length + 1,
          key.length - NFT_IDENTIFIER.length - 2,
        );
        const T2Arr = T2.split(',');
        const meta = T2Arr[0].trim();
        const body = T2Arr[1].trim();
        const items = resources[key].json.nft.vec.map((item) => {
          return {
            id: item.id,
            name: decodeNFTMeta(item.base_meta.name),
            description: decodeNFTMeta(item.base_meta.description),
            image: decodeNFTMeta(item.base_meta.image),
            imageData: decodeNFTMeta(item.base_meta.image_data),
          };
        });
        currentNFTIdentifier.push({
          meta,
          body,
          items,
        });
      });
      nftIdentifier[address] = currentNFTIdentifier;
    } catch (error) {
      log.info('_updateAccountAptos error', error);
      if (error.message) {
        // log.error(error.message);
        const data = JSON.parse(error.message)
        if (data.error_code && data.error_code === 'account_not_found') {
          log.warn(data.error_code, 'address')
        }
      }
      // HD account will get error: Invalid params: unable to parse AccoutAddress
      accounts[address] = { address, balance: '0x0', ticker };
      assets[address] = currentTokens;
      tokenHandles[address] = '';
      nftIdentifier[address] = [];
    }
    // log.debug('before this.store.updateState', { tokens, accountTokens })
    // update accounts state
    this.store.updateState({ accounts, assets, tokenHandles, nftIdentifier });
  }

  /**
   * Updates current address balances from balanceChecker deployed contract instance
   * @param {*} addresses
   * @param {*} deployedContractAddress
   */
  async _updateAccountsViaBalanceChecker(addresses, deployedContractAddress) {
    const { accounts } = this.store.getState();
    this.web3.setProvider(this._provider);
    const ethContract = this.web3.eth
      .contract(SINGLE_CALL_BALANCES_ABI)
      .at(deployedContractAddress);
    const ethBalance = ['0x0'];

    ethContract.balances(addresses, ethBalance, (error, result) => {
      if (error) {
        log.warn(
          `StarMask - Account Tracker single call balance fetch failed`,
          error,
        );
        Promise.all(addresses.map(this._updateAccount.bind(this)));
        return;
      }
      addresses.forEach((address, index) => {
        const balance = result[index] ? bnToHex(result[index]) : '0x0';
        accounts[address] = { address, balance, ticker };
      });
      this.store.updateState({ accounts });
    });
  }

  _checkAccountExistsInCurrentTicker() {
    const { accounts } = this.store.getState();
    const ticker = this.getCurrentNetworkTicker()
    const accountsInCurrentTicker = Object.values(accounts).filter((account) => account.ticker === ticker)
    return accountsInCurrentTicker.length > 0
  }

  updateAccountNFTs(newNFTs) {
    const { nfts } = this.store.getState();
    this.store.updateState({ nfts: { ...nfts, ...newNFTs } });
  }

  updateAccountNFTMetas(newNFTMetas) {
    const { nftMetas } = this.store.getState();
    this.store.updateState({ nftMetas: { ...nftMetas, ...newNFTMetas } });
  }
}

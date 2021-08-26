import EventEmitter from 'safe-event-emitter';
import { ObservableStore } from '@metamask/obs-store';
import ethUtil from 'ethereumjs-util';
import EthQuery from '@starcoin/stc-query';
import { ethErrors } from 'eth-rpc-errors';
// import abi from 'human-standard-token-abi';
// import { ethers } from 'ethers';
import NonceTracker from '@starcoin/stc-nonce-tracker';
import { ethers } from 'ethers';
import { bcs, encoding, utils, starcoin_types } from '@starcoin/starcoin';
import log from 'loglevel';
import BigNumber from 'bignumber.js';
import cleanErrorStack from '../../lib/cleanErrorStack';
import {
  hexToBn,
  bnToHex,
  BnMultiplyByFraction,
  addHexPrefix,
} from '../../lib/util';
import { TRANSACTION_NO_CONTRACT_ERROR_KEY } from '../../../../ui/app/helpers/constants/error-keys';
import { multiplyCurrencies, conversionUtil } from '../../../../ui/app/helpers/utils/conversion-util';
import { getSwapsTokensReceivedFromTxMeta } from '../../../../ui/app/pages/swaps/swaps.util';
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '../../../../shared/constants/transaction';
import { METAMASK_CONTROLLER_EVENTS } from '../../metamask-controller';
import TransactionStateManager from './tx-state-manager';
import TxGasUtil from './tx-gas-utils';
import PendingTransactionTracker from './pending-tx-tracker';
import * as txUtils from './lib/util';

const { arrayify, hexlify } = ethers.utils;
// const hstInterface = new ethers.utils.Interface(abi);

const SIMPLE_GAS_COST = '0x2710'; // Hex for 10000, cost of a simple send.
const MAX_MEMSTORE_TX_LIST_SIZE = 100; // Number of transactions (by unique nonces) to keep in memory

/**
  Transaction Controller is an aggregate of sub-controllers and trackers
  composing them in a way to be exposed to the metamask controller
    <br>- txStateManager
      responsible for the state of a transaction and
      storing the transaction
    <br>- pendingTxTracker
      watching blocks for transactions to be include
      and emitting confirmed events
    <br>- txGasUtil
      gas calculations and safety buffering
    <br>- nonceTracker
      calculating nonces

  @class
  @param {Object} opts
  @param {Object} opts.initState - initial transaction list default is an empty array
  @param {Object} opts.networkStore - an observable store for network number
  @param {Object} opts.blockTracker - An instance of eth-blocktracker
  @param {Object} opts.provider - A network provider.
  @param {Function} opts.signTransaction - function the signs an ethereumjs-tx(ethTx signer that returns a rawTx)
  @param {Object} opts.getPermittedAccounts - get accounts that an origin has permissions for
  @param {number} [opts.txHistoryLimit] - number *optional* for limiting how many transactions are in state
  @param {Object} opts.preferencesStore
*/

export default class TransactionController extends EventEmitter {
  constructor(opts) {
    super();
    this.networkStore = opts.networkStore || new ObservableStore({});
    this._getCurrentChainId = opts.getCurrentChainId;
    this.preferencesStore = opts.preferencesStore || new ObservableStore({});
    this.provider = opts.provider;
    this.getPermittedAccounts = opts.getPermittedAccounts;
    this.blockTracker = opts.blockTracker;
    this.signEthTx = opts.signTransaction;
    this.inProcessOfSigning = new Set();
    this._trackMetaMetricsEvent = opts.trackMetaMetricsEvent;
    this._getParticipateInMetrics = opts.getParticipateInMetrics;

    this.memStore = new ObservableStore({});
    this.query = new EthQuery(this.provider);
    this.txGasUtil = new TxGasUtil(this.provider, this.preferencesStore);
    this._mapMethods();
    this.txStateManager = new TransactionStateManager({
      initState: opts.initState,
      txHistoryLimit: opts.txHistoryLimit,
      getNetwork: this.getNetwork.bind(this),
      getCurrentChainId: opts.getCurrentChainId,
    });
    this._onBootCleanUp();

    this.store = this.txStateManager.store;
    this.nonceTracker = new NonceTracker({
      provider: this.provider,
      blockTracker: this.blockTracker,
      getPendingTransactions: this.txStateManager.getPendingTransactions.bind(
        this.txStateManager,
      ),
      getConfirmedTransactions: this.txStateManager.getConfirmedTransactions.bind(
        this.txStateManager,
      ),
    });

    this.pendingTxTracker = new PendingTransactionTracker({
      provider: this.provider,
      nonceTracker: this.nonceTracker,
      publishTransaction: (rawTx) => this.query.sendRawTransaction(rawTx),
      getPendingTransactions: () => {
        const pending = this.txStateManager.getPendingTransactions();
        const approved = this.txStateManager.getApprovedTransactions();
        return [...pending, ...approved];
      },
      approveTransaction: this.approveTransaction.bind(this),
      getCompletedTransactions: this.txStateManager.getConfirmedTransactions.bind(
        this.txStateManager,
      ),
    });

    this.txStateManager.store.subscribe(() =>
      this.emit(METAMASK_CONTROLLER_EVENTS.UPDATE_BADGE),
    );
    this._setupListeners();
    // memstore is computed from a few different stores
    this._updateMemstore();
    this.txStateManager.store.subscribe(() => this._updateMemstore());
    this.networkStore.subscribe(() => {
      this._onBootCleanUp();
      this._updateMemstore();
    });

    // request state update to finalize initialization
    this._updatePendingTxsAfterFirstBlock();
  }

  /**
   * Gets the current chainId in the network store as a number, returning 0 if
   * the chainId parses to NaN.
   *
   * @returns {number} The numerical chainId.
   */
  getChainId() {
    const networkState = this.networkStore.getState();
    const chainId = this._getCurrentChainId();
    const integerChainId = parseInt(chainId, 16);
    if (networkState === 'loading' || Number.isNaN(integerChainId)) {
      return 0;
    }
    return integerChainId;
  }

  /**
  Adds a tx to the txlist
  @emits ${txMeta.id}:unapproved
  */
  addTx(txMeta) {
    this.txStateManager.addTx(txMeta);
    this.emit(`${txMeta.id}:unapproved`, txMeta);
  }

  /**
  Wipes the transactions for a given account
  @param {string} address - hex string of the from address for txs being removed
  */
  wipeTransactions(address) {
    this.txStateManager.wipeTransactions(address);
  }

  /**
   * Add a new unapproved transaction to the pipeline
   *
   * @returns {Promise<string>} the hash of the transaction after being submitted to the network
   * @param {Object} txParams - txParams for the transaction
   * @param {Object} opts - with the key origin to put the origin on the txMeta
   */
  async newUnapprovedTransaction(txParams, opts = {}) {
    log.debug(
      `StarMaskController newUnapprovedTransaction ${JSON.stringify(txParams)}`,
    );

    const initialTxMeta = await this.addUnapprovedTransaction(
      txParams,
      opts.origin,
    );

    // listen for tx completion (success, fail)
    return new Promise((resolve, reject) => {
      this.txStateManager.once(
        `${initialTxMeta.id}:finished`,
        (finishedTxMeta) => {
          switch (finishedTxMeta.status) {
            case TRANSACTION_STATUSES.SUBMITTED:
              return resolve(finishedTxMeta.hash);
            case TRANSACTION_STATUSES.REJECTED:
              return reject(
                cleanErrorStack(
                  ethErrors.provider.userRejectedRequest(
                    'StarMask Tx Signature: User denied transaction signature.',
                  ),
                ),
              );
            case TRANSACTION_STATUSES.FAILED:
              return reject(
                cleanErrorStack(
                  ethErrors.rpc.internal(finishedTxMeta.err.message),
                ),
              );
            default:
              return reject(
                cleanErrorStack(
                  ethErrors.rpc.internal(
                    `StarMask Tx Signature: Unknown problem: ${JSON.stringify(
                      finishedTxMeta.txParams,
                    )}`,
                  ),
                ),
              );
          }
        },
      );
    });
  }

  /**
   * Validates and generates a txMeta with defaults and puts it in txStateManager
   * store.
   *
   * @returns {txMeta}
   */
  async addUnapprovedTransaction(txParams, origin) {
    log.debug(
      `StarMaskController addUnapprovedTransaction ${JSON.stringify(txParams)}`,
    );
    // validate
    const normalizedTxParams = txUtils.normalizeTxParams(txParams);

    txUtils.validateTxParams(normalizedTxParams);

    /**
    `generateTxMeta` adds the default txMeta properties to the passed object.
    These include the tx's `id`. As we use the id for determining order of
    txes in the tx-state-manager, it is necessary to call the asynchronous
    method `this._determineTransactionType` after `generateTxMeta`.
    */
    let txMeta = this.txStateManager.generateTxMeta({
      txParams: normalizedTxParams,
    });

    if (origin === 'starmask') {
      // Assert the from address is the selected address
      if (normalizedTxParams.from !== this.getSelectedAddress()) {
        throw ethErrors.rpc.internal({
          message: `Internally initiated transaction is using invalid account.`,
          data: {
            origin,
            fromAddress: normalizedTxParams.from,
            selectedAddress: this.getSelectedAddress(),
          },
        });
      }
    } else {
      // Assert that the origin has permissions to initiate transactions from
      // the specified address
      const permittedAddresses = await this.getPermittedAccounts(origin);
      if (!permittedAddresses.includes(normalizedTxParams.from)) {
        throw ethErrors.provider.unauthorized({ data: { origin } });
      }
    }

    txMeta.origin = origin;

    const { type, getCodeResponse } = await this._determineTransactionType(
      txParams,
    );
    txMeta.type = type;

    if (txParams.code) {
      txMeta.code = txParams.code;
    }

    // ensure value
    txMeta.txParams.value = txMeta.txParams.value
      ? addHexPrefix(txMeta.txParams.value)
      : '0x0';

    this.addTx(txMeta);
    this.emit('newUnapprovedTx', txMeta);

    try {
      txMeta = await this.addTxGasDefaults(txMeta, getCodeResponse);
    } catch (error) {
      log.warn(error);
      txMeta = this.txStateManager.getTx(txMeta.id);
      txMeta.loadingDefaults = false;
      this.txStateManager.updateTx(txMeta, 'Failed to calculate gas defaults.');
      throw error;
    }

    txMeta.loadingDefaults = false;
    // save txMeta
    this.txStateManager.updateTx(txMeta, 'Added new unapproved transaction.');

    return txMeta;
  }

  /**
   * Adds the tx gas defaults: gas && gasPrice
   * @param {Object} txMeta - the txMeta object
   * @returns {Promise<object>} resolves with txMeta
   */
  async addTxGasDefaults(txMeta, getCodeResponse) {
    log.debug('addTxGasDefaults', { txMeta, getCodeResponse })
    const defaultGasPrice = await this._getDefaultGasPrice(txMeta);
    log.debug({ defaultGasPrice })
    const {
      gasLimit: defaultGasLimit,
      simulationFails,
    } = await this._getDefaultGasLimit(txMeta, getCodeResponse);

    // eslint-disable-next-line no-param-reassign
    txMeta = this.txStateManager.getTx(txMeta.id);
    if (simulationFails) {
      txMeta.simulationFails = simulationFails;
    }
    if (defaultGasPrice && !txMeta.txParams.gasPrice) {
      txMeta.txParams.gasPrice = defaultGasPrice;
    }
    if (defaultGasLimit && !txMeta.txParams.gas) {
      txMeta.txParams.gas = defaultGasLimit;
    }
    log.debug({ txMeta })
    return txMeta;
  }

  /**
   * Gets default gas price, or returns `undefined` if gas price is already set
   * @param {Object} txMeta - The txMeta object
   * @returns {Promise<string|undefined>} The default gas price
   */
  async _getDefaultGasPrice(txMeta) {
    if (txMeta.txParams.gasPrice) {
      return undefined;
    }
    // const gasPrice = await this.query.gasPrice();
    const gasPrice = 1;
    return addHexPrefix(gasPrice.toString(16));
  }

  /**
   * Gets default gas limit, or debug information about why gas estimate failed.
   * @param {Object} txMeta - The txMeta object
   * @param {string} getCodeResponse - The transaction category code response, used for debugging purposes
   * @returns {Promise<Object>} Object containing the default gas limit, or the simulation failure object
   */
  async _getDefaultGasLimit(txMeta, getCodeResponse) {
    if (txMeta.txParams.gas) {
      return {};
    } else if (
      txMeta.txParams.to &&
      txMeta.type === TRANSACTION_TYPES.SENT_ETHER
    ) {
      // if there's data in the params, but there's no contract code, it's not a valid transaction
      if (txMeta.txParams.data) {
        const err = new Error(
          'TxGasUtil - Trying to call a function on a non-contract address',
        );
        // set error key so ui can display localized error message
        err.errorKey = TRANSACTION_NO_CONTRACT_ERROR_KEY;

        // set the response on the error so that we can see in logs what the actual response was
        err.getCodeResponse = getCodeResponse;
        throw err;
      }

      // This is a standard ether simple send, gas requirement is exactly 21k
      return { gasLimit: SIMPLE_GAS_COST };
    }

    const {
      blockGasLimit,
      estimatedGasHex,
      simulationFails,
    } = await this.txGasUtil.analyzeGasUsage(txMeta);

    // add additional gas buffer to our estimation for safety
    const gasLimit = this.txGasUtil.addGasBuffer(
      addHexPrefix(estimatedGasHex),
      blockGasLimit,
    );
    return { gasLimit, simulationFails };
  }

  /**
   * Creates a new approved transaction to attempt to cancel a previously submitted transaction. The
   * new transaction contains the same nonce as the previous, is a basic STC transfer of 0x value to
   * the sender's address, and has a higher gasPrice than that of the previous transaction.
   * @param {number} originalTxId - the id of the txMeta that you want to attempt to cancel
   * @param {string} [customGasPrice] - the hex value to use for the cancel transaction
   * @returns {txMeta}
   */
  async createCancelTransaction(originalTxId, customGasPrice, customGasLimit) {
    const originalTxMeta = this.txStateManager.getTx(originalTxId);
    const { txParams } = originalTxMeta;
    const { gasPrice: lastGasPrice, from, nonce, gas } = txParams;

    const newGasPrice =
      customGasPrice ||
      bnToHex(BnMultiplyByFraction(hexToBn(lastGasPrice), 11, 10));
    const newTxMeta = this.txStateManager.generateTxMeta({
      txParams: {
        from,
        to: from,
        nonce,
        gas: customGasLimit || gas,
        value: '0x0',
        gasPrice: newGasPrice,
      },
      lastGasPrice,
      loadingDefaults: false,
      status: TRANSACTION_STATUSES.APPROVED,
      type: TRANSACTION_TYPES.CANCEL,
    });

    this.addTx(newTxMeta);
    await this.approveTransaction(newTxMeta.id);
    return newTxMeta;
  }

  /**
   * Creates a new approved transaction to attempt to speed up a previously submitted transaction. The
   * new transaction contains the same nonce as the previous. By default, the new transaction will use
   * the same gas limit and a 10% higher gas price, though it is possible to set a custom value for
   * each instead.
   * @param {number} originalTxId - the id of the txMeta that you want to speed up
   * @param {string} [customGasPrice] - The new custom gas price, in hex
   * @param {string} [customGasLimit] - The new custom gas limt, in hex
   * @returns {txMeta}
   */
  async createSpeedUpTransaction(originalTxId, customGasPrice, customGasLimit) {
    const originalTxMeta = this.txStateManager.getTx(originalTxId);
    const { txParams } = originalTxMeta;
    const { gasPrice: lastGasPrice } = txParams;

    const newGasPrice =
      customGasPrice ||
      bnToHex(BnMultiplyByFraction(hexToBn(lastGasPrice), 11, 10));

    const newTxMeta = this.txStateManager.generateTxMeta({
      txParams: {
        ...txParams,
        gasPrice: newGasPrice,
      },
      lastGasPrice,
      loadingDefaults: false,
      status: TRANSACTION_STATUSES.APPROVED,
      type: TRANSACTION_TYPES.RETRY,
    });

    if (customGasLimit) {
      newTxMeta.txParams.gas = customGasLimit;
    }

    this.addTx(newTxMeta);
    await this.approveTransaction(newTxMeta.id);
    return newTxMeta;
  }

  /**
  updates the txMeta in the txStateManager
  @param {Object} txMeta - the updated txMeta
  */
  async updateTransaction(txMeta) {
    this.txStateManager.updateTx(txMeta, 'confTx: user updated transaction');
  }

  /**
  updates and approves the transaction
  @param {Object} txMeta
  */
  async updateAndApproveTransaction(txMeta) {
    this.txStateManager.updateTx(txMeta, 'confTx: user approved transaction');
    await this.approveTransaction(txMeta.id);
  }

  /**
  sets the tx status to approved
  auto fills the nonce
  signs the transaction
  publishes the transaction
  if any of these steps fails the tx status will be set to failed
    @param {number} txId - the tx's Id
  */
  async approveTransaction(txId) {
    // TODO: Move this safety out of this function.
    // Since this transaction is async,
    // we need to keep track of what is currently being signed,
    // So that we do not increment nonce + resubmit something
    // that is already being incremented & signed.
    if (this.inProcessOfSigning.has(txId)) {
      return;
    }
    this.inProcessOfSigning.add(txId);
    let nonceLock;
    try {
      // approve
      this.txStateManager.setTxStatusApproved(txId);
      // get next nonce
      const txMeta = this.txStateManager.getTx(txId);
      const fromAddress = txMeta.txParams.from;
      // wait for a nonce
      let { customNonceValue } = txMeta;
      customNonceValue = Number(customNonceValue);
      nonceLock = await this.nonceTracker.getNonceLock(fromAddress);
      // add nonce to txParams
      // if txMeta has lastGasPrice then it is a retry at same nonce with higher
      // gas price transaction and therefor the nonce should not be calculated
      const nonce = txMeta.lastGasPrice
        ? txMeta.txParams.nonce
        : nonceLock.nextNonce;
      const customOrNonce =
        customNonceValue === 0 ? customNonceValue : customNonceValue || nonce;

      txMeta.txParams.nonce = addHexPrefix(customOrNonce.toString(16));
      // add nonce debugging information to txMeta
      txMeta.nonceDetails = nonceLock.nonceDetails;
      if (customNonceValue) {
        txMeta.nonceDetails.customNonceValue = customNonceValue;
      }
      this.txStateManager.updateTx(txMeta, 'transactions#approveTransaction');
      // sign transaction
      const rawTx = await this.signTransaction(txId);
      await this.publishTransaction(txId, rawTx);
      // must set transaction to submitted/failed before releasing lock
      nonceLock.releaseLock();
    } catch (err) {
      // this is try-catch wrapped so that we can guarantee that the nonceLock is released
      try {
        this.txStateManager.setTxStatusFailed(txId, err);
      } catch (err2) {
        log.error(err2);
      }
      // must set transaction to submitted/failed before releasing lock
      if (nonceLock) {
        nonceLock.releaseLock();
      }
      // continue with error chain
      throw err;
    } finally {
      this.inProcessOfSigning.delete(txId);
    }
  }

  /**
    adds the chain id and signs the transaction and set the status to signed
    @param {number} txId - the tx's Id
    @returns {string} rawTx
  */
  async signTransaction(txId) {
    // log.debug('signTransaction', txId);
    const txMeta = this.txStateManager.getTx(txId);
    // log.debug({ txMeta });
    // add network/chain id
    const chainId = this.getChainId();
    const txParams = { ...txMeta.txParams, chainId };
    // sign tx
    const sendAmount = conversionUtil(ethUtil.stripHexPrefix(txParams.value), {
      fromNumericBase: 'hex',
      toNumericBase: 'dec',
    });
    // log.debug({ sendAmount });
    const senderSequenceNumber = await new Promise((resolve, reject) => {
      return this.query.getResource(
        txParams.from,
        '0x00000000000000000000000000000001::Account::Account',
        (err, res) => {
          if (err) {
            return reject(err);
          }

          const sequence_number = res && res.value[6][1].U64 || 0;
          return resolve(new BigNumber(sequence_number, 10).toNumber());
        },
      );
    });
    // log.debug({ senderSequenceNumber });
    const maxGasAmount = txParams.gas;
    const gasUnitPrice = txParams.gasPrice;
    log.debug({ gasUnitPrice, maxGasAmount });

    const expirationTimestampSecs = await this.txGasUtil.getExpirationTimestampSecs(txParams);
    const fromAddress = txParams.from;

    let payload;
    if (
      txMeta.type === TRANSACTION_TYPES.SENT_ETHER ||
      txMeta.type === TRANSACTION_TYPES.CANCEL ||
      (txMeta.type === TRANSACTION_TYPES.RETRY && !txParams.data)
    ) {
      const functionId = '0x00000000000000000000000000000001::TransferScripts::peer_to_peer_v2';

      const tyArgs = [{ Struct: { address: '0x1', module: 'STC', name: 'STC', type_params: [] } }];

      const receiver = txParams.toReceiptIdentifier ? txParams.toReceiptIdentifier : txParams.to;
      let receiverAddressHex;

      if (receiver.slice(0, 3) === 'stc') {
        const receiptIdentifierView = encoding.decodeReceiptIdentifier(receiver);
        receiverAddressHex = ethUtil.addHexPrefix(receiptIdentifierView.accountAddress);
      } else {
        receiverAddressHex = receiver;
      }

      // Multiple BcsSerializers should be used in different closures, otherwise, the latter will be contaminated by the former.
      const amountSCSHex = (function () {
        const se = new bcs.BcsSerializer();
        // eslint-disable-next-line no-undef
        se.serializeU128(BigInt(sendAmount));
        return hexlify(se.getBytes());
      })();

      const args = [arrayify(receiverAddressHex), arrayify(amountSCSHex)];

      const scriptFunction = utils.tx.encodeScriptFunction(
        functionId,
        tyArgs,
        args,
      );
      payload = scriptFunction;
    } else if (txParams.data) {
      const bytes = arrayify(txParams.data);
      const de = new bcs.BcsDeserializer(bytes);
      payload = starcoin_types.TransactionPayload.deserialize(de);
    }
    if (!payload) {
      log.error('payload is undefined');
      throw new Error('StarMask - signTransaction: payload is undefined');
    }
    const rawUserTransaction = utils.tx.generateRawUserTransaction(
      fromAddress,
      payload,
      maxGasAmount,
      gasUnitPrice,
      senderSequenceNumber,
      expirationTimestampSecs,
      chainId,
    );
    const rawUserTransactionHex = await this.signEthTx(
      rawUserTransaction,
      fromAddress,
    );
    return rawUserTransactionHex;
  }

  /**
    publishes the raw tx and sets the txMeta to submitted
    @param {number} txId - the tx's Id
    @param {string} rawTx - the hex string of the serialized signed transaction
    @returns {Promise<void>}
  */
  async publishTransaction(txId, rawTx) {
    const txMeta = this.txStateManager.getTx(txId);
    txMeta.rawTx = rawTx;
    if (txMeta.type === TRANSACTION_TYPES.SWAP) {
      const preTxBalance = await this.query.getBalance(txMeta.txParams.from);
      txMeta.preTxBalance = preTxBalance.toString(16);
    }
    this.txStateManager.updateTx(txMeta, 'transactions#publishTransaction');
    let txHash;
    try {
      txHash = await new Promise((resolve, reject) => {
        return this.query.sendRawTransaction(rawTx, (err, res) => {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        });
      });
    } catch (error) {
      if (error.message.toLowerCase().includes('known transaction')) {
        txHash = ethUtil.sha3(addHexPrefix(rawTx)).toString('hex');
        txHash = addHexPrefix(txHash);
      } else {
        throw error;
      }
    }
    this.setTxHash(txId, txHash);

    this.txStateManager.setTxStatusSubmitted(txId);
  }

  /**
   * Sets the status of the transaction to confirmed and sets the status of nonce duplicates as
   * dropped if the txParams have data it will fetch the txReceipt
   * @param {number} txId - The tx's ID
   * @returns {Promise<void>}
   */
  async confirmTransaction(txId, txReceipt) {
    // get the txReceipt before marking the transaction confirmed
    // to ensure the receipt is gotten before the ui revives the tx
    const txMeta = this.txStateManager.getTx(txId);

    if (!txMeta) {
      return;
    }

    try {
      // It seems that sometimes the numerical values being returned from
      // this.query.getTransactionReceipt are BN instances and not strings.
      const gasUsed =
        typeof txReceipt.gas_used === 'string'
          ? txReceipt.gas_used
          : txReceipt.gas_used.toString(16);

      txMeta.txReceipt = {
        ...txReceipt,
        gasUsed,
      };
      this.txStateManager.setTxStatusConfirmed(txId);
      this._markNonceDuplicatesDropped(txId);

      this.txStateManager.updateTx(
        txMeta,
        'transactions#confirmTransaction - add txReceipt',
      );

      if (txMeta.type === TRANSACTION_TYPES.SWAP) {
        const postTxBalance = await new Promise((resolve, reject) => {
          return this.query.getResource(
            txMeta.txParams.from,
            '0x00000000000000000000000000000001::Account::Account',
            (err, res) => {
              if (err) {
                return reject(err);
              }

              const balanceDecimal = res && res.value[0][1].Struct.value[0][1].U128 || 0;
              return resolve(new BigNumber(balanceDecimal, 10));
            },
          );
        });


        const latestTxMeta = this.txStateManager.getTx(txId);

        const approvalTxMeta = latestTxMeta.approvalTxId
          ? this.txStateManager.getTx(latestTxMeta.approvalTxId)
          : null;

        latestTxMeta.postTxBalance = postTxBalance.toString(16);

        this.txStateManager.updateTx(
          latestTxMeta,
          'transactions#confirmTransaction - add postTxBalance',
        );

        this._trackSwapsMetrics(latestTxMeta, approvalTxMeta);
      }
    } catch (err) {
      log.error(err);
    }
  }

  /**
    Convenience method for the ui thats sets the transaction to rejected
    @param {number} txId - the tx's Id
    @returns {Promise<void>}
  */
  async cancelTransaction(txId) {
    this.txStateManager.setTxStatusRejected(txId);
  }

  /**
    Sets the txHas on the txMeta
    @param {number} txId - the tx's Id
    @param {string} txHash - the hash for the txMeta
  */
  setTxHash(txId, txHash) {
    // Add the tx hash to the persisted meta-tx object
    const txMeta = this.txStateManager.getTx(txId);
    txMeta.hash = txHash;
    this.txStateManager.updateTx(txMeta, 'transactions#setTxHash');
  }

  //
  //           PRIVATE METHODS
  //
  /** maps methods for convenience*/
  _mapMethods() {
    /** @returns {Object} the state in transaction controller */
    this.getState = () => this.memStore.getState();

    /** @returns {string|number} the network number stored in networkStore */
    this.getNetwork = () => this.networkStore.getState();

    /** @returns {string} the user selected address */
    this.getSelectedAddress = () =>
      this.preferencesStore.getState().selectedAddress;

    /** @returns {Array} transactions whos status is unapproved */
    this.getUnapprovedTxCount = () =>
      Object.keys(this.txStateManager.getUnapprovedTxList()).length;

    /**
      @returns {number} number of transactions that have the status submitted
      @param {string} account - hex prefixed account
    */
    this.getPendingTxCount = (account) =>
      this.txStateManager.getPendingTransactions(account).length;

    /** see txStateManager */
    this.getFilteredTxList = (opts) =>
      this.txStateManager.getFilteredTxList(opts);
  }

  // called once on startup
  async _updatePendingTxsAfterFirstBlock() {
    // wait for first block so we know we're ready
    await this.blockTracker.getLatestBlock();
    // get status update for all pending transactions (for the current network)
    await this.pendingTxTracker.updatePendingTxs();
  }

  /**
    If transaction controller was rebooted with transactions that are uncompleted
    in steps of the transaction signing or user confirmation process it will either
    transition txMetas to a failed state or try to redo those tasks.
  */

  _onBootCleanUp() {
    this.txStateManager
      .getFilteredTxList({
        status: TRANSACTION_STATUSES.UNAPPROVED,
        loadingDefaults: true,
      })
      .forEach((tx) => {
        this.addTxGasDefaults(tx)
          .then((txMeta) => {
            txMeta.loadingDefaults = false;
            this.txStateManager.updateTx(
              txMeta,
              'transactions: gas estimation for tx on boot',
            );
          })
          .catch((error) => {
            const txMeta = this.txStateManager.getTx(tx.id);
            txMeta.loadingDefaults = false;
            this.txStateManager.updateTx(
              txMeta,
              'failed to estimate gas during boot cleanup.',
            );
            this.txStateManager.setTxStatusFailed(txMeta.id, error);
          });
      });

    this.txStateManager
      .getFilteredTxList({
        status: TRANSACTION_STATUSES.APPROVED,
      })
      .forEach((txMeta) => {
        const txSignError = new Error(
          'Transaction found as "approved" during boot - possibly stuck during signing',
        );
        this.txStateManager.setTxStatusFailed(txMeta.id, txSignError);
      });
  }

  /**
    is called in constructor applies the listeners for pendingTxTracker txStateManager
    and blockTracker
  */
  _setupListeners() {
    this.txStateManager.on(
      'tx:status-update',
      this.emit.bind(this, 'tx:status-update'),
    );
    this._setupBlockTrackerListener();
    this.pendingTxTracker.on('tx:warning', (txMeta) => {
      this.txStateManager.updateTx(
        txMeta,
        'transactions/pending-tx-tracker#event: tx:warning',
      );
    });
    this.pendingTxTracker.on(
      'tx:failed',
      this.txStateManager.setTxStatusFailed.bind(this.txStateManager),
    );
    this.pendingTxTracker.on('tx:confirmed', (txId, transactionReceipt) =>
      this.confirmTransaction(txId, transactionReceipt),
    );
    this.pendingTxTracker.on(
      'tx:dropped',
      this.txStateManager.setTxStatusDropped.bind(this.txStateManager),
    );
    this.pendingTxTracker.on('tx:block-update', (txMeta, latestBlockNumber) => {
      if (!txMeta.firstRetryBlockNumber) {
        txMeta.firstRetryBlockNumber = latestBlockNumber;
        this.txStateManager.updateTx(
          txMeta,
          'transactions/pending-tx-tracker#event: tx:block-update',
        );
      }
    });
    this.pendingTxTracker.on('tx:retry', (txMeta) => {
      if (!('retryCount' in txMeta)) {
        txMeta.retryCount = 0;
      }
      txMeta.retryCount += 1;
      this.txStateManager.updateTx(
        txMeta,
        'transactions/pending-tx-tracker#event: tx:retry',
      );
    });
  }

  /**
   * @typedef { 'transfer' | 'approve' | 'transferfrom' | 'contractInteraction'| 'sentEther' } InferrableTransactionTypes
   */

  /**
   * @typedef {Object} InferTransactionTypeResult
   * @property {InferrableTransactionTypes} type - The type of transaction
   * @property {string} getCodeResponse - The contract code, in hex format if
   *  it exists. '0x0' or '0x' are also indicators of non-existent contract
   *  code
   */

  /**
   * Determines the type of the transaction by analyzing the txParams.
   * This method will return one of the types defined in shared/constants/transactions
   * It will never return TRANSACTION_TYPE_CANCEL or TRANSACTION_TYPE_RETRY as these
   * represent specific events that we control from the extension and are added manually
   * at transaction creation.
   * @param {Object} txParams - Parameters for the transaction
   * @returns {InferTransactionTypeResult}
   */
  async _determineTransactionType(txParams) {
    const { data, to, type } = txParams;
    let name;
    try {
      // name = data && hstInterface.parseTransaction({ data }).name;
      if (data) {
        if (type && type === TRANSACTION_TYPES.TOKEN_METHOD_TRANSFER) {
          name = type;
        } else {
          const txnPayload = encoding.decodeTransactionPayload(data);
          const keys = Object.keys(txnPayload);
          if (keys[0] === 'ScriptFunction') {
            name = TRANSACTION_TYPES.CONTRACT_INTERACTION;
          } else if (keys[0] === 'Package') {
            name = TRANSACTION_TYPES.DEPLOY_CONTRACT;
          }
        }
      }
    } catch (error) {
      log.debug('Failed to parse transaction data.', error, data);
    }

    const tokenMethodName = [
      TRANSACTION_TYPES.TOKEN_METHOD_APPROVE,
      TRANSACTION_TYPES.TOKEN_METHOD_TRANSFER,
      TRANSACTION_TYPES.TOKEN_METHOD_TRANSFER_FROM,
      TRANSACTION_TYPES.CONTRACT_INTERACTION,
      TRANSACTION_TYPES.DEPLOY_CONTRACT,
    ].find((methodName) => methodName === name && name.toLowerCase());

    log.debug({ tokenMethodName });
    let result;
    if (data && tokenMethodName) {
      result = tokenMethodName;
    } else if (data && !to) {
      result = TRANSACTION_TYPES.DEPLOY_CONTRACT;
    }

    let code;
    if (!result) {
      // try {
      //   code = await new Promise((resolve, reject) => {
      //     return this.query.getCode('0x00000000000000000000000000000001::Account', (error, result) => {
      //       if (error) {
      //         return reject(error);
      //       }
      //       return resolve(result);
      //     });
      //   });
      // } catch (e) {
      //   code = null;
      //   log.warn(e);
      // }

      // const codeIsEmpty = !code || code === '0x' || code === '0x0';

      // result = codeIsEmpty
      //   ? TRANSACTION_TYPES.SENT_ETHER
      //   : TRANSACTION_TYPES.CONTRACT_INTERACTION;
      result = TRANSACTION_TYPES.SENT_ETHER;
    }
    return { type: result, getCodeResponse: code };
  }

  /**
    Sets other txMeta statuses to dropped if the txMeta that has been confirmed has other transactions
    in the list have the same nonce

    @param {number} txId - the txId of the transaction that has been confirmed in a block
  */
  _markNonceDuplicatesDropped(txId) {
    // get the confirmed transactions nonce and from address
    const txMeta = this.txStateManager.getTx(txId);
    const { nonce, from } = txMeta.txParams;
    const sameNonceTxs = this.txStateManager.getFilteredTxList({ nonce, from });
    if (!sameNonceTxs.length) {
      return;
    }
    // mark all same nonce transactions as dropped and give it a replacedBy hash
    sameNonceTxs.forEach((otherTxMeta) => {
      if (otherTxMeta.id === txId) {
        return;
      }
      otherTxMeta.replacedBy = txMeta.hash;
      this.txStateManager.updateTx(
        txMeta,
        'transactions/pending-tx-tracker#event: tx:confirmed reference to confirmed txHash with same nonce',
      );
      this.txStateManager.setTxStatusDropped(otherTxMeta.id);
    });
  }

  _setupBlockTrackerListener() {
    let listenersAreActive = false;
    const latestBlockHandler = this._onLatestBlock.bind(this);
    const { blockTracker, txStateManager } = this;

    txStateManager.on('tx:status-update', updateSubscription);
    updateSubscription();

    function updateSubscription() {
      const pendingTxs = txStateManager.getPendingTransactions();
      if (!listenersAreActive && pendingTxs.length > 0) {
        blockTracker.on('latest', latestBlockHandler);
        listenersAreActive = true;
      } else if (listenersAreActive && !pendingTxs.length) {
        blockTracker.removeListener('latest', latestBlockHandler);
        listenersAreActive = false;
      }
    }
  }

  async _onLatestBlock(blockNumber) {
    try {
      await this.pendingTxTracker.updatePendingTxs();
    } catch (err) {
      log.error(err);
    }
    try {
      await this.pendingTxTracker.resubmitPendingTxs(blockNumber);
    } catch (err) {
      log.error(err);
    }
  }

  /**
    Updates the memStore in transaction controller
  */
  _updateMemstore() {
    const unapprovedTxs = this.txStateManager.getUnapprovedTxList();
    const currentNetworkTxList = this.txStateManager.getTxList(
      MAX_MEMSTORE_TX_LIST_SIZE,
    );
    this.memStore.updateState({ unapprovedTxs, currentNetworkTxList });
  }

  _trackSwapsMetrics(txMeta, approvalTxMeta) {
    if (this._getParticipateInMetrics() && txMeta.swapMetaData) {
      if (txMeta.txReceipt.status === '0x0') {
        this._trackMetaMetricsEvent({
          event: 'Swap Failed',
          sensitiveProperties: { ...txMeta.swapMetaData },
          category: 'swaps',
        });
      } else {
        const tokensReceived = getSwapsTokensReceivedFromTxMeta(
          txMeta.destinationTokenSymbol,
          txMeta,
          txMeta.destinationTokenAddress,
          txMeta.txParams.from,
          txMeta.destinationTokenDecimals,
          approvalTxMeta,
          txMeta.chainId,
        );

        const quoteVsExecutionRatio = `${new BigNumber(tokensReceived, 10)
          .div(txMeta.swapMetaData.token_to_amount, 10)
          .times(100)
          .round(2)}%`;

        const estimatedVsUsedGasRatio = `${new BigNumber(
          txMeta.txReceipt.gasUsed,
          16,
        )
          .div(txMeta.swapMetaData.estimated_gas, 10)
          .times(100)
          .round(2)}%`;

        this._trackMetaMetricsEvent({
          event: 'Swap Completed',
          category: 'swaps',
          sensitiveProperties: {
            ...txMeta.swapMetaData,
            token_to_amount_received: tokensReceived,
            quote_vs_executionRatio: quoteVsExecutionRatio,
            estimated_vs_used_gasRatio: estimatedVsUsedGasRatio,
          },
        });
      }
    }
  }
}

import EventEmitter from 'safe-event-emitter';
import log from 'loglevel';
import StcQuery from '@starcoin/stc-query';
import BigNumber from 'bignumber.js';
import { TRANSACTION_STATUSES } from '../../../../shared/constants/transaction';

/**

  Event emitter utility class for tracking the transactions as they<br>
  go from a pending state to a confirmed (mined in a block) state<br>
<br>
  As well as continues broadcast while in the pending state
<br>
@param {Object} config - non optional configuration object consists of:
    @param {Object} config.provider - A network provider.
    @param {Object} config.nonceTracker - see nonce tracker
    @param {Function} config.getPendingTransactions - a function for getting an array of transactions,
    @param {Function} config.publishTransaction - a async function for publishing raw transactions,

@class
*/

export default class PendingTransactionTracker extends EventEmitter {
  /**
   * We wait this many blocks before emitting a 'tx:dropped' event
   *
   * This is because we could be talking to a node that is out of sync.
   *
   * @type {number}
   */
  DROPPED_BUFFER_COUNT = 3;

  /**
   * A map of transaction hashes to the number of blocks we've seen
   * since first considering it dropped
   *
   * @type {Map<String, number>}
   */
  droppedBlocksBufferByHash = new Map();

  constructor(config) {
    super();
    this.query = config.query || new StcQuery(config.provider);
    this.nonceTracker = config.nonceTracker;
    this.getPendingTransactions = config.getPendingTransactions;
    this.getCompletedTransactions = config.getCompletedTransactions;
    this.publishTransaction = config.publishTransaction;
    this.approveTransaction = config.approveTransaction;
    this.confirmTransaction = config.confirmTransaction;
  }

  /**
    check and handle pending txs in case of netwrok is offline 
  */
  async handlePendingTxsOffline(address) {
    // in order to keep the nonceTracker accurate we block it while updating pending transactions
    const nonceGlobalLock = await this.nonceTracker.getGlobalLock();
    try {
      const pendingTxs = this.getPendingTransactions(address);
      log.debug('handlePendingTxsOffline', { address, pendingTxsCount: pendingTxs.length, pendingTxs: pendingTxs.map(tx => ({ id: tx.id, hash: tx.hash, status: tx.status })) });
      await Promise.all(
        pendingTxs.map(async (txMeta) => {
          // Check if the transaction has been confirmed on chain
          // This is important for VM1/VM2 transactions that may not rely on blockTracker
          try {
            await this._checkPendingTx(txMeta);
          } catch (err) {
            log.debug('handlePendingTxsOffline - Error checking pending tx', { txId: txMeta.id, error: err.message });
          }
          
          // Handle timeout - if txn is still pending more than 5 minutes, mark as unknown
          // Note: if _checkPendingTx confirmed the tx, it won't be returned by getPendingTransactions next time
          const currentTime = new Date().getTime()
          if ((currentTime - txMeta.submittedTime) / 1000 > 300) {
            const txId = txMeta.id;
            this.emit('tx:unknown', txId);
          }
        }),
      );
    } catch (err) {
      log.error(
        'PendingTransactionTracker - Error handling pending transactions while offline',
      );
      log.error(err);
    }
    nonceGlobalLock.releaseLock();
  }

  /**
   * Query the network to see if the given {@code txMeta} has been included in a block
   * @param {Object} txMeta - the transaction metadata
   * @returns {Promise<void>}
   * @emits tx:confirmed
   * @emits tx:dropped
   * @emits tx:failed
   * @emits tx:warning
   * @private
   */
  async checkUnknownTx(txMeta) {
    const txHash = txMeta.hash;
    const txId = txMeta.id;
    
    // Handle both object and string formats for metamaskNetworkId
    const metamaskNetworkId = txMeta.metamaskNetworkId;
    const network = typeof metamaskNetworkId === 'object' && metamaskNetworkId !== null
      ? metamaskNetworkId.name
      : metamaskNetworkId;
    
    const isVM2 = txMeta.txParams && txMeta.txParams.vmType === 'vm2';

    // Only check submitted txs
    if (txMeta.status !== TRANSACTION_STATUSES.UNKNOWN) {
      return;
    }

    // extra check in case there was an uncaught error during the
    // signature and submission process
    if (!txHash) {
      const noTxHashErr = new Error(
        'We had an error while submitting this transaction, please try again.',
      );
      noTxHashErr.name = 'NoTxHashError';
      this.emit('tx:failed', txId, noTxHashErr);

      return;
    }

    if (await this._checkIfNonceIsTaken(txMeta)) {
      this.emit('tx:dropped', txId);
      return;
    }

    try {
      const transactionReceipt = await this._getTransactionReceipt(txHash, isVM2);
      log.debug('checkUnknownTx got receipt', { txId, txHash, isVM2, transactionReceipt: JSON.stringify(transactionReceipt) });
      // Check for confirmation - handle different RPC response formats
      // VM1: chain.get_transaction_info returns block_hash, status, gas_used, etc.
      // VM2: chain.get_transaction_info2 returns similar structure
      if (transactionReceipt && (
        transactionReceipt.block_number || 
        transactionReceipt.block_hash ||
        transactionReceipt.status === 'Executed' ||
        (['dev', 'test', 'main'].includes(network) && transactionReceipt?.success)
      )) {
        log.debug('checkUnknownTx emitting tx:confirmed', { txId });
        this.emit('tx:confirmed', txId, transactionReceipt);
        return;
      }
    } catch (err) {
      txMeta.warning = {
        error: err.message,
        message: 'There was a problem loading this transaction.',
      };
      this.emit('tx:warning', txMeta, err);
      return;
    }

    if (await this._checkIfTxWasDropped(txMeta)) {
      this.emit('tx:dropped', txId);
    }
  }

  /**
    checks the network for signed txs and releases the nonce global lock if it is
  */
  async updatePendingTxs() {
    // in order to keep the nonceTracker accurate we block it while updating pending transactions
    const nonceGlobalLock = await this.nonceTracker.getGlobalLock();
    try {
      const pendingTxs = this.getPendingTransactions();
      await Promise.all(
        pendingTxs.map((txMeta) => this._checkPendingTx(txMeta)),
      );
    } catch (err) {
      log.error(
        'PendingTransactionTracker - Error updating pending transactions',
      );
      log.error(err);
    }
    nonceGlobalLock.releaseLock();
  }

  /**
   * Resubmits each pending transaction
   * @param {string} blockNumber - the latest block number in hex
   * @emits tx:warning
   * @returns {Promise<void>}
   */
  async resubmitPendingTxs(blockNumber) {
    const pending = this.getPendingTransactions();
    if (!pending.length) {
      return;
    }
    for (const txMeta of pending) {
      try {
        await this._resubmitTx(txMeta, blockNumber);
      } catch (err) {
        const errorMessage =
          err.value?.message?.toLowerCase() || err.message.toLowerCase();
        const isKnownTx =
          // geth
          errorMessage.includes('replacement transaction underpriced') ||
          errorMessage.includes('known transaction') ||
          // parity
          errorMessage.includes('gas price too low to replace') ||
          errorMessage.includes(
            'transaction with the same hash was already imported',
          ) ||
          // other
          errorMessage.includes('gateway timeout') ||
          errorMessage.includes('nonce too low');
        // ignore resubmit warnings, return early
        if (isKnownTx) {
          return;
        }
        // encountered real error - transition to error state
        txMeta.warning = {
          error: errorMessage,
          message: 'There was an error when resubmitting this transaction.',
        };
        this.emit('tx:warning', txMeta, err);
      }
    }
  }

  /**
   * Attempts to resubmit the given transaction with exponential backoff
   *
   * Will only attempt to retry the given tx every {@code 2**(txMeta.retryCount)} blocks.
   *
   * @param {Object} txMeta - the transaction metadata
   * @param {string} latestBlockNumber - the latest block number in hex
   * @returns {Promise<string|undefined>} the tx hash if retried
   * @emits tx:block-update
   * @emits tx:retry
   * @private
   */
  async _resubmitTx(txMeta, latestBlockNumber) {
    if (!txMeta.firstRetryBlockNumber) {
      this.emit('tx:block-update', txMeta, latestBlockNumber);
    }

    const firstRetryBlockNumber =
      txMeta.firstRetryBlockNumber || latestBlockNumber;
    const txBlockDistance =
      Number.parseInt(latestBlockNumber, 16) -
      Number.parseInt(firstRetryBlockNumber, 16);

    const retryCount = txMeta.retryCount || 0;

    // Exponential backoff to limit retries at publishing
    if (txBlockDistance <= Math.pow(2, retryCount) - 1) {
      return undefined;
    }

    // Only auto-submit already-signed txs:
    if (!('rawTx' in txMeta)) {
      return this.approveTransaction(txMeta.id);
    }

    const { rawTx } = txMeta;
    const txHash = await this.publishTransaction(rawTx);

    // Increment successful tries:
    this.emit('tx:retry', txMeta);
    return txHash;
  }

  /**
   * Query the network to see if the given {@code txMeta} has been included in a block
   * @param {Object} txMeta - the transaction metadata
   * @returns {Promise<void>}
   * @emits tx:confirmed
   * @emits tx:dropped
   * @emits tx:failed
   * @emits tx:warning
   * @private
   */
  async _checkPendingTx(txMeta) {
    const txHash = txMeta.hash;
    const txId = txMeta.id;
    
    // Handle both object and string formats for metamaskNetworkId
    const metamaskNetworkId = txMeta.metamaskNetworkId;
    const network = typeof metamaskNetworkId === 'object' && metamaskNetworkId !== null
      ? metamaskNetworkId.name
      : metamaskNetworkId;
    
    const isVM2 = txMeta.txParams && txMeta.txParams.vmType === 'vm2';
    
    log.debug('_checkPendingTx called', { 
      txId, 
      txHash, 
      network, 
      isVM2, 
      vmType: txMeta.txParams?.vmType,
      status: txMeta.status 
    });
    
    // Only check submitted txs
    if (txMeta.status !== TRANSACTION_STATUSES.SUBMITTED) {
      return;
    }

    // extra check in case there was an uncaught error during the
    // signature and submission process
    if (!txHash) {
      const noTxHashErr = new Error(
        'We had an error while submitting this transaction, please try again.',
      );
      noTxHashErr.name = 'NoTxHashError';
      this.emit('tx:failed', txId, noTxHashErr);

      return;
    }

    // First, check on-chain status - this should take priority
    try {
      const transactionReceipt = await this._getTransactionReceipt(txHash, isVM2);
      log.debug('_checkPendingTx got receipt', { txId, txHash, isVM2, transactionReceipt: JSON.stringify(transactionReceipt) });
      
      // Check if transaction is confirmed on chain
      // Handle different RPC response formats: block_number, block_hash, or status
      if (transactionReceipt && (
        transactionReceipt.block_number || 
        transactionReceipt.block_hash ||
        transactionReceipt.status === 'Executed'
      )) {
        log.debug('_checkPendingTx confirming tx', { 
          txId, 
          block_number: transactionReceipt?.block_number, 
          block_hash: transactionReceipt?.block_hash,
          status: transactionReceipt?.status 
        });
        this.emit('tx:confirmed', txId, transactionReceipt);
        return;
      }
      // Check if transaction failed on chain
      if (transactionReceipt && !transactionReceipt.success && transactionReceipt.vm_status) {
        const txErr = new Error(transactionReceipt.vm_status);
        txErr.name = transactionReceipt.vm_status;
        this.emit('tx:failed', txId, txErr);
        return;
      }
      log.debug('_checkPendingTx no confirmation yet', { txId, transactionReceipt });
    } catch (err) {
      log.debug('_checkPendingTx error getting receipt', { txId, error: err.message });
      txMeta.warning = {
        error: err.message,
        message: 'There was a problem loading this transaction.',
      };
      this.emit('tx:warning', txMeta, err);
      return;
    }

    // Only check nonce collision if transaction is not yet on chain
    const nonceTaken = await this._checkIfNonceIsTaken(txMeta);
    log.debug('_checkPendingTx nonceTaken check', { txId, nonceTaken });
    if (nonceTaken) {
      log.debug('_checkPendingTx emitting tx:dropped due to nonce taken', { txId });
      this.emit('tx:dropped', txId);
      return;
    }

    if (await this._checkIfTxWasDropped(txMeta)) {
      this.emit('tx:dropped', txId);
    }
  }

  /**
   * Checks whether the nonce in the given {@code txMeta} is behind the network nonce
   *
   * @param {Object} txMeta - the transaction metadata
   * @returns {Promise<boolean>}
   * @private
   */
  async _checkIfTxWasDropped(txMeta) {
    const {
      hash: txHash,
      txParams: { nonce, from, vmType },
      metamaskNetworkId
    } = txMeta;
    
    // Handle both object and string formats for metamaskNetworkId
    const network = typeof metamaskNetworkId === 'object' && metamaskNetworkId !== null
      ? metamaskNetworkId.name
      : metamaskNetworkId;

    const networkNextNonce = await this.getSequenceNumber(from, network, vmType)
    const localNonce = parseInt(nonce, 16);
    
    log.debug('_checkIfTxWasDropped', { 
      txId: txMeta.id, 
      txHash, 
      nonce, 
      localNonce,
      networkNextNonce,
      vmType,
      network 
    });

    if (localNonce >= networkNextNonce) {
      log.debug('_checkIfTxWasDropped: nonce still valid, not dropped', { txId: txMeta.id });
      return false;
    }
    
    log.debug('_checkIfTxWasDropped: nonce has been consumed, checking buffer', { 
      txId: txMeta.id, 
      localNonce, 
      networkNextNonce 
    });

    if (!this.droppedBlocksBufferByHash.has(txHash)) {
      this.droppedBlocksBufferByHash.set(txHash, 0);
    }

    const currentBlockBuffer = this.droppedBlocksBufferByHash.get(txHash);

    if (currentBlockBuffer < this.DROPPED_BUFFER_COUNT) {
      this.droppedBlocksBufferByHash.set(txHash, currentBlockBuffer + 1);
      log.debug('_checkIfTxWasDropped: buffer not full, not dropped yet', { 
        txId: txMeta.id, 
        currentBlockBuffer: currentBlockBuffer + 1, 
        bufferCount: this.DROPPED_BUFFER_COUNT 
      });
      return false;
    }

    log.debug('_checkIfTxWasDropped: buffer full, marking as dropped', { txId: txMeta.id });
    this.droppedBlocksBufferByHash.delete(txHash);
    return true;
  }

  async getSequenceNumber(from, network, vmType) {
    // Handle both object and string formats for network
    const networkName = typeof network === 'object' && network !== null
      ? network.name
      : network;
      
    let sequenceNumber
    if (['dev', 'test', 'main'].includes(networkName)) {
      sequenceNumber = await new Promise((resolve, reject) => {
        return this.query.getAccount(
          from,
          (err, res) => {
            if (err) {
              return reject(err);
            }
            return resolve(new BigNumber(res.sequence_number).toNumber());
          },
        );
      });
    } else if (vmType === 'vm2') {
      // VM2: use state2.get_resource for sequence number
      sequenceNumber = await new Promise((resolve, reject) => {
        return this.query.sendAsync(
          { method: 'state2.get_resource', params: [from, '0x00000000000000000000000000000001::account::Account', { decode: true }] },
          (err, res) => {
            if (err) {
              return reject(err);
            }
            const sequence_number = res && res.json && res.json.sequence_number || 0;
            return resolve(new BigNumber(sequence_number, 10).toNumber());
          },
        );
      });
    } else {
      sequenceNumber = await new Promise((resolve, reject) => {
        return this.query.getResource(
          from,
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
    }
    return sequenceNumber
  }

  /**
   * Get transaction receipt, using VM2 RPC method if isVM2
   * @param {string} txHash - the transaction hash
   * @param {boolean} isVM2 - whether this is a VM2 transaction
   * @returns {Promise<Object>} the transaction receipt
   * @private
   */
  async _getTransactionReceipt(txHash, isVM2) {
    if (isVM2) {
      return new Promise((resolve, reject) => {
        return this.query.sendAsync(
          { method: 'chain.get_transaction_info2', params: [txHash] },
          (err, res) => {
            log.debug('_getTransactionReceipt VM2 result', { txHash, err: err?.message, res: JSON.stringify(res) });
            if (err) return reject(err);
            return resolve(res);
          },
        );
      });
    }
    // For VM1, use chain.get_transaction_info
    return new Promise((resolve, reject) => {
      return this.query.sendAsync(
        { method: 'chain.get_transaction_info', params: [txHash] },
        (err, res) => {
          log.debug('_getTransactionReceipt VM1 result', { txHash, err: err?.message, res: JSON.stringify(res) });
          if (err) return reject(err);
          return resolve(res);
        },
      );
    });
  }

  /**
   * Checks whether the nonce in the given {@code txMeta} is correct against the local set of transactions
   * @param {Object} txMeta - the transaction metadata
   * @returns {Promise<boolean>}
   * @private
   */
  async _checkIfNonceIsTaken(txMeta) {
    const address = txMeta.txParams.from;
    const completed = this.getCompletedTransactions(address);
    const nonce = txMeta.txParams.nonce;
    const txId = txMeta.id;
    // Normalize vmType: undefined or anything other than 'vm2' is treated as 'vm1'
    const isVM2 = txMeta.txParams.vmType === 'vm2';
    
    log.debug('_checkIfNonceIsTaken', { 
      txId, 
      address, 
      nonce,
      isVM2, 
      completedCount: completed.length,
      completedNonces: completed.map(tx => ({ id: tx.id, nonce: tx.txParams.nonce, vmType: tx.txParams.vmType }))
    });
    
    return completed.some(
      // This is called while the transaction is in-flight, so it is possible that the
      // list of completed transactions now includes the transaction we were looking at
      // and if that is the case, don't consider the transaction to have taken its own nonce
      // Also, only compare nonces within the same VM type (VM1 and VM2 have separate nonce sequences)
      (other) => {
        const otherIsVM2 = other.txParams.vmType === 'vm2';
        return !(other.id === txMeta.id) &&
          other.txParams.nonce === txMeta.txParams.nonce &&
          otherIsVM2 === isVM2;
      },
    );
  }
}

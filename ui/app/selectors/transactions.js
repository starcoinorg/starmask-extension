import { createSelector } from 'reselect';
import log from 'loglevel';
import {
  PRIORITY_STATUS_HASH,
  PENDING_STATUS_HASH,
} from '../helpers/constants/transactions';
import { hexToDecimal } from '../helpers/utils/conversions.util';
import txHelper from '../../lib/tx-helper';
import {
  TRANSACTION_STATUSES,
  TRANSACTION_TYPES,
} from '../../../shared/constants/transaction';
import { transactionMatchesNetwork } from '../../../shared/modules/transaction.utils';
import { getCurrentChainId, deprecatedGetCurrentNetworkId } from './selectors';
import { getSelectedAddress } from '.';

export const incomingTxListSelector = (state) => {
  const { showIncomingTransactions } = state.starmask.featureFlags;
  if (!showIncomingTransactions) {
    return [];
  }

  const {
    network,
    provider: { chainId },
  } = state.starmask;
  const selectedAddress = getSelectedAddress(state);
  return Object.values(state.starmask.incomingTransactions).filter(
    (tx) =>
      tx.txParams.to === selectedAddress &&
      transactionMatchesNetwork(tx, chainId, network),
  );
};
export const unapprovedMsgsSelector = (state) => state.starmask.unapprovedMsgs;
export const currentNetworkTxListSelector = (state) =>
  state.starmask.currentNetworkTxList;
export const unapprovedPersonalMsgsSelector = (state) =>
  state.starmask.unapprovedPersonalMsgs;
export const unapprovedDecryptMsgsSelector = (state) =>
  state.starmask.unapprovedDecryptMsgs;
export const unapprovedEncryptionPublicKeyMsgsSelector = (state) =>
  state.starmask.unapprovedEncryptionPublicKeyMsgs;
export const unapprovedTypedMessagesSelector = (state) =>
  state.starmask.unapprovedTypedMessages;

export const selectedAddressTxListSelector = createSelector(
  getSelectedAddress,
  currentNetworkTxListSelector,
  (selectedAddress, transactions = []) => {
    const filtered = transactions.filter(
      ({ txParams }) => txParams.from === selectedAddress,
    );
    // Debug: Log VM2 transactions filtering
    const vm2Txs = transactions.filter(tx => tx.txParams?.vmType === 'vm2');
    const vm2Filtered = filtered.filter(tx => tx.txParams?.vmType === 'vm2');
    if (vm2Txs.length > 0 || vm2Filtered.length > 0) {
      console.log('selectedAddressTxListSelector: selectedAddress=', selectedAddress,
        'totalTx=', transactions.length,
        'vm2BeforeFilter=', vm2Txs.length,
        'vm2AfterFilter=', vm2Filtered.length,
        'vm2Details=', vm2Txs.map(tx => ({ id: tx.id, from: tx.txParams?.from, status: tx.status })));
    }
    return filtered;
  },
);

export const unapprovedMessagesSelector = createSelector(
  unapprovedMsgsSelector,
  unapprovedPersonalMsgsSelector,
  unapprovedDecryptMsgsSelector,
  unapprovedEncryptionPublicKeyMsgsSelector,
  unapprovedTypedMessagesSelector,
  deprecatedGetCurrentNetworkId,
  getCurrentChainId,
  (
    unapprovedMsgs = {},
    unapprovedPersonalMsgs = {},
    unapprovedDecryptMsgs = {},
    unapprovedEncryptionPublicKeyMsgs = {},
    unapprovedTypedMessages = {},
    network,
    chainId,
  ) =>
    txHelper(
      {},
      unapprovedMsgs,
      unapprovedPersonalMsgs,
      unapprovedDecryptMsgs,
      unapprovedEncryptionPublicKeyMsgs,
      unapprovedTypedMessages,
      network,
      chainId,
    ) || [],
);

export const transactionSubSelector = createSelector(
  unapprovedMessagesSelector,
  incomingTxListSelector,
  (unapprovedMessages = [], incomingTxList = []) => {
    return unapprovedMessages.concat(incomingTxList);
  },
);

export const transactionsSelector = createSelector(
  transactionSubSelector,
  selectedAddressTxListSelector,
  (subSelectorTxList = [], selectedAddressTxList = []) => {
    const txsToRender = selectedAddressTxList.concat(subSelectorTxList);

    return txsToRender.sort((a, b) => b.time - a.time);
  },
);

/**
 * @name getNonceFromKey
 * @private
 * @description Extracts the nonce hex value from a nonceKey (format: "vm1:0x22" or "vm2:0x22")
 * @param {string} nonceKey - The nonce key containing vmType prefix
 * @returns {string} The nonce hex value
 */
const getNonceFromKey = (nonceKey) => {
  const parts = nonceKey.split(':');
  return parts.length > 1 ? parts[1] : nonceKey;
};

/**
 * @name insertOrderedNonce
 * @private
 * @description Inserts (mutates) a nonce key into an array of ordered nonce keys, sorted in ascending
 * order by nonce value (VM1 and VM2 are separated by their prefixes).
 * @param {string[]} nonces - Array of nonce key strings (format: "vm1:0x22" or "vm2:0x22")
 * @param {string} nonceToInsert - Nonce key to be inserted into the array.
 * @returns {string[]}
 */
const insertOrderedNonce = (nonces, nonceToInsert) => {
  let insertIndex = nonces.length;
  const nonceValueToInsert = getNonceFromKey(nonceToInsert);

  for (let i = 0; i < nonces.length; i++) {
    const nonce = nonces[i];
    const nonceValue = getNonceFromKey(nonce);

    if (Number(hexToDecimal(nonceValue)) > Number(hexToDecimal(nonceValueToInsert))) {
      insertIndex = i;
      break;
    }
  }

  nonces.splice(insertIndex, 0, nonceToInsert);
};

/**
 * @name insertTransactionByTime
 * @private
 * @description Inserts (mutates) a transaction object into an array of ordered transactions, sorted
 * in ascending order by time.
 * @param {Object[]} transactions - Array of transaction objects.
 * @param {Object} transaction - Transaction object to be inserted into the array of transactions.
 * @returns {Object[]}
 */
const insertTransactionByTime = (transactions, transaction) => {
  const { time } = transaction;

  let insertIndex = transactions.length;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];

    if (tx.time > time) {
      insertIndex = i;
      break;
    }
  }

  transactions.splice(insertIndex, 0, transaction);
};

/**
 * Contains transactions and properties associated with those transactions of the same nonce.
 * @typedef {Object} transactionGroup
 * @property {string} nonce - The nonce that the transactions within this transactionGroup share.
 * @property {Object[]} transactions - An array of transaction (txMeta) objects.
 * @property {Object} initialTransaction - The transaction (txMeta) with the lowest "time".
 * @property {Object} primaryTransaction - Either the latest transaction or the confirmed
 * transaction.
 * @property {boolean} hasRetried - True if a transaction in the group was a retry transaction.
 * @property {boolean} hasCancelled - True if a transaction in the group was a cancel transaction.
 */

/**
 * @name insertTransactionGroupByTime
 * @private
 * @description Inserts (mutates) a transactionGroup object into an array of ordered
 * transactionGroups, sorted in ascending order by nonce.
 * @param {transactionGroup[]} transactionGroups - Array of transactionGroup objects.
 * @param {transactionGroup} transactionGroup - transactionGroup object to be inserted into the
 * array of transactionGroups.
 */
const insertTransactionGroupByTime = (transactionGroups, transactionGroup) => {
  const {
    primaryTransaction: { time: groupToInsertTime } = {},
  } = transactionGroup;

  let insertIndex = transactionGroups.length;

  for (let i = 0; i < transactionGroups.length; i++) {
    const txGroup = transactionGroups[i];
    const { primaryTransaction: { time } = {} } = txGroup;

    if (time > groupToInsertTime) {
      insertIndex = i;
      break;
    }
  }

  transactionGroups.splice(insertIndex, 0, transactionGroup);
};

/**
 * @name mergeNonNonceTransactionGroups
 * @private
 * @description Inserts (mutates) transactionGroups that are not to be ordered by nonce into an array
 * of nonce-ordered transactionGroups by time.
 * @param {transactionGroup[]} orderedTransactionGroups - Array of transactionGroups ordered by
 * nonce.
 * @param {transactionGroup[]} nonNonceTransactionGroups - Array of transactionGroups not intended to be ordered by nonce,
 * but intended to be ordered by timestamp
 */
const mergeNonNonceTransactionGroups = (
  orderedTransactionGroups,
  nonNonceTransactionGroups,
) => {
  nonNonceTransactionGroups.forEach((transactionGroup) => {
    insertTransactionGroupByTime(orderedTransactionGroups, transactionGroup);
  });
};

/**
 * @name nonceSortedTransactionsSelector
 * @description Returns an array of transactionGroups sorted by nonce in ascending order.
 * @returns {transactionGroup[]}
 */
export const nonceSortedTransactionsSelector = createSelector(
  transactionsSelector,
  (transactions = []) => {
    const unapprovedTransactionGroups = [];
    const incomingTransactionGroups = [];
    const orderedNonces = [];
    const nonceToTransactionsMap = {};

    transactions
      .forEach((transaction) => {
        const {
          txParams: { nonce, vmType } = {},
          status,
          type,
          time: txTime,
        } = transaction;
        // Use vmType + nonce as the key because VM1 and VM2 have independent nonce sequences
        const nonceKey = vmType === 'vm2' ? `vm2:${nonce}` : `vm1:${nonce}`;
        
        if (typeof nonce === 'undefined' || type === TRANSACTION_TYPES.INCOMING) {
          const transactionGroup = {
            transactions: [transaction],
            initialTransaction: transaction,
            primaryTransaction: transaction,
            hasRetried: false,
            hasCancelled: false,
          };

          if (type === TRANSACTION_TYPES.INCOMING) {
            incomingTransactionGroups.push(transactionGroup);
          } else {
            insertTransactionGroupByTime(
              unapprovedTransactionGroups,
              transactionGroup,
            );
          }
        } else if (nonceKey in nonceToTransactionsMap) {
          const nonceProps = nonceToTransactionsMap[nonceKey];
          insertTransactionByTime(nonceProps.transactions, transaction);

          const {
            primaryTransaction: { time: primaryTxTime = 0 } = {},
          } = nonceProps;

          const previousPrimaryIsNetworkFailure =
            nonceProps.primaryTransaction.status ===
            TRANSACTION_STATUSES.FAILED &&
            nonceProps.primaryTransaction?.txReceipt?.status !== '0x0';
          const currentTransactionIsOnChainFailure =
            transaction?.txReceipt?.status === '0x0';

          if (
            status === TRANSACTION_STATUSES.CONFIRMED ||
            currentTransactionIsOnChainFailure ||
            previousPrimaryIsNetworkFailure ||
            (txTime > primaryTxTime && status in PRIORITY_STATUS_HASH)
          ) {
            nonceProps.primaryTransaction = transaction;
          }

          const {
            initialTransaction: { time: initialTxTime = 0 } = {},
          } = nonceProps;

          // Used to display the transaction action, since we don't want to overwrite the action if
          // it was replaced with a cancel attempt transaction.
          if (txTime < initialTxTime) {
            nonceProps.initialTransaction = transaction;
          }

          if (type === TRANSACTION_TYPES.RETRY) {
            nonceProps.hasRetried = true;
          }

          if (type === TRANSACTION_TYPES.CANCEL) {
            nonceProps.hasCancelled = true;
          }
        } else {
          nonceToTransactionsMap[nonceKey] = {
            nonce: nonceKey,
            transactions: [transaction],
            initialTransaction: transaction,
            primaryTransaction: transaction,
            hasRetried: transaction.type === TRANSACTION_TYPES.RETRY,
            hasCancelled: transaction.type === TRANSACTION_TYPES.CANCEL,
          };

          insertOrderedNonce(orderedNonces, nonceKey);
        }
      });

    const orderedTransactionGroups = orderedNonces.map(
      (nonceKey) => nonceToTransactionsMap[nonceKey],
    );
    mergeNonNonceTransactionGroups(
      orderedTransactionGroups,
      incomingTransactionGroups,
    );
    return unapprovedTransactionGroups.concat(orderedTransactionGroups);
  },
);

/**
 * @name nonceSortedPendingTransactionsSelector
 * @description Returns an array of transactionGroups where transactions are still pending sorted by
 * nonce in descending order.
 * @returns {transactionGroup[]}
 */
export const nonceSortedPendingTransactionsSelector = createSelector(
  nonceSortedTransactionsSelector,
  (transactions = []) =>
    transactions.filter(
      ({ primaryTransaction }) =>
        primaryTransaction.status in PENDING_STATUS_HASH,
    ),
);

/**
 * @name nonceSortedCompletedTransactionsSelector
 * @description Returns an array of transactionGroups where transactions are confirmed sorted by
 * nonce in descending order.
 * @returns {transactionGroup[]}
 */
export const nonceSortedCompletedTransactionsSelector = createSelector(
  nonceSortedTransactionsSelector,
  (transactions = []) =>
    transactions
      .filter(
        ({ primaryTransaction }) =>
          !(primaryTransaction.status in PENDING_STATUS_HASH),
      )
      .reverse(),
);

export const submittedPendingTransactionsSelector = createSelector(
  transactionsSelector,
  (transactions = []) =>
    transactions.filter(
      (transaction) => transaction.status === TRANSACTION_STATUSES.SUBMITTED,
    ),
);

export const multiSignTransactionsSelector = createSelector(
  transactionsSelector,
  (transactions = []) =>
    transactions.filter(
      (transaction) => transaction.status === TRANSACTION_STATUSES.MULTISIGN,
    ),
);

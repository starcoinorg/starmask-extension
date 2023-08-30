import { MethodRegistry } from 'eth-method-registry';
// import abi from 'human-standard-token-abi';
// import { ethers } from 'ethers';
import { encoding } from '@starcoin-org/starcoin';
import { TxnBuilderTypes, BCS } from '@starcoin-org/aptos';
import log from 'loglevel';
import { arrayify } from 'ethers/lib/utils';

import { addHexPrefix } from '../../../../app/scripts/lib/util';
import {
  TRANSACTION_TYPES,
  TRANSACTION_GROUP_STATUSES,
  TRANSACTION_STATUSES,
} from '../../../../shared/constants/transaction';
import fetchWithCache from './fetch-with-cache';

import { addCurrencies } from './conversion-util';

// const hstInterface = new ethers.utils.Interface(abi);

/**
 * @typedef EthersContractCall
 * @type object
 * @property {any[]} args - The args/params to the function call.
 * An array-like object with numerical and string indices.
 * @property {string} name - The name of the function.
 * @property {string} signature - The function signature.
 * @property {string} sighash - The function signature hash.
 * @property {EthersBigNumber} value - The ETH value associated with the call.
 * @property {FunctionFragment} functionFragment - The Ethers function fragment
 * representation of the function.
 */

/**
 * @returns {EthersContractCall | undefined}
 */
export function getTokenData(data, network) {
  try {
    const payload = decodeTokenData(data, network);
    return payload.params;
  } catch (error) {
    log.debug('Failed to parse transaction data.', error, data);
    return undefined;
  }
}

export function decodeTokenData(data, network) {
  let name, params;
  try {
    if (['devnet', 'testnet', 'mainnet'].includes(network)) {
      const deserializer = new BCS.Deserializer(arrayify(data));
      const entryFunctionPayload = TxnBuilderTypes.TransactionPayloadEntryFunction.deserialize(deserializer);
      if (entryFunctionPayload instanceof TxnBuilderTypes.TransactionPayloadEntryFunction) {
        name = 'EntryFunction';
        params = entryFunctionPayload.value;
      }
    } else {
      const txnPayload = encoding.decodeTransactionPayload(data);
      const keys = Object.keys(txnPayload);
      name = keys[0];
      params = txnPayload[keys[0]];
    }
    return { name, params };
  } catch (error) {
    log.debug('Failed to decode transaction data.', error, data);
    return { name, params };
  }
}

async function getMethodFrom4Byte(fourBytePrefix) {
  const fourByteResponse = await fetchWithCache(
    `https://www.4byte.directory/api/v1/signatures/?hex_signature=${ fourBytePrefix }`,
    {
      referrerPolicy: 'no-referrer-when-downgrade',
      body: null,
      method: 'GET',
      mode: 'cors',
    },
  );

  if (fourByteResponse.count === 1) {
    return fourByteResponse.results[0].text_signature;
  }
  return null;
}
let registry;

/**
 * Attempts to return the method data from the MethodRegistry library, the message registry library and the token abi, in that order of preference
 * @param {string} fourBytePrefix - The prefix from the method code associated with the data
 * @returns {Object}
 */
export async function getMethodDataAsync(fourBytePrefix) {
  try {
    const fourByteSig = getMethodFrom4Byte(fourBytePrefix).catch((e) => {
      log.error(e);
      return null;
    });

    if (!registry) {
      registry = new MethodRegistry({ provider: global.ethereumProvider });
    }

    let sig = await registry.lookup(fourBytePrefix);

    if (!sig) {
      sig = await fourByteSig;
    }

    if (!sig) {
      return {};
    }

    const parsedResult = registry.parse(sig);

    return {
      name: parsedResult.name,
      params: parsedResult.args,
    };
  } catch (error) {
    log.error(error);
    return {};
  }
}

/**
 * Returns four-byte method signature from data
 *
 * @param {string} data - The hex data (@code txParams.data) of a transaction
 * @returns {string} The four-byte method signature
 */
export function getFourBytePrefix(data = '') {
  const prefixedData = addHexPrefix(data);
  const fourBytePrefix = prefixedData.slice(0, 10);
  return fourBytePrefix;
}

/**
 * Given an transaction category, returns a boolean which indicates whether the transaction is calling an erc20 token method
 *
 * @param {TRANSACTION_TYPES[keyof TRANSACTION_TYPES]} type - The type of transaction being evaluated
 * @returns {boolean} whether the transaction is calling an erc20 token method
 */
export function isTokenMethodAction(type) {
  return [
    TRANSACTION_TYPES.TOKEN_METHOD_TRANSFER,
    TRANSACTION_TYPES.TOKEN_METHOD_APPROVE,
    TRANSACTION_TYPES.TOKEN_METHOD_TRANSFER_FROM,
  ].includes(type);
}

export function getLatestSubmittedTxWithNonce(
  transactions = [],
  nonce = '0x0',
) {
  if (!transactions.length) {
    return {};
  }

  return transactions.reduce((acc, current) => {
    const { submittedTime, txParams: { nonce: currentNonce } = {} } = current;

    if (currentNonce === nonce) {
      if (!acc.submittedTime) {
        return current;
      }
      return submittedTime > acc.submittedTime ? current : acc;
    }
    return acc;
  }, {});
}

export async function isSmartContractAddress(address) {
  const code = await new Promise((resolve, reject) => {
    return global.stcQuery.getCode('0x1::Account', (error, result) => {
      if (error) {
        return reject(error);
      }
      return resolve(result);
    });
  });
  // Geth will return '0x', and ganache-core v2.2.1 will return '0x0'
  const codeIsEmpty = !code || code === '0x' || code === '0x0';
  return !codeIsEmpty;
}

export function sumHexes(...args) {
  const total = args.reduce((acc, hexAmount) => {
    return addCurrencies(acc, hexAmount, {
      toNumericBase: 'hex',
      aBase: 16,
      bBase: 16,
    });
  });

  return addHexPrefix(total);
}

/**
 * Returns a status key for a transaction. Requires parsing the txMeta.txReceipt on top of
 * txMeta.status because txMeta.status does not reflect on-chain errors.
 * @param {Object} transaction - The txMeta object of a transaction.
 * @param {Object} transaction.txReceipt - The transaction receipt.
 * @returns {string}
 */
export function getStatusKey(transaction) {
  const {
    txReceipt: { status: receiptStatus } = {},
    type,
    status,
  } = transaction;

  // There was an on-chain failure
  if (receiptStatus && receiptStatus !== 'Executed') {
    return TRANSACTION_STATUSES.FAILED;
  }

  if (
    status === TRANSACTION_STATUSES.CONFIRMED &&
    type === TRANSACTION_TYPES.CANCEL
  ) {
    return TRANSACTION_GROUP_STATUSES.CANCELLED;
  }

  return transaction.status;
}

/**
 * Returns a title for the given transaction category.
 *
 * This will throw an error if the transaction category is unrecognized and no default is provided.
 * @param {function} t - The translation function
 * @param {TRANSACTION_TYPES[keyof TRANSACTION_TYPES]} type - The transaction type constant
 * @returns {string} The transaction category title
 */
export function getTransactionTypeTitle(t, type, ticker = 'STC') {
  switch (type) {
    case TRANSACTION_TYPES.TOKEN_METHOD_TRANSFER: {
      return t('transfer');
    }
    case TRANSACTION_TYPES.TOKEN_METHOD_TRANSFER_FROM: {
      return t('transferFrom');
    }
    case TRANSACTION_TYPES.TOKEN_METHOD_APPROVE: {
      return t('approve');
    }
    case TRANSACTION_TYPES.SENT_ETHER: {
      return t('sentEther', [ticker]);
    }
    case TRANSACTION_TYPES.CONTRACT_INTERACTION: {
      return t('contractInteraction');
    }
    case TRANSACTION_TYPES.DEPLOY_CONTRACT: {
      return t('contractDeployment');
    }
    case TRANSACTION_TYPES.SWAP: {
      return t('swap');
    }
    case TRANSACTION_TYPES.SWAP_APPROVAL: {
      return t('swapApproval');
    }
    default: {
      throw new Error(`Unrecognized transaction type: ${ type }`);
    }
  }
}

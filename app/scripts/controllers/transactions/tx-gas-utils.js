import EthQuery from '@starcoin/stc-query';
import log from 'loglevel';
import * as ethUtil from '@starcoin/stc-util';
// import { cloneDeep } from 'lodash';
import BigNumber from 'bignumber.js';
// eslint-disable-next-line camelcase
import { encoding, utils, starcoin_types } from '@starcoin/starcoin';
import { hexToBn, BnMultiplyByFraction, bnToHex } from '../../lib/util';
import { conversionUtil } from '../../../../ui/app/helpers/utils/conversion-util';

/**
 * Result of gas analysis, including either a gas estimate for a successful analysis, or
 * debug information for a failed analysis.
 * @typedef {Object} GasAnalysisResult
 * @property {string} blockGasLimit - The gas limit of the block used for the analysis
 * @property {string} estimatedGasHex - The estimated gas, in hexadecimal
 * @property {Object} simulationFails - Debug information about why an analysis failed
 */

/**
tx-gas-utils are gas utility methods for Transaction manager
its passed ethquery
and used to do things like calculate gas of a tx.
its passed store.getState()
and used to get selected account publicKey.
@param {Object} provider - A network provider.
@param {Object} store - current store, store.getState() will include identities.
*/

export default class TxGasUtil {
  constructor(provider, store) {
    this.query = new EthQuery(provider);
    this.store = store;
  }

  /**
    @param {Object} txMeta - the txMeta object
    @returns {GasAnalysisResult} The result of the gas analysis
  */
  async analyzeGasUsage(txMeta) {
    log.debug('analyzeGasUsage', txMeta)
    const chainInfo = await new Promise((resolve, reject) => {
      return this.query.getChainInfo((err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      });
    });
    log.debug({ chainInfo })
    const blockNumber = chainInfo && chainInfo.head ? chainInfo.head.number : 0;

    // maxGasAmount is dynamical adjusted, today it is about 40000000
    const maxGasAmount = new BigNumber(40000000, 10).toString(16);
    const gasLimit = ethUtil.addHexPrefix(maxGasAmount);
    const block = { number: blockNumber, gasLimit };
    log.debug({ block })
    // fallback to block gasLimit
    const blockGasLimitBN = hexToBn(block.gasLimit);
    const saferGasLimitBN = BnMultiplyByFraction(blockGasLimitBN, 19, 20);
    let estimatedGasHex = bnToHex(saferGasLimitBN);
    log.debug('estimatedGasHex1', { estimatedGasHex })
    let simulationFails;
    try {
      estimatedGasHex = await this.estimateTxGas(txMeta);
      log.debug('estimatedGasHex2', { estimatedGasHex })
    } catch (error) {
      log.warn({ error });
      simulationFails = {
        reason: error.message,
        errorKey: error.errorKey,
        debug: { blockNumber: block.number, blockGasLimit: block.gasLimit },
      };
    }

    return { blockGasLimit: block.gasLimit, estimatedGasHex, simulationFails };
  }

  /**
    Estimates the tx's gas usage
    @param {Object} txMeta - the txMeta object
    @returns {string} the estimated gas limit as a hex string
  */
  async estimateTxGas(txMeta) {
    // log.debug('estimateTxGas', { txMeta })
    // const txParams = cloneDeep(txMeta.txParams);

    // // `eth_estimateGas` can fail if the user has insufficient balance for the
    // // value being sent, or for the gas cost. We don't want to check their
    // // balance here, we just want the gas estimate. The gas price is removed
    // // to skip those balance checks. We check balance elsewhere.
    // delete txParams.gasPrice;

    // // estimate tx gas requirements
    // return await this.query.estimateGas(txParams);

    const maxGasAmount = 40000000;
    const expirationTimestampSecs = await this.getExpirationTimestampSecs(txMeta.txParams);
    const selectedAddressHex = txMeta.txParams.from;
    const selectedPublicKeyHex = this.store.getState().identities[selectedAddressHex].publicKey;
    const selectedSequenceNumber = await new Promise((resolve, reject) => {
      return this.query.getResource(
        txMeta.txParams.from,
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
    const chainId = txMeta.metamaskNetworkId.id;

    const transactionPayload = encoding.bcsDecode(
      starcoin_types.TransactionPayload,
      txMeta.txParams.data,
    );

    const rawUserTransaction = utils.tx.generateRawUserTransaction(
      selectedAddressHex,
      transactionPayload,
      maxGasAmount,
      selectedSequenceNumber,
      expirationTimestampSecs,
      chainId,
    );

    const rawUserTransactionHex = encoding.bcsEncode(rawUserTransaction);

    const dryRunRawResult = await new Promise((resolve, reject) => {
      return this.query.dryRunRaw(
        rawUserTransactionHex,
        selectedPublicKeyHex,
        (err, res) => {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        },
      );
    });

    let estimatedGasHex;
    if (dryRunRawResult.status === 'Executed') {
      estimatedGasHex = new BigNumber(dryRunRawResult.gas_used, 10).toString(16);
    } else {
      if (typeof dryRunRawResult.status === 'string') {
        throw new Error(`Starmask: contract.dry_run_raw failed. status: ${dryRunRawResult.status}, Error: ${dryRunRawResult.explained_status.Error}`)
      }
      throw new Error(`Starmask: contract.dry_run_raw failed. Error: ${JSON.stringify(dryRunRawResult.explained_status)}`)
    }

    return estimatedGasHex;
  }

  async getExpirationTimestampSecs(txParams) {
    // because the time system in dev network is relatively static,
    // we should use nodeInfo.now_secondsinstead of using new Date().getTime()
    const nowSeconds = await new Promise((resolve, reject) => {
      return this.query.getNodeInfo((err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res.now_seconds);
      });
    });
    // expired after 30 minutes since Unix Epoch by default
    const expiredSecs = txParams.expiredSecs ? Number(conversionUtil(txParams.expiredSecs, {
      fromNumericBase: 'hex',
      toNumericBase: 'dec',
    })) : 1800;
    const expirationTimestampSecs = nowSeconds + expiredSecs;
    return expirationTimestampSecs;
  }

  /**
    Adds a gas buffer with out exceeding the block gas limit
  
    @param {string} initialGasLimitHex - the initial gas limit to add the buffer too
    @param {string} blockGasLimitHex - the block gas limit
    @returns {string} the buffered gas limit as a hex string
  */
  addGasBuffer(initialGasLimitHex, blockGasLimitHex, multiplier = 1.5) {
    const initialGasLimitBn = hexToBn(initialGasLimitHex);
    const blockGasLimitBn = hexToBn(blockGasLimitHex);
    const upperGasLimitBn = blockGasLimitBn.muln(0.9);
    const bufferedGasLimitBn = initialGasLimitBn.muln(multiplier);

    // if initialGasLimit is above blockGasLimit, dont modify it
    if (initialGasLimitBn.gt(upperGasLimitBn)) {
      return bnToHex(initialGasLimitBn);
    }
    // if bufferedGasLimit is below blockGasLimit, use bufferedGasLimit
    if (bufferedGasLimitBn.lt(upperGasLimitBn)) {
      return bnToHex(bufferedGasLimitBn);
    }
    // otherwise use blockGasLimit
    return bnToHex(upperGasLimitBn);
  }

  async getBufferedGasLimit(txMeta, multiplier) {
    const {
      blockGasLimit,
      estimatedGasHex,
      simulationFails,
    } = await this.analyzeGasUsage(txMeta);

    // add additional gas buffer to our estimation for safety
    const gasLimit = this.addGasBuffer(
      ethUtil.addHexPrefix(estimatedGasHex),
      blockGasLimit,
      multiplier,
    );
    return { gasLimit, simulationFails };
  }
}

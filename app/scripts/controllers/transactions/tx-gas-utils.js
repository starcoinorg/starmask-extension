import EthQuery from '@starcoin/stc-query';
import log from 'loglevel';
import * as ethUtil from '@starcoin/stc-util';
import { cloneDeep } from 'lodash';
import BigNumber from 'bignumber.js';
import { arrayify, hexlify } from '@ethersproject/bytes';
import { encoding, utils } from '@starcoin/starcoin';
import { hexToBn, BnMultiplyByFraction, bnToHex } from '../../lib/util';

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
@param {Object} provider - A network provider.
*/

export default class TxGasUtil {
  constructor(provider) {
    this.query = new EthQuery(provider);
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
    // log.debug({ blockNumber })
    // const block = await await new Promise((resolve, reject) => {
    //   return this.query.getBlockByNumber(
    //     new BigNumber(blockNumber, 10).toNumber(),
    //     (err, res) => {
    //       if (err) {
    //         return reject(err);
    //       }
    //       return resolve(res);
    //     },
    //   );
    // });
    // log.debug({ block })

    // maxGasAmount is dynamical adjusted, today it is about 50000000
    const maxGasAmount = new BigNumber(50000000, 10).toString(16);
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
      log.warn(error);
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
    log.debug('estimateTxGas')
    // const txParams = cloneDeep(txMeta.txParams);

    // // `eth_estimateGas` can fail if the user has insufficient balance for the
    // // value being sent, or for the gas cost. We don't want to check their
    // // balance here, we just want the gas estimate. The gas price is removed
    // // to skip those balance checks. We check balance elsewhere.
    // delete txParams.gasPrice;

    // // estimate tx gas requirements
    // return await this.query.estimateGas(txParams);

    const maxGasAmount = 50000000;

    // because the time system in dev network is relatively static,
    // we should use nodeInfo.now_secondsinstead of using new Date().getTime()
    const nodeInfo = await new Promise((resolve, reject) => {
      return this.query.getNodeInfo((err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      });
    });
    log.debug({ nodeInfo })
    // expired after 12 hours since Unix Epoch
    const expirationTimestampSecs = nodeInfo.now_seconds + 43200;
    log.debug({ expirationTimestampSecs })
    const senderAddressHex = '0x024f69FF412b2C1Bb1dD394d79554F30';
    const senderPublicKeyHex = '0x06898c96a2abfa44ba4d5db6f9f3751595bb868eaac01c8f3c6bb4424ee882a6';
    const senderSequenceNumber = 7;
    const chainId = 254;
    const transactionPayload = encoding.packageHexToTransactionPayload(
      txMeta.txParams.data,
    );
    const rawUserTransaction = utils.tx.generateRawUserTransaction(
      senderAddressHex,
      transactionPayload,
      maxGasAmount,
      senderSequenceNumber,
      expirationTimestampSecs,
      chainId,
    );
    console.log({ rawUserTransaction })

    const rawUserTransactionHex = encoding.bcsEncode(rawUserTransaction)
    console.log({ rawUserTransactionHex })

    const dryRunRawResult = await await new Promise((resolve, reject) => {
      return this.query.dryRunRaw(
        rawUserTransactionHex,
        senderPublicKeyHex,
        (err, res) => {
          if (err) {
            return reject(err);
          }
          return resolve(res);
        },
      );
    });
    log.debug({ dryRunRawResult })

    // const dryRunRawResult = await provider.dryRunRaw(
    //   rawUserTransactionHex,
    //   senderPublicKeyHex
    // );
    // console.log({ dryRunRawResult })
    let estimatedGasHex;
    if (dryRunRawResult.status === 'Executed') {
      log.debug(dryRunRawResult.gas_used, typeof dryRunRawResult.gas_used)
      estimatedGasHex = new BigNumber(dryRunRawResult.gas_used, 10).toString(16);
    }
    return estimatedGasHex;
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

import StcQuery from '@starcoin/stc-query';
import log from 'loglevel';
import { AptosClient, AptosAccount, TxnBuilderTypes, BCS } from '@starcoin/aptos';
import { hexStripZeros } from '@ethersproject/bytes';
import { addHexPrefix, stripHexPrefix } from '@starcoin/stc-util';
// import { cloneDeep } from 'lodash';
import BigNumber from 'bignumber.js';
// eslint-disable-next-line camelcase
import { bcs, encoding, utils, starcoin_types } from '@starcoin/starcoin';
import { hexToBn, BnMultiplyByFraction, bnToHex } from '../../lib/util';
import { conversionUtil } from '../../../../ui/app/helpers/utils/conversion-util';
import { TRANSACTION_TYPES } from '../../../../shared/constants/transaction';
import { ethers } from 'ethers';
import { hexToDecimal } from '../../../../ui/app/helpers/utils/conversions.util';

const { arrayify, hexlify } = ethers.utils;

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
  constructor(provider, store, getPublicKeyFor, exportAccount) {
    this.query = new StcQuery(provider);
    this.store = store;
    this.getPublicKeyFor = getPublicKeyFor;
    this.exportAccount = exportAccount;
    this.client = new AptosClient('https://fullnode.devnet.aptoslabs.com/v1');
  }

  /**
    @param {Object} txMeta - the txMeta object
    @returns {GasAnalysisResult} The result of the gas analysis
  */
  async analyzeGasUsage(txMeta) {
    const chainInfo = await new Promise((resolve, reject) => {
      return this.query.getChainInfo((err, res) => {
        if (err) {
          return reject(err);
        }
        return resolve(res);
      });
    });
    const blockNumber = chainInfo && chainInfo.head ? chainInfo.head.number : 0;

    // maxGasAmount is dynamical adjusted, today it is about 40000000
    const maxGasAmount = new BigNumber(40000000, 10).toString(16);
    const gasLimit = addHexPrefix(maxGasAmount);
    const block = { number: blockNumber, gasLimit };
    // fallback to block gasLimit
    const blockGasLimitBN = hexToBn(block.gasLimit);
    const saferGasLimitBN = BnMultiplyByFraction(blockGasLimitBN, 19, 20);
    let estimatedGasHex = bnToHex(saferGasLimitBN);
    let tokenChanges;
    let simulationFails;
    try {
      const result = await this.estimateTxGas(txMeta);
      estimatedGasHex = result.estimatedGasHex;
      tokenChanges = result.tokenChanges;

    } catch (error) {
      log.warn({ error });
      simulationFails = {
        reason: error.message,
        errorKey: error.errorKey,
        debug: { blockNumber: block.number, blockGasLimit: block.gasLimit },
      };
    }

    return { blockGasLimit: block.gasLimit, estimatedGasHex, tokenChanges, simulationFails };
  }

  /**
    Estimates the tx's gas usage
    @param {Object} txMeta - the txMeta object
    @returns {string} the estimated gas limit as a hex string
  */
  async estimateTxGas(txMeta) {
    const network = txMeta.metamaskNetworkId.name
    let result = {}
    if (['devnet'].includes(network)) {
      result = await this.estimateTxGasAptos(txMeta)
    } else {
      result = await this.estimateTxGasStarcoin(txMeta)
    }
    return result;
  }

  async estimateTxGasStarcoin(txMeta) {
    // // `eth_estimateGas` can fail if the user has insufficient balance for the
    // // value being sent, or for the gas cost. We don't want to check their
    // // balance here, we just want the gas estimate. The gas price is removed
    // // to skip those balance checks. We check balance elsewhere.
    // delete txParams.gasPrice;

    // // estimate tx gas requirements
    // return await this.query.estimateGas(txParams);

    const maxGasAmount = 40000000;
    const gasUnitPrice = txMeta.txParams.gasPrice || 1;
    const expirationTimestampSecs = await this.getExpirationTimestampSecs(txMeta.txParams);
    const selectedAddressHex = txMeta.txParams.from;
    const selectedPublicKeyHex = await this.getPublicKeyFor(selectedAddressHex);
    if (!selectedPublicKeyHex) {
      throw new Error(`Starmask: selected account's public key is null`);
    }
    const selectedSequenceNumber = await this.getSequenceNumber(txMeta.txParams.from, 'STC');
    const chainId = txMeta.metamaskNetworkId.id;
    let transactionPayload;
    if (txMeta.txParams.data) {
      transactionPayload = encoding.bcsDecode(
        starcoin_types.TransactionPayload,
        txMeta.txParams.data,
      );
    } else {
      if (txMeta.txParams.to
        && txMeta.type === TRANSACTION_TYPES.SENT_ETHER) {
        const functionId = '0x1::TransferScripts::peer_to_peer_v2'
        const strTypeArgs = ['0x1::STC::STC']
        const tyArgs = utils.tx.encodeStructTypeTags(strTypeArgs)
        const sendAmountNanoSTC = hexToBn(txMeta.txParams.value)
        const amountSCSHex = (function () {
          const se = new bcs.BcsSerializer()
          se.serializeU128(BigInt(sendAmountNanoSTC.toString(10)))
          return hexlify(se.getBytes())
        })()
        const args = [
          arrayify(txMeta.txParams.to),
          arrayify(amountSCSHex),
        ]
        const scriptFunction = utils.tx.encodeScriptFunction(functionId, tyArgs, args)
        transactionPayload = scriptFunction;
      }
    }
    const rawUserTransaction = utils.tx.generateRawUserTransaction(
      selectedAddressHex,
      transactionPayload,
      maxGasAmount,
      gasUnitPrice,
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
    const queryTokenChanges = (dryRunRawResult) => {
      const matches = dryRunRawResult.write_set.reduce((acc, item) => {
        const reg = /^(0x[a-zA-Z0-9]{32})\/[01]\/0x00000000000000000000000000000001\:\:Account\:\:Balance<(.*)>$/i
        const result = item.access_path.match(reg)
        if (result && result.length === 3 && selectedAddressHex === result[1]) {
          const maxGasAmount = new BigNumber(40000000, 10).toString(16);
          acc[result[2]] = addHexPrefix(new BigNumber(item.value.Resource.json.token.value, 10).toString(16))
        }
        return acc
      }, {})
      return matches
    }
    let estimatedGasHex;
    let tokenChanges;
    if (dryRunRawResult.status === 'Executed') {
      estimatedGasHex = new BigNumber(dryRunRawResult.gas_used, 10).toString(16);
      tokenChanges = queryTokenChanges(dryRunRawResult)
    } else {
      if (typeof dryRunRawResult.status === 'string') {
        throw new Error(`Starmask: contract.dry_run_raw failed. status: ${ dryRunRawResult.status }, Error: ${ dryRunRawResult.explained_status.Error }`)
      }
      throw new Error(`Starmask: contract.dry_run_raw failed. Error: ${ JSON.stringify(dryRunRawResult.explained_status) }`)
    }
    const result = { estimatedGasHex, tokenChanges };
    return result;
  }

  async estimateTxGasAptos(txMeta) {
    let rawTxn
    if (txMeta.txParams.data) {
      const deserializer = new BCS.Deserializer(arrayify(txMeta.txParams.data));
      const entryFunctionPayload = TxnBuilderTypes.TransactionPayloadEntryFunction.deserialize(deserializer);
      rawTxn = await this.client.generateRawTransaction(txMeta.txParams.from, entryFunctionPayload);
    } else {
      if (txMeta.txParams.to
        && txMeta.type === TRANSACTION_TYPES.SENT_ETHER) {
        const payload = {
          function: "0x1::coin::transfer",
          type_arguments: ["0x1::aptos_coin::AptosCoin"],
          arguments: [txMeta.txParams.to, hexToDecimal(txMeta.txParams.value)],
        };
        rawTxn = await this.client.generateTransaction(txMeta.txParams.from, payload, { gas_unit_price: "100" })
      }
    }
    const privateKey = await this.exportAccount(txMeta.txParams.from)
    const fromAccount = AptosAccount.fromAptosAccountObject({ privateKeyHex: addHexPrefix(privateKey) });
    const result = await this.client.simulateTransaction(fromAccount, rawTxn)
    // log.debug({ result })
    const transactionRespSimulation = result[0]
    // log.debug('simulated', transactionRespSimulation.gas_used)
    const estimatedGasHex = addHexPrefix(new BigNumber(transactionRespSimulation.gas_used).toString(16))
    let tokenChanges
    // const queryTokenChanges = (transactionRespSimulation) => {
    //   const matches = transactionRespSimulation.changes.reduce((acc, item) => {
    //     const reg = /^0x1\:\:coin\:\:CoinStore<(.*)>$/i
    //     const result = item.data?.type.match(reg)
    //     // log.debug({ item, result }, txMeta.txParams.from, hexStripZeros(txMeta.txParams.from), item.address, hexStripZeros(txMeta.txParams.from) === item.address)
    //     if (result && result.length === 2 && hexStripZeros(txMeta.txParams.from) === item.address) {
    //       acc[result[1]] = addHexPrefix(new BigNumber(item.data.data.coin.value).toString(16))
    //     }
    //     return acc
    //   }, {})
    //   return matches
    // }
    // const tokenChanges2 = queryTokenChanges(transactionRespSimulation)
    // log.debug({ tokenChanges2 })
    return { estimatedGasHex, tokenChanges };
  }

  async getSequenceNumber(from, ticker) {
    let sequenceNumber
    if (ticker === 'STC') {
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
    } else if (ticker === 'APT') {
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
    }
    return sequenceNumber
  }

  async getExpirationTimestampSecs(txParams) {
    // because the time system in dev network is relatively static,
    // we should use nodeInfo.now_seconds instead of using new Date().getTime()
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
      tokenChanges,
      simulationFails,
    } = await this.analyzeGasUsage(txMeta);

    // add additional gas buffer to our estimation for safety
    const gasLimit = this.addGasBuffer(
      addHexPrefix(estimatedGasHex),
      blockGasLimit,
      multiplier,
    );
    log.debug('getBufferedGasLimit', { gasLimit, simulationFails })
    return { gasLimit, tokenChanges, simulationFails };
  }
}

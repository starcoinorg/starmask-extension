import StcQuery from '@starcoin/stc-query';
import log from 'loglevel';
import { AptosAccount, TxnBuilderTypes, BCS } from '@starcoin/aptos';
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
  constructor(provider, store, getPublicKeyFor, exportAccount, getAptosClient) {
    this.query = new StcQuery(provider);
    this.store = store;
    this.getPublicKeyFor = getPublicKeyFor;
    this.exportAccount = exportAccount;
    this.getAptosClient = getAptosClient;
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

    // maxGasAmount is dynamical adjusted, today it is about 10000000
    const maxGasAmount = new BigNumber(10000000, 10).toString(16);
    const gasLimit = addHexPrefix(maxGasAmount);
    const block = { number: blockNumber, gasLimit };
    // fallback to block gasLimit
    const blockGasLimitBN = hexToBn(block.gasLimit);
    const saferGasLimitBN = BnMultiplyByFraction(blockGasLimitBN, 19, 20);
    let estimatedGasHex = bnToHex(saferGasLimitBN);
    let tokenChanges;
    let simulationFails;
    let gasUsed;
    let gasUnitPrice;
    try {
      const result = await this.estimateTxGas(txMeta);
      gasUsed = result.gasUsed;
      gasUnitPrice = result.gasUnitPrice;
      estimatedGasHex = result.estimatedGasHex;
      tokenChanges = result.tokenChanges;
      block.gasLimit = result.maxGasAmount
    } catch (error) {
      log.warn({ error });
      simulationFails = {
        reason: error.message,
        errorKey: error.errorKey,
        debug: { blockNumber: block.number, blockGasLimit: block.gasLimit },
      };
    }

    return { blockGasLimit: block.gasLimit, gasUsed, gasUnitPrice, estimatedGasHex, tokenChanges, simulationFails };
  }

  /**
    Estimates the tx's gas usage
    @param {Object} txMeta - the txMeta object
    @returns {string} the estimated gas limit as a hex string
  */
  async estimateTxGas(txMeta) {
    const network = txMeta.metamaskNetworkId.name
    let result = {}
    if (['devnet', 'testnet', 'mainnet'].includes(network)) {
      result = await this.estimateTxGasAptos(txMeta)
    } else {
      result = await this.estimateTxGasStarcoin(txMeta)
    }
    return result;
  }

  async estimateTxGasStarcoin(txMeta) {
    const vmType = txMeta.txParams.vmType || 'vm1';

    let maxGasAmount = 10000000;
    const balance = await this.query.getBalance(txMeta.txParams.from);
    if (balance < maxGasAmount) {
      maxGasAmount = balance;
    }
    
    let gasUnitPrice = txMeta.txParams.gasPrice || 1;
    const expirationTimestampSecs = await this.getExpirationTimestampSecs(txMeta.txParams);
    const selectedAddressHex = txMeta.txParams.from;
    const selectedPublicKeyHex = await this.getPublicKeyFor(selectedAddressHex);
    if (!selectedPublicKeyHex) {
      throw new Error(`Starmask: selected account's public key is null`);
    }
    const selectedSequenceNumber = await this.getSequenceNumber(txMeta.txParams.from, 'STC', vmType);
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
        const sendAmountNanoSTC = hexToBn(txMeta.txParams.value)
        let scriptFunction;
        if (vmType === 'vm2') {
          // VM2: use starcoin_account::transfer with u64 amount, no type args
          // IMPORTANT: The Move function expects 16-byte address, NOT 32-byte!
          const functionId = '0x1::starcoin_account::transfer'
          const tyArgs = []
          const amountSCSHex = (function () {
            const se = new bcs.BcsSerializer()
            se.serializeU64(BigInt(sendAmountNanoSTC.toString(10)))
            return hexlify(se.getBytes())
          })()
          // Extract 16-byte address from receiver (may be 16, 20, or 32 bytes input)
          const receiverBytes = arrayify(txMeta.txParams.to);
          let receiver16Bytes;
          if (receiverBytes.length === 16) {
            receiver16Bytes = receiverBytes;
          } else if (receiverBytes.length === 32) {
            // 32-byte format: [16 zeros][16 real address] - extract last 16
            receiver16Bytes = receiverBytes.slice(16);
          } else if (receiverBytes.length === 20) {
            // 20-byte Ethereum-style: take last 16 bytes
            receiver16Bytes = receiverBytes.slice(4);
          } else {
            log.warn(`VM2 gas estimate: Unexpected receiver address length: ${receiverBytes.length}`);
            receiver16Bytes = receiverBytes;
          }
          log.debug(`VM2 gas estimate: receiver -> 16-byte ${hexlify(receiver16Bytes)}`);
          const args = [
            receiver16Bytes,
            arrayify(amountSCSHex),
          ]
          scriptFunction = utils.tx.encodeScriptFunction(functionId, tyArgs, args)
        } else {
          // VM1: use TransferScripts::peer_to_peer_v2 with u128 amount
          const functionId = '0x1::TransferScripts::peer_to_peer_v2'
          const strTypeArgs = ['0x1::STC::STC']
          const tyArgs = utils.tx.encodeStructTypeTags(strTypeArgs)
          const amountSCSHex = (function () {
            const se = new bcs.BcsSerializer()
            se.serializeU128(BigInt(sendAmountNanoSTC.toString(10)))
            return hexlify(se.getBytes())
          })()
          const args = [
            arrayify(txMeta.txParams.to),
            arrayify(amountSCSHex),
          ]
          scriptFunction = utils.tx.encodeScriptFunction(functionId, tyArgs, args)
        }
        transactionPayload = scriptFunction;
      }
    }
    
    let rawUserTransaction;
    if (vmType === 'vm2') {
      // VM2 requires gas_token_code = '0x1::starcoin_coin::STC' (not '0x1::STC::STC')
      const senderSCS = encoding.addressToSCS(selectedAddressHex);
      const vm2GasTokenCode = '0x1::starcoin_coin::STC';
      rawUserTransaction = new starcoin_types.RawUserTransaction(
        senderSCS,
        BigInt(selectedSequenceNumber),
        transactionPayload,
        BigInt(maxGasAmount),
        BigInt(gasUnitPrice),
        vm2GasTokenCode,
        BigInt(expirationTimestampSecs),
        new starcoin_types.ChainId(chainId)
      );
    } else {
      // VM1 uses the standard generateRawUserTransaction
      rawUserTransaction = utils.tx.generateRawUserTransaction(
        selectedAddressHex,
        transactionPayload,
        maxGasAmount,
        gasUnitPrice,
        selectedSequenceNumber,
        expirationTimestampSecs,
        chainId,
      );
    }

    const rawUserTransactionHex = encoding.bcsEncode(rawUserTransaction);

    const dryRunMethod = vmType === 'vm2' ? 'contract2.dry_run_raw' : 'contract.dry_run_raw';
    // For VM2, we need to bypass StcQuery's explained_status.Error check because 
    // VM2 dry_run may return errors that we want to handle gracefully with fallbacks
    const dryRunRawResult = await new Promise((resolve, reject) => {
      if (vmType === 'vm2') {
        // Bypass StcQuery - use provider directly to avoid automatic error conversion
        this.query.currentProvider.sendAsync(
          { jsonrpc: '2.0', id: Date.now(), method: dryRunMethod, params: [rawUserTransactionHex, selectedPublicKeyHex] },
          (err, response) => {
            if (err) {
              return reject(err);
            }
            if (response.error) {
              return reject(new Error(response.error.message));
            }
            // Return result directly, even if it has explained_status.Error
            // The fallback logic below will handle it
            return resolve(response.result);
          },
        );
      } else {
        return this.query.sendAsync(
          { method: dryRunMethod, params: [rawUserTransactionHex, selectedPublicKeyHex] },
          (err, res) => {
            if (err) {
              return reject(err);
            }
            return resolve(res);
          },
        );
      }
    });
    const queryTokenChanges = (dryRunRawResult) => {
      if (!dryRunRawResult.write_set || !Array.isArray(dryRunRawResult.write_set)) {
        return {};
      }
      const matches = dryRunRawResult.write_set.reduce((acc, item) => {
        if (!item.access_path) return acc;
        // VM1 format: 0x{addr}/[01]/0x1::Account::Balance<...>
        // VM2 may use the same format or a slightly different one
        const reg = /^(0x[a-zA-Z0-9]{32})\/[01]\/0x00000000000000000000000000000001\:\:Account\:\:Balance<(.*)>$/i
        const result = item.access_path.match(reg)
        if (result && result.length === 3 && selectedAddressHex === result[1]) {
          try {
            acc[result[2]] = addHexPrefix(new BigNumber(item.value.Resource.json.token.value, 10).toString(16))
          } catch (e) {
            // VM2 may have a different value structure; try alternative paths
            try {
              const val = item.value?.Resource?.json?.token?.value || item.value?.json?.token?.value || '0';
              acc[result[2]] = addHexPrefix(new BigNumber(val, 10).toString(16))
            } catch (e2) {
              log.info('queryTokenChanges: failed to parse value for', result[2], e2);
            }
          }
        }
        return acc
      }, {})
      return matches
    }
    let estimatedGasHex;
    let tokenChanges;
    let gasUsed;
    if (dryRunRawResult.status === 'Executed') {
      gasUsed = addHexPrefix(new BigNumber(dryRunRawResult.gas_used).toString(16))
      maxGasAmount = addHexPrefix(new BigNumber(maxGasAmount).toString(16))
      gasUnitPrice = addHexPrefix(new BigNumber(gasUnitPrice).toString(16))
      estimatedGasHex = new BigNumber(dryRunRawResult.gas_used, 10).toString(16);
      tokenChanges = queryTokenChanges(dryRunRawResult)
    } else if (vmType === 'vm2') {
      // VM2 dry_run may fail due to node aggregator bug (DELAYED_MATERIALIZATION)
      // Use default gas estimates so the UI can still proceed
      log.info('VM2 dry_run_raw failed, using default gas estimates:', JSON.stringify(dryRunRawResult.status));
      const defaultGas = 1000000; // 1M gas units as safe default
      gasUsed = addHexPrefix(new BigNumber(defaultGas).toString(16))
      maxGasAmount = addHexPrefix(new BigNumber(maxGasAmount).toString(16))
      gasUnitPrice = addHexPrefix(new BigNumber(gasUnitPrice).toString(16))
      estimatedGasHex = new BigNumber(defaultGas).toString(16);
      tokenChanges = {}
    } else {
      const methodName = vmType === 'vm2' ? 'contract2.dry_run_raw' : 'contract.dry_run_raw';
      // Handle different error status formats between VM1 and VM2
      const explainedStatus = dryRunRawResult.explained_status || {};
      const errorMsg = explainedStatus.Error
        || explainedStatus.error
        || (typeof explainedStatus === 'string' ? explainedStatus : JSON.stringify(explainedStatus));
      if (typeof dryRunRawResult.status === 'string') {
        throw new Error(`Starmask: ${methodName} failed. status: ${ dryRunRawResult.status }, Error: ${ errorMsg }`)
      }
      throw new Error(`Starmask: ${methodName} failed. Error: ${ errorMsg }`)
    }
    const result = {
      estimatedGasHex,
      tokenChanges,
      gasUsed,
      gasUnitPrice,
      maxGasAmount,
    };
    return result;
  }

  async estimateTxGasAptos(txMeta) {
    const client = this.getAptosClient()
    let rawTxn
    if (txMeta.txParams.data) {
      const deserializer = new BCS.Deserializer(arrayify(txMeta.txParams.data));
      const entryFunctionPayload = TxnBuilderTypes.TransactionPayloadEntryFunction.deserialize(deserializer);
      rawTxn = await client.generateRawTransaction(txMeta.txParams.from, entryFunctionPayload);
    } else if (txMeta.txParams.functionAptos) {
      rawTxn = await client.generateTransaction(txMeta.txParams.from, txMeta.txParams.functionAptos);
    } else {
      if (txMeta.txParams.to
        && txMeta.type === TRANSACTION_TYPES.SENT_ETHER) {
        const payload = {
          type: "entry_function_payload",
          function: "0x1::aptos_account::transfer",
          type_arguments: [],
          arguments: [txMeta.txParams.to, hexToDecimal(txMeta.txParams.value)],
        };
        rawTxn = await client.generateTransaction(txMeta.txParams.from, payload)
      }
    }
    const privateKey = await this.exportAccount(txMeta.txParams.from)
    const fromAccount = AptosAccount.fromAptosAccountObject({ privateKeyHex: addHexPrefix(privateKey) });
    const result = await client.simulateTransaction(fromAccount, rawTxn, {
      estimateGasUnitPrice: true,
      estimateMaxGasAmount: true,
      estimatePrioritizedGasUnitPrice: true,
    })
    const transactionRespSimulation = result[0]
    // log.debug('simulated', transactionRespSimulation.gas_used)
    let estimatedGasHex
    let tokenChanges
    let gasUsed
    let gasUnitPrice
    let maxGasAmount
    if (transactionRespSimulation.success) {
      maxGasAmount = addHexPrefix(new BigNumber(transactionRespSimulation.max_gas_amount).toString(16))
      gasUsed = addHexPrefix(new BigNumber(transactionRespSimulation.gas_used).toString(16))
      gasUnitPrice = addHexPrefix(new BigNumber(transactionRespSimulation.gas_unit_price).toString(16))
      estimatedGasHex = addHexPrefix(new BigNumber(parseInt(transactionRespSimulation.gas_used) * parseInt(transactionRespSimulation.gas_unit_price)).toString(16))
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
    } else {
      throw new Error(`simulateTransaction failed: ${ transactionRespSimulation.vm_status } ${ JSON.stringify({ gas_unit_price: transactionRespSimulation.gas_unit_price, max_gas_amount: transactionRespSimulation.max_gas_amount }) }`)
    }
    return { estimatedGasHex, tokenChanges, gasUsed, gasUnitPrice, maxGasAmount };
  }

  async getSequenceNumber(from, ticker, vmType) {
    let sequenceNumber
    if (ticker === 'STC') {
      if (vmType === 'vm2') {
        // VM2 uses lowercase module names and returns {json: {sequence_number: N}} format
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
          return this.query.sendAsync(
            { method: 'contract.get_resource', params: [from, '0x00000000000000000000000000000001::Account::Account'] },
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

  // used in swap
  async getBufferedGasLimit(txMeta, multiplier) {
    const {
      blockGasLimit,
      gasUsed,
      gasUnitPrice,
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
    return { gasLimit, tokenChanges, simulationFails };
  }
}

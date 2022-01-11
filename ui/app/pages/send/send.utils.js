import { utils, bcs } from '@starcoin/starcoin';
import { ethers } from 'ethers';
import abi from 'ethereumjs-abi';
import { BigNumber } from 'bignumber.js';
import {
  addCurrencies,
  conversionUtil,
  conversionGTE,
  multiplyCurrencies,
  conversionGreaterThan,
  conversionLessThan,
} from '../../helpers/utils/conversion-util';

import { calcTokenAmount } from '../../helpers/utils/token-util';
import { addHexPrefix } from '../../../../app/scripts/lib/util';

import {
  BASE_TOKEN_GAS_COST,
  INSUFFICIENT_FUNDS_ERROR,
  INSUFFICIENT_TOKENS_ERROR,
  MIN_GAS_LIMIT_HEX,
  NEGATIVE_ETH_ERROR,
  SIMPLE_GAS_COST,
  TOKEN_TRANSFER_FUNCTION_SIGNATURE,
} from './send.constants';

const { arrayify, hexlify } = ethers.utils;

export {
  addGasBuffer,
  calcGasTotal,
  calcTokenBalance,
  doesAmountErrorRequireUpdate,
  estimateGasForSend,
  generateTokenTransferData,
  generateTokenPalyloadData,
  getAmountErrorObject,
  getGasFeeErrorObject,
  getToAddressForGasUpdate,
  isBalanceSufficient,
  isTokenBalanceSufficient,
  removeLeadingZeroes,
  ellipsify,
};

function calcGasTotal(gasLimit = '0', gasPrice = '0') {
  return multiplyCurrencies(gasLimit, gasPrice, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 16,
  });
}

function isBalanceSufficient({
  amount = '0x0',
  balance = '0x0',
  conversionRate = 1,
  gasTotal = '0x0',
  primaryCurrency,
}) {
  const totalAmount = addCurrencies(amount, gasTotal, {
    aBase: 16,
    bBase: 16,
    toNumericBase: 'hex',
  });

  const balanceIsSufficient = conversionGTE(
    {
      value: balance,
      fromNumericBase: 'hex',
      fromCurrency: primaryCurrency,
      conversionRate,
    },
    {
      value: totalAmount,
      fromNumericBase: 'hex',
      conversionRate,
      fromCurrency: primaryCurrency,
    },
  );

  return balanceIsSufficient;
}

function isTokenBalanceSufficient({ amount = '0x0', tokenBalance, decimals }) {
  const amountInDec = conversionUtil(amount, {
    fromNumericBase: 'hex',
  });

  const tokenBalanceIsSufficient = conversionGTE(
    {
      value: tokenBalance,
      fromNumericBase: 'hex',
    },
    {
      value: calcTokenAmount(amountInDec, decimals),
    },
  );

  return tokenBalanceIsSufficient;
}

function getAmountErrorObject({
  amount,
  balance,
  conversionRate,
  gasTotal,
  primaryCurrency,
  sendToken,
  tokenBalance,
}) {
  let insufficientFunds = false;
  if (gasTotal && conversionRate && !sendToken) {
    insufficientFunds = !isBalanceSufficient({
      amount,
      balance,
      conversionRate,
      gasTotal,
      primaryCurrency,
    });
  }

  let inSufficientTokens = false;
  if (sendToken && tokenBalance !== null) {
    const { decimals } = sendToken;
    inSufficientTokens = !isTokenBalanceSufficient({
      tokenBalance,
      amount,
      decimals,
    });
  }

  const amountLessThanZero = conversionGreaterThan(
    { value: 0, fromNumericBase: 'dec' },
    { value: amount, fromNumericBase: 'hex' },
  );

  let amountError = null;

  if (insufficientFunds) {
    amountError = INSUFFICIENT_FUNDS_ERROR;
  } else if (inSufficientTokens) {
    amountError = INSUFFICIENT_TOKENS_ERROR;
  } else if (amountLessThanZero) {
    amountError = NEGATIVE_ETH_ERROR;
  }

  return { amount: amountError };
}

function getGasFeeErrorObject({
  balance,
  conversionRate,
  gasTotal,
  primaryCurrency,
}) {
  let gasFeeError = null;

  if (gasTotal && conversionRate) {
    const insufficientFunds = !isBalanceSufficient({
      amount: '0x0',
      balance,
      conversionRate,
      gasTotal,
      primaryCurrency,
    });

    if (insufficientFunds) {
      gasFeeError = INSUFFICIENT_FUNDS_ERROR;
    }
  }

  return { gasFee: gasFeeError };
}

function calcTokenBalance({ sendToken, usersToken }) {
  const { code, decimals } = sendToken || {};
  return calcTokenAmount(usersToken[code].toString(), decimals).toString(16);
}

function doesAmountErrorRequireUpdate({
  balance,
  gasTotal,
  prevBalance,
  prevGasTotal,
  prevTokenBalance,
  sendToken,
  tokenBalance,
}) {
  const balanceHasChanged = balance !== prevBalance;
  const gasTotalHasChange = gasTotal !== prevGasTotal;
  const tokenBalanceHasChanged = sendToken && tokenBalance !== prevTokenBalance;
  const amountErrorRequiresUpdate =
    balanceHasChanged || gasTotalHasChange || tokenBalanceHasChanged;

  return amountErrorRequiresUpdate;
}

async function estimateGasForSend({
  selectedAddress,
  sendToken,
  blockGasLimit = MIN_GAS_LIMIT_HEX,
  to,
  toReceiptIdentifier,
  value,
  data,
  gasPrice,
  estimateGasMethod,
}) {
  const paramsForGasEstimate = { from: selectedAddress, to, toReceiptIdentifier, value, gasPrice };

  // if recipient has no code, gas is 21k max:
  if (!sendToken && !data) {
    const code = await new Promise((resolve, reject) => {
      return global.stcQuery.getCode('0x00000000000000000000000000000001::Account', (error, result) => {
        if (error) {
          return reject(error);
        }
        return resolve(result);
      });
    });

    const codeIsEmpty = !code;
    if (codeIsEmpty) {
      return SIMPLE_GAS_COST;
    }
  } else if (sendToken && !to) {
    return BASE_TOKEN_GAS_COST;
  }

  if (sendToken) {
    paramsForGasEstimate.code = sendToken.code;
    paramsForGasEstimate.value = '0x0';
    paramsForGasEstimate.data = generateTokenPalyloadData({
      toAddress: to,
      amount: value,
      sendToken,
    });
  } else {
    if (data) {
      paramsForGasEstimate.data = data;
    }

    if (!value || value === '0') {
      paramsForGasEstimate.value = '0xff';
    }
  }

  // if not, fall back to block gasLimit
  if (!blockGasLimit) {
    // eslint-disable-next-line no-param-reassign
    blockGasLimit = MIN_GAS_LIMIT_HEX;
  }

  paramsForGasEstimate.gas = addHexPrefix(
    multiplyCurrencies(blockGasLimit, 1, {
      multiplicandBase: 16,
      multiplierBase: 10,
      roundDown: '0',
      toNumericBase: 'hex',
    }),
  );

  // run tx
  try {
    // get sequence_number from contract.get_resource
    const sequenceNumber = await new Promise((resolve, reject) => {
      return global.stcQuery.getResource(
        paramsForGasEstimate.from,
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
    paramsForGasEstimate.sequenceNumber = sequenceNumber;
    // get gas_used from contract.dry_run_raw
    const estimatedGas = await estimateGasMethod(paramsForGasEstimate);
    const estimateWithBuffer = addGasBuffer(
      estimatedGas.toString(16),
      blockGasLimit,
      1.5,
    );
    return addHexPrefix(estimateWithBuffer);
  } catch (error) {
    const simulationFailed =
      error.message.includes('Transaction execution error.') ||
      error.message.includes(
        'gas required exceeds allowance or always failing transaction',
      );
    if (simulationFailed) {
      const estimateWithBuffer = addGasBuffer(
        paramsForGasEstimate.gas,
        blockGasLimit,
        1.5,
      );
      return addHexPrefix(estimateWithBuffer);
    }
    throw error;
  }
}

function addGasBuffer(
  initialGasLimitHex,
  blockGasLimitHex,
  bufferMultiplier = 1.5,
) {
  const upperGasLimit = multiplyCurrencies(blockGasLimitHex, 0.9, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 10,
    numberOfDecimals: '0',
  });
  const bufferedGasLimit = multiplyCurrencies(
    initialGasLimitHex,
    bufferMultiplier,
    {
      toNumericBase: 'hex',
      multiplicandBase: 16,
      multiplierBase: 10,
      numberOfDecimals: '0',
    },
  );

  // if initialGasLimit is above blockGasLimit, dont modify it
  if (
    conversionGreaterThan(
      { value: initialGasLimitHex, fromNumericBase: 'hex' },
      { value: upperGasLimit, fromNumericBase: 'hex' },
    )
  ) {
    return initialGasLimitHex;
  }
  // if bufferedGasLimit is below blockGasLimit, use bufferedGasLimit
  if (
    conversionLessThan(
      { value: bufferedGasLimit, fromNumericBase: 'hex' },
      { value: upperGasLimit, fromNumericBase: 'hex' },
    )
  ) {
    return bufferedGasLimit;
  }
  // otherwise use blockGasLimit
  return upperGasLimit;
}

function generateTokenPalyloadData({
  toAddress = '0x0',
  amount = '0x0',
  sendToken,
}) {
  if (!sendToken) {
    return undefined;
  }
  const functionId = '0x00000000000000000000000000000001::TransferScripts::peer_to_peer_v2';
  const strTypeArgs = [sendToken.code];
  const tyArgs = utils.tx.encodeStructTypeTags(strTypeArgs);

  const bnAmount = new BigNumber(amount, 16);

  const amountSCSHex = (function () {
    const se = new bcs.BcsSerializer();
    // eslint-disable-next-line no-undef
    se.serializeU128(BigInt(bnAmount.toString(10)));
    return hexlify(se.getBytes());
  })();

  const args = [arrayify(toAddress), arrayify(amountSCSHex)];

  const scriptFunction = utils.tx.encodeScriptFunction(
    functionId,
    tyArgs,
    args,
  );

  const payloadInHex = (function () {
    const se = new bcs.BcsSerializer();
    scriptFunction.serialize(se);
    return hexlify(se.getBytes());
  })();
  return payloadInHex;
}

function generateTokenTransferData({
  toAddress = '0x0',
  amount = '0x0',
  sendToken,
}) {
  if (!sendToken) {
    return undefined;
  }
  return (
    TOKEN_TRANSFER_FUNCTION_SIGNATURE +
    Array.prototype.map
      .call(
        abi.rawEncode(
          ['address', 'uint256'],
          [toAddress, addHexPrefix(amount)],
        ),
        (x) => `00${ x.toString(16) }`.slice(-2),
      )
      .join('')
  );
}

function getToAddressForGasUpdate(...addresses) {
  return [...addresses, '']
    .find((str) => str !== undefined && str !== null)
    .toLowerCase();
}

function removeLeadingZeroes(str) {
  return str.replace(/^0*(?=\d)/u, '');
}

function ellipsify(text, first = 6, last = 4) {
  return `${ text.slice(0, first) }...${ text.slice(-last) }`;
}

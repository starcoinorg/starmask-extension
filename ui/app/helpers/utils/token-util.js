import log from 'loglevel';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { bcs, utils } from '@starcoin/starcoin';
import contractMap from '@metamask/contract-metadata';
import * as util from './util';
import { conversionUtil, multiplyCurrencies } from './conversion-util';
import { formatCurrency } from './confirm-tx.util';

const { arrayify, hexlify } = ethers.utils;
// tokens should be single instance at global level
const tokens = {};

const casedContractMap = Object.keys(contractMap).reduce((acc, base) => {
  return {
    ...acc,
    [base.toLowerCase()]: contractMap[base],
  };
}, {});

const DEFAULT_SYMBOL = '';
const DEFAULT_DECIMALS = '0';

async function getSymbolFromContract(tokenAddress) {
  const token = util.getContractAtAddress(tokenAddress);

  try {
    const result = await token.symbol();
    return result[0];
  } catch (error) {
    log.warn(
      `symbol() call for token at address ${ tokenAddress } resulted in error:`,
      error,
    );
    return undefined;
  }
}

async function getDecimalsFromContract(tokenAddress) {
  const token = util.getContractAtAddress(tokenAddress);

  try {
    const result = await token.decimals();
    const decimalsBN = result[0];
    return decimalsBN?.toString();
  } catch (error) {
    log.warn(
      `decimals() call for token at address ${ tokenAddress } resulted in error:`,
      error,
    );
    return undefined;
  }
}

function getContractMetadata(tokenAddress) {
  return tokenAddress && casedContractMap[tokenAddress.toLowerCase()];
}

function getSymbol(tokenCode) {
  const arr = tokenCode.split('::');
  const symbol = arr[2];
  return Promise.resolve(symbol);
  // let symbol = await getSymbolFromContract(tokenAddress);

  // if (!symbol) {
  //   const contractMetadataInfo = getContractMetadata(tokenAddress);

  //   if (contractMetadataInfo) {
  //     symbol = contractMetadataInfo.symbol;
  //   }
  // }

  // return symbol;
}

async function getDecimals(tokenCode) {
  const decimals = await new Promise((resolve, reject) => {
    return global.stcQuery.sendAsync(
      {
        method: 'contract.call_v2',
        params: [
          {
            function_id: '0x1::Token::scaling_factor',
            type_args: [tokenCode],
            args: [],
          },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (result && result[0]) {
          return resolve(Math.log10(result[0]));
        }
        return reject(new Error('invalid token code'));
      },
    );
  });
  return Promise.resolve(decimals);
  // let decimals = await getDecimalsFromContract(tokenAddress);

  // if (!decimals || decimals === '0') {
  //   const contractMetadataInfo = getContractMetadata(tokenAddress);

  //   if (contractMetadataInfo) {
  //     decimals = contractMetadataInfo.decimals;
  //   }
  // }

  // return decimals;
}

export async function fetchSymbolAndDecimals(tokenAddress) {
  let symbol, decimals;

  try {
    symbol = await getSymbol(tokenAddress);
    decimals = await getDecimals(tokenAddress);
  } catch (error) {
    log.warn(
      `symbol() and decimal() calls for token at address ${ tokenAddress } resulted in error:`,
      error,
    );
  }

  return {
    symbol: symbol || DEFAULT_SYMBOL,
    decimals: decimals || DEFAULT_DECIMALS,
  };
}

export async function getSymbolAndDecimals(tokenCode, existingTokens = []) {
  const existingToken = existingTokens.find(({ code }) => tokenCode === code);

  if (existingToken) {
    return {
      symbol: existingToken.symbol,
      decimals: existingToken.decimals,
    };
  }

  let symbol, decimals;

  try {
    symbol = await getSymbol(tokenCode);
    decimals = await getDecimals(tokenCode);
  } catch (error) {
    log.warn(
      `symbol() and decimal() calls for token ${ tokenCode } resulted in error:`,
      error,
    );
  }

  return {
    symbol: symbol || DEFAULT_SYMBOL,
    decimals: decimals || DEFAULT_DECIMALS,
  };
}

export function tokenInfoGetter() {
  return async (code) => {
    if (tokens[code]) {
      return tokens[code];
    }

    tokens[code] = await getSymbolAndDecimals(code);
    return tokens[code];
  };
}

export function calcTokenAmount(value, decimals) {
  const multiplier = Math.pow(10, Number(decimals || 0));
  return new BigNumber(String(value)).div(multiplier);
}

export function calcTokenValue(value, decimals) {
  const multiplier = Math.pow(10, Number(decimals || 0));
  return new BigNumber(String(value)).times(multiplier);
}

/**
 * Attempts to get the address parameter of the given token transaction data
 * (i.e. function call) per the Human Standard Token ABI, in the following
 * order:
 *   - The first parameter, if present
 *
 * @param {Object} tokenData - ethers Interface token data.
 * @returns {string | undefined} A lowercase address string.
 */
export function getTokenAddressParam(tokenData = []) {
  const value = tokenData?.args?.[0];
  return value?.toString().toLowerCase();
}

/**
 * Gets the '_value' parameter of the given token transaction data
 * (i.e function call) per the Human Standard Token ABI, in the following
 * order:
 *   - The third parameter, if present
 * @param {Object} tokenData - ethers Interface token data.
 * @returns {string | undefined} A decimal string value.
 */
export function getTokenValueParam(tokenData = {}) {
  const value = tokenData?.args?.[tokenData.args.length - 1];
  if (!value) {
    return '0';
  }
  const amountNanoSTC = (function () {
    const bytes = arrayify(value);
    const de = new bcs.BcsDeserializer(bytes);
    return de.deserializeU128();
  })();

  return amountNanoSTC?.toString().toLowerCase();
}

export function getTokenValue(tokenParams = []) {
  const valueData = tokenParams.find((param) => param.name === '_value');
  return valueData && valueData.value;
}

/**
 * Get the token balance converted to fiat and optionally formatted for display
 *
 * @param {number} [contractExchangeRate] - The exchange rate between the current token and the native currency
 * @param {number} conversionRate - The exchange rate between the current fiat currency and the native currency
 * @param {string} currentCurrency - The currency code for the user's chosen fiat currency
 * @param {string} [tokenAmount] - The current token balance
 * @param {string} [tokenSymbol] - The token symbol
 * @param {boolean} [formatted] - Whether the return value should be formatted or not
 * @param {boolean} [hideCurrencySymbol] - excludes the currency symbol in the result if true
 * @returns {string|undefined} The token amount in the user's chosen fiat currency, optionally formatted and localize
 */
export function getTokenFiatAmount(
  contractExchangeRate,
  conversionRate,
  currentCurrency,
  tokenAmount,
  tokenSymbol,
  formatted = true,
  hideCurrencySymbol = false,
) {
  // If the conversionRate is 0 (i.e. unknown) or the contract exchange rate
  // is currently unknown, the fiat amount cannot be calculated so it is not
  // shown to the user
  if (
    conversionRate <= 0 ||
    !contractExchangeRate ||
    tokenAmount === undefined
  ) {
    return undefined;
  }

  const currentTokenToFiatRate = multiplyCurrencies(
    contractExchangeRate,
    conversionRate,
    {
      multiplicandBase: 10,
      multiplierBase: 10,
    },
  );
  const currentTokenInFiat = conversionUtil(tokenAmount, {
    fromNumericBase: 'dec',
    fromCurrency: tokenSymbol,
    toCurrency: currentCurrency.toUpperCase(),
    numberOfDecimals: 2,
    conversionRate: currentTokenToFiatRate,
  });
  let result;
  if (hideCurrencySymbol) {
    result = formatCurrency(currentTokenInFiat, currentCurrency);
  } else if (formatted) {
    result = `${ formatCurrency(
      currentTokenInFiat,
      currentCurrency,
    ) } ${ currentCurrency.toUpperCase() }`;
  } else {
    result = currentTokenInFiat;
  }
  return result;
}

export function generateAcceptTokenPayloadHex(tokenCode) {
  const functionId = '0x1::Account::accept_token';
  const strTypeArgs = [tokenCode];
  const tyArgs = utils.tx.encodeStructTypeTags(strTypeArgs);
  const args = [];

  const scriptFunction = utils.tx.encodeScriptFunction(functionId, tyArgs, args);

  // Multiple BcsSerializers should be used in different closures, otherwise, the latter will be contaminated by the former.
  const payloadInHex = (function () {
    const se = new bcs.BcsSerializer();
    scriptFunction.serialize(se);
    return hexlify(se.getBytes());
  })();
  return payloadInHex;
}

export function generateAutoAcceptTokenPayloadHex(value) {
  const functionId = value
    ? '0x1::AccountScripts::enable_auto_accept_token'
    : '0x1::AccountScripts::disable_auto_accept_token';
  const tyArgs = [];
  const args = [];

  const scriptFunction = utils.tx.encodeScriptFunction(functionId, tyArgs, args);

  // Multiple BcsSerializers should be used in different closures, otherwise, the latter will be contaminated by the former.
  const payloadInHex = (function () {
    const se = new bcs.BcsSerializer();
    scriptFunction.serialize(se);
    return hexlify(se.getBytes());
  })();
  return payloadInHex;
}

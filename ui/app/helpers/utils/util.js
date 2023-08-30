import punycode from 'punycode/punycode';
import abi from 'human-standard-token-abi';
import BigNumber from 'bignumber.js';
import * as stcUtil from '@starcoin-org/stc-util';
import { DateTime } from 'luxon';
import { addHexPrefix } from '../../../../app/scripts/lib/util';
import {
  BARNARD_CHAIN_ID,
  PROXIMA_CHAIN_ID,
  LOCALHOST_CHAIN_ID,
  MAINNET_CHAIN_ID,
  HALLEY_CHAIN_ID,
} from '../../../../shared/constants/network';

// formatData :: ( date: <Unix Timestamp> ) -> String
export function formatDate(date, format = "M/d/y 'at' T") {
  return DateTime.fromMillis(date).toFormat(format);
}

export function formatDateWithYearContext(
  date,
  formatThisYear = 'MMM d',
  fallback = 'MMM d, y',
) {
  const dateTime = DateTime.fromMillis(date);
  const now = DateTime.local();
  return dateTime.toFormat(
    now.year === dateTime.year ? formatThisYear : fallback,
  );
}

const valueTable = {
  wei: '1000000000000000000',
  kwei: '1000000000000000',
  mwei: '1000000000000',
  gwei: '1000000000',
  szabo: '1000000',
  finney: '1000',
  ether: '1',
  kether: '0.001',
  mether: '0.000001',
  gether: '0.000000001',
  tether: '0.000000000001',
};
const bnTable = {};
Object.keys(valueTable).forEach((currency) => {
  bnTable[currency] = new stcUtil.BN(valueTable[currency], 10);
});

/**
 * Determines if the provided chainId is a default MetaMask chain
 * @param {string} chainId - chainId to check
 */
export function isDefaultMetaMaskChain(chainId) {
  if (
    !chainId ||
    chainId === MAINNET_CHAIN_ID ||
    chainId === BARNARD_CHAIN_ID ||
    chainId === PROXIMA_CHAIN_ID ||
    chainId === HALLEY_CHAIN_ID ||
    chainId === LOCALHOST_CHAIN_ID
  ) {
    return true;
  }

  return false;
}

export function valuesFor(obj) {
  if (!obj) {
    return [];
  }
  return Object.keys(obj).map(function (key) {
    return obj[key];
  });
}

export function addressSummary(
  address,
  firstSegLength = 10,
  lastSegLength = 4,
  includeHex = true,
) {
  if (!address) {
    return '';
  }
  let checked = checksumAddress(address);
  if (!includeHex) {
    checked = stcUtil.stripHexPrefix(checked);
  }
  return checked
    ? `${ checked.slice(0, firstSegLength) }...${ checked.slice(
      checked.length - lastSegLength,
    ) }`
    : '...';
}

export function isValidAddress(address) {
  if (!address || address === '0x0000000000000000000000000000000000000000') {
    return false;
  }
  const prefixed = addHexPrefix(address);
  return (
    (isAllOneCase(prefixed.slice(2)) && stcUtil.isValidAddress(prefixed)) ||
    stcUtil.isValidChecksumAddress(prefixed)
  );
}

/**
 * Checks if the value is a valid receiptIdentifier, more in SIP#22.
 */
export function isValidReceiptIdentifier(value) {
  // prefix is `stc`
  // totalLength=37: address only
  // totalLength=88: address + authKey
  return /^stc[0-9a-z]{34,85}$/i.test(value);
}

export function isValidReceipt(receipt) {
  if (receipt.startsWith('stc')) {
    return isValidReceiptIdentifier(receipt);
  }
  return isValidAddress(receipt);
}

export function isValidDomainName(address) {
  const match = punycode
    .toASCII(address)
    .toLowerCase()
    // Checks that the domain consists of at least one valid domain pieces separated by periods, followed by a tld
    // Each piece of domain name has only the characters a-z, 0-9, and a hyphen (but not at the start or end of chunk)
    // A chunk has minimum length of 1, but minimum tld is set to 2 for now (no 1-character tlds exist yet)
    .match(
      /^(?:[a-z0-9](?:[-a-z0-9]*[a-z0-9])?\.)+[a-z0-9][-a-z0-9]*[a-z0-9]$/u,
    );
  return match !== null;
}

export function isOriginContractAddress(to, sendTokenAddress) {
  if (!to || !sendTokenAddress) {
    return false;
  }
  return to.toLowerCase() === sendTokenAddress.toLowerCase();
}

export function isAllOneCase(address) {
  if (!address) {
    return true;
  }
  const lower = address.toLowerCase();
  const upper = address.toUpperCase();
  return address === lower || address === upper;
}

// Takes wei Hex, returns wei BN, even if input is null
export function numericBalance(balance) {
  if (!balance) {
    return new stcUtil.BN(0, 16);
  }
  const stripped = stcUtil.stripHexPrefix(balance);
  return new stcUtil.BN(stripped, 16);
}

// Takes  hex, returns [beforeDecimal, afterDecimal]
export function parseBalance(balance) {
  let afterDecimal;
  const wei = numericBalance(balance);
  const weiString = wei.toString();
  const trailingZeros = /0+$/u;

  const beforeDecimal =
    weiString.length > 18 ? weiString.slice(0, weiString.length - 18) : '0';
  afterDecimal = `000000000000000000${ wei }`
    .slice(-18)
    .replace(trailingZeros, '');
  if (afterDecimal === '') {
    afterDecimal = '0';
  }
  return [beforeDecimal, afterDecimal];
}

// Takes wei hex, returns an object with three properties.
// Its "formatted" property is what we generally use to render values.
export function formatBalance(
  balance,
  decimalsToKeep,
  needsParse = true,
  ticker = 'STC',
) {
  const parsed = needsParse ? parseBalance(balance) : balance.split('.');
  const beforeDecimal = parsed[0];
  let afterDecimal = parsed[1];
  let formatted = 'None';
  if (decimalsToKeep === undefined) {
    if (beforeDecimal === '0') {
      if (afterDecimal !== '0') {
        const sigFigs = afterDecimal.match(/^0*(.{2})/u); // default: grabs 2 most significant digits
        if (sigFigs) {
          afterDecimal = sigFigs[0];
        }
        formatted = `0.${ afterDecimal } ${ ticker }`;
      }
    } else {
      formatted = `${ beforeDecimal }.${ afterDecimal.slice(0, 3) } ${ ticker }`;
    }
  } else {
    afterDecimal += Array(decimalsToKeep).join('0');
    formatted = `${ beforeDecimal }.${ afterDecimal.slice(
      0,
      decimalsToKeep,
    ) } ${ ticker }`;
  }
  return formatted;
}

export function generateBalanceObject(formattedBalance, decimalsToKeep = 1) {
  let balance = formattedBalance.split(' ')[0];
  const label = formattedBalance.split(' ')[1];
  const beforeDecimal = balance.split('.')[0];
  const afterDecimal = balance.split('.')[1];
  const shortBalance = shortenBalance(balance, decimalsToKeep);

  if (beforeDecimal === '0' && afterDecimal.substr(0, 5) === '00000') {
    // eslint-disable-next-line eqeqeq
    if (afterDecimal == 0) {
      balance = '0';
    } else {
      balance = '<1.0e-5';
    }
  } else if (beforeDecimal !== '0') {
    balance = `${ beforeDecimal }.${ afterDecimal.slice(0, decimalsToKeep) }`;
  }

  return { balance, label, shortBalance };
}

export function shortenBalance(balance, decimalsToKeep = 1) {
  let truncatedValue;
  const convertedBalance = parseFloat(balance);
  if (convertedBalance > 1000000) {
    truncatedValue = (balance / 1000000).toFixed(decimalsToKeep);
    return `${ truncatedValue }m`;
  } else if (convertedBalance > 1000) {
    truncatedValue = (balance / 1000).toFixed(decimalsToKeep);
    return `${ truncatedValue }k`;
  } else if (convertedBalance === 0) {
    return '0';
  } else if (convertedBalance < 0.001) {
    return '<0.001';
  } else if (convertedBalance < 1) {
    const stringBalance = convertedBalance.toString();
    if (stringBalance.split('.')[1].length > 3) {
      return convertedBalance.toFixed(3);
    }
    return stringBalance;
  }
  return convertedBalance.toFixed(decimalsToKeep);
}

// Takes a BN and an ethereum currency name,
// returns a BN in wei
export function normalizeToWei(amount, currency) {
  try {
    return amount.mul(bnTable.wei).div(bnTable[currency]);
  } catch (e) {
    return amount;
  }
}

export function normalizeEthStringToWei(str) {
  const parts = str.split('.');
  let eth = new stcUtil.BN(parts[0], 10).mul(bnTable.wei);
  if (parts[1]) {
    let decimal = parts[1];
    while (decimal.length < 18) {
      decimal += '0';
    }
    if (decimal.length > 18) {
      decimal = decimal.slice(0, 18);
    }
    const decimalBN = new stcUtil.BN(decimal, 10);
    eth = eth.add(decimalBN);
  }
  return eth;
}

const multiple = new stcUtil.BN('10000', 10);
export function normalizeNumberToWei(n, currency) {
  const enlarged = n * 10000;
  const amount = new stcUtil.BN(String(enlarged), 10);
  return normalizeToWei(amount, currency).div(multiple);
}

export function isHex(str) {
  return Boolean(str.match(/^(0x)?[0-9a-fA-F]+$/u));
}

export function getContractAtAddress(tokenAddress) {
  return global.eth.contract(abi).at(tokenAddress);
}

export function getRandomFileName() {
  let fileName = '';
  const charBank = [
    ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  ];
  const fileNameLength = Math.floor(Math.random() * 7 + 6);

  for (let i = 0; i < fileNameLength; i++) {
    fileName += charBank[Math.floor(Math.random() * charBank.length)];
  }

  return fileName;
}

export function exportAsFile(filename, data, type = 'text/csv') {
  // eslint-disable-next-line no-param-reassign
  filename = filename || getRandomFileName();
  // source: https://stackoverflow.com/a/33542499 by Ludovic Feltz
  const blob = new window.Blob([data], { type });
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, filename);
  } else {
    const elem = window.document.createElement('a');
    elem.target = '_blank';
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }
}

/**
 * Safely checksumms a potentially-null address
 *
 * @param {string} [address] - address to checksum
 * @returns {string} checksummed address
 *
 */
export function checksumAddress(address) {
  const checksummed = address ? stcUtil.toChecksumAddress(address) : '';
  return checksummed;
}

/**
 * Shortens an Ethereum address for display, preserving the beginning and end.
 * Returns the given address if it is no longer than 10 characters.
 * Shortened addresses are 13 characters long.
 *
 * Example output: 0xabcd...1234
 *
 * @param {string} address - The address to shorten.
 * @returns {string} The shortened address, or the original if it was no longer
 * than 10 characters.
 */
export function shortenAddress(address = '') {
  if (address.length < 11) {
    return address;
  }

  return `${ address.slice(0, 6) }...${ address.slice(-4) }`;
}

export function isValidAddressHead(address) {
  const addressLengthIsLessThanFull = address.length < 42;
  const addressIsHex = isHex(address);

  return addressLengthIsLessThanFull && addressIsHex;
}

export function getAccountByAddress(accounts = [], targetAddress) {
  return accounts.find(({ address }) => address === targetAddress);
}

/**
 * Strips the following schemes from URL strings:
 * - http
 * - https
 *
 * @param {string} urlString - The URL string to strip the scheme from.
 * @returns {string} The URL string, without the scheme, if it was stripped.
 */
export function stripHttpSchemes(urlString) {
  return urlString.replace(/^https?:\/\//u, '');
}

/**
 * Strips the following schemes from URL strings:
 * - https
 *
 * @param {string} urlString - The URL string to strip the scheme from.
 * @returns {string} The URL string, without the scheme, if it was stripped.
 */
export function stripHttpsScheme(urlString) {
  return urlString.replace(/^https:\/\//u, '');
}

/**
 * Checks whether a URL-like value (object or string) is an extension URL.
 *
 * @param {string | URL | object} urlLike - The URL-like value to test.
 * @returns {boolean} Whether the URL-like value is an extension URL.
 */
export function isExtensionUrl(urlLike) {
  const EXT_PROTOCOLS = ['chrome-extension:', 'moz-extension:'];

  if (typeof urlLike === 'string') {
    for (const protocol of EXT_PROTOCOLS) {
      if (urlLike.startsWith(protocol)) {
        return true;
      }
    }
  }

  if (urlLike?.protocol) {
    return EXT_PROTOCOLS.includes(urlLike.protocol);
  }
  return false;
}

/**
 * Checks whether an address is in a passed list of objects with address properties. The check is performed on the
 * lowercased version of the addresses.
 *
 * @param {string} address - The hex address to check
 * @param {Array} list - The array of objects to check
 * @returns {boolean} Whether or not the address is in the list
 */
export function checkExistingAddresses(address, list = []) {
  if (!address) {
    return false;
  }

  const matchesAddress = (obj) => {
    const tokenAddress = obj.code.split('::')[0];
    return tokenAddress.toLowerCase() === address.toLowerCase();
  };

  return list.some(matchesAddress);
}

/**
 * Checks whether a code is in a passed list of objects with code properties. The check is performed on the
 * lowercased version of the addresses.
 *
 * @param {string} code - The hex address to check
 * @param {Array} list - The array of objects to check
 * @returns {boolean} Whether or not the address is in the list
 */
export function checkExistingCodes(code, list = []) {
  if (!code) {
    return false;
  }

  const matchesCode = (obj) => {
    return (typeof obj === 'string') ? obj.toLowerCase() === code.toLowerCase() : obj.code?.toLowerCase() === code.toLowerCase();
  };

  return list.some(matchesCode);
}

/**
 * Checks whether a nftMeta is in a passed list of objects with NFTMeta properties. The check is performed on the
 * lowercased version of the addresses.
 *
 * @param {string} code - The NFTMeta to check
 * @param {Array} list - The array of objects to check
 * @returns {boolean} Whether or not the NFTMeta is in the list
 */
export function checkExistingNFT(nftMeta, list = []) {
  if (!nftMeta) {
    return false;
  }

  const matchesNFT = (obj) => {
    return obj.NFTMeta?.toLowerCase() === nftMeta.toLowerCase();
  };

  return list.some(matchesNFT);
}

/**
 * Given a number and specified precision, returns that number in base 10 with a maximum of precision
 * significant digits, but without any trailing zeros after the decimal point To be used when wishing
 * to display only as much digits to the user as necessary
 *
 * @param {string | number | BigNumber} n - The number to format
 * @param {number} precision - The maximum number of significant digits in the return value
 * @returns {string} The number in decimal form, with <= precision significant digits and no decimal trailing zeros
 */
export function toPrecisionWithoutTrailingZeros(n, precision) {
  return new BigNumber(n)
    .toPrecision(precision)
    .replace(/(\.[0-9]*[1-9])0*|(\.0*)/u, '$1');
}

/**
 * Given and object where all values are strings, returns the same object with all values
 * now prefixed with '0x'
 */
export function addHexPrefixToObjectValues(obj) {
  return Object.keys(obj).reduce((newObj, key) => {
    return { ...newObj, [key]: addHexPrefix(obj[key]) };
  }, {});
}

/**
 * Given the standard set of information about a transaction, returns a transaction properly formatted for
 * publishing via JSON RPC and web3
 *
 * @param {boolean} [sendToken] - Indicates whether or not the transaciton is a token transaction
 * @param {string} data - A hex string containing the data to include in the transaction
 * @param {string} to - A hex address of the tx recipient address
 * @param {string} from - A hex address of the tx sender address
 * @param {string} gas - A hex representation of the gas value for the transaction
 * @param {string} gasPrice - A hex representation of the gas price for the transaction
 * @returns {Object} An object ready for submission to the blockchain, with all values appropriately hex prefixed
 */
export function constructTxParams({
  sendToken,
  data,
  to,
  amount,
  from,
  gas,
  gasPrice,
}) {
  const txParams = {
    data,
    from,
    value: '0',
    gas,
    gasPrice,
  };

  if (!sendToken) {
    txParams.value = amount;
    txParams.to = to;
  }
  return addHexPrefixToObjectValues(txParams);
}

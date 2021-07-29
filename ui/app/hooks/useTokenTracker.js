import { useSelector } from 'react-redux';
import BN from 'bn.js';
import { getSelectedAddress, getAssets } from '../selectors';

const zero = new BN(0)

function stringifyBalance(balance, bnDecimals) {
  if (balance.eq(zero)) {
    return '0'
  }

  const decimals = parseInt(bnDecimals.toString())
  if (decimals === 0) {
    return balance.toString()
  }

  let bal = balance.toString()
  let len = bal.length
  let decimalIndex = len - decimals
  let prefix = ''

  if (decimalIndex <= 0) {
    while (prefix.length <= decimalIndex * -1) {
      prefix += '0'
      len++
    }
    bal = prefix + bal
    decimalIndex = 1
  }

  const whole = bal.substr(0, len - decimals)
  const fractional = bal.substr(decimalIndex, 3)
  if (/0+$/.test(fractional)) {
    let withOnlySigZeroes = bal.substr(decimalIndex).replace(/0+$/, '')
    if (withOnlySigZeroes.length > 0) withOnlySigZeroes = `.${withOnlySigZeroes}`
    return `${whole}${withOnlySigZeroes}`
  }
  return `${whole}.${fractional}`
}


export function useTokenTracker(
  tokens,
  includeFailedTokens = false,
  hideZeroBalanceTokens = false,
) {
  const tokensWithBalances = [];
  const userAddress = useSelector(getSelectedAddress);
  const assets = useSelector(getAssets);
  const currentAssets = assets[userAddress];
  if (currentAssets && Object.keys(currentAssets).length) {
    Object.keys(currentAssets).forEach((key) => {
      if (!tokens.filter((token) => token.code === key).length) {
        return;
      }
      if (key === '0x00000000000000000000000000000001::STC::STC') {
        return;
      }
      if (hideZeroBalanceTokens && Number(currentAssets[key]) === 0) {
        return;
      }
      const decimals = 9;
      const token = {
        code: key,
        balance: currentAssets[key],
        symbol: key.split('::')[2],
        decimals,
        string: stringifyBalance(new BN(currentAssets[key], 16), decimals || new BN(0)),
      };
      tokensWithBalances.push(token);
    });
  }
  const loading = false;
  const error = null;
  return { loading, tokensWithBalances, error };
}

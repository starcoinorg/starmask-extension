import { useSelector } from 'react-redux';
import { getSelectedAddress, getAssets } from '../selectors';
import { stringifyBalance } from '../helpers/utils/confirm-tx.util';
import { tokenInfoGetter } from '../helpers/utils/token-util';

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
      const currentToken = tokens.filter((token) => token.code === key)[0];
      if (key === '0x00000000000000000000000000000001::STC::STC') {
        return;
      }
      if (hideZeroBalanceTokens && Number(currentAssets[key]) === 0) {
        return;
      }

      const { decimals, symbol } = currentToken;
      const numberOfDecimals = decimals <= 9 ? 4 : 9;
      const token = {
        code: key,
        balance: currentAssets[key],
        symbol,
        decimals,
        string: stringifyBalance(currentAssets[key], decimals, symbol, numberOfDecimals),
        accepted: true,
      };
      tokensWithBalances.push(token);
    });
  }
  // added to wallet but not enabled accept_tokens ones
  const unAcceptTokens = tokens.filter((token) => token.code.split('::').length === 3 && currentAssets && !currentAssets[token.code]);
  unAcceptTokens.map(({ code, decimals }) => {
    const numberOfDecimals = decimals <= 9 ? 4 : 9;;
    const symbol = code.split('::')[2];
    const token = {
      code,
      balance: currentAssets[code],
      symbol,
      decimals,
      string: stringifyBalance(currentAssets[code], decimals, symbol, numberOfDecimals),
      accepted: false,
    };
    tokensWithBalances.push(token);
  });
  const loading = false;
  const error = null;
  return { loading, tokensWithBalances, error };
}

export async function getTokenInfos(currentAssets) {
  return Promise.all(
    Object.keys(currentAssets).map(async (code) => {
      const result = await tokenInfoGetter()(code)
      return { code, ...result };
    })
  ).then((tokens) => {
    return tokens;
  });
}

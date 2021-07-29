import { useSelector } from 'react-redux';
import { getSelectedAddress, getAssets } from '../selectors';
import { stringifyBalance } from '../helpers/utils/confirm-tx.util';

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
      const decimals = 4;
      const symbol = key.split('::')[2];
      const token = {
        code: key,
        balance: currentAssets[key],
        symbol,
        decimals,
        string: stringifyBalance(currentAssets[key], decimals, symbol),
      };
      tokensWithBalances.push(token);
    });
  }
  const loading = false;
  const error = null;
  return { loading, tokensWithBalances, error };
}

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { isEqual } from 'lodash';
import { useSelector, useDispatch } from 'react-redux';
import TokenCell from '../token-cell';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { useTokenTracker, getTokenInfos } from '../../../hooks/useTokenTracker';
import {
  getAssetImages,
  getShouldHideZeroBalanceTokens,
  getSelectedAddress,
  getAssets,
} from '../../../selectors';
import { getTokens, getHiddenTokens } from '../../../ducks/metamask/metamask';
import { addTokens } from '../../../store/actions';

export default function TokenList({ onTokenClick }) {
  const dispatch = useDispatch();
  const t = useI18nContext();
  const assetImages = useSelector(getAssetImages);
  const shouldHideZeroBalanceTokens = useSelector(
    getShouldHideZeroBalanceTokens,
  );
  const hiddenTokens = useSelector(getHiddenTokens);
  // use `isEqual` comparison function because the token array is serialized
  // from the background so it has a new reference with each background update,
  // even if the tokens haven't changed
  const tokens = useSelector(getTokens, isEqual);

  const [loadingTokenInfos, setLoadingTokenInfos] = useState(false);
  const userAddress = useSelector(getSelectedAddress);
  const assets = useSelector(getAssets, isEqual);
  useEffect(() => {
    const fetchData = async () => {
      const currentAssets = assets[userAddress] || undefined;
      if (currentAssets) {
        if (!loadingTokenInfos) {
          setLoadingTokenInfos(true);
          const assetTokens = await getTokenInfos(currentAssets);
          const tokensCode = tokens.map((token) => token.code.toLowerCase())
          const addedTokens = assetTokens.filter((token) =>
            !(tokensCode.includes(token.code.toLowerCase()) || hiddenTokens.includes(token.code.toLowerCase()))
          )
          if (addedTokens.length) {
            dispatch(addTokens(addedTokens));
          }
          setLoadingTokenInfos(false);
        }
      }
    };
    fetchData();
  }, [userAddress, assets, tokens, hiddenTokens]);

  const { loading, tokensWithBalances } = useTokenTracker(
    tokens,
    true,
    shouldHideZeroBalanceTokens,
  );
  if (loadingTokenInfos || loading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '250px',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px',
        }}
      >
        {t('loadingTokens')}
      </div>
    );
  }

  return (
    <div>
      {tokensWithBalances.map((tokenData, index) => {
        tokenData.image = assetImages[tokenData.code];
        return <TokenCell key={index} {...tokenData} onClick={onTokenClick} />;
      })}
    </div>
  );
}

TokenList.propTypes = {
  onTokenClick: PropTypes.func.isRequired,
};

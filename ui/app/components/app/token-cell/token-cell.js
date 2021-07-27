import classnames from 'classnames';
import PropTypes from 'prop-types';
import React from 'react';
import { useSelector } from 'react-redux';
import AssetListItem from '../asset-list-item';
import { getSelectedAddress } from '../../../selectors';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { useTokenFiatAmount } from '../../../hooks/useTokenFiatAmount';

export default function TokenCell({
  code,
  decimals,
  balanceError,
  symbol,
  string,
  image,
  onClick,
}) {
  const userAddress = useSelector(getSelectedAddress);
  const t = useI18nContext();

  const formattedFiat = useTokenFiatAmount(code, string, symbol);

  const warning = balanceError ? (
    <span>
      {t('troubleTokenBalances')}
      <a
        href={`https://stcscan.io/address/${userAddress}`}
        rel="noopener noreferrer"
        target="_blank"
        onClick={(event) => event.stopPropagation()}
        style={{ color: '#F7861C' }}
      >
        {t('here')}
      </a>
    </span>
  ) : (code ? code : null);

  return (
    <AssetListItem
      className={classnames('token-cell', {
        'token-cell--outdated': Boolean(balanceError),
      })}
      iconClassName="token-cell__icon"
      onClick={onClick.bind(null, code)}
      tokenCode={code}
      tokenImage={image}
      tokenSymbol={symbol}
      tokenDecimals={decimals}
      warning={warning}
      primary={`${string || 0}`}
      secondary={formattedFiat}
    />
  );
}

TokenCell.propTypes = {
  code: PropTypes.string,
  balanceError: PropTypes.object,
  symbol: PropTypes.string,
  decimals: PropTypes.number,
  string: PropTypes.string,
  image: PropTypes.string,
  onClick: PropTypes.func.isRequired,
};

TokenCell.defaultProps = {
  balanceError: null,
};

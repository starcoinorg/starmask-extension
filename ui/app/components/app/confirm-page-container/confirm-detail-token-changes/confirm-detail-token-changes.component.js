import React from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useSelector, useDispatch } from 'react-redux';
import { isEqual } from 'lodash';
import { getTokens, getHiddenTokens } from '../../../../ducks/metamask/metamask';
import log from 'loglevel';
import UserPreferencedCurrencyDisplay from '../../user-preferenced-currency-display';
import { PRIMARY, SECONDARY } from '../../../../helpers/constants/common';
import Tooltip from '../../../ui/tooltip';
import InfoIcon from '../../../ui/icon/info-icon.component';
import { SEVERITIES } from '../../../../helpers/constants/design-system';
import { useTokenTracker, getTokenInfos } from '../../../../hooks/useTokenTracker';
import { getSelectedAddress, getAssets, getCurrentEthBalance } from '../../../../selectors';
import { stringifyBalance } from '../../../../helpers/utils/confirm-tx.util';
import { ConfirmDetailTokenChangeRow } from '../../confirm-page-container';
import { useI18nContext } from '../../../../hooks/useI18nContext';

const ConfirmDetailTokenChanges = (props) => {
  const {
    tokenChanges,
  } = props;

  const accountBalance = useSelector(getCurrentEthBalance)

  const tokens = useSelector(getTokens, isEqual)


  const { loading, tokensWithBalances } = useTokenTracker(
    tokens,
    true,
    true
  );
  const currencySTC = {
    code: "0x00000000000000000000000000000001::STC::STC",
    decimals: 9,
    symbol: "STC",
    accepted: true,
    balance: accountBalance,
  }

  tokensWithBalances.push({
    ...currencySTC,
    string: stringifyBalance(currencySTC.balance, currencySTC.decimals, currencySTC.symbol, currencySTC.decimals),
  })
  const t = useI18nContext()
  return (
    <div className="confirm-detail-row__token-changes">
      <div className="confirm-detail-row">
        <div className="confirm-detail-row__secondary">{t('estimatedTokenChanges')}</div>
      </div>
      {
        Object.keys(tokenChanges).map((code, i) => {
          const balanceChanged = tokenChanges[code]
          const token = tokensWithBalances.filter((item) => item.code === code)
          return token && token[0] && (
            <ConfirmDetailTokenChangeRow
              key={i}
              code={code}
              symbol={token[0].symbol}
              decimals={token[0].decimals}
              valueAfter={balanceChanged}
              valueBefore={token[0].balance}
              primaryText="asdf"
              secondaryText="+ 1"
              headerText="+ 1"
              headerTextClassName="confirm-detail-row__header-text--total"
            />
          )
        })
      }
    </div>
  );
};

ConfirmDetailTokenChanges.propTypes = {
  tokenChanges: PropTypes.object,
};

export default ConfirmDetailTokenChanges;

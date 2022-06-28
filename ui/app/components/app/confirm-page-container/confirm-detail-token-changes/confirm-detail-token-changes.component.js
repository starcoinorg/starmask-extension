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

const ConfirmDetailTokenChanges = (props) => {
  const {
    code,
  } = props;
  const tokenChanges = {
    '0x00000000000000000000000000000001::STC::STC': "0x151cd24262",
    '0x8c109349c6bd91411d6bc962e080c4a3::STAR::STAR': "0x171cd24252"
  }
  const accountBalance = useSelector(getCurrentEthBalance)
  log.debug({ accountBalance })

  const assets = useSelector(getAssets)
  log.debug({ assets })
  const tokens = useSelector(getTokens, isEqual)


  const { loading, tokensWithBalances } = useTokenTracker(
    tokens,
    true,
    true
  );
  log.debug({ tokens })
  log.debug('asdfsa')
  const currencySTC = {
    code: "0x00000000000000000000000000000001::STC::STC",
    decimals: 9,
    symbol: "STC",
    accepted: true,
    balance: accountBalance,
  }

  log.debug({ loading, tokensWithBalances })
  tokensWithBalances.push({
    ...currencySTC,
    string: stringifyBalance(currencySTC.balance, currencySTC.decimals, currencySTC.symbol, currencySTC.decimals),
  })
  log.debug({ tokensWithBalances })
  log.debug({ tokenChanges })
  return (
    <>
      {
        Object.keys(tokenChanges).map((code, i) => {
          const balanceChanged = tokenChanges[code]
          const token = tokensWithBalances.filter((item) => item.code === code)
          log.debug({ i, token })
          return token && token[0] && (
            <ConfirmDetailTokenChangeRow
              index={i}
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
    </>
  );
};

ConfirmDetailTokenChanges.propTypes = {
  code: PropTypes.string,
};

export default ConfirmDetailTokenChanges;

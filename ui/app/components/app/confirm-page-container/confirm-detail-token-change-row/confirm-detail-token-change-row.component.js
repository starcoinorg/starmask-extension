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
import Identicon from '../../../ui/identicon';
import InfoIcon from '../../../ui/icon/info-icon.component';
import { SEVERITIES } from '../../../../helpers/constants/design-system';
import BigNumber from 'bignumber.js';
import { stringifyBalance } from '../../../../helpers/utils/confirm-tx.util';

const ConfirmDetailTokenChangeRow = (props) => {
  const {
    code,
    symbol,
    decimals,
    primaryText,
    secondaryText,
    onHeaderClick,
    primaryValueTextColor,
    headerText,
    headerTextClassName,
    valueAfter,
    valueBefore,
  } = props;
  const label = code.split('::')[2]
  const bnValueBefore = new BigNumber(String(valueBefore), 16);
  const bnValueAfter = new BigNumber(String(valueAfter), 16);
  const valueAfterText = stringifyBalance(valueAfter, decimals, symbol, decimals)
  const bnDelta = bnValueAfter.minus(bnValueBefore)
  const delta = bnDelta.toNumber()
  const deltaText = stringifyBalance(bnDelta.toString(16), decimals, symbol, decimals)
  return (
    <div className="confirm-detail-row">
      <div className={classnames(
        'confirm-detail-row__label',
        'confirm-detail-row__token'
      )}>
        <Tooltip
          position="top"
          title={code.replace('<', '\n<').replace(',', '\n,')}
        >
          <Identicon
            diameter={18}
            address={code}
            alt={code}
          />
        </Tooltip>&nbsp;
        {label}

      </div>
      <div className="confirm-detail-row__details">
        <UserPreferencedCurrencyDisplay
          className="confirm-detail-row__secondary"
          value={valueBefore}
          style={{ color: primaryValueTextColor }}
          hideLabel
        />
        <div
          className={classnames(
            'confirm-detail-row__primary',
          )}
        >
          {delta > 0 ? `+${ deltaText }` : deltaText}
        </div>
        <div
          className={classnames(
            'confirm-detail-row__secondary',
          )}
        >
          {`= ${ valueAfterText }`}
        </div>
      </div>
    </div>
  )
};

ConfirmDetailTokenChangeRow.propTypes = {
  headerText: PropTypes.string,
  headerTextClassName: PropTypes.string,
  code: PropTypes.string,
  symbol: PropTypes.string,
  decimals: PropTypes.number,
  onHeaderClick: PropTypes.func,
  primaryValueTextColor: PropTypes.string,
  primaryText: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  secondaryText: PropTypes.string,
  valueAfter: PropTypes.string,
  valueBefore: PropTypes.string,
};

export default ConfirmDetailTokenChangeRow;

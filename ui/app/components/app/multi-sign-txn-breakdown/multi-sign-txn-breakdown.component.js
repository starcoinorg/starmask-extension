import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { formatDate } from '../../../helpers/utils/util';
import CurrencyDisplay from '../../ui/currency-display';
import UserPreferencedCurrencyDisplay from '../user-preferenced-currency-display';
import HexToDecimal from '../../ui/hex-to-decimal';
import { NANOSTC, PRIMARY, SECONDARY } from '../../../helpers/constants/common';
import TransactionBreakdownRow from '../transaction-breakdown/transaction-breakdown-row';

export default class MultiSignTxnBreakdown extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    className: PropTypes.string,
    timestamp: PropTypes.string,
    nativeCurrency: PropTypes.string,
    showFiat: PropTypes.bool,
    nonce: PropTypes.string,
    primaryCurrency: PropTypes.string,
    isTokenApprove: PropTypes.bool,
    gas: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gasPrice: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    gasUsed: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    totalInHex: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  };

  static defaultProps = {
    showFiat: true,
  };

  render() {
    const { t } = this.context;
    const { primaryCurrency, className, nonce, timestamp } = this.props;

    const titleAmountThreshold = `${t('multiSignTxnAmount')}/${t('threshold')}`;
    const formattedTimestamp = timestamp ? formatDate(timestamp, "T 'on' M/d/y") : '';
    return (
      <div className={classnames('transaction-breakdown', className)}>
        <div className="transaction-breakdown__title">
          {t('multiSign')}
          {t('transaction')}
        </div>
        <TransactionBreakdownRow title={t('sequenceNumber')}>
          {typeof nonce === 'undefined' ? null : (
            <HexToDecimal
              className="transaction-breakdown__value"
              value={nonce}
            />
          )}
        </TransactionBreakdownRow>
        <TransactionBreakdownRow title={titleAmountThreshold}>
          <span className="transaction-breakdown__value">
            {primaryCurrency}
          </span>
        </TransactionBreakdownRow>
        <TransactionBreakdownRow title={t('multiSignTxnTime')}>
          <span className="transaction-breakdown__value">
            {formattedTimestamp}
          </span>
        </TransactionBreakdownRow>
      </div>
    );
  }
}

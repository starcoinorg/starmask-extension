import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import copyToClipboard from 'copy-to-clipboard';
import { exportAsFile } from '../../../helpers/utils/util';
import { hexToDecimal } from '../../../helpers/utils/conversions.util';
import {
  getEthConversionFromWeiHex,
  getValueFromWeiHex,
} from '../../../helpers/utils/conversions.util';
import { formatDate } from '../../../helpers/utils/util';
import { getBlockExplorerUrlForTx } from '../../../../../shared/modules/transaction.utils';
import TransactionActivityLogIcon from './transaction-activity-log-icon';
import { CONFIRMED_STATUS } from './transaction-activity-log.constants';
import { TRANSACTION_ERRORED_EVENT, TRANSACTION_DROPPED_EVENT } from './transaction-activity-log.constants';
import { arrayify } from 'ethers/lib/utils';

export default class TransactionActivityLog extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
    metricEvent: PropTypes.func,
  };

  static propTypes = {
    activities: PropTypes.array,
    className: PropTypes.string,
    conversionRate: PropTypes.number,
    inlineRetryIndex: PropTypes.number,
    inlineCancelIndex: PropTypes.number,
    nativeCurrency: PropTypes.string,
    onCancel: PropTypes.func,
    onRetry: PropTypes.func,
    primaryTransaction: PropTypes.object,
    isEarliestNonce: PropTypes.bool,
    rpcPrefs: PropTypes.object,
  };

  handleActivityClick = (activity) => {
    const etherscanUrl = getBlockExplorerUrlForTx(
      activity,
      this.props.rpcPrefs,
    );
    global.platform.openTab({ url: etherscanUrl });
  };

  renderInlineRetry(index) {
    const { t } = this.context;
    const {
      inlineRetryIndex,
      primaryTransaction = {},
      onRetry,
      isEarliestNonce,
    } = this.props;
    const { status } = primaryTransaction;

    return isEarliestNonce &&
      status !== CONFIRMED_STATUS &&
      index === inlineRetryIndex ? (
      <div className="transaction-activity-log__action-link" onClick={onRetry}>
        {t('speedUpTransaction')}
      </div>
    ) : null;
  }

  renderInlineCancel(index) {
    const { t } = this.context;
    const {
      inlineCancelIndex,
      primaryTransaction = {},
      onCancel,
      isEarliestNonce,
    } = this.props;
    const { status } = primaryTransaction;

    return isEarliestNonce &&
      status !== CONFIRMED_STATUS &&
      index === inlineCancelIndex ? (
      <div className="transaction-activity-log__action-link" onClick={onCancel}>
        {t('speedUpCancellation')}
      </div>
    ) : null;
  }

  handleCopyTxDetail = () => {
    const { primaryTransaction: transaction = {} } = this.props;
    const result = JSON.stringify(transaction, null, 2);
    copyToClipboard(result);
  };

  handleDownload = () => {
    const { primaryTransaction: transaction = {} } = this.props;
    const {
      multiSign: { signedTransactionHex: hash, signatures },
      txParams: { from, nonce }
    } = transaction;

    const filename = `${ from }-${ hexToDecimal(nonce) }-${ signatures }.multisig-txn`
    exportAsFile(filename, arrayify(hash), 'application/octet-stream');
  };

  handleCopyTxId = () => {
    const { primaryTransaction: transaction = {} } = this.props;
    const {
      multiSign: { signedTransactionHex: hash },
    } = transaction;
    copyToClipboard(hash);
  };

  renderInlineDetail(eventKey) {
    const { t } = this.context;
    return [TRANSACTION_ERRORED_EVENT, TRANSACTION_DROPPED_EVENT].includes(eventKey) ? (
      <div className="transaction-activity-log__action-link" onClick={this.handleCopyTxDetail}>
        {t('copyTransactionDetail')}
      </div>
    ) : null
  }


  renderActivity(activity, index) {
    const { conversionRate, nativeCurrency } = this.props;
    const { eventKey, value, timestamp } = activity;
    const ethValue =
      index === 0
        ? `${ getValueFromWeiHex({
          value,
          fromCurrency: 'STC',
          toCurrency: 'STC',
          conversionRate,
          numberOfDecimals: 6,
        }) } ${ nativeCurrency }`
        : getEthConversionFromWeiHex({
          value,
          fromCurrency: 'STC',
          conversionRate,
          numberOfDecimals: 3,
        });
    const formattedTimestamp = timestamp ? formatDate(timestamp, "T 'on' M/d/y") : '';
    const activityText = this.context.t(eventKey, [
      ethValue,
      formattedTimestamp,
    ]);

    return (
      <div key={index} className="transaction-activity-log__activity">
        <TransactionActivityLogIcon
          className="transaction-activity-log__activity-icon"
          eventKey={eventKey}
        />
        <div className="transaction-activity-log__entry-container">
          <div
            className="transaction-activity-log__activity-text"
            title={activityText}
            onClick={() => this.handleActivityClick(activity)}
          >
            {activityText}
          </div>
          {this.renderInlineRetry(index)}
          {this.renderInlineCancel(index)}
          {this.renderInlineDetail(eventKey)}
        </div>
      </div>
    );
  }

  render() {
    const { t } = this.context;
    const { className, activities } = this.props;

    if (activities.length === 0) {
      return null;
    }

    return (
      <div className={classnames('transaction-activity-log', className)}>
        <div className="transaction-activity-log__title">
          {t('activityLog')}
        </div>
        <div className="transaction-activity-log__activities-container">
          {activities.map((activity, index) =>
            this.renderActivity(activity, index),
          )}
        </div>

      </div>
    );
  }
}

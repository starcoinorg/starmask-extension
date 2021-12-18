import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import copyToClipboard from 'copy-to-clipboard';
import MultiSignTxnBreakdown from '../multi-sign-txn-breakdown';
import Button from '../../ui/button';
import Tooltip from '../../ui/tooltip';
import Copy from '../../ui/icon/copy-icon.component';
import Popover from '../../ui/popover';
import { getBlockExplorerUrlForTx } from '../../../../../shared/modules/transaction.utils';
import { TRANSACTION_TYPES } from '../../../../../shared/constants/transaction';

export default class MultiSignTxnListItemDetails extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
  };

  static defaultProps = {
    recipientEns: null,
  };

  static propTypes = {
    onCancel: PropTypes.func,
    onRetry: PropTypes.func,
    showCancel: PropTypes.bool,
    showSpeedUp: PropTypes.bool,
    showRetry: PropTypes.bool,
    isEarliestNonce: PropTypes.bool,
    cancelDisabled: PropTypes.bool,
    primaryCurrency: PropTypes.string,
    transactionGroup: PropTypes.object,
    title: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    recipientEns: PropTypes.string,
    recipientAddress: PropTypes.string,
    rpcPrefs: PropTypes.object,
    senderAddress: PropTypes.string.isRequired,
    tryReverseResolveAddress: PropTypes.func.isRequired,
    senderNickname: PropTypes.string.isRequired,
    recipientNickname: PropTypes.string,
  };

  state = {
    justCopied: false,
  };

  handleEtherscanClick = () => {
    const {
      transactionGroup: { primaryTransaction },
      rpcPrefs,
    } = this.props;

    this.context.metricsEvent({
      eventOpts: {
        category: 'Navigation',
        action: 'Activity Log',
        name: 'Clicked "View on Etherscan"',
      },
    });

    global.platform.openTab({
      url: getBlockExplorerUrlForTx(primaryTransaction, rpcPrefs),
    });
  };

  handleCancel = (event) => {
    const { onCancel, onClose } = this.props;
    onCancel(event);
    onClose();
  };

  handleRetry = (event) => {
    const { onClose, onRetry } = this.props;
    onRetry(event);
    onClose();
  };

  handleCopyTxId = () => {
    const { transactionGroup } = this.props;
    const { primaryTransaction: transaction } = transactionGroup;
    const { hash } = transaction;

    this.context.metricsEvent({
      eventOpts: {
        category: 'Navigation',
        action: 'Activity Log',
        name: 'Copied Transaction ID',
      },
    });

    this.setState({ justCopied: true }, () => {
      copyToClipboard(hash);
      setTimeout(() => this.setState({ justCopied: false }), 1000);
    });
  };

  componentDidMount() {
    const { recipientAddress, tryReverseResolveAddress } = this.props;

    if (recipientAddress) {
      tryReverseResolveAddress(recipientAddress);
    }
  }

  renderCancel() {
    const { t } = this.context;
    const { showCancel, cancelDisabled } = this.props;

    if (!showCancel) {
      return null;
    }

    return cancelDisabled ? (
      <Tooltip title={t('notEnoughGas')} position="bottom">
        <div>
          <Button
            type="raised"
            onClick={this.handleCancel}
            className="transaction-list-item-details__header-button"
            disabled
          >
            {t('cancel')}
          </Button>
        </div>
      </Tooltip>
    ) : (
      <Button
        type="raised"
        onClick={this.handleCancel}
        className="transaction-list-item-details__header-button"
      >
        {t('cancel')}
      </Button>
    );
  }

  render() {
    const { t } = this.context;
    const { justCopied } = this.state;
    const { transactionGroup, primaryCurrency, title, onClose } = this.props;
    const {
      primaryTransaction: transaction,
      initialTransaction: { type },
    } = transactionGroup;
    const { hash } = transaction;

    return (
      <Popover title={title} onClose={onClose}>
        <div className="transaction-list-item-details">
          <div className="transaction-list-item-details__header">
            <div>
              {t('multiSign')}
              {t('transaction')}
            </div>
            <div className="transaction-list-item-details__header-buttons">
              <Tooltip
                wrapperClassName="transaction-list-item-details__header-button"
                containerClassName="transaction-list-item-details__header-button-tooltip-container"
                title={
                  justCopied
                    ? t('multiSignTxnCopiedHex')
                    : t('multiSignTxnCopyHex')
                }
              >
                <Button
                  type="raised"
                  onClick={this.handleCopyTxId}
                  disabled={!hash}
                >
                  <Copy size={10} color="#3098DC" />
                </Button>
              </Tooltip>
              <Tooltip
                wrapperClassName="transaction-list-item-details__header-button"
                containerClassName="transaction-list-item-details__header-button-tooltip-container"
                title={t('clickToDownload')}
              >
                <Button type="raised" onClick={this.handleEtherscanClick}>
                  <img src="/images/download.svg" alt="" />
                </Button>
              </Tooltip>
            </div>
          </div>
          <div className="transaction-list-item-details__body">
            <div className="transaction-list-item-details__cards-container">
              <MultiSignTxnBreakdown
                nonce={
                  type === TRANSACTION_TYPES.MULTI_SIGN_ADD_SIGN
                    ? transactionGroup.initialTransaction.txParams.nonce
                    : ''
                }
                isTokenApprove={type === TRANSACTION_TYPES.TOKEN_METHOD_APPROVE}
                transaction={transaction}
                primaryCurrency={primaryCurrency}
                className="transaction-list-item-details__transaction-breakdown"
              />
            </div>
          </div>
        </div>
      </Popover>
    );
  }
}

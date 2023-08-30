import ethUtil from 'ethereumjs-util';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { encoding, starcoin_types } from '@starcoin-org/starcoin';
import { ENVIRONMENT_TYPE_NOTIFICATION } from '../../../../shared/constants/app';
import { getEnvironmentType } from '../../../../app/scripts/lib/util';
import ConfirmPageContainer, {
  ConfirmDetailRow,
  ConfirmDetailTokenChanges,
} from '../../components/app/confirm-page-container';
import { isBalanceSufficient } from '../send/send.utils';
import { MIN_GAS_LIMIT_DEC } from '../send/send.constants';
import { CONFIRM_TRANSACTION_ROUTE } from '../../helpers/constants/routes';
import {
  INSUFFICIENT_FUNDS_ERROR_KEY,
  TRANSACTION_ERROR_KEY,
  GAS_DEFAULTS_LOADING_ERROR_KEY,
  GAS_LIMIT_TOO_LOW_ERROR_KEY,
  GAS_PRICE_EXTEND_MAX_ERROR_KEY,
  GAS_LIMIT_EXTEND_MAX_ERROR_KEY,
} from '../../helpers/constants/error-keys';
import UserPreferencedCurrencyDisplay from '../../components/app/user-preferenced-currency-display';
import { PRIMARY, SECONDARY } from '../../helpers/constants/common';
import { hexToDecimal } from '../../helpers/utils/conversions.util';
import AdvancedGasInputs from '../../components/app/gas-customization/advanced-gas-inputs';
import TextField from '../../components/ui/text-field';
import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUSES,
} from '../../../../shared/constants/transaction';
import { getTransactionTypeTitle } from '../../helpers/utils/transactions.util';

export default class ConfirmTransactionBase extends Component {
  static contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
  };

  static propTypes = {
    // react-router props
    history: PropTypes.object,
    // Redux props
    balance: PropTypes.string,
    cancelTransaction: PropTypes.func,
    cancelAllTransactions: PropTypes.func,
    clearConfirmTransaction: PropTypes.func,
    conversionRate: PropTypes.number,
    fromAddress: PropTypes.string,
    fromName: PropTypes.string,
    hexTransactionAmount: PropTypes.string,
    hexTransactionFee: PropTypes.string,
    hexTransactionTotal: PropTypes.string,
    isTxReprice: PropTypes.bool,
    methodData: PropTypes.object,
    nonce: PropTypes.string,
    useNonceField: PropTypes.bool,
    customNonceValue: PropTypes.string,
    updateCustomNonce: PropTypes.func,
    assetImage: PropTypes.string,
    sendTransaction: PropTypes.func,
    showCustomizeGasModal: PropTypes.func,
    showTransactionConfirmedModal: PropTypes.func,
    showRejectTransactionsConfirmationModal: PropTypes.func,
    toAddress: PropTypes.string,
    tokenData: PropTypes.object,
    tokenProps: PropTypes.object,
    toName: PropTypes.string,
    toEns: PropTypes.string,
    toNickname: PropTypes.string,
    transactionStatus: PropTypes.string,
    txData: PropTypes.object,
    unapprovedTxCount: PropTypes.number,
    currentNetworkUnapprovedTxs: PropTypes.object,
    updateGasAndCalculate: PropTypes.func,
    customGas: PropTypes.object,
    // Component props
    actionKey: PropTypes.string,
    contentComponent: PropTypes.node,
    dataComponent: PropTypes.node,
    primaryTotalTextOverride: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.node,
    ]),
    secondaryTotalTextOverride: PropTypes.string,
    hideData: PropTypes.bool,
    hideSubtitle: PropTypes.bool,
    identiconAddress: PropTypes.string,
    onEdit: PropTypes.func,
    setMetaMetricsSendCount: PropTypes.func,
    metaMetricsSendCount: PropTypes.number,
    subtitleComponent: PropTypes.node,
    title: PropTypes.string,
    advancedInlineGasShown: PropTypes.bool,
    insufficientBalance: PropTypes.bool,
    hideFiatConversion: PropTypes.bool,
    type: PropTypes.string,
    getNextNonce: PropTypes.func,
    nextNonce: PropTypes.number,
    tryReverseResolveAddress: PropTypes.func.isRequired,
    hideSenderToRecipient: PropTypes.bool,
    showAccountInHeader: PropTypes.bool,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    isMainnet: PropTypes.bool,
    gasPriceIsExtendMax: PropTypes.bool,
    gasLimitIsExtendMax: PropTypes.bool,
    tokenChanges: PropTypes.object,
    ticker: PropTypes.string,
  };

  state = {
    submitting: false,
    submitError: null,
    submitWarning: '',
  };

  componentDidUpdate(prevProps) {
    const {
      transactionStatus,
      showTransactionConfirmedModal,
      history,
      clearConfirmTransaction,
      mostRecentOverviewPage,
      nextNonce,
      customNonceValue,
      toAddress,
      tryReverseResolveAddress,
    } = this.props;
    const {
      customNonceValue: prevCustomNonceValue,
      nextNonce: prevNextNonce,
      toAddress: prevToAddress,
      transactionStatus: prevTxStatus,
    } = prevProps;
    const statusUpdated = transactionStatus !== prevTxStatus;
    const txDroppedOrConfirmed =
      transactionStatus === TRANSACTION_STATUSES.DROPPED ||
      transactionStatus === TRANSACTION_STATUSES.CONFIRMED;

    if (
      nextNonce !== prevNextNonce ||
      customNonceValue !== prevCustomNonceValue
    ) {
      if (nextNonce !== null && customNonceValue > nextNonce) {
        this.setState({
          submitWarning: this.context.t('nextNonceWarning', [nextNonce]),
        });
      } else {
        this.setState({ submitWarning: '' });
      }
    }

    if (statusUpdated && txDroppedOrConfirmed) {
      showTransactionConfirmedModal({
        onSubmit: () => {
          clearConfirmTransaction();
          history.push(mostRecentOverviewPage);
        },
      });
    }

    if (toAddress && toAddress !== prevToAddress) {
      tryReverseResolveAddress(toAddress);
    }
  }

  getErrorKey() {
    const {
      balance,
      conversionRate,
      hexTransactionFee,
      txData: { simulationFails, loadingDefaults, txParams: { value: amount } = {} } = {},
      customGas,
      gasPriceIsExtendMax,
      gasLimitIsExtendMax,
    } = this.props;

    const insufficientBalance =
      balance &&
      !isBalanceSufficient({
        amount,
        gasTotal: hexTransactionFee || '0x0',
        balance,
        conversionRate,
      });

    if (loadingDefaults) {
      return {
        valid: false,
        errorKey: GAS_DEFAULTS_LOADING_ERROR_KEY,
      };
    }

    if (insufficientBalance) {
      return {
        valid: false,
        errorKey: INSUFFICIENT_FUNDS_ERROR_KEY,
      };
    }

    if (simulationFails) {
      return {
        valid: false,
        errorKey: simulationFails.reason
          ? simulationFails.reason
          : TRANSACTION_ERROR_KEY,
      };
    }

    if (hexToDecimal(customGas.gasLimit) < parseInt(MIN_GAS_LIMIT_DEC)) {
      return {
        valid: false,
        errorKey: GAS_LIMIT_TOO_LOW_ERROR_KEY,
      };
    }

    if (gasPriceIsExtendMax) {
      return {
        valid: false,
        errorKey: GAS_PRICE_EXTEND_MAX_ERROR_KEY,
      };
    }

    if (gasLimitIsExtendMax) {
      return {
        valid: false,
        errorKey: GAS_LIMIT_EXTEND_MAX_ERROR_KEY,
      };
    }

    return {
      valid: true,
    };
  }

  handleEditGas() {
    const {
      showCustomizeGasModal,
      actionKey,
      txData: { origin },
      methodData = {},
    } = this.props;

    this.context.metricsEvent({
      eventOpts: {
        category: 'Transactions',
        action: 'Confirm Screen',
        name: 'User clicks "Edit" on gas',
      },
      customVariables: {
        recipientKnown: null,
        functionType:
          actionKey ||
          getMethodName(methodData.name) ||
          TRANSACTION_TYPES.CONTRACT_INTERACTION,
        origin,
      },
    });

    showCustomizeGasModal();
  }

  renderDetails() {
    const {
      primaryTotalTextOverride,
      secondaryTotalTextOverride,
      hexTransactionFee,
      hexTransactionTotal,
      useNonceField,
      customNonceValue,
      updateCustomNonce,
      advancedInlineGasShown,
      customGas,
      insufficientBalance,
      updateGasAndCalculate,
      hideFiatConversion,
      nextNonce,
      getNextNonce,
      isMainnet,
      gasPriceIsExtendMax,
      gasLimitIsExtendMax,
      tokenChanges,
    } = this.props;

    const notMainnetOrTest = !(isMainnet || process.env.IN_TEST);


    return (
      <div className="confirm-page-container-content__details">
        <div className="confirm-page-container-content__gas-fee">
          {
            tokenChanges ? (
              <ConfirmDetailTokenChanges
                tokenChanges={tokenChanges}
              />
            ) : null
          }
          <ConfirmDetailRow
            label="Gas Fee"
            value={hexTransactionFee}
            headerText={notMainnetOrTest ? '' : 'Edit'}
            headerTextClassName={
              notMainnetOrTest ? '' : 'confirm-detail-row__header-text--edit'
            }
            onHeaderClick={notMainnetOrTest ? null : () => this.handleEditGas()}
            secondaryText={
              hideFiatConversion
                ? this.context.t('noConversionRateAvailable')
                : ''
            }
          />
          {advancedInlineGasShown || notMainnetOrTest ? (
            <AdvancedGasInputs
              updateCustomGasPrice={(newGasPrice) =>
                updateGasAndCalculate({ ...customGas, gasPrice: newGasPrice })
              }
              updateCustomGasLimit={(newGasLimit) =>
                updateGasAndCalculate({ ...customGas, gasLimit: newGasLimit })
              }
              customGasPrice={customGas.gasPrice}
              customGasLimit={customGas.gasLimit}
              insufficientBalance={insufficientBalance}
              customPriceIsSafe
              isSpeedUp={false}
              gasPriceIsExtendMax={gasPriceIsExtendMax}
              gasLimitIsExtendMax={gasLimitIsExtendMax}
            />
          ) : null}
        </div>
        <div
          className={
            useNonceField ? 'confirm-page-container-content__gas-fee' : null
          }
        >
          <ConfirmDetailRow
            label="Total"
            value={hexTransactionTotal}
            primaryText={primaryTotalTextOverride}
            secondaryText={
              hideFiatConversion
                ? this.context.t('noConversionRateAvailable')
                : secondaryTotalTextOverride
            }
            headerText="Amount + Gas Fee"
            headerTextClassName="confirm-detail-row__header-text--total"
            primaryValueTextColor="#2f9ae0"
          />
        </div>
        {useNonceField ? (
          <div>
            <div className="confirm-detail-row">
              <div className="confirm-detail-row__label">
                {this.context.t('nonceFieldHeading')}
              </div>
              <div className="custom-nonce-input">
                <TextField
                  type="number"
                  min="0"
                  placeholder={
                    typeof nextNonce === 'number' ? nextNonce.toString() : null
                  }
                  onChange={({ target: { value } }) => {
                    if (!value.length || Number(value) < 0) {
                      updateCustomNonce('');
                    } else {
                      updateCustomNonce(String(Math.floor(value)));
                    }
                    getNextNonce();
                  }}
                  fullWidth
                  margin="dense"
                  value={customNonceValue || ''}
                />
              </div>
            </div>
          </div>
        ) : null}
        <div
          className={
            useNonceField ? 'confirm-page-container-content__gas-fee' : null
          }
        >
        </div>
      </div>
    );
  }

  renderData(functionType) {
    const { t } = this.context;
    const {
      txData: { txParams: { data, functionAptos } = {} } = {},
      methodData: { params } = {},
      hideData,
      dataComponent,
    } = this.props;

    if (hideData) {
      return null;
    }

    return (
      dataComponent || (
        <div className="confirm-page-container-content__data">
          <div className="confirm-page-container-content__data-box-label">
            {`${ t('functionType') }:`}
            <span className="confirm-page-container-content__function-type">
              {functionType}
            </span>
          </div>
          {params && (
            <div className="confirm-page-container-content__data-box">
              <div className="confirm-page-container-content__data-field-label">
                {`${ t('parameters') }:`}
              </div>
              <div>
                <pre>{JSON.stringify(params, null, 2)}</pre>
              </div>
            </div>
          )}
          {functionAptos && (
            <div className="confirm-page-container-content__data-box">
              <div className="confirm-page-container-content__data-field-label">
                {`${ t('parameters') }:`}
              </div>
              <div>
                <pre>{JSON.stringify(functionAptos, null, 2)}</pre>
              </div>
            </div>
          )}
          {
            data ? (
              <>
                <div className="confirm-page-container-content__data-box-label">
                  {`${ t('hexData') }: ${ ethUtil.toBuffer(data).length } bytes`}
                </div>
                <div className="confirm-page-container-content__data-box">{data}</div>
              </>
            ) : null
          }
        </div>
      )
    );
  }

  handleEdit() {
    const {
      txData,
      tokenData,
      tokenProps,
      onEdit,
      actionKey,
      txData: { origin },
      methodData = {},
    } = this.props;

    this.context.metricsEvent({
      eventOpts: {
        category: 'Transactions',
        action: 'Confirm Screen',
        name: 'Edit Transaction',
      },
      customVariables: {
        recipientKnown: null,
        functionType:
          actionKey ||
          getMethodName(methodData.name) ||
          TRANSACTION_TYPES.CONTRACT_INTERACTION,
        origin,
      },
    });

    onEdit({ txData, tokenData, tokenProps });
  }

  handleCancelAll() {
    const {
      cancelAllTransactions,
      clearConfirmTransaction,
      history,
      mostRecentOverviewPage,
      showRejectTransactionsConfirmationModal,
      unapprovedTxCount,
    } = this.props;

    showRejectTransactionsConfirmationModal({
      unapprovedTxCount,
      onSubmit: async () => {
        this._removeBeforeUnload();
        await cancelAllTransactions();
        clearConfirmTransaction();
        history.push(mostRecentOverviewPage);
      },
    });
  }

  handleCancel() {
    const { metricsEvent } = this.context;
    const {
      txData,
      cancelTransaction,
      history,
      mostRecentOverviewPage,
      clearConfirmTransaction,
      actionKey,
      txData: { origin },
      methodData = {},
      updateCustomNonce,
    } = this.props;

    this._removeBeforeUnload();
    metricsEvent({
      eventOpts: {
        category: 'Transactions',
        action: 'Confirm Screen',
        name: 'Cancel',
      },
      customVariables: {
        recipientKnown: null,
        functionType:
          actionKey ||
          getMethodName(methodData.name) ||
          TRANSACTION_TYPES.CONTRACT_INTERACTION,
        origin,
      },
    });
    updateCustomNonce('');
    cancelTransaction(txData).then(() => {
      clearConfirmTransaction();
      history.push(mostRecentOverviewPage);
    });
  }

  handleSubmit() {
    const { metricsEvent } = this.context;
    const {
      txData: { origin },
      sendTransaction,
      clearConfirmTransaction,
      txData,
      history,
      actionKey,
      mostRecentOverviewPage,
      metaMetricsSendCount = 0,
      setMetaMetricsSendCount,
      methodData = {},
      updateCustomNonce,
    } = this.props;
    const { submitting } = this.state;

    if (submitting) {
      return;
    }

    this.setState(
      {
        submitting: true,
        submitError: null,
      },
      () => {
        this._removeBeforeUnload();
        metricsEvent({
          eventOpts: {
            category: 'Transactions',
            action: 'Confirm Screen',
            name: 'Transaction Completed',
          },
          customVariables: {
            recipientKnown: null,
            functionType:
              actionKey ||
              getMethodName(methodData.name) ||
              TRANSACTION_TYPES.CONTRACT_INTERACTION,
            origin,
          },
        });

        setMetaMetricsSendCount(metaMetricsSendCount + 1).then(() => {
          sendTransaction(txData)
            .then(() => {
              clearConfirmTransaction();
              this.setState(
                {
                  submitting: false,
                },
                () => {
                  history.push(mostRecentOverviewPage);
                  updateCustomNonce('');
                },
              );
            })
            .catch((error) => {
              this.setState({
                submitting: false,
                submitError: error.message,
              });
              updateCustomNonce('');
            });
        });
      },
    );
  }

  renderTitleComponent() {
    const { title, hexTransactionAmount, txData, t } = this.props;
    const isMultiSign = txData && txData.txParams && txData.txParams.multiSignData;
    if (isMultiSign) {
      const txn = encoding.bcsDecode(
        starcoin_types.SignedUserTransaction,
        txData.txParams.multiSignData,
      );
      const exists = txn.authenticator.signature.signatures.length;
      const threshold = txn.authenticator.public_key.threshold;
      return (
        <div className="confirm-detail-row__secondary">{this.context.t('multiSign')} {exists}/{threshold}</div>
      )
    }

    // Title string passed in by props takes priority
    if (title) {
      return null;
    }

    return (
      <UserPreferencedCurrencyDisplay
        value={hexTransactionAmount}
        type={PRIMARY}
        showEthLogo
        ethLogoHeight="26"
        hideLabel
      />
    );
  }

  renderSubtitleComponent() {
    const { subtitleComponent, hexTransactionAmount } = this.props;

    return (
      subtitleComponent || (
        <UserPreferencedCurrencyDisplay
          value={hexTransactionAmount}
          type={SECONDARY}
          showEthLogo
          hideLabel
        />
      )
    );
  }

  handleNextTx(txId) {
    const { history, clearConfirmTransaction } = this.props;

    if (txId) {
      clearConfirmTransaction();
      history.push(`${ CONFIRM_TRANSACTION_ROUTE }/${ txId }`);
    }
  }

  getNavigateTxData() {
    const { currentNetworkUnapprovedTxs, txData: { id } = {} } = this.props;
    const enumUnapprovedTxs = Object.keys(currentNetworkUnapprovedTxs);
    const currentPosition = enumUnapprovedTxs.indexOf(id ? id.toString() : '');

    return {
      totalTx: enumUnapprovedTxs.length,
      positionOfCurrentTx: currentPosition + 1,
      nextTxId: enumUnapprovedTxs[currentPosition + 1],
      prevTxId: enumUnapprovedTxs[currentPosition - 1],
      showNavigation: enumUnapprovedTxs.length > 1,
      firstTx: enumUnapprovedTxs[0],
      lastTx: enumUnapprovedTxs[enumUnapprovedTxs.length - 1],
      ofText: this.context.t('ofTextNofM'),
      requestsWaitingText: this.context.t('requestsAwaitingAcknowledgement'),
    };
  }

  _beforeUnload = () => {
    const { txData: { origin, id } = {}, cancelTransaction } = this.props;
    const { metricsEvent } = this.context;
    metricsEvent({
      eventOpts: {
        category: 'Transactions',
        action: 'Confirm Screen',
        name: 'Cancel Tx Via Notification Close',
      },
      customVariables: {
        origin,
      },
    });
    cancelTransaction({ id });
  };

  _removeBeforeUnload = () => {
    if (getEnvironmentType() === ENVIRONMENT_TYPE_NOTIFICATION) {
      window.removeEventListener('beforeunload', this._beforeUnload);
    }
  };

  componentDidMount() {
    const {
      toAddress,
      txData: { origin } = {},
      getNextNonce,
      tryReverseResolveAddress,
    } = this.props;
    const { metricsEvent } = this.context;
    metricsEvent({
      eventOpts: {
        category: 'Transactions',
        action: 'Confirm Screen',
        name: 'Confirm: Started',
      },
      customVariables: {
        origin,
      },
    });

    if (getEnvironmentType() === ENVIRONMENT_TYPE_NOTIFICATION) {
      window.addEventListener('beforeunload', this._beforeUnload);
    }

    getNextNonce();
    if (toAddress) {
      tryReverseResolveAddress(toAddress);
    }
  }

  componentWillUnmount() {
    this._removeBeforeUnload();
  }

  render() {
    const { t } = this.context;
    const {
      isTxReprice,
      fromName,
      fromAddress,
      toName,
      toAddress,
      toEns,
      toNickname,
      methodData,
      title,
      hideSubtitle,
      identiconAddress,
      contentComponent,
      onEdit,
      nonce,
      customNonceValue,
      assetImage,
      unapprovedTxCount,
      type,
      hideSenderToRecipient,
      showAccountInHeader,
      txData,
      ticker,
    } = this.props;
    let titleMultiSign
    const isMultiSign = txData && txData.txParams && txData.txParams.multiSignData
    if (isMultiSign) {
      titleMultiSign = true
    }
    const { submitting, submitError, submitWarning } = this.state;

    const { name } = methodData;
    const { valid, errorKey } = this.getErrorKey();
    const {
      totalTx,
      positionOfCurrentTx,
      nextTxId,
      prevTxId,
      showNavigation,
      firstTx,
      lastTx,
      ofText,
      requestsWaitingText,
    } = this.getNavigateTxData();

    let functionType = getMethodName(name);
    if (!functionType) {
      if (type) {
        functionType = getTransactionTypeTitle(t, type, ticker);
      } else {
        functionType = t('contractInteraction');
      }
    }

    return (
      <ConfirmPageContainer
        fromName={fromName}
        fromAddress={fromAddress}
        showAccountInHeader={showAccountInHeader}
        toName={toName}
        toAddress={toAddress}
        toEns={toEns}
        toNickname={toNickname}
        showEdit={onEdit && !isTxReprice}
        action={functionType}
        title={title || isMultiSign}
        titleComponent={this.renderTitleComponent()}
        subtitleComponent={this.renderSubtitleComponent()}
        hideSubtitle={hideSubtitle}
        detailsComponent={this.renderDetails()}
        dataComponent={this.renderData(functionType)}
        contentComponent={contentComponent}
        nonce={customNonceValue || nonce}
        unapprovedTxCount={unapprovedTxCount}
        assetImage={assetImage}
        identiconAddress={identiconAddress}
        errorMessage={submitError}
        errorKey={errorKey}
        warning={submitWarning}
        totalTx={totalTx}
        positionOfCurrentTx={positionOfCurrentTx}
        nextTxId={nextTxId}
        prevTxId={prevTxId}
        showNavigation={showNavigation}
        onNextTx={(txId) => this.handleNextTx(txId)}
        firstTx={firstTx}
        lastTx={lastTx}
        ofText={ofText}
        requestsWaitingText={requestsWaitingText}
        disabled={!valid || submitting}
        onEdit={() => this.handleEdit()}
        onCancelAll={() => this.handleCancelAll()}
        onCancel={() => this.handleCancel()}
        onSubmit={() => this.handleSubmit()}
        hideSenderToRecipient={hideSenderToRecipient}
        origin={txData.origin}
      />
    );
  }
}

export function getMethodName(camelCase) {
  if (!camelCase || typeof camelCase !== 'string') {
    return '';
  }

  return camelCase
    .replace(/([a-z])([A-Z])/gu, '$1 $2')
    .replace(/([A-Z])([a-z])/gu, ' $1$2')
    .replace(/ +/gu, ' ');
}

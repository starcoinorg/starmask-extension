import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { stripHexPrefix } from 'ethereumjs-util';
import PageContainerFooter from '../../../components/ui/page-container/page-container-footer';
import { CONFIRM_TRANSACTION_ROUTE } from '../../../helpers/constants/routes';
import { MIN_GAS_LIMIT_DEC } from '../send.constants';

export default class SendFooter extends Component {
  static propTypes = {
    addToAddressBookIfNew: PropTypes.func,
    amount: PropTypes.string,
    data: PropTypes.string,
    clearSend: PropTypes.func,
    editingTransactionId: PropTypes.string,
    from: PropTypes.object,
    gasLimit: PropTypes.string,
    gasPrice: PropTypes.string,
    gasTotal: PropTypes.string,
    history: PropTypes.object,
    inError: PropTypes.bool,
    nft: PropTypes.object,
    sendToken: PropTypes.object,
    transferNFT: PropTypes.func,
    sign: PropTypes.func,
    to: PropTypes.string,
    toAccounts: PropTypes.array,
    toReceiptIdentifier: PropTypes.string,
    tokenBalance: PropTypes.string,
    unapprovedTxs: PropTypes.object,
    update: PropTypes.func,
    sendErrors: PropTypes.object,
    gasEstimateType: PropTypes.string,
    gasIsLoading: PropTypes.bool,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    gasPriceIsExtendMax: PropTypes.bool,
    gasLimitIsExtendMax: PropTypes.bool,
    ticker: PropTypes.string,
  };

  static contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
  };

  onCancel() {
    const { clearSend, history, mostRecentOverviewPage } = this.props;
    clearSend();
    history.push(mostRecentOverviewPage);
  }

  async onSubmit(event) {
    event.preventDefault();
    const {
      addToAddressBookIfNew,
      amount,
      data,
      editingTransactionId,
      from: { address: from },
      gasLimit: gas,
      gasPrice,
      nft,
      sendToken,
      transferNFT,
      sign,
      to,
      toReceiptIdentifier,
      unapprovedTxs,
      // updateTx,
      update,
      toAccounts,
      history,
      gasEstimateType,
      ticker,
    } = this.props;
    const { metricsEvent } = this.context;

    // Should not be needed because submit should be disabled if there are errors.
    // const noErrors = !amountError && toError === null

    // if (!noErrors) {
    //   return
    // }

    // TODO: add nickname functionality
    await addToAddressBookIfNew(to, toAccounts);
    let promise;
    if (nft) {
      promise = transferNFT({ ...nft, to });
    } else {
      promise = editingTransactionId
        ? update({
          amount,
          data,
          editingTransactionId,
          from,
          gas,
          gasPrice,
          sendToken,
          to,
          unapprovedTxs,
        })
        : sign({ data, sendToken, to, toReceiptIdentifier, amount, from, gas, gasPrice, ticker });
    }
    Promise.resolve(promise).then(() => {
      metricsEvent({
        eventOpts: {
          category: 'Transactions',
          action: 'Edit Screen',
          name: 'Complete',
        },
        customVariables: {
          gasChanged: gasEstimateType,
        },
      });
      history.push(CONFIRM_TRANSACTION_ROUTE);
    });
  }

  formShouldBeDisabled() {
    const {
      data,
      inError,
      sendToken,
      tokenBalance,
      gasTotal,
      to,
      gasLimit,
      gasIsLoading,
      gasPriceIsExtendMax,
      gasLimitIsExtendMax,
    } = this.props;
    const missingTokenBalance = sendToken && !tokenBalance;
    const gasLimitTooLow = stripHexPrefix(gasLimit) < MIN_GAS_LIMIT_DEC;
    const shouldBeDisabled =
      gasPriceIsExtendMax ||
      gasLimitIsExtendMax ||
      inError ||
      !gasTotal ||
      missingTokenBalance ||
      !(data || to) ||
      gasLimitTooLow ||
      gasIsLoading;
    return shouldBeDisabled;
  }

  componentDidUpdate(prevProps) {
    const { inError, sendErrors } = this.props;
    const { metricsEvent } = this.context;
    if (!prevProps.inError && inError) {
      const errorField = Object.keys(sendErrors).find((key) => sendErrors[key]);
      const errorMessage = sendErrors[errorField];

      metricsEvent({
        eventOpts: {
          category: 'Transactions',
          action: 'Edit Screen',
          name: 'Error',
        },
        customVariables: {
          errorField,
          errorMessage,
        },
      });
    }
  }

  render() {
    return (
      <PageContainerFooter
        onCancel={() => this.onCancel()}
        onSubmit={(e) => this.onSubmit(e)}
        disabled={this.formShouldBeDisabled()}
      />
    );
  }
}

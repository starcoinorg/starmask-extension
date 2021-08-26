import { connect } from 'react-redux';
import {
  addToAddressBook,
  clearSend,
  signTokenTx,
  signTx,
  updateTransaction,
} from '../../../store/actions';
import {
  getGasLimit,
  getGasPrice,
  getGasTotal,
  getSendToken,
  getSendAmount,
  getSendEditingTransactionId,
  getSendFromObject,
  getSendTo,
  getSendToAccounts,
  getSendToReceiptIdentifierFromIdentities,
  getSendHexData,
  getTokenBalance,
  getUnapprovedTxs,
  getSendErrors,
  isSendFormInError,
  getGasIsLoading,
  getRenderableEstimateDataForSmallButtonsFromGWEI,
  getDefaultActiveButtonIndex,
  isCustomPriceExtendMax,
  isCustomLimitExtendMax,
} from '../../../selectors';
import { getMostRecentOverviewPage } from '../../../ducks/history/history';
import { addHexPrefix } from '../../../../../app/scripts/lib/util';
import SendFooter from './send-footer.component';
import {
  addressIsNew,
  constructTxParams,
  constructUpdatedTx,
} from './send-footer.utils';

export default connect(mapStateToProps, mapDispatchToProps)(SendFooter);

function mapStateToProps(state) {
  const gasButtonInfo = getRenderableEstimateDataForSmallButtonsFromGWEI(state);
  const gasPrice = getGasPrice(state);
  const gasLimit = getGasLimit(state);
  const activeButtonIndex = getDefaultActiveButtonIndex(
    gasButtonInfo,
    gasPrice,
  );
  const gasEstimateType =
    activeButtonIndex >= 0
      ? gasButtonInfo[activeButtonIndex].gasEstimateType
      : 'custom';
  const editingTransactionId = getSendEditingTransactionId(state);

  return {
    amount: getSendAmount(state),
    data: getSendHexData(state),
    editingTransactionId,
    from: getSendFromObject(state),
    gasLimit,
    gasPrice,
    gasTotal: getGasTotal(state),
    inError: isSendFormInError(state),
    sendToken: getSendToken(state),
    to: getSendTo(state),
    toAccounts: getSendToAccounts(state),
    toReceiptIdentifier: getSendToReceiptIdentifierFromIdentities(state),
    tokenBalance: getTokenBalance(state),
    unapprovedTxs: getUnapprovedTxs(state),
    sendErrors: getSendErrors(state),
    gasEstimateType,
    gasIsLoading: getGasIsLoading(state),
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    gasPriceIsExtendMax: isCustomPriceExtendMax(state, gasPrice),
    gasLimitIsExtendMax: isCustomLimitExtendMax(state, gasLimit),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    clearSend: () => dispatch(clearSend()),
    sign: async ({ sendToken, to, toReceiptIdentifier, amount, from, gas, gasPrice, data }) => {
      const txParams = constructTxParams({
        amount,
        data,
        from,
        gas,
        gasPrice,
        sendToken,
        to,
        toReceiptIdentifier,
      });

      sendToken
        ? dispatch(signTokenTx(sendToken, to, amount, txParams))
        : dispatch(signTx(txParams));
    },
    update: ({
      amount,
      data,
      editingTransactionId,
      from,
      gas,
      gasPrice,
      sendToken,
      to,
      unapprovedTxs,
    }) => {
      const editingTx = constructUpdatedTx({
        amount,
        data,
        editingTransactionId,
        from,
        gas,
        gasPrice,
        sendToken,
        to,
        unapprovedTxs,
      });

      return dispatch(updateTransaction(editingTx));
    },

    addToAddressBookIfNew: (newAddress, toAccounts, nickname = '') => {
      const hexPrefixedAddress = addHexPrefix(newAddress);
      if (addressIsNew(toAccounts, hexPrefixedAddress)) {
        // TODO: nickname, i.e. addToAddressBook(recipient, nickname)
        dispatch(addToAddressBook(hexPrefixedAddress, nickname));
      }
    },
  };
}

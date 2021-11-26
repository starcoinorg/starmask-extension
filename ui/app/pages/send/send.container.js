import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';

import {
  getBlockGasLimit,
  getConversionRate,
  getGasLimit,
  getGasPrice,
  getGasTotal,
  getPrimaryCurrency,
  getSendNFT,
  getSendToken,
  getAssets,
  getSendAmount,
  getSendEditingTransactionId,
  getSendHexDataFeatureFlagState,
  getSendFromObject,
  getSendTo,
  getSendToReceiptIdentifier,
  getSendToNickname,
  getTokenBalance,
  getQrCodeData,
  getSelectedAddress,
  getAddressBook,
  getSendTokenCode,
  isCustomPriceExcessive,
  isCustomPriceExtendMax,
  isCustomLimitExtendMax,
  getCurrentChainId,
} from '../../selectors';

import {
  updateSendTo,
  updateSendTokenBalance,
  updateGasData,
  setGasTotal,
  showQrScanner,
  qrCodeDetected,
  updateSendEnsResolution,
  updateSendEnsResolutionError,
  getAutoAcceptToken,
  checkIsAcceptToken,
} from '../../store/actions';
import { resetSendState, updateSendErrors } from '../../ducks/send/send.duck';
import { fetchBasicGasEstimates } from '../../ducks/gas/gas.duck';
import { getTokens } from '../../ducks/metamask/metamask';
import { isValidDomainName } from '../../helpers/utils/util';
import { calcGasTotal } from './send.utils';
import SendEther from './send.component';

function mapStateToProps(state) {
  const editingTransactionId = getSendEditingTransactionId(state);
  const gasPrice = getGasPrice(state);
  const gasLimit = getGasLimit(state);
  return {
    addressBook: getAddressBook(state),
    amount: getSendAmount(state),
    blockGasLimit: getBlockGasLimit(state),
    conversionRate: getConversionRate(state),
    editingTransactionId,
    from: getSendFromObject(state),
    gasLimit,
    gasPrice,
    gasTotal: getGasTotal(state),
    chainId: getCurrentChainId(state),
    primaryCurrency: getPrimaryCurrency(state),
    qrCodeData: getQrCodeData(state),
    selectedAddress: getSelectedAddress(state),
    sendNFT: getSendNFT(state),
    sendToken: getSendToken(state),
    showHexData: getSendHexDataFeatureFlagState(state),
    to: getSendTo(state),
    toReceiptIdentifier: getSendToReceiptIdentifier(state),
    toNickname: getSendToNickname(state),
    tokens: getTokens(state),
    tokenBalance: getTokenBalance(state),
    assets: getAssets(state),
    sendTokenAddress: getSendTokenCode(state),
    gasIsExcessive: isCustomPriceExcessive(state, true),
    gasPriceIsExtendMax: isCustomPriceExtendMax(state, gasPrice),
    gasLimitIsExtendMax: isCustomLimitExtendMax(state, gasLimit),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    getAutoAcceptToken: (address) => {
      return dispatch(getAutoAcceptToken(address)).then((res) => {
        return res;
      });
    },
    checkIsAcceptToken: (address, code) => {
      return dispatch(checkIsAcceptToken(address, code)).then((res) => {
        return res;
      });
    },
    updateAndSetGasLimit: ({
      blockGasLimit,
      editingTransactionId,
      gasLimit,
      gasPrice,
      selectedAddress,
      sendToken,
      to,
      toReceiptIdentifier,
      value,
      data,
    }) => {
      editingTransactionId
        ? dispatch(setGasTotal(calcGasTotal(gasLimit, gasPrice)))
        : dispatch(
          updateGasData({
            gasPrice,
            selectedAddress,
            sendToken,
            blockGasLimit,
            to,
            toReceiptIdentifier,
            value,
            data,
          }),
        );
    },
    updateSendTokenBalance: ({ sendToken, assets, address }) => {
      dispatch(
        updateSendTokenBalance({
          sendToken,
          assets,
          address,
        }),
      );
    },
    updateSendErrors: (newError) => dispatch(updateSendErrors(newError)),
    resetSendState: () => dispatch(resetSendState()),
    scanQrCode: () => dispatch(showQrScanner()),
    qrCodeDetected: (data) => dispatch(qrCodeDetected(data)),
    updateSendTo: (to, nickname) => dispatch(updateSendTo(to, nickname)),
    fetchBasicGasEstimates: () => dispatch(fetchBasicGasEstimates()),
    updateSendEnsResolution: (ensResolution) =>
      dispatch(updateSendEnsResolution(ensResolution)),
    updateSendEnsResolutionError: (message) =>
      dispatch(updateSendEnsResolutionError(message)),
    updateToNicknameIfNecessary: (to, toNickname, addressBook) => {
      if (isValidDomainName(toNickname)) {
        const addressBookEntry =
          addressBook.find(({ address }) => to === address) || {};
        if (!addressBookEntry.name !== toNickname) {
          dispatch(updateSendTo(to, addressBookEntry.name || ''));
        }
      }
    },
  };
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(SendEther);

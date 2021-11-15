import abi from 'human-standard-token-abi';
import log from 'loglevel';
import { calcGasTotal } from '../pages/send/send.utils';
import {
  accountsWithSendEtherInfoSelector,
  getAddressBook,
  getSelectedAccount,
  getTargetAccount,
  getAveragePriceEstimateInHexWEI,
} from '.';

export function getBlockGasLimit(state) {
  return state.starmask.currentBlockGasLimit;
}

export function getConversionRate(state) {
  return state.starmask.conversionRate;
}

export function getNativeCurrency(state) {
  return state.starmask.nativeCurrency;
}

export function getGasLimit(state) {
  return state.starmask.send.gasLimit || '0';
}

export function getGasPrice(state) {
  return state.starmask.send.gasPrice || getAveragePriceEstimateInHexWEI(state);
}

export function getGasTotal(state) {
  return calcGasTotal(getGasLimit(state), getGasPrice(state));
}

export function getPrimaryCurrency(state) {
  const sendToken = getSendToken(state);
  return sendToken?.symbol;
}

export function getSendNFT(state) {
  return state.starmask.send.nft;
}

export function getSendToken(state) {
  return state.starmask.send.token;
}

export function getSendTokenAddress(state) {
  return getSendToken(state)?.address;
}

export function getSendTokenCode(state) {
  return getSendToken(state)?.code;
}

export function getSendTokenContract(state) {
  const sendTokenAddress = getSendTokenAddress(state);
  return sendTokenAddress
    ? global.eth.contract(abi).at(sendTokenAddress)
    : null;
}

export function getSendAmount(state) {
  return state.starmask.send.amount;
}

export function getSendHexData(state) {
  return state.starmask.send.data;
}

export function getSendHexDataFeatureFlagState(state) {
  return state.starmask.featureFlags.sendHexData;
}

export function getSendEditingTransactionId(state) {
  return state.starmask.send.editingTransactionId;
}

export function getSendErrors(state) {
  return state.send.errors;
}

export function sendAmountIsInError(state) {
  return Boolean(state.send.errors.amount);
}

export function getSendFrom(state) {
  return state.starmask.send.from;
}

export function getSendFromBalance(state) {
  const fromAccount = getSendFromObject(state);
  return fromAccount.balance;
}

export function getSendFromObject(state) {
  const fromAddress = getSendFrom(state);
  return fromAddress
    ? getTargetAccount(state, fromAddress)
    : getSelectedAccount(state);
}

export function getSendMaxModeState(state) {
  return state.starmask.send.maxModeOn;
}

export function getSendTo(state) {
  return state.starmask.send.to;
}

export function getSendToNickname(state) {
  return state.starmask.send.toNickname;
}

export function getSendToReceiptIdentifier(state) {
  return state.starmask.send.toReceiptIdentifier;
}

export function getSendToAccounts(state) {
  const fromAccounts = accountsWithSendEtherInfoSelector(state);
  const addressBookAccounts = getAddressBook(state);
  return [...fromAccounts, ...addressBookAccounts];
}

export function getTokenBalance(state) {
  return state.starmask.send.tokenBalance;
}

export function getSendEnsResolution(state) {
  return state.starmask.send.ensResolution;
}

export function getSendEnsResolutionError(state) {
  return state.starmask.send.ensResolutionError;
}

export function getUnapprovedTxs(state) {
  return state.starmask.unapprovedTxs;
}

export function getQrCodeData(state) {
  return state.appState.qrCodeData;
}

export function getGasLoadingError(state) {
  return state.send.errors.gasLoadingError;
}

export function gasFeeIsInError(state) {
  return Boolean(state.send.errors.gasFee);
}

export function getGasButtonGroupShown(state) {
  return state.send.gasButtonGroupShown;
}

export function getTitleKey(state) {
  const isEditing = Boolean(getSendEditingTransactionId(state));
  const isToken = Boolean(getSendToken(state));

  if (!getSendTo(state)) {
    return 'addRecipient';
  }

  if (isEditing) {
    return 'edit';
  } else if (isToken) {
    return 'sendTokens';
  }
  return 'send';
}

export function isSendFormInError(state) {
  return Object.values(getSendErrors(state)).some((n) => n);
}

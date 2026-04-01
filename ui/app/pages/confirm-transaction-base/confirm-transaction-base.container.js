import { connect } from 'react-redux';
import { compose } from 'redux';
import { withRouter } from 'react-router-dom';
import contractMap from '@metamask/contract-metadata';
import { clearConfirmTransaction } from '../../ducks/confirm-transaction/confirm-transaction.duck';

import {
  updateCustomNonce,
  cancelTx,
  cancelTxs,
  updateAndApproveTx,
  showModal,
  setMetaMetricsSendCount,
  updateTransaction,
  getNextNonce,
  tryReverseResolveAddress,
} from '../../store/actions';
import {
  INSUFFICIENT_FUNDS_ERROR_KEY,
  GAS_LIMIT_TOO_LOW_ERROR_KEY,
} from '../../helpers/constants/error-keys';
import { decodeTokenData } from '../../helpers/utils/transactions.util';
import { getHexGasTotal } from '../../helpers/utils/confirm-tx.util';
import { isBalanceSufficient, calcGasTotal } from '../send/send.utils';
import { conversionGreaterThan } from '../../helpers/utils/conversion-util';
import { MIN_GAS_LIMIT_DEC } from '../send/send.constants';
import {
  checksumAddress,
  shortenAddress,
  valuesFor,
} from '../../helpers/utils/util';
import {
  getAdvancedInlineGasShown,
  getCustomNonceValue,
  getIsMainnet,
  getMetaMaskAccounts,
  getUseNonceField,
  getPreferences,
  transactionFeeSelector,
  isCustomPriceExtendMax,
  isCustomLimitExtendMax,
  getTickerForCurrentProvider,
} from '../../selectors';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import { transactionMatchesNetwork } from '../../../../shared/modules/transaction.utils';
import ConfirmTransactionBase from './confirm-transaction-base.component';

const casedContractMap = Object.keys(contractMap).reduce((acc, base) => {
  return {
    ...acc,
    [base.toLowerCase()]: contractMap[base],
  };
}, {});

let customNonceValue = '';
const customNonceMerge = (txData) =>
  customNonceValue
    ? {
      ...txData,
      customNonceValue,
    }
    : txData;

const mapStateToProps = (state, ownProps) => {
  const {
    toAddress: propsToAddress,
    customTxParamsData,
    match: { params = {} },
  } = ownProps;
  const { id: paramsTransactionId } = params;
  const { showFiatInTestnets } = getPreferences(state);
  const isMainnet = getIsMainnet(state);
  const { confirmTransaction, starmask } = state;
  const {
    ensResolutionsByAddress,
    conversionRate,
    identities,
    addressBook,
    assetImages,
    network,
    unapprovedTxs,
    metaMetricsSendCount,
    nextNonce,
    provider: { chainId },
  } = starmask;
  const { tokenData, txData, tokenProps, nonce } = confirmTransaction;
  const { txParams = {}, lastGasPrice, id: transactionId, type, metamaskNetworkId } = txData;
  const transaction =
    Object.values(unapprovedTxs).find(
      ({ id }) => id === (transactionId || Number(paramsTransactionId)),
    ) || {};
  const {
    from: fromAddress,
    to: txParamsToAddress,
    gasPrice,
    gas: gasLimit,
    value: amount,
    data,
    tokenChanges,
    vmType: txVmType,
  } = (transaction && transaction.txParams) || txParams;
  const accounts = getMetaMaskAccounts(state);
  const assetImage = assetImages[txParamsToAddress];

  const { balance } = accounts[fromAddress] || {};
  const vm2Balance = accounts[fromAddress] && accounts[fromAddress].vm2Balance || '0x0';
  // Debug: log all balance calculation values
  const effectiveBalance = txVmType === 'vm2' ? vm2Balance : balance;
  const debugGasTotal = calcGasTotal(gasLimit, gasPrice);
  console.log('=== confirm-tx balance check ===');
  console.log('txVmType:', txVmType);
  console.log('VM1 balance (raw):', balance);
  console.log('VM2 balance (raw):', vm2Balance);
  console.log('effectiveBalance:', effectiveBalance);
  console.log('amount (txParams.value):', amount);
  console.log('gasPrice:', gasPrice);
  console.log('gasLimit:', gasLimit);
  console.log('gasTotal (calculated):', debugGasTotal);
  // Convert to decimal for easier reading
  console.log('effectiveBalance (decimal):', parseInt(effectiveBalance, 16));
  console.log('amount (decimal):', parseInt(amount, 16));
  console.log('gasTotal (decimal):', parseInt(debugGasTotal, 16));
  console.log('total needed (decimal):', parseInt(amount, 16) + parseInt(debugGasTotal, 16));
  console.log('=== end balance check ===');
  const { name: fromName } = identities[fromAddress];
  const toAddress = propsToAddress || txParamsToAddress;

  const toName =
    identities[toAddress]?.name ||
    casedContractMap[toAddress]?.name ||
    shortenAddress(checksumAddress(toAddress));

  const checksummedAddress = checksumAddress(toAddress);
  const addressBookObject = addressBook[checksummedAddress];
  const toEns = ensResolutionsByAddress[checksummedAddress] || '';
  const toNickname = addressBookObject ? addressBookObject.name : '';
  const isTxReprice = Boolean(lastGasPrice);
  const transactionStatus = transaction ? transaction.status : '';

  const {
    hexTransactionAmount,
    hexTransactionFee,
    hexTransactionTotal,
  } = transactionFeeSelector(state, transaction);

  if (transaction && transaction.simulationFails) {
    txData.simulationFails = transaction.simulationFails;
  }

  const currentNetworkUnapprovedTxs = Object.keys(unapprovedTxs)
    .filter((key) =>
      transactionMatchesNetwork(unapprovedTxs[key], chainId, network),
    )
    .reduce((acc, key) => ({ ...acc, [key]: unapprovedTxs[key] }), {});
  const unapprovedTxCount = valuesFor(currentNetworkUnapprovedTxs).length;

  const gasTotal = calcGasTotal(gasLimit, gasPrice);
  console.log('=== isBalanceSufficient inputs ===');
  console.log('amount:', amount, 'decimal:', parseInt(amount, 16));
  console.log('gasTotal:', gasTotal, 'decimal:', parseInt(gasTotal, 16));
  console.log('effectiveBalance:', effectiveBalance, 'decimal:', parseInt(effectiveBalance, 16));
  console.log('conversionRate:', conversionRate);
  console.log('total needed:', parseInt(amount, 16) + parseInt(gasTotal, 16));
  console.log('balance sufficient?', parseInt(effectiveBalance, 16) >= parseInt(amount, 16) + parseInt(gasTotal, 16));
  console.log('=== end isBalanceSufficient inputs ===');
  const insufficientBalance = !isBalanceSufficient({
    amount,
    gasTotal,
    balance: effectiveBalance,
    conversionRate,
  });

  const methodData = (data && decodeTokenData(data, metamaskNetworkId?.name)) || {};

  let fullTxData = { ...txData, ...transaction };
  if (customTxParamsData) {
    fullTxData = {
      ...fullTxData,
      txParams: {
        ...fullTxData.txParams,
        data: customTxParamsData,
      },
    };
  }
  const gasPriceIsExtendMax = isCustomPriceExtendMax(state, gasPrice);
  const gasLimitIsExtendMax = isCustomLimitExtendMax(state, gasLimit);
  return {
    balance: effectiveBalance, // Use effectiveBalance (VM2 if vmType=vm2, otherwise VM1)
    fromAddress,
    fromName,
    toAddress,
    toEns,
    toName,
    toNickname,
    hexTransactionAmount,
    hexTransactionFee,
    hexTransactionTotal,
    txData: fullTxData,
    tokenData,
    methodData,
    tokenProps,
    isTxReprice,
    conversionRate,
    transactionStatus,
    nonce,
    assetImage,
    unapprovedTxs,
    unapprovedTxCount,
    currentNetworkUnapprovedTxs,
    customGas: {
      gasLimit,
      gasPrice,
    },
    advancedInlineGasShown: getAdvancedInlineGasShown(state),
    useNonceField: getUseNonceField(state),
    customNonceValue: getCustomNonceValue(state),
    insufficientBalance,
    // hideSubtitle: !isMainnet && !showFiatInTestnets,
    // hideFiatConversion: !isMainnet && !showFiatInTestnets,
    hideSubtitle: true,
    hideFiatConversion: true,
    metaMetricsSendCount,
    type,
    nextNonce,
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    isMainnet,
    gasPriceIsExtendMax,
    gasLimitIsExtendMax,
    tokenChanges,
    ticker: getTickerForCurrentProvider(state),
  };
};

export const mapDispatchToProps = (dispatch) => {
  return {
    tryReverseResolveAddress: (address) => {
      return dispatch(tryReverseResolveAddress(address));
    },
    updateCustomNonce: (value) => {
      customNonceValue = value;
      dispatch(updateCustomNonce(value));
    },
    clearConfirmTransaction: () => dispatch(clearConfirmTransaction()),
    showTransactionConfirmedModal: ({ onSubmit }) => {
      return dispatch(showModal({ name: 'TRANSACTION_CONFIRMED', onSubmit }));
    },
    showCustomizeGasModal: ({ txData, onSubmit, validate }) => {
      return dispatch(
        showModal({ name: 'CUSTOMIZE_GAS', txData, onSubmit, validate }),
      );
    },
    updateGasAndCalculate: (updatedTx) => {
      return dispatch(updateTransaction(updatedTx));
    },
    showRejectTransactionsConfirmationModal: ({
      onSubmit,
      unapprovedTxCount,
    }) => {
      return dispatch(
        showModal({ name: 'REJECT_TRANSACTIONS', onSubmit, unapprovedTxCount }),
      );
    },
    cancelTransaction: ({ id }) => dispatch(cancelTx({ id })),
    cancelAllTransactions: (txList) => dispatch(cancelTxs(txList)),
    sendTransaction: (txData) =>
      dispatch(updateAndApproveTx(customNonceMerge(txData))),
    setMetaMetricsSendCount: (val) => dispatch(setMetaMetricsSendCount(val)),
    getNextNonce: () => dispatch(getNextNonce()),
  };
};

const getValidateEditGas = ({ balance, conversionRate, txData }) => {
  const { txParams: { value: amount } = {} } = txData;

  return ({ gasLimit, gasPrice }) => {
    const gasTotal = getHexGasTotal({ gasLimit, gasPrice });
    const hasSufficientBalance = isBalanceSufficient({
      amount,
      gasTotal,
      balance,
      conversionRate,
    });

    if (!hasSufficientBalance) {
      return {
        valid: false,
        errorKey: INSUFFICIENT_FUNDS_ERROR_KEY,
      };
    }

    const gasLimitTooLow =
      gasLimit &&
      conversionGreaterThan(
        {
          value: MIN_GAS_LIMIT_DEC,
          fromNumericBase: 'dec',
          conversionRate,
        },
        {
          value: gasLimit,
          fromNumericBase: 'hex',
        },
      );

    if (gasLimitTooLow) {
      return {
        valid: false,
        errorKey: GAS_LIMIT_TOO_LOW_ERROR_KEY,
      };
    }

    return {
      valid: true,
    };
  };
};

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { balance, conversionRate, txData, unapprovedTxs } = stateProps;
  const {
    cancelAllTransactions: dispatchCancelAllTransactions,
    showCustomizeGasModal: dispatchShowCustomizeGasModal,
    updateGasAndCalculate: dispatchUpdateGasAndCalculate,
    ...otherDispatchProps
  } = dispatchProps;

  const validateEditGas = getValidateEditGas({
    balance,
    conversionRate,
    txData,
  });

  return {
    ...stateProps,
    ...otherDispatchProps,
    ...ownProps,
    showCustomizeGasModal: () =>
      dispatchShowCustomizeGasModal({
        txData,
        onSubmit: (customGas) => dispatchUpdateGasAndCalculate(customGas),
        validate: validateEditGas,
      }),
    cancelAllTransactions: () =>
      dispatchCancelAllTransactions(valuesFor(unapprovedTxs)),
    updateGasAndCalculate: ({ gasLimit, gasPrice }) => {
      const updatedTx = {
        ...txData,
        txParams: {
          ...txData.txParams,
          gas: gasLimit,
          gasPrice,
        },
      };
      dispatchUpdateGasAndCalculate(updatedTx);
    },
  };
};

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
)(ConfirmTransactionBase);

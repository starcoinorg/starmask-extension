import { connect } from 'react-redux';
import { compose } from 'redux';
import { withRouter } from 'react-router-dom';
import {
  contractExchangeRateSelector,
  transactionFeeSelector,
} from '../../selectors';
import { getTokens } from '../../ducks/metamask/metamask';
import { getTokenData } from '../../helpers/utils/transactions.util';
import {
  calcTokenAmount,
  getTokenAddressParam,
  getTokenValueParam,
} from '../../helpers/utils/token-util';
import ConfirmTokenTransactionBase from './confirm-token-transaction-base.component';

const mapStateToProps = (state, ownProps) => {
  const {
    match: { params = {} },
  } = ownProps;
  const { id: paramsTransactionId } = params;
  const {
    confirmTransaction,
    starmask: { currentCurrency, conversionRate, currentNetworkTxList },
  } = state;

  const {
    txData: {
      id: transactionId,
      txParams: { to: tokenAddress, data } = {},
      code: tokenCode,
      metamaskNetworkId: { name: network } = {},
    } = {},
  } = confirmTransaction;

  const transaction =
    currentNetworkTxList.find(
      ({ id }) => id === (Number(paramsTransactionId) || transactionId),
    ) || {};

  const { ethTransactionTotal, fiatTransactionTotal } = transactionFeeSelector(
    state,
    transaction,
  );
  const tokens = getTokens(state);
  const currentToken = tokens?.find(({ code }) => tokenCode === code);
  const { decimals, symbol: tokenSymbol } = currentToken || {};

  const tokenData = data && getTokenData(data, network);
  const tokenValue = tokenData && getTokenValueParam(tokenData, network);
  const toAddress = tokenData && getTokenAddressParam(tokenData, network);
  const tokenAmount =
    tokenData && calcTokenAmount(tokenValue, decimals).toFixed();
  const contractExchangeRate = contractExchangeRateSelector(state);

  return {
    toAddress,
    tokenAddress,
    tokenAmount,
    tokenSymbol,
    currentCurrency,
    conversionRate,
    contractExchangeRate,
    fiatTransactionTotal,
    ethTransactionTotal,
    network,
  };
};

export default compose(
  withRouter,
  connect(mapStateToProps),
)(ConfirmTokenTransactionBase);

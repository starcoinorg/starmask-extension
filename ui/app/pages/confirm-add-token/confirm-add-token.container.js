import { connect } from 'react-redux';
import {
  getSelectedAddress,
  unconfirmedTransactionsCountSelector,
  getTickerForCurrentProvider,
} from '../../selectors';
import {
  addTokens,
  clearPendingTokens,
  getAutoAcceptToken,
  checkIsAcceptToken,
  acceptToken,
} from '../../store/actions';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import ConfirmAddToken from './confirm-add-token.component';

const mapStateToProps = (state) => {
  const {
    starmask: { pendingTokens },
  } = state;
  return {
    selectedAddress: getSelectedAddress(state),
    unconfirmedTransactionsCount: unconfirmedTransactionsCountSelector(state),
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    pendingTokens,
    ticker: getTickerForCurrentProvider(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    getAutoAcceptToken: (address, ticker) => {
      return dispatch(getAutoAcceptToken(address, ticker)).then((res) => {
        return res;
      });
    },
    checkIsAcceptToken: (address, code, ticker) => {
      return dispatch(checkIsAcceptToken(address, code, ticker)).then((res) => {
        return res;
      });
    },
    acceptToken: (code, address, ticker) => dispatch(acceptToken(code, address, ticker)),
    addTokens: (tokens) => dispatch(addTokens(tokens)),
    clearPendingTokens: () => dispatch(clearPendingTokens()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ConfirmAddToken);

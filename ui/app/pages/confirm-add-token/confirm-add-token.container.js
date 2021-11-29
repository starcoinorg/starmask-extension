import { connect } from 'react-redux';
import {
  getSelectedAddress,
  unconfirmedTransactionsCountSelector,
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
  };
};

const mapDispatchToProps = (dispatch) => {
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
    acceptToken: (code, address) => dispatch(acceptToken(code, address)),
    addTokens: (tokens) => dispatch(addTokens(tokens)),
    clearPendingTokens: () => dispatch(clearPendingTokens()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ConfirmAddToken);

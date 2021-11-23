import { connect } from 'react-redux';
import {
  getPublicKeyFor,
  hideWarning,
  showModal,
  hideModal,
  clearAccountDetails,
  getAutoAcceptToken,
  setAutoAcceptToken,
} from '../../../../store/actions';
import { getSelectedIdentity } from '../../../../selectors';
import AutoAcceptToken from './auto-accept-token-modal.component';

function mapStateToPropsFactory() {
  let selectedIdentity = null;
  return function mapStateToProps(state) {
    // We should **not** change the identity displayed here even if it changes from underneath us.
    // If we do, we will be showing the user one private key and a **different** address and name.
    // Note that the selected identity **will** change from underneath us when we unlock the keyring
    // which is the expected behavior that we are side-stepping.
    selectedIdentity = selectedIdentity || getSelectedIdentity(state);
    return {
      warning: state.appState.warning,
      privateKey: state.appState.accountDetail.privateKey,
      selectedIdentity,
      previousModalState: state.appState.modal.previousModalState.name,
    };
  };
}

function mapDispatchToProps(dispatch) {
  return {
    getPublicKeyFor: (address) => {
      return dispatch(getPublicKeyFor(address)).then((res) => {
        dispatch(hideWarning());
        return res;
      });
    },
    getAutoAcceptToken: () => {
      return dispatch(getAutoAcceptToken()).then((res) => {
        return res;
      });
    },
    setAutoAcceptToken: (value) => {
      return dispatch(setAutoAcceptToken(value)).then((res) => {
        return res;
      });
    },
    showAccountDetailModal: () =>
      dispatch(showModal({ name: 'ACCOUNT_DETAILS' })),
    hideModal: () => dispatch(hideModal()),
    hideWarning: () => dispatch(hideWarning()),
    clearAccountDetails: () => dispatch(clearAccountDetails()),
  };
}

export default connect(
  mapStateToPropsFactory,
  mapDispatchToProps,
)(AutoAcceptToken);

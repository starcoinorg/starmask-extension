import { connect } from 'react-redux';
import { showModal, setAccountLabel } from '../../../../store/actions';
import {
  getSelectedIdentity,
  getRpcPrefsForCurrentProvider,
  getCurrentChainId,
} from '../../../../selectors';
import AccountDetailsModal from './account-details-modal.component';

const mapStateToProps = (state) => {
  return {
    chainId: getCurrentChainId(state),
    selectedIdentity: getSelectedIdentity(state),
    keyrings: state.starmask.keyrings,
    rpcPrefs: getRpcPrefsForCurrentProvider(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    showPublicKeyModal: () =>
      dispatch(showModal({ name: 'SHOW_PUBLIC_KEY' })),
    showReceiptIdentiferModal: () =>
      dispatch(showModal({ name: 'SHOW_RECEIPT_IDENTIFIER' })),
    showExportPrivateKeyModal: () =>
      dispatch(showModal({ name: 'EXPORT_PRIVATE_KEY' })),
    setAccountLabel: (address, label) =>
      dispatch(setAccountLabel(address, label)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(AccountDetailsModal);

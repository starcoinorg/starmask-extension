import { connect } from 'react-redux';
import {
  getGasLoadingError,
  getSendTo,
  getSendVMType,
  accountsWithSendEtherInfoSelector,
  getAddressBookEntry,
  getTickerForCurrentProvider,
} from '../../../selectors';

import { updateSend } from '../../../store/actions';
import * as actions from '../../../store/actions';
import SendContent from './send-content.component';

function mapStateToProps(state) {
  const ownedAccounts = accountsWithSendEtherInfoSelector(state);
  const to = getSendTo(state);
  return {
    isOwnedAccount: Boolean(
      ownedAccounts.find(
        ({ address }) => address.toLowerCase() === to.toLowerCase(),
      ),
    ),
    contact: getAddressBookEntry(state, to),
    gasLoadingError: getGasLoadingError(state),
    to,
    vmType: getSendVMType(state),
    ticker: getTickerForCurrentProvider(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    showAddToAddressBookModal: (recipient) =>
      dispatch(
        actions.showModal({
          name: 'ADD_TO_ADDRESSBOOK',
          recipient,
        }),
      ),
    setVMType: (vmType) => dispatch(updateSend({ vmType })),
  };
}

function mergeProps(stateProps, dispatchProps, ownProps) {
  const { to, ...restStateProps } = stateProps;
  return {
    ...ownProps,
    ...restStateProps,
    ...dispatchProps,
    showAddToAddressBookModal: () =>
      dispatchProps.showAddToAddressBookModal(to),
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
)(SendContent);

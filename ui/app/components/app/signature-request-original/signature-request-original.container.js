import { connect } from 'react-redux';
import { compose } from 'redux';
import { withRouter } from 'react-router-dom';

import { MESSAGE_TYPE } from '../../../../../shared/constants/app';
import { goHome } from '../../../store/actions';
import {
  accountsWithSendEtherInfoSelector,
  conversionRateSelector,
  getDomainMetadata,
} from '../../../selectors';
import { getAccountByAddress } from '../../../helpers/utils/util';
import { clearConfirmTransaction } from '../../../ducks/confirm-transaction/confirm-transaction.duck';
import { getMostRecentOverviewPage } from '../../../ducks/history/history';
import SignatureRequestOriginal from './signature-request-original.component';

function mapStateToProps(state) {
  return {
    requester: null,
    requesterAddress: null,
    conversionRate: conversionRateSelector(state),
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    // not passed to component
    allAccounts: accountsWithSendEtherInfoSelector(state),
    domainMetadata: getDomainMetadata(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    goHome: () => dispatch(goHome()),
    clearConfirmTransaction: () => dispatch(clearConfirmTransaction()),
  };
}

function mergeProps(stateProps, dispatchProps, ownProps) {
  const {
    signPersonalMessage,
    signAptMessage,
    signTypedMessage,
    cancelPersonalMessage,
    cancelTypedMessage,
    signMessage,
    cancelMessage,
    txData,
  } = ownProps;

  const { allAccounts, ...otherStateProps } = stateProps;

  const {
    type,
    msgParams: { from },
  } = txData;

  const fromAccount = getAccountByAddress(allAccounts, from);

  let cancel;
  let sign;
  if (type === MESSAGE_TYPE.PERSONAL_SIGN) {
    cancel = cancelPersonalMessage;
    sign = signPersonalMessage;
  } else if (type === MESSAGE_TYPE.APT_SIGN) {
    cancel = cancelPersonalMessage;
    sign = signAptMessage;
  } else if (type === MESSAGE_TYPE.ETH_SIGN_TYPED_DATA) {
    cancel = cancelTypedMessage;
    sign = signTypedMessage;
  } else if (type === MESSAGE_TYPE.ETH_SIGN) {
    cancel = cancelMessage;
    sign = signMessage;
  }

  return {
    ...ownProps,
    ...otherStateProps,
    ...dispatchProps,
    fromAccount,
    txData,
    cancel,
    sign,
  };
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps, mergeProps),
)(SignatureRequestOriginal);

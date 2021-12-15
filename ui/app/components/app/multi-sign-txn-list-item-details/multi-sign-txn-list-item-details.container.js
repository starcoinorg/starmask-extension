import { connect } from 'react-redux';
import { checksumAddress } from '../../../helpers/utils/util';
import { tryReverseResolveAddress } from '../../../store/actions';
import {
  getAddressBook,
  getRpcPrefsForCurrentProvider,
} from '../../../selectors';
import MultiSignTxnListItemDetails from './multi-sign-txn-list-item-details.component';

const mapStateToProps = (state, ownProps) => {
  const { starmask } = state;
  const { ensResolutionsByAddress } = starmask;
  const { recipientAddress, senderAddress } = ownProps;
  let recipientEns;
  if (recipientAddress) {
    const address = checksumAddress(recipientAddress);
    recipientEns = ensResolutionsByAddress[address] || '';
  }
  const addressBook = getAddressBook(state);

  const getNickName = (address) => {
    const entry = addressBook.find((contact) => {
      return address.toLowerCase() === contact.address.toLowerCase();
    });
    return (entry && entry.name) || '';
  };
  const rpcPrefs = getRpcPrefsForCurrentProvider(state);

  return {
    rpcPrefs,
    recipientEns,
    senderNickname: getNickName(senderAddress),
    recipientNickname: recipientAddress ? getNickName(recipientAddress) : null,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    tryReverseResolveAddress: (address) => {
      return dispatch(tryReverseResolveAddress(address));
    },
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(MultiSignTxnListItemDetails);

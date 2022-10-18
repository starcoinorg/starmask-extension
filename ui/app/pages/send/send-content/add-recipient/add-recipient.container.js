import { connect } from 'react-redux';
import {
  getSendEnsResolution,
  getSendEnsResolutionError,
  accountsWithSendEtherInfoSelector,
  getAddressBook,
  getAddressBookEntry,
  getTickerForCurrentProvider,
} from '../../../../selectors';

import { updateSendTo } from '../../../../store/actions';
import AddRecipient from './add-recipient.component';

export default connect(mapStateToProps, mapDispatchToProps)(AddRecipient);

function mapStateToProps(state) {
  const ensResolution = getSendEnsResolution(state);

  let addressBookEntryName = '';
  if (ensResolution) {
    const addressBookEntry = getAddressBookEntry(state, ensResolution) || {};
    addressBookEntryName = addressBookEntry.name;
  }

  const addressBook = getAddressBook(state);

  const ticker = getTickerForCurrentProvider(state);

  const ownedAccounts = accountsWithSendEtherInfoSelector(state)
    .filter(account => {
      // there are moments that account object balance is undefined, and no ticker field, while switch from aptos to starcoin
      // so we have to use address length, instead of ticker
      const length = (ticker === 'STC' ? 34 : 66)
      return account.address.length === length
    })
    .sort((a, b) =>
      a.name.localeCompare(b.name),
    );

  return {
    addressBook,
    addressBookEntryName,
    contacts: addressBook.filter(({ name }) => Boolean(name)),
    ensResolution,
    ensResolutionError: getSendEnsResolutionError(state),
    nonContacts: addressBook.filter(({ name }) => !name),
    ownedAccounts,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    updateSendTo: (to, nickname) => dispatch(updateSendTo(to, nickname)),
  };
}

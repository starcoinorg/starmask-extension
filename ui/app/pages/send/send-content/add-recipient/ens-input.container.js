import { connect } from 'react-redux';
import { CHAIN_ID_TO_NETWORK_ID_MAP } from '../../../../../../shared/constants/network';
import {
  getSendTo,
  getSendToNickname,
  getAddressBookEntry,
  getCurrentChainId,
} from '../../../../selectors';
import EnsInput from './ens-input.component';

export default connect((state, ownProps) => {
  const selectedAddress = !ownProps.validating && !ownProps.toError ? getSendTo(state) : null;
  const chainId = getCurrentChainId(state);
  return {
    network: CHAIN_ID_TO_NETWORK_ID_MAP[chainId],
    selectedAddress,
    selectedName: getSendToNickname(state),
    contact: getAddressBookEntry(state, selectedAddress),
  };
})(EnsInput);

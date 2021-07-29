import { connect } from 'react-redux';
import {
  getMetaMaskAccounts,
  getNativeCurrency,
  getSendTokenCode,
} from '../../../../selectors';
import { updateSendToken } from '../../../../store/actions';
import SendAssetRow from './send-asset-row.component';

function mapStateToProps(state) {
  return {
    tokens: state.starmask.tokens,
    selectedAddress: state.starmask.selectedAddress,
    sendTokenCode: getSendTokenCode(state),
    accounts: getMetaMaskAccounts(state),
    nativeCurrency: getNativeCurrency(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setSendToken: (token) => dispatch(updateSendToken(token)),
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(SendAssetRow);

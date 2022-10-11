import { connect } from 'react-redux';
import {
  getRpcPrefsForCurrentProvider,
} from '../../selectors';
import CreateAccountPage from './create-account.component';

const mapStateToProps = (state) => {
  return {
    rpcPrefs: getRpcPrefsForCurrentProvider(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(CreateAccountPage);

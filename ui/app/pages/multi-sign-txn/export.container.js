import { connect } from 'react-redux';
import {
  setAccountLabel,
  addNewAccount,
  createMultiSignAccount,
} from '../../store/actions';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import MultiSignTxnExport from './export.component';

const mapStateToProps = (state) => {
  const {
    starmask: { identities = {} },
  } = state;
  const numberOfExistingAccounts = Object.keys(identities).length;
  const newAccountNumber = numberOfExistingAccounts + 1;

  return {
    newAccountNumber,
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    createAccount: (newAccountName) => {
      return dispatch(addNewAccount()).then((newAccountAddress) => {
        if (newAccountName) {
          dispatch(setAccountLabel(newAccountAddress, newAccountName));
        }
      });
    },
    createMultiSignAccount: (newAccountName, args) => {
      return dispatch(createMultiSignAccount(args)).then(
        (newAccountAddress) => {
          if (newAccountName) {
            dispatch(setAccountLabel(newAccountAddress, newAccountName));
          }
        },
      );
    },
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(MultiSignTxnExport);

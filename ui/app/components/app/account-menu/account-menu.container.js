import { connect } from 'react-redux';
import { compose } from 'redux';
import { withRouter } from 'react-router-dom';
import {
  toggleAccountMenu,
  showAccountDetail,
  hideSidebar,
  lockMetamask,
  hideWarning,
} from '../../../store/actions';
import {
  getAddressConnectedDomainMap,
  getMetaMaskAccountsOrdered,
  getMetaMaskKeyrings,
  getOriginOfCurrentTab,
  getSelectedAddress,
  getRpcPrefsForCurrentProvider,
} from '../../../selectors';
import AccountMenu from './account-menu.component';

/**
 * The min amount of accounts to show search field
 */
const SHOW_SEARCH_ACCOUNTS_MIN_COUNT = 5;

function mapStateToProps(state) {
  const {
    starmask: { isAccountMenuOpen },
  } = state;
  const accounts = getMetaMaskAccountsOrdered(state);
  const origin = getOriginOfCurrentTab(state);
  const selectedAddress = getSelectedAddress(state);

  return {
    isAccountMenuOpen,
    addressConnectedDomainMap: getAddressConnectedDomainMap(state),
    originOfCurrentTab: origin,
    selectedAddress,
    keyrings: getMetaMaskKeyrings(state),
    accounts,
    shouldShowAccountsSearch: accounts.length >= SHOW_SEARCH_ACCOUNTS_MIN_COUNT,
    rpcPrefs: getRpcPrefsForCurrentProvider(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    toggleAccountMenu: () => dispatch(toggleAccountMenu()),
    showAccountDetail: (address) => {
      dispatch(showAccountDetail(address));
      dispatch(hideSidebar());
      dispatch(toggleAccountMenu());
    },
    lockMetamask: () => {
      dispatch(lockMetamask());
      dispatch(hideWarning());
      dispatch(hideSidebar());
      dispatch(toggleAccountMenu());
    },
  };
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(AccountMenu);

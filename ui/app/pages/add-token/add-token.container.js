import { connect } from 'react-redux';
import { setPendingTokens, clearPendingTokens } from '../../store/actions';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import AddToken from './add-token.component';

const mapStateToProps = (state) => {
  const {
    starmask: { identities, tokens, pendingTokens, selectedAddress, assets },
  } = state;
  const currentAssets = assets[selectedAddress];
  const currentAssetsTokens = (currentAssets && Object.keys(currentAssets).length) ? Object.keys(currentAssets) : []
  return {
    identities,
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    tokens,
    currentAssetsTokens,
    pendingTokens,
    showSearchTab: true,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setPendingTokens: (tokens) => dispatch(setPendingTokens(tokens)),
    clearPendingTokens: () => dispatch(clearPendingTokens()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddToken);

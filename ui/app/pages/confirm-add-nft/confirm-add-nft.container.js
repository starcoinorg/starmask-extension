import { connect } from 'react-redux';

import { addTokens, clearPendingNFTs } from '../../store/actions';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import ConfirmAddNFT from './confirm-add-nft.component';

const mapStateToProps = (state) => {
  const {
    starmask: { pendingNFTs },
  } = state;
  return {
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    pendingNFTs,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addTokens: (tokens) => dispatch(addTokens(tokens)),
    clearPendingNFTs: () => dispatch(clearPendingNFTs()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ConfirmAddNFT);

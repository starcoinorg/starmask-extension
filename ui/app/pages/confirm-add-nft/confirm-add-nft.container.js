import { connect } from 'react-redux';
import { addNFTs, clearPendingNFTs } from '../../store/actions';
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
    addNFTs: (tokens) => dispatch(addNFTs(tokens)),
    clearPendingNFTs: () => dispatch(clearPendingNFTs()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ConfirmAddNFT);

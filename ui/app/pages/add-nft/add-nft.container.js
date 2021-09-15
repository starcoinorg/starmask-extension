import { connect } from 'react-redux';
import { setPendingNFTs, clearPendingNFTs } from '../../store/actions';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import { getNFTs } from '../../selectors/selectors';
import AddNFT from './add-nft.component';

const mapStateToProps = (state) => {
  const {
    starmask: { pendingNFTs },
  } = state;
  const nfts = getNFTs(state);
  return {
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    pendingNFTs,
    showSearchTab: false,
    nfts,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setPendingNFTs: (nfts) => dispatch(setPendingNFTs(nfts)),
    clearPendingNFTs: () => dispatch(clearPendingNFTs()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddNFT);

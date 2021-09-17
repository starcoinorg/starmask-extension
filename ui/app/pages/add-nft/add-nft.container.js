import { connect } from 'react-redux';
import {
  setPendingNFTs,
  clearPendingNFTs,
  updateNFTMetas,
} from '../../store/actions';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import { getCurrentNFTs, getNFTMetas } from '../../selectors/selectors';
import AddNFT from './add-nft.component';

const mapStateToProps = (state) => {
  const {
    starmask: { pendingNFTs },
  } = state;
  const nfts = getCurrentNFTs(state);
  const nftMetas = getNFTMetas(state);
  return {
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    pendingNFTs,
    showSearchTab: false,
    nfts,
    nftMetas,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    updateNFTMetas: (newNFTMetas) => dispatch(updateNFTMetas(newNFTMetas)),
    setPendingNFTs: (nfts) => dispatch(setPendingNFTs(nfts)),
    clearPendingNFTs: () => dispatch(clearPendingNFTs()),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddNFT);

import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import {
  getCurrentNFTs,
  getNFTMetas,
  getSelectedIdentity,
} from '../../selectors';
import { updateSendNFT } from '../../store/actions';
import NFTItems from './nft-items.component';

function mapStateToProps(state, ownProps) {
  const {
    match: { params = {} },
  } = ownProps;
  const { nft: nftMeta } = params;
  const nfts = getCurrentNFTs(state);
  const nftMetas = getNFTMetas(state);
  const selectedIdentity = getSelectedIdentity(state);
  return {
    nfts,
    selectedIdentity,
    nftMeta,
    nftMetas,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    updateSendNFT: (nft) => dispatch(updateSendNFT(nft)),
  };
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(NFTItems);

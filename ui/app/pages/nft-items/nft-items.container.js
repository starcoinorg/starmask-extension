import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { getNFTs, getSelectedIdentity } from '../../selectors';
import { updateSendNFT } from '../../store/actions';
import NFTItems from './nft-items.component';

function mapStateToProps(state, ownProps) {
  const {
    match: { params = {} },
  } = ownProps;
  const { nft: nftName } = params;
  const nfts = getNFTs(state);
  const selectedIdentity = getSelectedIdentity(state);
  return {
    nfts,
    selectedIdentity,
    nftName,
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

import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { getNFTMetas } from '../../../selectors';
import { updateNFTMetas } from '../../../store/actions';
import NFTGallreyCard from './nft-gallery-card.component';

function mapStateToProps(state) {
  const nftMetas = getNFTMetas(state);
  return {
    nftMetas,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    updateNFTMetas: (nft) => dispatch(updateNFTMetas(nft)),
  };
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(NFTGallreyCard);

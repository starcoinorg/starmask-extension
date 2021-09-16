import { connect } from 'react-redux';
import { getSendNFT } from '../../../../selectors';
import SendNFTRow from './send-nft-row.component';

function mapStateToProps(state) {
  return {
    nft: getSendNFT(state),
  };
}

export default connect(mapStateToProps)(SendNFTRow);

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import NFTGallreyCard from '../../../../components/app/nft-galler-card';

export default class SendNFTRow extends Component {
  static propTypes = {
    nft: PropTypes.object.isRequired,
  };

  render() {
    const { nft } = this.props;
    return (
      <div className="nft-list__photo-card_row">
        <NFTGallreyCard nft={nft} />
      </div>
    );
  }
}

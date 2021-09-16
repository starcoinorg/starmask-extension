import React, { Component } from 'react';
import PropTypes from 'prop-types';
import genesisNFTMeta from '../../../../helpers/constants/genesis-nft-meta.json';

export default class SendNFTRow extends Component {
  static propTypes = {
    nft: PropTypes.object.isRequired,
  };

  render() {
    const { nft } = this.props;
    console.log('render', { nft })
    let imgSrc = '';
    if (nft.image.length) {
      imgSrc = nft.image;
    } else if (nft.imageData.length) {
      imgSrc = nft.imageData;
    }
    if (!imgSrc.length) {
      imgSrc = genesisNFTMeta.image_data;
    }
    return (
      <div className="nft-list__photo-card_row">
        <div className="nft-list__photo-card">
          <img src={imgSrc} />
          <div className="nft-list__photo-card_body">
            <div>{nft.name}</div>
          </div>
        </div>
      </div>
    );
  }
}

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import genesisNFTMeta from '../../../helpers/constants/genesis-nft-meta.json';
import { getNFTGalleryInfo } from '../../../helpers/utils/nft-util';

export default class NFTGalleryCard extends Component {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    nft: PropTypes.object,
    nftMetas: PropTypes.object,
    onClickNFT: PropTypes.func,
    updateNFTMetas: PropTypes.func,
  };

  async getNFTGalleryInfo(meta) {
    const metaInfo = await getNFTGalleryInfo(meta);
    const { nftMetas, updateNFTMetas } = this.props;
    const newNFTMetas = { ...nftMetas, [meta]: metaInfo };
    updateNFTMetas(newNFTMetas);
  }

  render() {
    const { nft, nftMetas, onClickNFT } = this.props;
    let metaInfo = nftMetas[nft.meta];
    if (!metaInfo) {
      metaInfo = this.getNFTGalleryInfo(nft.meta);
    }
    const nftGallery = { ...nft, ...metaInfo };
    let imgSrc = '';
    if (nft.image && nft.image.length) {
      imgSrc = nft.image;
    } else if (nft.imageData && nft.imageData.length) {
      imgSrc = nft.imageData;
    }
    if (!imgSrc.length) {
      imgSrc = genesisNFTMeta.image_data;
      // imgSrc = 'https://c3r.oss-cn-beijing.aliyuncs.com/8972542977126636.png';
    }
    const props = {
      className: 'nft-list__photo-card',
      ...(onClickNFT ? { onClick: () => onClickNFT(nftGallery.meta) } : {}),
    };
    return (
      <div {...props}>
        <img src={imgSrc} />
        {onClickNFT ? (
          <div className="nft-list__photo-card_qty">{nftGallery.items.length}&nbsp;
            <svg
              stroke="currentColor"
              fill="currentColor"
              strokeWidth="0"
              viewBox="0 0 24 24"
              height="1em"
              width="1em"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                <path fill="none" d="M0 0h24v24H0z"></path>
                <path d="M20.083 10.5l1.202.721a.5.5 0 0 1 0 .858L12 17.65l-9.285-5.571a.5.5 0 0 1 0-.858l1.202-.721L12 15.35l8.083-4.85zm0 4.7l1.202.721a.5.5 0 0 1 0 .858l-8.77 5.262a1 1 0 0 1-1.03 0l-8.77-5.262a.5.5 0 0 1 0-.858l1.202-.721L12 20.05l8.083-4.85zM12.514 1.309l8.771 5.262a.5.5 0 0 1 0 .858L12 13 2.715 7.429a.5.5 0 0 1 0-.858l8.77-5.262a1 1 0 0 1 1.03 0z"></path>
              </g>
            </svg>
          </div>
        ) : null}
        <div className="nft-list__photo-card_body">{nftGallery.name}</div>
        <div className="nft-list__photo-card_description">
          {nftGallery.description}
        </div>
      </div>
    );
  }
}

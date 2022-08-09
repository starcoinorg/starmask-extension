import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DEFAULT_ROUTE, SEND_ROUTE } from '../../helpers/constants/routes';
import Button from '../../components/ui/button';
import AssetNavigation from '../asset/components/asset-navigation';
import { imageSourceUrls } from '../../helpers/utils/nft-util';

export default class NFTItems extends Component {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    history: PropTypes.object,
    nfts: PropTypes.array,
    nftMeta: PropTypes.string,
    selectedIdentity: PropTypes.object,
    nftMetas: PropTypes.object,
    updateSendNFT: PropTypes.func,
    // updateNFTMetas: PropTypes.func,
  };

  // async getNFTGalleryInfo(meta) {
  //   const metaInfo = await getNFTGalleryInfo(meta);
  //   const { nftMetas, updateNFTMetas } = this.props;
  //   const newNFTMetas = { ...nftMetas, [meta]: metaInfo };
  //   updateNFTMetas(newNFTMetas);
  // }

  renderPicture(image, imageData, galleryImage, galleryImageData) {
    const imageSources = (imageUrl) => {
      const urls = imageSourceUrls(imageUrl);
      return urls.map((url, index) => (
        <source key={`${ imageUrl }-${ index }`} srcSet={url} />
      ));
    };

    const picture = (
      <picture>
        {image && imageSources(image)}
        {imageData && <source key="imageData" srcSet={imageData} />}
        {galleryImage && imageSources(galleryImage)}
        {galleryImageData && <source key="galleryImageData" srcSet={galleryImageData} />}
        <img src="/images/imagenotfound.svg" />
      </picture>
    );
    return picture;
  }

  render() {
    const {
      history,
      nfts,
      updateSendNFT,
      selectedIdentity,
      nftMeta,
      nftMetas,
    } = this.props;
    const selectedAccountName = selectedIdentity.name;

    const nft = nfts.find(({ meta }) => meta === nftMeta);
    const metaInfo = nftMetas[nftMeta];
    // if (!metaInfo) {
    //   metaInfo = this.getNFTGalleryInfo(nftMeta);
    // }
    const nftGallery = { ...nft, ...metaInfo };

    return (
      <div className="main-container asset__container">
        <AssetNavigation
          accountName={selectedAccountName}
          assetName={nftGallery.name}
          onBack={() => history.push(DEFAULT_ROUTE)}
          optionsButton={null}
        />
        <div className="nft-list__grid nft-list__grid--3">
          {nftGallery && nftGallery.items && nftGallery.items.length > 0 ? (
            nftGallery.items.map((item, index) => {
              const nftItem = {
                ...item,
                meta: nftGallery.meta,
                body: nftGallery.body,
              };

              return (
                <div key={index} className="nft-list__photo-card">
                  {this.renderPicture(nftItem.image, nftItem.imageData, nftGallery.image, nftGallery.imageData)}
                  <div className="nft-list__photo-card_body">
                    <div>{nftItem.name}</div>
                    <div>
                      <Button
                        className="nft-list__create-gallery"
                        type="secondary"
                        rounded
                        onClick={() => {
                          this.context.trackEvent({
                            event: 'Transfer NFT',
                            category: 'Wallet',
                            sensitiveProperties: {
                              id: nftItem.id,
                              meta: nftItem.meta,
                              body: nftItem.body,
                              from: selectedIdentity.address,
                            },
                          });
                          updateSendNFT(nftItem);
                          history.push(SEND_ROUTE);
                        }}
                      >
                        {this.context.t('transferNFT')}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="nft-list__empty">
              <div className="nft-list__empty-text">
                {this.context.t('noNFTGallery')}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

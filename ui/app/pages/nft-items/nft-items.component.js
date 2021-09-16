import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { DEFAULT_ROUTE, SEND_ROUTE } from '../../helpers/constants/routes';
import Button from '../../components/ui/button';
import AssetNavigation from '../asset/components/asset-navigation';
import genesisNFTMeta from '../../helpers/constants/genesis-nft-meta.json';

export default class NFTItems extends Component {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    history: PropTypes.object,
    nfts: PropTypes.array,
    nftName: PropTypes.string,
    selectedIdentity: PropTypes.object,
    updateSendNFT: PropTypes.func,
  };

  render() {
    const {
      history,
      nfts,
      updateSendNFT,
      selectedIdentity,
      nftName,
    } = this.props;
    const selectedAccountName = selectedIdentity.name;

    const current = nfts.find(({ name }) => name === nftName);
    return (
      <div className="main-container asset__container">
        <AssetNavigation
          accountName={selectedAccountName}
          assetName={nftName}
          onBack={() => history.push(DEFAULT_ROUTE)}
          optionsButton={null}
        />
        <div className="nft-list__grid nft-list__grid--3">
          {current && current.items && current.items.length > 0 ? (
            current.items.map((item, index) => {
              const nft = {
                ...item,
                meta: current.meta,
                body: current.body,
              };
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
                <div key={index} className="nft-list__photo-card">
                  <img src={imgSrc} />
                  <div className="nft-list__photo-card_body">
                    <div>{nft.name}</div>
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
                              id: nft.id,
                              meta: nft.meta,
                              body: nft.body,
                              from: selectedIdentity.address,
                            },
                          });
                          updateSendNFT(nft);
                          history.push(SEND_ROUTE);
                        }}
                      >
                        {this.context.t('transferNFT')}
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="nft-list__empty">
              <div className="nft-list__empty-text">
                {this.context.t('noNFTs')}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

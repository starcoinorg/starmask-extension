import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ADD_NFT_ROUTE } from '../../helpers/constants/routes';
import genesisNFTMeta from '../../helpers/constants/genesis-nft-meta.json';
import Button from '../../components/ui/button';

export default class ConfirmAddNFT extends Component {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    history: PropTypes.object,
    clearPendingNFTs: PropTypes.func,
    addNFTs: PropTypes.func,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    pendingNFTs: PropTypes.object,
  };

  componentDidMount() {
    const { mostRecentOverviewPage, pendingNFTs = {}, history } = this.props;
    if (Object.keys(pendingNFTs).length === 0) {
      history.push(mostRecentOverviewPage);
    }
  }

  render() {
    const {
      history,
      addNFTs,
      clearPendingNFTs,
      mostRecentOverviewPage,
      pendingNFTs,
    } = this.props;
    return (
      <div className="page-container">
        <div className="page-container__header">
          <div className="page-container__title">
            {this.context.t('addNFTGallery')}
          </div>
          <div className="page-container__subtitle">
            {this.context.t('likeToAddNFTs')}
          </div>
        </div>
        <div className="page-container__content">
          <div className="confirm-add-token">
            <div className="confirm-add-token__token-list">
              {Object.entries(pendingNFTs).map(([meta, nft]) => {
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
                  <div key={meta} className="nft-list__photo-card">
                    <img src={imgSrc} />
                    <div className="nft-list__photo-card_body">{nft.name}</div>
                    <div className="nft-list__photo-card_description">
                      {nft.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="page-container__footer">
          <footer>
            <Button
              type="default"
              large
              className="page-container__footer-button"
              onClick={() => history.push(ADD_NFT_ROUTE)}
            >
              {this.context.t('back')}
            </Button>
            <Button
              type="secondary"
              large
              className="page-container__footer-button"
              onClick={() => {
                addNFTs(pendingNFTs).then(() => {
                  const pendingNFTValues = Object.values(pendingNFTs);
                  pendingNFTValues.forEach((pendingNFT) => {
                    this.context.trackEvent({
                      event: 'NFT Added',
                      category: 'Wallet',
                      sensitiveProperties: {
                        meta: pendingNFT.symbol,
                        body: pendingNFT.code,
                        name: pendingNFT.decimals,
                        unlisted: pendingNFT.unlisted,
                        source: pendingNFT.isCustom ? 'custom' : 'list',
                      },
                    });
                  });
                  clearPendingNFTs();
                  history.push(mostRecentOverviewPage);
                });
              }}
            >
              {this.context.t('addNFTGallery')}
            </Button>
          </footer>
        </div>
      </div>
    );
  }
}

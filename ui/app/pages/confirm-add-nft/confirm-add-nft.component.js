import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ASSET_ROUTE, ADD_NFT_ROUTE } from '../../helpers/constants/routes';
import genesisNFTMeta from '../../helpers/constants/genesis-nft-meta.json';
import Button from '../../components/ui/button';

export default class ConfirmAddNFT extends Component {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    history: PropTypes.object,
    clearPendingTokens: PropTypes.func,
    addTokens: PropTypes.func,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    pendingNFTs: PropTypes.object,
  };

  componentDidMount() {
    const { mostRecentOverviewPage, pendingNFTs = {}, history } = this.props;
    console.log({ pendingNFTs })
    if (Object.keys(pendingNFTs).length === 0) {
      history.push(mostRecentOverviewPage);
    }
  }

  getTokenName(name, symbol) {
    return typeof name === 'undefined' ? symbol : `${name} (${symbol})`;
  }

  render() {
    const {
      history,
      addTokens,
      clearPendingTokens,
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
                console.log({ meta, nft })
                let imgSrc = '';
                if (nft.image.length) {
                  imgSrc = nft.image;
                } else if (nft.imageData.length) {
                  imgSrc = nft.imageData;
                }
                if (!imgSrc.length) {
                  imgSrc = genesisNFTMeta.image_data;
                }
                console.log({ imgSrc })
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
                addTokens(pendingNFTs).then(() => {
                  const pendingTokenValues = Object.values(pendingNFTs);
                  pendingTokenValues.forEach((pendingToken) => {
                    this.context.trackEvent({
                      event: 'Token Added',
                      category: 'Wallet',
                      sensitiveProperties: {
                        token_symbol: pendingToken.symbol,
                        token_contract_code: pendingToken.code,
                        token_decimal_precision: pendingToken.decimals,
                        unlisted: pendingToken.unlisted,
                        source: pendingToken.isCustom ? 'custom' : 'list',
                      },
                    });
                  });
                  clearPendingTokens();
                  const firstTokenAddress = pendingTokenValues?.[0].code?.toLowerCase();
                  if (firstTokenAddress) {
                    history.push(`${ASSET_ROUTE}/${firstTokenAddress}`);
                  } else {
                    history.push(mostRecentOverviewPage);
                  }
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

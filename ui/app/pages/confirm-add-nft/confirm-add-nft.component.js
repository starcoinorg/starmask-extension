import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ASSET_ROUTE, ADD_NFT_ROUTE } from '../../helpers/constants/routes';
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
                  imgSrc = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiIHN0YW5kYWxvbmU9InllcyI/Pgo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPgo8c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6Y2M9Imh0dHA6Ly93ZWIucmVzb3VyY2Uub3JnL2NjLyIgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIiB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIiB2ZXJzaW9uPSIxLjEiIGJhc2VQcm9maWxlPSJmdWxsIiB3aWR0aD0iMTUwcHgiIGhlaWdodD0iMTUwcHgiIHZpZXdCb3g9IjAgMCAxNTAgMTUwIiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJ4TWlkWU1pZCBtZWV0IiBpZD0ic3ZnX2RvY3VtZW50IiBzdHlsZT0iem9vbTogMTsiPjwhLS0gQ3JlYXRlZCB3aXRoIG1hY1NWRyAtIGh0dHBzOi8vbWFjc3ZnLm9yZy8gLSBodHRwczovL2dpdGh1Yi5jb20vZHN3YXJkMi9tYWNzdmcvIC0tPjx0aXRsZSBpZD0ic3ZnX2RvY3VtZW50X3RpdGxlIj5VbnRpdGxlZC5zdmc8L3RpdGxlPjxkZWZzIGlkPSJzdmdfZG9jdW1lbnRfZGVmcyI+PC9kZWZzPjxnIGlkPSJtYWluX2dyb3VwIj48cmVjdCBpZD0iYmFja2dyb3VuZF9yZWN0IiBmaWxsPSIjMTU4OGYxIiB4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjE1MHB4IiBoZWlnaHQ9IjE1MHB4Ij48L3JlY3Q+PC9nPjwvc3ZnPg=='
                }
                console.log({ imgSrc })
                return (
                  <div key={meta} className="nft-list__photo-card">
                    <img src={imgSrc} />
                    <div className="nft-list__photo-card_body">
                      {nft.name}
                    </div>
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

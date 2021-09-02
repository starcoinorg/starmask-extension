import React from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useParams } from 'react-router-dom';
import { useI18nContext } from '../../hooks/useI18nContext';
import { getSelectedIdentity, getNFTList } from '../../selectors';
import { DEFAULT_ROUTE } from '../../helpers/constants/routes';
import Button from '../../components/ui/button';
import AssetNavigation from '../asset/components/asset-navigation';

const NFTGallery = () => {
  const t = useI18nContext();
  const selectedIdentity = useSelector(getSelectedIdentity);
  const selectedAccountName = selectedIdentity.name;
  const history = useHistory();
  const { nft } = useParams();
  console.log('NFTGallery', nft)
  const nfts = useSelector(getNFTList);
  console.log(nfts)
  const current = nfts.find(({ name }) => name === nft);
  const transferNFT = () => {
    console.log('transferNFT')
  }
  return (
    <div className="main-container asset__container">
      <AssetNavigation
        accountName={selectedAccountName}
        assetName={nft}
        onBack={() => history.push(DEFAULT_ROUTE)}
        optionsButton={null}
      />
      <div className="nft-list__grid nft-list__grid--3">
        {
          current.gallery.length > 0 ? (
            current.gallery.map((nft, index) => (
              // <AssetListItem
              //   key={index}
              //   onClick={() => onClickAsset(nativeCurrency)}
              //   data-testid="wallet-balance"
              //   primary={primaryCurrencyProperties.value}
              //   tokenSymbol={primaryCurrencyProperties.suffix}
              //   secondary={showFiat ? secondaryCurrencyDisplay : undefined}
              // />
              <div key={index} className="nft-list__photo-card">
                <img src={nft.image} alt={nft.name} />
                <div className="nft-list__photo-card_body">
                  <div>{nft.name}</div>
                  <div>
                    <Button
                      className="nft-list__create-gallery"
                      type="secondary"
                      rounded
                      onClick={transferNFT}
                    >
                      {t('transferNFT')}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="nft-list__empty">
              <div className="nft-list__empty-text">{t('noNFTs')}</div>
            </div>
          )
        }
      </div>
    </div>
  );
};

export default NFTGallery;

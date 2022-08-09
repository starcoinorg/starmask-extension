import React from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getCurrentNFTIdentifier } from '../../../selectors';
import NFTIdentifierCard from '../nft-identifier-card';

const NFTIdentifier = () => {
  const t = useI18nContext();
  const nftIdentifier = useSelector(getCurrentNFTIdentifier);

  return (
    <>
      <div className={classNames('nft-list__grid', 'nft-list__grid--3')}>
        {nftIdentifier && nftIdentifier.length > 0 ? (
          nftIdentifier.map((nft, index) => {
            return (
              <NFTIdentifierCard key={index} nft={nft} />
            );
          })
        ) : (
          <div className="nft-list__empty">
            <div className="nft-list__empty-text">{t('noNFTIdentifier')}</div>
          </div>
        )}
      </div>
    </>
  );
};

export default NFTIdentifier;

import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';
import Button from '../../ui/button';
import { ADD_NFT_ROUTE } from '../../../helpers/constants/routes';
import { useMetricEvent } from '../../../hooks/useMetricEvent';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getCurrentNFTs } from '../../../selectors';
import NFTGallreyCard from '../nft-galler-card';

const NFTGallery = ({ onClickNFT }) => {
  const t = useI18nContext();
  const history = useHistory();
  const addNFTEvent = useMetricEvent({
    eventOpts: {
      category: 'Navigation',
      action: 'NFT Menu',
      name: 'Clicked "Add NFT Gallery"',
    },
  });

  const nfts = useSelector(getCurrentNFTs);

  return (
    <>
      <div className={classNames('nft-list__grid', 'nft-list__grid--3')}>
        {nfts && nfts.length > 0 ? (
          nfts.map((nft, index) => {
            return (
              <NFTGallreyCard key={index} nft={nft} onClickNFT={onClickNFT} />
            );
          })
        ) : (
          <div className="nft-list__empty">
            <div className="nft-list__empty-text">{t('noNFTs')}</div>
          </div>
        )}
      </div>
      <Button
        className="nft-list__create-gallery"
        type="secondary"
        rounded
        onClick={() => {
          history.push(ADD_NFT_ROUTE);
          addNFTEvent();
        }}
      >
        {t('addNFTGallery')}
      </Button>
    </>
  );
};

NFTGallery.propTypes = {
  onClickNFT: PropTypes.func.isRequired,
};

export default NFTGallery;

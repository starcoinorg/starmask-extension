import React from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';
import AddTokenButton from '../add-token-button';
import TokenList from '../token-list';
import Button from '../../ui/button';
import { ADD_NFT_ROUTE } from '../../../helpers/constants/routes';
import AssetListItem from '../asset-list-item';
import { PRIMARY, SECONDARY } from '../../../helpers/constants/common';
import { useMetricEvent } from '../../../hooks/useMetricEvent';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { useUserPreferencedCurrency } from '../../../hooks/useUserPreferencedCurrency';
import {
  getCurrentAccountWithSendEtherInfo,
  getNativeCurrency,
  getShouldShowFiat,
  getNFTs,
} from '../../../selectors';
import { useCurrencyDisplay } from '../../../hooks/useCurrencyDisplay';
import { addFiat } from '../../../helpers/utils/confirm-tx.util';

const NFTList = ({ onClickNFT }) => {
  const t = useI18nContext();

  const history = useHistory();
  const selectedAccountBalance = useSelector(
    (state) => getCurrentAccountWithSendEtherInfo(state).balance,
  );
  const nativeCurrency = useSelector(getNativeCurrency);
  const showFiat = useSelector(getShouldShowFiat);
  const selectTokenEvent = useMetricEvent({
    eventOpts: {
      category: 'Navigation',
      action: 'Token Menu',
      name: 'Clicked Token',
    },
  });
  const addNFTEvent = useMetricEvent({
    eventOpts: {
      category: 'Navigation',
      action: 'NFT Menu',
      name: 'Clicked "Add NFT Gallery"',
    },
  });

  const {
    currency: primaryCurrency,
    numberOfDecimals: primaryNumberOfDecimals,
  } = useUserPreferencedCurrency(PRIMARY, { ethNumberOfDecimals: 4 });
  const {
    currency: secondaryCurrency,
    numberOfDecimals: secondaryNumberOfDecimals,
  } = useUserPreferencedCurrency(SECONDARY, { ethNumberOfDecimals: 4 });

  const [, primaryCurrencyProperties] = useCurrencyDisplay(
    selectedAccountBalance,
    {
      numberOfDecimals: primaryNumberOfDecimals,
      currency: primaryCurrency,
    },
  );

  const [secondaryCurrencyDisplay] = useCurrencyDisplay(
    selectedAccountBalance,
    {
      numberOfDecimals: secondaryNumberOfDecimals,
      currency: secondaryCurrency,
    },
  );

  const nfts = useSelector(getNFTs);

  return (
    <>
      <div className="nft-list__grid nft-list__grid--3">
        {
          nfts && nfts.length > 0 ? (
            nfts.map((nft, index) => (
              <div key={index} className="nft-list__photo-card" onClick={() => onClickNFT(nft.name)}>
                <img src={nft.image} />
                <div className="nft-list__photo-card_qty">{nft.items.length}&nbsp;
                  <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><g><path fill="none" d="M0 0h24v24H0z"></path><path d="M20.083 10.5l1.202.721a.5.5 0 0 1 0 .858L12 17.65l-9.285-5.571a.5.5 0 0 1 0-.858l1.202-.721L12 15.35l8.083-4.85zm0 4.7l1.202.721a.5.5 0 0 1 0 .858l-8.77 5.262a1 1 0 0 1-1.03 0l-8.77-5.262a.5.5 0 0 1 0-.858l1.202-.721L12 20.05l8.083-4.85zM12.514 1.309l8.771 5.262a.5.5 0 0 1 0 .858L12 13 2.715 7.429a.5.5 0 0 1 0-.858l8.77-5.262a1 1 0 0 1 1.03 0z"></path></g></svg>
                </div>
                <div className="nft-list__photo-card_body">
                  {nft.name}
                </div>
                <div className="nft-list__photo-card_description">{nft.description}</div>
              </div>
            ))
          ) : (
            <div className="nft-list__empty">
              <div className="nft-list__empty-text">{t('noNFTs')}</div>
            </div>
          )
        }
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

NFTList.propTypes = {
  onClickNFT: PropTypes.func.isRequired,
};

export default NFTList;

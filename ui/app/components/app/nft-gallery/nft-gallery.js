import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, connect } from 'react-redux';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';
import { getAptosTokens } from '../../../store/actions';
import Button from '../../ui/button';
import { ADD_NFT_ROUTE } from '../../../helpers/constants/routes';
import { useMetricEvent } from '../../../hooks/useMetricEvent';
import { useI18nContext } from '../../../hooks/useI18nContext';
import { getCurrentNFTs, getTickerForCurrentProvider, getSelectedAddress } from '../../../selectors';
import NFTGallreyCard from '../nft-galler-card';

const NFTGallery = ({ onClickNFT, getAptosTokens, ticker, nfts, address }) => {
  const t = useI18nContext();
  const history = useHistory();
  const [tokens, setTokens] = useState([]);
  const addNFTEvent = useMetricEvent({
    eventOpts: {
      category: 'Navigation',
      action: 'NFT Menu',
      name: 'Clicked "Add NFT Gallery"',
    },
  });

  console.log({ ticker, address, nfts })
  useEffect(() => {
    console.log('useEffect', { ticker, address, nfts })

    if (ticker === 'APT') {
      console.log({ nfts })
      if (typeof nfts === 'string' && parseInt(nfts) > 0) {
        getAptosTokens(address)
          .then((res) => {
            setTokens(res);
          })
          .catch((e) => log.error(e));
      }
    } else if (ticker === 'STC') {
      setTokens(nfts);
    }
  }, [ticker, address, nfts]);

  // if (ticker === 'APT') {
  //   console.log({ nfts })
  //   // nfts = []
  // }
  console.log({ nfts, tokens })
  return (
    <>
      <div className={classNames('nft-list__grid', 'nft-list__grid--3')}>
        {Array.isArray(nfts) && nfts.length > 0 ? (
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
  getAptosTokens: PropTypes.func.isRequired,
  address: PropTypes.string.isRequired,
  ticker: PropTypes.string.isRequired,
  nfts: PropTypes.oneOfType([PropTypes.array, PropTypes.string]).isRequired,
};


function mapStateToProps(state) {
  return {
    ticker: getTickerForCurrentProvider(state),
    nfts: getCurrentNFTs(state),
    address: getSelectedAddress(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    getAptosTokens: (address, ticker) => {
      return dispatch(getAptosTokens(address)).then((res) => {
        return res;
      });
    },
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(NFTGallery);

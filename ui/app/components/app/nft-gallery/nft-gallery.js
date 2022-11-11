import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, connect } from 'react-redux';
import { useHistory } from 'react-router-dom';
import classNames from 'classnames';
import { getAptosTokens, getAptosTableItem } from '../../../store/actions';
import Button from '../../ui/button';
import { ADD_NFT_ROUTE } from '../../../helpers/constants/routes';
import { useMetricEvent } from '../../../hooks/useMetricEvent';
import { useI18nContext } from '../../../hooks/useI18nContext';
import {
  getCurrentNFTs,
  getTickerForCurrentProvider,
  getSelectedAddress,
  getCurrentTokenHandle
} from '../../../selectors';
import NFTGallreyCard from '../nft-galler-card';

const NFTGallery = ({ onClickNFT, getAptosTokens, getAptosTableItem, ticker, nfts, tokenHandle, address }) => {
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

  console.log({ ticker, address, nfts, tokenHandle })
  useEffect(() => {
    console.log('useEffect', { ticker, address, tokenHandle })

    if (ticker === 'APT' && tokenHandle) {
      console.log({ tokenHandle })
      getAptosTokens(address)
        .then((res) => {
          console.log({ res })
          Promise.all(res.map((item) => {
            const sequence_number = item.sequence_number
            const key = item.data.id.token_data_id
            const key_type = "0x3::token::TokenDataId"
            const value_type = "0x3::token::TokenData"
            return getAptosTableItem(tokenHandle, key_type, value_type, key).then((data) => {
              console.log('getAptosTableItem', data)
              return { ...key, sequence_number, uri: data.uri }
            })
          }))
            .then((result) => {
              console.log({ result })
            })
          // setTokens(res);
        })
        .catch((e) => console.error(e));
    }
  }, [ticker, address, tokenHandle]);

  console.log({ nfts, tokenHandle, tokens })
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
  getAptosTableItem: PropTypes.func.isRequired,
  address: PropTypes.string.isRequired,
  ticker: PropTypes.string.isRequired,
  nfts: PropTypes.array.isRequired,
  tokenHandle: PropTypes.string.isRequired,
};


function mapStateToProps(state) {
  return {
    ticker: getTickerForCurrentProvider(state),
    nfts: getCurrentNFTs(state),
    tokenHandle: getCurrentTokenHandle(state),
    address: getSelectedAddress(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
    getAptosTokens: (address) => {
      return dispatch(getAptosTokens(address)).then((res) => {
        return res;
      });
    },
    getAptosTableItem: (token_data_handle, key_type, value_type, key) => {
      return dispatch(getAptosTableItem(token_data_handle, key_type, value_type, key)).then((res) => {
        return res;
      });
    },
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(NFTGallery);

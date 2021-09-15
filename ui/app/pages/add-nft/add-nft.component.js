import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as stcUtil from '@starcoin/stc-util';
import { checkExistingNFT } from '../../helpers/utils/util';
import { CONFIRM_ADD_NFT_ROUTE } from '../../helpers/constants/routes';
import TextField from '../../components/ui/text-field';
import PageContainer from '../../components/ui/page-container';
import { Tabs, Tab } from '../../components/ui/tabs';

class AddNFT extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    history: PropTypes.object,
    setPendingNFTs: PropTypes.func,
    pendingNFTs: PropTypes.object,
    clearPendingNFTs: PropTypes.func,
    nfts: PropTypes.array,
    mostRecentOverviewPage: PropTypes.string.isRequired,
  };

  state = {
    customNFTMeta: '',
    customNFTBody: '',
    customNFTMetaError: null,
    customNFTBodyError: null,
  };

  componentDidMount() {
    const { pendingNFTs = {} } = this.props;
    const pendingNFTKeys = Object.keys(pendingNFTs);

    if (pendingNFTKeys.length > 0) {
      let selectedNFTs = {};
      let customNFT = {};

      pendingNFTKeys.forEach((key) => {
        const nft = pendingNFTs[key];
        const { isCustom } = nft;

        if (isCustom) {
          customNFT = { ...nft };
        } else {
          selectedNFTs = { ...selectedNFTs, [key]: { ...nft } };
        }
      });

      const {
        NFTMeta: customNFTMeta = '',
        NFTBody: customNFTBody = '',
      } = customNFT;

      this.setState({
        customNFTMeta,
        customNFTBody,
      });
    }
  }

  hasError() {
    const { customNFTMetaError, customNFTBodyError } = this.state;
    return customNFTMetaError || customNFTBodyError;
  }

  handleNext() {
    if (this.hasError()) {
      return;
    }

    const { setPendingNFTs, history } = this.props;
    const { customNFTMeta: NFTMeta, customNFTBody: NFTBody } = this.state;

    const customNFT = {
      NFTMeta,
      NFTBody,
    };

    setPendingNFTs({ customNFT });
    history.push(CONFIRM_ADD_NFT_ROUTE);
  }

  handleCustomNFTMetaChange(value) {
    console.log('handleCustomNFTMetaChange', value)
    const customNFTMeta = value.trim();
    this.setState({
      customNFTMeta,
      customNFTMetaError: null,
    });

    const arr = customNFTMeta.split('::');
    const isValidCode = arr.length / 3 >= 1 && stcUtil.isValidAddress(arr[0]);
    switch (true) {
      case !isValidCode:
        this.setState({
          customNFTMetaError: this.context.t('invalidNFTMeta'),
          customNFTBodyError: null,
        });

        break;
      case checkExistingNFT(customNFTMeta, this.props.nfts):
        this.setState({
          customNFTMetaError: this.context.t('nftAlreadyAdded'),
        });

        break;
      default:
    }
  }

  handleCustomNFTBodyChange(value) {
    console.log('handleCustomNFTBodyChange')
    const customNFTBody = value.trim();
    this.setState({
      customNFTBody,
      customNFTBodyError: null,
    });

    const arr = customNFTBody.split('::');

    const isValidCode = arr.length / 3 >= 1 && stcUtil.isValidAddress(arr[0]);

    switch (true) {
      case !isValidCode:
        this.setState({
          customNFTBodyError: this.context.t('invalidNFTBody'),
          customNFTMetaError: null,
        });

        break;
      default:
    }
  }

  renderCustomNFTForm() {
    const {
      customNFTMeta,
      customNFTBody,
      customNFTMetaError,
      customNFTBodyError,
    } = this.state;

    return (
      <div className="add-token__custom-token-form">
        <TextField
          id="custom-nft-meta"
          label={this.context.t('nftMeta')}
          type="text"
          value={customNFTMeta}
          onChange={(e) => this.handleCustomNFTMetaChange(e.target.value)}
          error={customNFTMetaError}
          fullWidth
          autoFocus
          margin="normal"
          multiline
          rows="4"
          classes={{
            inputMultiline: 'address-book__view-contact__text-area',
            inputRoot: 'address-book__view-contact__text-area-wrapper',
          }}
        />
        <TextField
          id="custom-nft-body"
          label={this.context.t('nftBody')}
          type="text"
          value={customNFTBody}
          onChange={(e) => this.handleCustomNFTBodyChange(e.target.value)}
          error={customNFTBodyError}
          fullWidth
          autoFocus
          margin="normal"
          multiline
          rows="4"
          classes={{
            inputMultiline: 'address-book__view-contact__text-area',
            inputRoot: 'address-book__view-contact__text-area-wrapper',
          }}
        />
      </div>
    );
  }

  renderTabs() {
    const tabs = [];

    tabs.push(
      <Tab name={this.context.t('customNFT')} key="custom-tab">
        {this.renderCustomNFTForm()}
      </Tab>,
    );

    return <Tabs>{tabs}</Tabs>;
  }

  render() {
    const { history, clearPendingNFTs, mostRecentOverviewPage } = this.props;

    return (
      <PageContainer
        title={this.context.t('addNFTGallery')}
        tabsComponent={this.renderTabs()}
        onSubmit={() => this.handleNext()}
        disabled={Boolean(this.hasError())}
        onCancel={() => {
          clearPendingNFTs();
          history.push(mostRecentOverviewPage);
        }}
      />
    );
  }
}

export default AddNFT;

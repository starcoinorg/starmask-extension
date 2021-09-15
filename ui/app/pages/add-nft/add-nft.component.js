import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as stcUtil from '@starcoin/stc-util';
import { checkExistingNFT } from '../../helpers/utils/util';
import { getNFTGalleryInfo } from '../../helpers/utils/nft-util';
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
    customMeta: '',
    customBody: '',
    customName: '',
    customDescription: '',
    customImage: '',
    customImageData: '',
    customMetaError: null,
    customBodyError: null,
    customNameError: null,
    customDescriptionError: null,
    autoFilled: false,
  };

  componentDidMount() {
    this.getNFTGalleryInfo = (meta) => getNFTGalleryInfo(meta);
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
        meta: customMeta = '',
        body: customBody = '',
        name: customName = '',
        description: customDescription = '',
        image: customImage = '',
        imageData: customImageData = '',
      } = customNFT;

      this.setState({
        customMeta,
        customBody,
        customName,
        customDescription,
        customImage,
        customImageData,
      });
    }
  }

  hasError() {
    const { customMetaError, customBodyError } = this.state;
    return customMetaError || customBodyError;
  }

  hasSelected() {
    const { customMeta = '', customBody = '', selectedNFTs = {} } = this.state;
    return (customMeta && customBody) || Object.keys(selectedNFTs).length > 0;
  }

  async handleNext() {
    if (this.hasError()) {
      return;
    }

    // if (!this.hasSelected()) {
    //   this.setState({ tokenSelectorError: this.context.t('mustSelectOne') });
    //   return;
    // }

    const { setPendingNFTs, history } = this.props;
    const {
      customMeta: meta,
      customBody: body,
      customName: name,
      customDescription: description,
      customImage: image,
      customImageData: imageData,
    } = this.state;

    const customNFT = {
      meta,
      body,
      name,
      description,
      image,
      imageData,
    };

    setPendingNFTs({ customNFT });
    history.push(CONFIRM_ADD_NFT_ROUTE);
  }

  async attemptToAutoFillNFTParams(meta) {
    try {
      const result = await this.getNFTGalleryInfo(meta);
      const autoFilled = Boolean(result.name && result.description);
      this.setState({
        autoFilled,
        customImage: result.image,
        customImageData: result.image_data,
      });
      this.handleCustomNameChange(result.name || '');
      this.handleCustomDescriptionChange(result.description || '');
    } catch (error) {
      console.log('dsdf', typeof error, JSON.stringify(error), error.Error);
      console.log(error);
      // this.setState({
      //   customMetaError: error,
      //   customBodyError: null,
      //   customNameError: null,
      //   customDescriptionError: null,
      // });
    }
  }

  handleCustomNameChange(value) {
    const customName = value.trim();
    const customNameError = null;
    this.setState({ customName, customNameError });
  }

  handleCustomDescriptionChange(value) {
    const customDescription = value.trim();
    const customDescriptionError = null;
    this.setState({ customDescription, customDescriptionError });
  }

  handleCustomMetaChange(value) {
    const customMeta = value.trim();
    this.setState({
      customMeta,
      customMetaError: null,
      autoFilled: false,
    });

    const arr = customMeta.split('::');
    const isValidCode = arr.length / 3 >= 1 && stcUtil.isValidAddress(arr[0]);
    switch (true) {
      case !isValidCode:
        this.setState({
          customMetaError: this.context.t('invalidMeta'),
          customBodyError: null,
          customNameError: null,
          customDescriptionError: null,
        });

        break;
      case checkExistingNFT(customMeta, this.props.nfts):
        this.setState({
          customMetaError: this.context.t('nftAlreadyAdded'),
        });

        break;
      default:
        this.attemptToAutoFillNFTParams(customMeta);
    }
  }

  handleCustomBodyChange(value) {
    const customBody = value.trim();
    this.setState({
      customBody,
      customBodyError: null,
    });

    const arr = customBody.split('::');

    const isValidCode = arr.length / 3 >= 1 && stcUtil.isValidAddress(arr[0]);

    switch (true) {
      case !isValidCode:
        this.setState({
          customBodyError: this.context.t('invalidBody'),
          customMetaError: null,
          customNameError: null,
          customDescriptionError: null,
        });

        break;
      default:
    }
  }

  renderCustomNFTForm() {
    const {
      customMeta,
      customBody,
      customName,
      customDescription,
      customMetaError,
      customBodyError,
      customNameError,
      customDescriptionError,
      autoFilled,
    } = this.state;

    return (
      <div className="add-token__custom-token-form">
        <TextField
          id="custom-nft-meta"
          label={this.context.t('nftMeta')}
          type="text"
          value={customMeta}
          onChange={(e) => this.handleCustomMetaChange(e.target.value)}
          error={customMetaError}
          fullWidth
          autoFocus
          margin="normal"
          multiline
          rows="3"
          classes={{
            inputMultiline: 'address-book__view-contact__text-area',
            inputRoot: 'address-book__view-contact__text-area-wrapper',
          }}
        />
        <TextField
          id="custom-nft-body"
          label={this.context.t('nftBody')}
          type="text"
          value={customBody}
          onChange={(e) => this.handleCustomBodyChange(e.target.value)}
          error={customBodyError}
          fullWidth
          margin="normal"
          multiline
          rows="3"
          classes={{
            inputMultiline: 'address-book__view-contact__text-area',
            inputRoot: 'address-book__view-contact__text-area-wrapper',
          }}
        />
        <TextField
          id="custom-name"
          label={this.context.t('nftName')}
          type="text"
          value={customName}
          onChange={(e) => this.handleCustomNameChange(e.target.value)}
          error={customNameError}
          fullWidth
          margin="normal"
          disabled={autoFilled}
        />
        <TextField
          id="custom-description"
          label={this.context.t('nftDescription')}
          type="text"
          value={customDescription}
          onChange={(e) => this.handleCustomDescriptionChange(e.target.value)}
          error={customDescriptionError}
          fullWidth
          margin="normal"
          disabled={autoFilled}
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
        disabled={Boolean(this.hasError()) || !this.hasSelected()}
        onCancel={() => {
          clearPendingNFTs();
          history.push(mostRecentOverviewPage);
        }}
      />
    );
  }
}

export default AddNFT;

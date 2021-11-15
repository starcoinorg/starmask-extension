import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ErrorMessage from '../../../components/ui/error-message';
import PageContainerContent from '../../../components/ui/page-container/page-container-content.component';
import Dialog from '../../../components/ui/dialog';
import SendAmountRow from './send-amount-row';
import SendGasRow from './send-gas-row';
import SendHexDataRow from './send-hex-data-row';
import SendAssetRow from './send-asset-row';
import SendNFTRow from './send-nft-row';

export default class SendContent extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    gasLoadingError: PropTypes.string,
    updateGas: PropTypes.func,
    showAddToAddressBookModal: PropTypes.func,
    showHexData: PropTypes.bool,
    sendNFT: PropTypes.object,
    contact: PropTypes.object,
    isOwnedAccount: PropTypes.bool,
    warning: PropTypes.string,
    error: PropTypes.string,
    gasIsExcessive: PropTypes.bool.isRequired,
  };

  state = {
    gasLoadingError: null,
  };

  componentDidUpdate(prevProps) {
    const { gasLoadingError } = this.props;

    const { gasLoadingError: prefGasLoadingError } = prevProps;

    if (gasLoadingError && prefGasLoadingError !== gasLoadingError) {
      this.setState({
        gasLoadingError,
      });
    }
  }

  updateGas = (updateData) => this.props.updateGas(updateData);

  render() {
    const { warning, error, gasIsExcessive, sendNFT } = this.props;
    return error ? (
      this.renderError()
    ) : (
      <PageContainerContent>
        <div className="send-v2__form">
          {gasIsExcessive && this.renderError(true)}
          {warning && this.renderWarning()}
          {/* {this.maybeRenderAddContact()} */}
          {sendNFT ? <SendNFTRow /> : this.renderAsset()}
          {this.props.showHexData && (
            <SendHexDataRow updateGas={this.updateGas} />
          )}
        </div>
      </PageContainerContent >
    );
  }

  maybeRenderAddContact() {
    const { t } = this.context;
    const {
      isOwnedAccount,
      showAddToAddressBookModal,
      contact = {},
    } = this.props;

    if (isOwnedAccount || contact.name) {
      return null;
    }

    return (
      <Dialog
        type="message"
        className="send__dialog"
        onClick={showAddToAddressBookModal}
      >
        {t('newAccountDetectedDialogMessage')}
      </Dialog>
    );
  }

  renderWarning() {
    const { t } = this.context;
    const { warning } = this.props;

    return (
      <Dialog type="warning" className="send__error-dialog">
        {t(warning)}
      </Dialog>
    );
  }

  renderError(gasError = false) {
    const { t } = this.context;
    const { error } = this.props;

    return (
      <Dialog type="error" className="send__error-dialog">
        {gasError ? t('gasPriceExcessive') : t(error)}
      </Dialog>
    );
  }

  renderGasLoadingError() {
    const { gasLoadingError } = this.state;

    return gasLoadingError ? (
      <div className="confirm-page-container-content__error-container">
        <ErrorMessage errorMessage={gasLoadingError} errorKey={gasLoadingError} />
      </div>
    ) : null;
  }

  renderAsset() {
    return (
      <>
        <SendAssetRow />
        <SendAmountRow updateGas={this.updateGas} />
        <SendGasRow />
        {this.renderGasLoadingError()}
      </>
    );
  }
}

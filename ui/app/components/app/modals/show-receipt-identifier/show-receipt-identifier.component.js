import PropTypes from 'prop-types';
import React, { Component } from 'react';
import copyToClipboard from 'copy-to-clipboard';
import { checksumAddress } from '../../../../helpers/utils/util';
import ReadOnlyInput from '../../../ui/readonly-input';
import Button from '../../../ui/button';
import AccountModalContainer from '../account-modal-container';

export default class ShowReceiptIdentifier extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static defaultProps = {
    previousModalState: null,
  };

  static propTypes = {
    selectedIdentity: PropTypes.object.isRequired,
    showAccountDetailModal: PropTypes.func.isRequired,
    hideModal: PropTypes.func.isRequired,
    hideWarning: PropTypes.func.isRequired,
    clearAccountDetails: PropTypes.func.isRequired,
    previousModalState: PropTypes.string,
  };

  componentWillUnmount() {
    this.props.clearAccountDetails();
    this.props.hideWarning();
  }

  render() {
    const {
      selectedIdentity,
      showAccountDetailModal,
      hideModal,
      previousModalState,
    } = this.props;
    const { name, address, receiptIdentifier } = selectedIdentity;

    return (
      <AccountModalContainer
        className="export-private-key-modal"
        selectedIdentity={selectedIdentity}
        showBackButton={previousModalState === 'ACCOUNT_DETAILS'}
        backButtonAction={() => showAccountDetailModal()}
      >
        <span className="export-private-key-modal__account-name">{name}</span>
        <ReadOnlyInput
          wrapperClass="ellip-address-wrapper"
          value={checksumAddress(address)}
        />
        <div className="export-private-key-modal__divider" />
        <span className="export-private-key-modal__body-title">
          {this.context.t('receiptIdentifier')}
        </span>
        <div className="export-private-key-modal__password">
          <span className="export-private-key-modal__password-label">
            {this.context.t('copyToClipboardOnClick')}
          </span>
          <ReadOnlyInput
            textarea
            wrapperClass="ellip-address-wrapper"
            value={receiptIdentifier}
            onClick={() => copyToClipboard(receiptIdentifier)}
          />
        </div>
        <div className="export-private-key-modal__buttons">
          <Button
            onClick={() => hideModal()}
            type="secondary"
            large
            className="export-private-key-modal__button"
          >
            {this.context.t('done')}
          </Button>
        </div>
      </AccountModalContainer>
    );
  }
}

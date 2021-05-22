import React, { Component } from 'react';
import PropTypes from 'prop-types';
import AccountModalContainer from '../account-modal-container';
import getAccountLink from '../../../../../lib/account-link';
import QrView from '../../../ui/qr-code';
import EditableLabel from '../../../ui/editable-label';
import Button from '../../../ui/button';
import ReadOnlyInput from '../../../ui/readonly-input/readonly-input';

export default class AccountDetailsModal extends Component {
  static propTypes = {
    selectedIdentity: PropTypes.object,
    chainId: PropTypes.string,
    showExportPrivateKeyModal: PropTypes.func,
    setAccountLabel: PropTypes.func,
    keyrings: PropTypes.array,
    rpcPrefs: PropTypes.object,
  };

  static contextTypes = {
    t: PropTypes.func,
  };

  render() {
    const {
      selectedIdentity,
      chainId,
      showExportPrivateKeyModal,
      setAccountLabel,
      keyrings,
      rpcPrefs,
    } = this.props;
    const { name, address, receiptIdentifier } = selectedIdentity;

    const keyring = keyrings.find((kr) => {
      return kr.accounts.includes(address);
    });

    let exportPrivateKeyFeatureEnabled = true;
    // This feature is disabled for hardware wallets
    if (keyring?.type?.search('Hardware') !== -1) {
      exportPrivateKeyFeatureEnabled = false;
    }

    let showReceiptIdentifier = false;
    // This feature is enabled for HD Key Tree wallets
    if (keyring?.type?.search('HD Key Tree') !== -1) {
      showReceiptIdentifier = true;
    }

    return (
      <AccountModalContainer className="account-details-modal">
        <EditableLabel
          className="account-details-modal__name"
          defaultValue={name}
          onSubmit={(label) => setAccountLabel(address, label)}
        />

        <QrView
          Qr={{
            data: address,
          }}
        />

        <div className="account-details-modal__divider" />
        {showReceiptIdentifier ? (
          <>
            <div className="editable-label__value">
              {this.context.t('receiptIdentifier')}
            </div>

            <ReadOnlyInput
              wrapperClass="ellip-address-wrapper"
              value={receiptIdentifier}
            />
          </>
        ) : null}


        <Button
          type="secondary"
          className="account-details-modal__button"
          onClick={() => {
            global.platform.openTab({
              url: getAccountLink(address, chainId, rpcPrefs),
            });
          }}
        >
          {rpcPrefs.blockExplorerUrl
            ? this.context.t('blockExplorerView', [
              rpcPrefs.blockExplorerUrl.match(/^https?:\/\/(.+)/u)[1],
            ])
            : this.context.t('viewOnEtherscan')}
        </Button>

        {exportPrivateKeyFeatureEnabled ? (
          <Button
            type="secondary"
            className="account-details-modal__button"
            onClick={() => showExportPrivateKeyModal()}
          >
            {this.context.t('exportPrivateKey')}
          </Button>
        ) : null}
      </AccountModalContainer>
    );
  }
}

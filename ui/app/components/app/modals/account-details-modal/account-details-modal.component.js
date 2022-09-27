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
    showPublicKeyModal: PropTypes.func,
    showReceiptIdentiferModal: PropTypes.func,
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
      showPublicKeyModal,
      showReceiptIdentiferModal,
      showExportPrivateKeyModal,
      setAccountLabel,
      keyrings,
      rpcPrefs,
    } = this.props;
    const { name, address } = selectedIdentity;

    const keyring = keyrings.find((kr) => {
      return kr.accounts.includes(address);
    });

    let exportPrivateKeyFeatureEnabled = true;
    // This feature is disabled for hardware wallets
    if (keyring?.type?.search('Hardware') !== -1) {
      exportPrivateKeyFeatureEnabled = false;
    }

    return (
      <AccountModalContainer className="account-details-modal">
        <EditableLabel
          className="account-details-modal__name"
          defaultValue={name}
          onSubmit={(label) => setAccountLabel(address, label)}
        />
        {
          rpcPrefs.ticker === 'STC' ? (
            <QrView
              Qr={{
                data: address,
              }}
            />
          ) : null
        }
        <Button
          type="secondary"
          className="account-details-modal__button"
          onClick={() => showPublicKeyModal()}
        >
          {this.context.t('viewPublicKey')}
        </Button>
        <Button
          type="secondary"
          className="account-details-modal__button"
          onClick={() => showReceiptIdentiferModal()}
        >
          {this.context.t('viewReceiptIdengifier')}
        </Button>
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
              rpcPrefs.blockExplorerUrl.match(/^https?:\/\/(.+)\//u)[1],
            ])
            : this.context.t('viewOnStcscan')}
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

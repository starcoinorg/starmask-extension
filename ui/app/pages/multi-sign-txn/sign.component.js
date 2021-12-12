import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { utils, encoding } from '@starcoin/starcoin';
import copyToClipboard from 'copy-to-clipboard';
import ReadOnlyInput from '../../components/ui/readonly-input';
import Dropdown from '../../components/ui/dropdown';
// Subviews
import JsonImportView from '../create-account/import-account/json';
import TxnHexImportView from './txn-hex';

export default class MultiSignTxnSign extends Component {
  static defaultProps = {
    newAccountNumber: 0,
  };

  state = {
    number: 3,
    threshold: 2,
    localAccount: {},
    externalPublicKeys: {},
    type: this.context.t('multiSignTxnHex'),
    newAccountName: '',
    defaultAccountName: this.context.t('newAccountNumberName', [
      '',
      this.props.newAccountNumber,
    ]),
  };

  generatePublicKey() {
    const privateKey = utils.account.generatePrivateKey();
    encoding.privateKeyToPublicKey(privateKey).then((publicKey) => {
      const localAccount = {
        privateKey,
        publicKey,
      };
      this.setState({ localAccount });
    });
  }

  getMenuItemTexts() {
    return [this.context.t('multiSignTxnHex'), this.context.t('binaryFile')];
  }

  renderImportView() {
    const { type } = this.state;
    const menuItems = this.getMenuItemTexts();
    const current = type || menuItems[0];

    switch (current) {
      case this.context.t('multiSignTxnHex'):
        return <TxnHexImportView />;
      case this.context.t('binaryFile'):
        return <JsonImportView />;
      default:
        return <JsonImportView />;
    }
  }

  render() {
    const menuItems = this.getMenuItemTexts();
    const { type } = this.state;

    return (
      <div className="new-account-create-form">
        <div className="new-account-import-form">
          <div className="new-account-import-form__select-section">
            <div className="new-account-import-form__select-label">
              {this.context.t('selectType')}
            </div>
            <Dropdown
              className="new-account-import-form__select"
              options={menuItems.map((text) => ({ value: text }))}
              selectedOption={type || menuItems[0]}
              onChange={(value) => {
                this.setState({ type: value });
              }}
            />
          </div>
          {this.renderImportView()}
        </div>
      </div>
    );
  }
}

MultiSignTxnSign.propTypes = {
  createAccount: PropTypes.func,
  createMultiSignAccount: PropTypes.func,
  newAccountNumber: PropTypes.number,
  history: PropTypes.object,
  mostRecentOverviewPage: PropTypes.string.isRequired,
};

MultiSignTxnSign.contextTypes = {
  t: PropTypes.func,
  metricsEvent: PropTypes.func,
};

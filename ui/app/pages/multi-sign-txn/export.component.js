import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { utils, encoding } from '@starcoin/starcoin';
import copyToClipboard from 'copy-to-clipboard';
import ReadOnlyInput from '../../components/ui/readonly-input';
import Dropdown from '../../components/ui/dropdown';
import Button from '../../components/ui/button';

export default class MultiSignTxnExport extends Component {
  static defaultProps = {
    newAccountNumber: 0,
  };

  state = {
    number: 3,
    threshold: 2,
    localAccount: {},
    externalPublicKeys: {},
    type: this.context.t('normalAccount'),
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
    return [
      this.context.t('normalAccount'),
      this.context.t('multiSignAccount'),
    ];
  }

  renderMultiSign() {
    const { number, threshold } = this.state;
    const contents = [];
    contents.push(
      <div key="0">
        <div className="new-account-create-form__input-label">
          {this.context.t('accountsNumber')}
          <input
            className="new-account-create-form__input new-account-create-form__input-threshold"
            value={number}
            placeholder="3"
            onChange={(event) => this.setState({ number: event.target.value })}
          />
          &nbsp;&nbsp;&nbsp;&nbsp;{this.context.t('threshold')}
          <input
            className="new-account-create-form__input new-account-create-form__input-threshold"
            value={threshold}
            placeholder="2"
            onChange={(event) =>
              this.setState({ threshold: event.target.value })
            }
          />
        </div>
      </div>,
    );
    contents.push(
      <div key="1">
        <div className="new-account-create-form__input-label">
          {`${this.context.t('localTemp')}${this.context.t('publicKey')} 1 (${this.context.t('copyToClipboardOnClick')})`}
        </div>
        <div>
          <ReadOnlyInput
            textarea
            wrapperClass="ellip-address-wrapper"
            value={this.state.localAccount.publicKey}
            onClick={() => copyToClipboard(this.state.localAccount.publicKey)}
          />
        </div>
      </div>,
    );
    for (let i = 1; i < number; i++) {
      const index = i + 1;
      contents.push(
        <div key={index}>
          <div className="new-account-create-form__input-label">
            {this.context.t('externalTemp')}
            {this.context.t('publicKey')}&nbsp;{index}
          </div>
          <div>
            <textarea
              rows="2"
              className="new-account-create-form__input-publicKey"
              value={this.state.externalPublicKeys[i] || ''}
              placeholder=""
              onChange={(event) => {
                const externalPublicKeys = {
                  ...this.state.externalPublicKeys,
                  [i]: event.target.value,
                };
                this.setState({ externalPublicKeys });
              }}
            />
          </div>
        </div>,
      );
    }
    return contents;
  }

  render() {
    const menuItems = this.getMenuItemTexts();
    const {
      newAccountName,
      defaultAccountName,
      type,
      externalPublicKeys,
      localAccount,
      threshold,
    } = this.state;
    const {
      history,
      createAccount,
      createMultiSignAccount,
      mostRecentOverviewPage,
    } = this.props;
    const createClick = (_) => {
      if (type === this.context.t('normalAccount')) {
        createAccount(newAccountName || defaultAccountName)
          .then(() => {
            this.context.metricsEvent({
              eventOpts: {
                category: 'Accounts',
                action: 'Add New Account',
                name: 'Added New Account',
              },
            });
            history.push(mostRecentOverviewPage);
          })
          .catch((e) => {
            this.context.metricsEvent({
              eventOpts: {
                category: 'Accounts',
                action: 'Add New Account',
                name: 'Error',
              },
              customVariables: {
                errorMessage: e.message,
              },
            });
          });
      } else {
        const publicKeys = Object.values(externalPublicKeys);
        const privateKeys = [localAccount.privateKey];

        const accountName = newAccountName || defaultAccountName;
        const args = { privateKeys, publicKeys, threshold };
        createMultiSignAccount(accountName, args)
          .then(() => {
            this.context.metricsEvent({
              eventOpts: {
                category: 'Accounts',
                action: 'Add New Account',
                name: 'Added New Account',
              },
            });
            history.push(mostRecentOverviewPage);
          })
          .catch((e) => {
            this.context.metricsEvent({
              eventOpts: {
                category: 'Accounts',
                action: 'Add New Account',
                name: 'Error',
              },
              customVariables: {
                errorMessage: e.message,
              },
            });
          });
      }
    };

    return (
      <div className="new-account-create-form">
        <div className="new-account-create-form__select-section">
          <div className="new-account-import-form__select-label">
            {this.context.t('selectType')}
          </div>
          <Dropdown
            className="new-account-import-form__select"
            options={menuItems.map((text) => ({ value: text }))}
            selectedOption={type || menuItems[0]}
            onChange={(value) => {
              const _defaultAccountName = this.context.t(
                'newAccountNumberName',
                [
                  value === menuItems[0] ? '' : this.context.t('multiSign'),
                  this.props.newAccountNumber,
                ],
              );
              if (!this.state.localAccount.publicKey) {
                this.generatePublicKey();
              }
              this.setState({
                type: value,
                defaultAccountName: _defaultAccountName,
              });
            }}
          />
        </div>
        <div className="new-account-create-form__input-label">
          {this.context.t('accountName')}
        </div>
        <div>
          <input
            className="new-account-create-form__input"
            value={newAccountName}
            placeholder={defaultAccountName}
            onChange={(event) =>
              this.setState({ newAccountName: event.target.value })
            }
            autoFocus
          />
          {type === menuItems[1] ? this.renderMultiSign() : null}
          <div className="new-account-create-form__buttons">
            <Button
              type="default"
              large
              className="new-account-create-form__button"
              onClick={() => history.push(mostRecentOverviewPage)}
            >
              {this.context.t('cancel')}
            </Button>
            <Button
              type="secondary"
              large
              className="new-account-create-form__button"
              onClick={createClick}
            >
              {this.context.t('create')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

MultiSignTxnExport.propTypes = {
  createAccount: PropTypes.func,
  createMultiSignAccount: PropTypes.func,
  newAccountNumber: PropTypes.number,
  history: PropTypes.object,
  mostRecentOverviewPage: PropTypes.string.isRequired,
};

MultiSignTxnExport.contextTypes = {
  t: PropTypes.func,
  metricsEvent: PropTypes.func,
};

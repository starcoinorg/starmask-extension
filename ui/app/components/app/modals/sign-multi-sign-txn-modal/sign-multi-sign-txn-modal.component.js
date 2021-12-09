import PropTypes from 'prop-types';
import React, { Component } from 'react';
import log from 'loglevel';
import { checksumAddress } from '../../../../helpers/utils/util';
import ReadOnlyInput from '../../../ui/readonly-input';
import AccountModalContainer from '../account-modal-container';
import { CONFIRM_TRANSACTION_ROUTE } from '../../../../helpers/constants/routes';
import Dropdown from '../../../ui/dropdown';
// Subviews
import JsonImportView from '../../../../pages/create-account/import-account/json';
import TxnHexImportView from './txn-hex';

export default class SignMultiSignTxn extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static defaultProps = {
    previousModalState: null,
  };

  static propTypes = {
    history: PropTypes.object,
    selectedIdentity: PropTypes.object.isRequired,
    showAccountDetailModal: PropTypes.func.isRequired,
    hideWarning: PropTypes.func.isRequired,
    clearAccountDetails: PropTypes.func.isRequired,
    txId: PropTypes.number,
    previousModalState: PropTypes.string,
    getAutoAcceptToken: PropTypes.func.isRequired,
  };

  state = {
    autoAcceptToken: false,
  };

  componentDidMount() {
    const { selectedIdentity, getAutoAcceptToken } = this.props;
    const { address } = selectedIdentity;

    getAutoAcceptToken(address)
      .then((autoAcceptToken) => {
        this.setState({
          autoAcceptToken,
        });
      })
      .catch((e) => log.error(e));
  }

  componentWillUnmount() {
    this.props.clearAccountDetails();
    this.props.hideWarning();
  }

  UNSAFE_componentWillReceiveProps(nextProps, _) {
    const { history, txId } = this.props;

    if (nextProps.txId > 0 && !txId) {
      history.push(CONFIRM_TRANSACTION_ROUTE);
    }
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
    const {
      selectedIdentity,
      showAccountDetailModal,
      previousModalState,
    } = this.props;
    const { name, address } = selectedIdentity;
    const { autoAcceptToken } = this.state;
    const menuItems = this.getMenuItemTexts();
    const { type } = this.state;
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
      </AccountModalContainer>
    );
  }
}

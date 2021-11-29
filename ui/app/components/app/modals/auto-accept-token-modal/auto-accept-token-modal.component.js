import PropTypes from 'prop-types';
import React, { Component } from 'react';
import log from 'loglevel';
import { checksumAddress } from '../../../../helpers/utils/util';
import ReadOnlyInput from '../../../ui/readonly-input';
import ToggleButton from '../../../ui/toggle-button';
import AccountModalContainer from '../account-modal-container';
import { CONFIRM_TRANSACTION_ROUTE } from '../../../../helpers/constants/routes';

export default class AutoAcceptToken extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static defaultProps = {
    previousModalState: null,
  };

  static propTypes = {
    isLoading: PropTypes.bool,
    history: PropTypes.object,
    selectedIdentity: PropTypes.object.isRequired,
    showAccountDetailModal: PropTypes.func.isRequired,
    hideWarning: PropTypes.func.isRequired,
    clearAccountDetails: PropTypes.func.isRequired,
    txId: PropTypes.number,
    previousModalState: PropTypes.string,
    getAutoAcceptToken: PropTypes.func.isRequired,
    setAutoAcceptToken: PropTypes.func.isRequired,
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

  render() {
    const {
      selectedIdentity,
      showAccountDetailModal,
      previousModalState,
      setAutoAcceptToken,
      isLoading,
    } = this.props;
    const { name, address } = selectedIdentity;
    const { autoAcceptToken } = this.state;

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
          {this.context.t('AutoAcceptToken')}
        </span>
        <span className="export-private-key-modal__password-label export-private-key-modal__desc-label">
          {this.context.t('AutoAcceptTokenDescription')}
        </span>
        {isLoading ? (
          'Loading...'
        ) : (
          <ToggleButton
            value={autoAcceptToken}
            onToggle={(value) => {
              this.setState({ autoAcceptToken: !value });
              setAutoAcceptToken(!value, address);
            }}
            offLabel={this.context.t('off')}
            onLabel={this.context.t('on')}
          />
        )}
      </AccountModalContainer>
    );
  }
}

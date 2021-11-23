import PropTypes from 'prop-types';
import React, { Component } from 'react';
import copyToClipboard from 'copy-to-clipboard';
import log from 'loglevel';
import { checksumAddress } from '../../../../helpers/utils/util';
import ReadOnlyInput from '../../../ui/readonly-input';
import ToggleButton from '../../../ui/toggle-button';
import Button from '../../../ui/button';
import AccountModalContainer from '../account-modal-container';

export default class AutoAcceptToken extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static defaultProps = {
    previousModalState: null,
  };

  static propTypes = {
    selectedIdentity: PropTypes.object.isRequired,
    showAccountDetailModal: PropTypes.func.isRequired,
    hideWarning: PropTypes.func.isRequired,
    clearAccountDetails: PropTypes.func.isRequired,
    previousModalState: PropTypes.string,
    getAutoAcceptToken: PropTypes.func.isRequired,
    setAutoAcceptToken: PropTypes.func.isRequired,
  };

  state = {
    autoAcceptToken: false,
  };

  componentDidMount() {
    // const { getAutoAcceptToken } = this.props;
    // getAutoAcceptToken()
    //   .then((autoAcceptToken) =>
    //     this.setState({
    //       autoAcceptToken,
    //     }),
    //   )
    //   .catch((e) => log.error(e));
  }

  componentWillUnmount() {
    this.props.clearAccountDetails();
    this.props.hideWarning();
  }

  render() {
    const {
      selectedIdentity,
      showAccountDetailModal,
      previousModalState,
      setAutoAcceptToken,
    } = this.props;
    const { name, address } = selectedIdentity;

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
        <ToggleButton
          value={this.state.autoAcceptToken}
          onToggle={(value) => setAutoAcceptToken(!value)}
          offLabel={this.context.t('off')}
          onLabel={this.context.t('on')}
        />
      </AccountModalContainer>
    );
  }
}

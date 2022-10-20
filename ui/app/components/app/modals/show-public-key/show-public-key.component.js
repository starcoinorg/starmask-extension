import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import copyToClipboard from 'copy-to-clipboard';
import log from 'loglevel';
import { checksumAddress } from '../../../../helpers/utils/util';
import ReadOnlyInput from '../../../ui/readonly-input';
import Button from '../../../ui/button';
import AccountModalContainer from '../account-modal-container';
import {
  getTickerForCurrentProvider,
} from '../../../../selectors';
class ShowPublicKey extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static defaultProps = {
    previousModalState: null,
  };

  static propTypes = {
    selectedIdentity: PropTypes.object.isRequired,
    showAccountDetailModal: PropTypes.func.isRequired,
    getPublicKeyFor: PropTypes.func.isRequired,
    hideModal: PropTypes.func.isRequired,
    hideWarning: PropTypes.func.isRequired,
    clearAccountDetails: PropTypes.func.isRequired,
    previousModalState: PropTypes.string,
    ticker: PropTypes.string,
  };

  state = {
    publicKey: '',
  };

  componentDidMount() {
    const { selectedIdentity, getPublicKeyFor } = this.props;
    const { address } = selectedIdentity;
    getPublicKeyFor(address)
      .then((publicKey) =>
        this.setState({
          publicKey,
        }),
      )
      .catch((e) => log.error(e));
  }

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
      ticker,
    } = this.props;
    const { name, address } = selectedIdentity;
    const checksummedAddress = ticker === 'APT' ? address : checksumAddress(address);

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
          value={checksummedAddress}
        />
        <div className="export-private-key-modal__divider" />
        <span className="export-private-key-modal__body-title">
          {this.context.t('publicKey')}
        </span>
        <div className="export-private-key-modal__password">
          <span className="export-private-key-modal__password-label">
            {this.context.t('copyToClipboardOnClick')}
          </span>
          <ReadOnlyInput
            textarea
            wrapperClass="ellip-address-wrapper"
            value={this.state.publicKey}
            onClick={() => copyToClipboard(this.state.publicKey)}
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

function mapStateToProps(state) {
  return {
    ticker: getTickerForCurrentProvider(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(ShowPublicKey);
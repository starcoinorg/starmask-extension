import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { connect, useSelector } from 'react-redux';
import log from 'loglevel';
import { getCurrentKeyring } from '../../selectors';
import * as actions from '../../store/actions';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import { getMetaMaskAccounts } from '../../selectors';
import Button from '../../components/ui/button';
import TextField from '../../components/ui/text-field';

class TxnHexImportView extends Component {
  static contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
  };

  static propTypes = {
    signMultiSignTransaction: PropTypes.func.isRequired,
    history: PropTypes.object.isRequired,
    displayWarning: PropTypes.func.isRequired,
    hideModal: PropTypes.func.isRequired,
    setSelectedAddress: PropTypes.func.isRequired,
    firstAddress: PropTypes.string.isRequired,
    isMultiSign: PropTypes.bool.isRequired,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    error: PropTypes.node,
  };

  state = { txnHex: '', isEmpty: true };

  componentDidMount() {
    const { hideWarning } = this.props;
    hideWarning();
  }

  signMultiSignTxn() {
    const { txnHex } = this.state;
    const {
      history,
      mostRecentOverviewPage,
      // hideModal,
      isMultiSign,
      signMultiSignTransaction,
      displayWarning,
    } = this.props;

    // hide multiSign page
    setTimeout(() => {
      const { error } = this.props;
      if (!error) {
        history.push(mostRecentOverviewPage)
      }
    }, 1000);

    signMultiSignTransaction(txnHex)
      .then(() => {
        displayWarning(null);
      }).catch((err) => err && displayWarning(err.message || err));


  }

  signTxnOnEnter = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.signMultiSignTxn();
    }
  };

  checkInputEmpty(value) {
    const { hideWarning } = this.props;
    hideWarning();
    const txnHex = value.trim();
    let isEmpty = true;
    if (txnHex !== '') {
      isEmpty = false;
    }
    this.setState({ txnHex, isEmpty });
  }

  render() {
    const { error, history, mostRecentOverviewPage } = this.props;
    console.log({ error })
    const { txnHex } = this.state;
    return (
      <div className="new-account-import-form__private-key">
        <span className="new-account-create-form__instruction">
          {this.context.t('pasteTxnHex')}
        </span>
        <div className="new-account-import-form__private-key-password-container">
          <TextField
            id="custom-nft-meta"
            type="text"
            value={txnHex}
            onKeyPress={(e) => this.signTxnOnEnter(e)}
            onChange={(e) => this.checkInputEmpty(e.target.value)}
            fullWidth
            margin="normal"
            multiline
            rows="5"
            classes={{
              inputMultiline: 'address-book__view-contact__text-area',
              inputRoot: 'address-book__view-contact__text-area-wrapper',
            }}
          />
        </div>
        <div className="new-account-import-form__buttons">
          <Button
            type="default"
            className="new-account-create-form__button"
            onClick={() => history.push(mostRecentOverviewPage)}
          >
            {this.context.t('cancel')}
          </Button>
          <Button
            type="secondary"
            className="new-account-create-form__button"
            onClick={() => this.signMultiSignTxn()}
            disabled={this.state.isEmpty}
          >
            {this.context.t('sign')}
          </Button>
        </div>
        {error ? <span className="error">{error}</span> : null}
      </div>
    );
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(TxnHexImportView);

function mapStateToProps(state) {
  const keyring = getCurrentKeyring(state);
  const isMultiSign = keyring.type === 'Multi Sign';
  return {
    error: state.appState.warning,
    firstAddress: Object.keys(getMetaMaskAccounts(state))[0],
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
    isMultiSign
  };
}

function mapDispatchToProps(dispatch) {
  return {
    hideModal: () => {
      dispatch(actions.hideModal());
    },
    importNewAccount: (strategy, [privateKey]) => {
      return dispatch(actions.importNewAccount(strategy, [privateKey]));
    },
    displayWarning: (message) =>
      dispatch(actions.displayWarning(message || null)),
    hideWarning: () =>
      dispatch(actions.hideWarning()),
    setSelectedAddress: (address) =>
      dispatch(actions.setSelectedAddress(address)),
    signMultiSignTransaction: (txnHex) => {
      return dispatch(actions.signMultiSignTransaction(txnHex));
    }
  };
}

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import { connect } from 'react-redux';
import FileInput from 'react-simple-file-input';
import { ethers } from 'ethers';
const { hexlify } = ethers.utils;
import * as actions from '../../store/actions';
import { getMetaMaskAccounts } from '../../selectors';
import Button from '../../components/ui/button';
import { getMostRecentOverviewPage } from '../../ducks/history/history';

class TxnFileImportSubview extends Component {
    state = {
        fileContents: '',
    };

    inputRef = React.createRef();

    componentDidMount() {
        const { hideWarning } = this.props;
        hideWarning();
    }

    render() {
        const { error, history, mostRecentOverviewPage } = this.props;
        const enabled = this.state.fileContents !== '';

        return (
            <div className="new-account-import-form__json">
                <p>{this.context.t('usedByClients')}</p>
                <FileInput
                    readAs='buffer'
                    onLoad={this.onLoad.bind(this)}
                    style={{
                        padding: '20px 0px 12px 15%',
                        fontSize: '15px',
                        display: 'flex',
                        justifyContent: 'center',
                        width: '100%',
                    }}
                />
                <div className="new-account-create-form__buttons">
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
                        onClick={() => this.signTxnFile()}
                        disabled={!enabled}
                    >
                        {this.context.t('sign')}
                    </Button>
                </div>
                {error ? <span className="error">{error}</span> : null}
            </div>
        );
    }

    onLoad(event) {
        const { hideWarning } = this.props;
        hideWarning();
        this.setState({
            fileContents: event.target.result,
        });
    }

    signTxnFile() {
        const {
            firstAddress,
            displayWarning,
            history,
            signMultiSignTransaction,
            mostRecentOverviewPage,
            setSelectedAddress,
        } = this.props;
        const { fileContents } = this.state;

        if (!fileContents) {
            const message = this.context.t('needImportFile');
            displayWarning(message);
            return;
        }

        const txnUint8Array = new Uint8Array(fileContents)
        const txnHex = hexlify(txnUint8Array)
        console.log('signTxnFile', { fileContents, txnHex })

        // hide multiSign page
        setTimeout(() => {
            const { error } = this.props;
            if (!error) {
                history.push(mostRecentOverviewPage)
            }
        }, 500);

        signMultiSignTransaction(txnHex)
            .then(() => {
                displayWarning(null);
            }).catch((err) => err && displayWarning(err.message || err));
    }
}

TxnFileImportSubview.propTypes = {
    error: PropTypes.string,
    displayWarning: PropTypes.func,
    firstAddress: PropTypes.string,
    signMultiSignTransaction: PropTypes.func,
    history: PropTypes.object,
    setSelectedAddress: PropTypes.func,
    mostRecentOverviewPage: PropTypes.string.isRequired,
};

const mapStateToProps = (state) => {
    return {
        error: state.appState.warning,
        firstAddress: Object.keys(getMetaMaskAccounts(state))[0],
        mostRecentOverviewPage: getMostRecentOverviewPage(state),
    };
};

const mapDispatchToProps = (dispatch) => {
    return {
        displayWarning: (warning) => dispatch(actions.displayWarning(warning)),
        hideWarning: () => dispatch(actions.hideWarning()),
        importNewJsonAccount: (options) =>
            dispatch(actions.importNewAccount('JSON File', options)),
        setSelectedAddress: (address) =>
            dispatch(actions.setSelectedAddress(address)),
        signMultiSignTransaction: (txnHex) => {
            return dispatch(actions.signMultiSignTransaction(txnHex));
        }
    };
};

TxnFileImportSubview.contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
};

export default compose(
    withRouter,
    connect(mapStateToProps, mapDispatchToProps),
)(TxnFileImportSubview);

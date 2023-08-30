import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import log from 'loglevel';
import { isValidAddress } from '@starcoin-org/stc-util';
import { isValidReceipt } from '../../helpers/utils/util';
import {
  getAmountErrorObject,
  getGasFeeErrorObject,
  getToAddressForGasUpdate,
  doesAmountErrorRequireUpdate,
} from './send.utils';
import {
  getToWarningObject,
  getToErrorObject,
} from './send-content/add-recipient/add-recipient';
import SendHeader from './send-header';
import AddRecipient from './send-content/add-recipient';
import SendContent from './send-content';
import SendFooter from './send-footer';
import EnsInput from './send-content/add-recipient/ens-input';
import {
  INVALID_RECIPIENT_ADDRESS_ERROR,
  KNOWN_RECIPIENT_ADDRESS_ERROR,
  CONTRACT_ADDRESS_ERROR,
  RECIPIENT_ACCOUNT_NOT_ACCEPT_TOKEN_ERROR,
  RECIPIENT_ACCOUNT_NOT_REGISTER_TOKEN_ERROR,
  RECIPIENT_ACCOUNT_NOT_ADD_NFT_GALLERY_ERROR,
} from './send.constants';

export default class SendTransactionScreen extends Component {
  static propTypes = {
    addressBook: PropTypes.arrayOf(PropTypes.object),
    amount: PropTypes.string,
    blockGasLimit: PropTypes.string,
    conversionRate: PropTypes.number,
    editingTransactionId: PropTypes.string,
    getAutoAcceptToken: PropTypes.func.isRequired,
    checkIsAcceptToken: PropTypes.func.isRequired,
    checkIsAddNFTGallery: PropTypes.func.isRequired,
    fetchBasicGasEstimates: PropTypes.func.isRequired,
    from: PropTypes.object,
    gasLimit: PropTypes.string,
    gasPrice: PropTypes.string,
    gasTotal: PropTypes.string,
    history: PropTypes.object,
    chainId: PropTypes.string,
    primaryCurrency: PropTypes.string,
    resetSendState: PropTypes.func.isRequired,
    selectedAddress: PropTypes.string,
    sendNFT: PropTypes.object,
    sendToken: PropTypes.object,
    showHexData: PropTypes.bool,
    to: PropTypes.string,
    ticker: PropTypes.string,
    toReceiptIdentifier: PropTypes.string,
    toNickname: PropTypes.string,
    tokens: PropTypes.array,
    tokenBalance: PropTypes.string,
    assets: PropTypes.object,
    updateAndSetGasLimit: PropTypes.func.isRequired,
    updateSendEnsResolution: PropTypes.func.isRequired,
    updateSendEnsResolutionError: PropTypes.func.isRequired,
    updateSendErrors: PropTypes.func.isRequired,
    updateSendTo: PropTypes.func.isRequired,
    updateSendTokenBalance: PropTypes.func.isRequired,
    updateToNicknameIfNecessary: PropTypes.func.isRequired,
    scanQrCode: PropTypes.func.isRequired,
    qrCodeDetected: PropTypes.func.isRequired,
    qrCodeData: PropTypes.object,
    sendTokenAddress: PropTypes.string,
    gasIsExcessive: PropTypes.bool.isRequired,
    gasPriceIsExtendMax: PropTypes.bool.isRequired,
    gasLimitIsExtendMax: PropTypes.bool.isRequired,
  };

  static contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
  };

  state = {
    query: '',
    toError: null,
    toWarning: null,
    internalSearch: false,
    validating: false,
  };

  constructor(props) {
    super(props);
    this.dValidate = debounce(this.validate, 1000);
  }

  componentDidUpdate(prevProps) {
    const {
      amount,
      conversionRate,
      from: { address, balance },
      gasTotal,
      chainId,
      primaryCurrency,
      sendToken,
      sendNFT,
      tokenBalance,
      updateSendErrors,
      updateSendTo,
      updateSendTokenBalance,
      assets,
      to,
      ticker,
      toNickname,
      addressBook,
      updateToNicknameIfNecessary,
      qrCodeData,
      qrCodeDetected,
    } = this.props;
    const { toError, toWarning } = this.state;

    let updateGas = false;
    const {
      from: { balance: prevBalance },
      gasTotal: prevGasTotal,
      tokenBalance: prevTokenBalance,
      chainId: prevChainId,
      sendToken: prevSendToken,
      to: prevTo,
    } = prevProps;

    if (to && sendToken && sendToken?.code && to !== prevTo) {
      if (ticker === 'APT') {
        const { checkIsAcceptToken } = this.props;
        checkIsAcceptToken(to, sendToken?.code, ticker).then((isAcceptToken) => {
          if (!isAcceptToken) {
            this.setState({
              toError: RECIPIENT_ACCOUNT_NOT_REGISTER_TOKEN_ERROR,
              validating: false,
            });
          }
        });
      } else if (ticker === 'STC') {
        const { getAutoAcceptToken, checkIsAcceptToken } = this.props;
        // if not AutoAcceptToken and not AcceptToken
        getAutoAcceptToken(to, ticker)
          .then((autoAcceptToken) => {
            if (!autoAcceptToken) {
              checkIsAcceptToken(to, sendToken.code).then((isAcceptToken) => {
                if (!isAcceptToken) {
                  this.setState({
                    toError: RECIPIENT_ACCOUNT_NOT_ACCEPT_TOKEN_ERROR,
                    validating: false,
                  });
                }
              });
            }
          })
          .catch((e) => log.error(e));
      }
    }

    if (to && sendNFT && sendNFT.meta && to !== prevTo) {
      const { checkIsAddNFTGallery } = this.props;
      checkIsAddNFTGallery(to, sendNFT.meta, sendNFT.body)
        .then((isAddNFTGallery) => {
          if (!isAddNFTGallery) {
            this.setState({
              toError: RECIPIENT_ACCOUNT_NOT_ADD_NFT_GALLERY_ERROR,
              validating: false,
            });
          }
        })
        .catch((e) => log.error(e));
      return;
    }

    const uninitialized = [prevBalance, prevGasTotal].every((n) => n === null);
    const amountErrorRequiresUpdate = doesAmountErrorRequireUpdate({
      balance,
      gasTotal,
      prevBalance,
      prevGasTotal,
      prevTokenBalance,
      sendToken,
      tokenBalance,
    });
    if (amountErrorRequiresUpdate) {
      const amountErrorObject = getAmountErrorObject({
        amount,
        balance,
        conversionRate,
        gasTotal,
        primaryCurrency,
        sendToken,
        tokenBalance,
      });
      const gasFeeErrorObject = sendToken
        ? getGasFeeErrorObject({
          balance,
          conversionRate,
          gasTotal,
          primaryCurrency,
          sendToken,
        })
        : { gasFee: null };
      updateSendErrors(Object.assign(amountErrorObject, gasFeeErrorObject));
    }

    if (!uninitialized) {
      if (chainId !== prevChainId && chainId !== undefined) {
        updateSendTokenBalance({
          sendToken,
          assets,
          address,
        });
        updateToNicknameIfNecessary(to, toNickname, addressBook);
        this.props.fetchBasicGasEstimates();
        updateGas = true;
      }
    }

    const prevTokenCode = prevSendToken && prevSendToken.code;
    const sendTokenCode = sendToken && sendToken.code;

    if (sendTokenCode && prevTokenCode !== sendTokenCode) {
      this.updateSendToken();
      this.validate(this.state.query);
      updateGas = true;
    }

    let scannedAddress;
    if (qrCodeData) {
      if (qrCodeData.type === 'address') {
        scannedAddress = qrCodeData.values.address.toLowerCase();
        if (isValidAddress(scannedAddress)) {
          const currentAddress = prevTo?.toLowerCase();
          if (currentAddress !== scannedAddress) {
            updateSendTo(scannedAddress);
            updateGas = true;
            // Clean up QR code data after handling
            qrCodeDetected(null);
          }
        } else {
          scannedAddress = null;
          qrCodeDetected(null);
          this.setState({ toError: INVALID_RECIPIENT_ADDRESS_ERROR });
        }
      }
    }

    if (updateGas) {
      if (scannedAddress) {
        this.updateGas({ to: scannedAddress });
      } else {
        this.updateGas();
      }
    }

    // If selecting STC after selecting a token, clear token related messages.
    if (prevSendToken && !sendToken) {
      let error = toError;
      let warning = toWarning;

      if (toError === CONTRACT_ADDRESS_ERROR) {
        error = null;
      }

      if (toWarning === KNOWN_RECIPIENT_ADDRESS_ERROR) {
        warning = null;
      }

      this.setState({
        toError: error,
        toWarning: warning,
      });
    }
  }

  componentDidMount() {
    this.props.fetchBasicGasEstimates().then(() => {
      this.updateGas();
    });
  }

  UNSAFE_componentWillMount() {
    this.updateSendToken();

    // Show QR Scanner modal  if ?scan=true
    if (window.location.search === '?scan=true') {
      this.props.scanQrCode();

      // Clear the queryString param after showing the modal
      const cleanUrl = window.location.href.split('?')[0];
      window.history.pushState({}, null, `${ cleanUrl }`);
      window.location.hash = '#send';
    }
  }

  componentWillUnmount() {
    this.props.resetSendState();
  }

  onRecipientInputChange = (query) => {
    const { internalSearch } = this.state;

    if (!internalSearch) {
      if (query) {
        this.dValidate(query);
      } else {
        this.dValidate.cancel();
        this.validate(query);
      }
    }

    this.setState({ query, validating: true });
  };

  setInternalSearch(internalSearch) {
    this.setState({ query: '', internalSearch });
  }

  validate(query) {
    const { tokens, sendToken, chainId, sendTokenAddress } = this.props;
    const { internalSearch, toError } = this.state;

    if (!query || internalSearch) {
      this.setState({ toError: '', toWarning: '', validating: false });
      return;
    }

    const toErrorObject = getToErrorObject(query, sendTokenAddress, chainId);
    const toWarningObject = getToWarningObject(query, tokens, sendToken);
    const self = this;
    Promise.resolve(toErrorObject).then((object) => {
      self.setState({
        toError: object.to || toError,
        toWarning: toWarningObject.to,
        validating: false,
      });
    });
  }

  updateSendToken() {
    const {
      from: { address },
      sendToken,
      assets,
      updateSendTokenBalance,
    } = this.props;

    updateSendTokenBalance({
      sendToken,
      assets,
      address,
    });
  }

  updateGas({ to: updatedToAddress, amount: value, data } = {}) {
    const {
      amount,
      blockGasLimit,
      editingTransactionId,
      gasLimit,
      gasPrice,
      selectedAddress,
      sendToken,
      to: currentToAddress,
      toReceiptIdentifier,
      updateAndSetGasLimit,
    } = this.props;

    updateAndSetGasLimit({
      blockGasLimit,
      editingTransactionId,
      gasLimit,
      gasPrice,
      selectedAddress,
      sendToken,
      to: getToAddressForGasUpdate(updatedToAddress, currentToAddress),
      toReceiptIdentifier,
      value: value || amount,
      data,
    });
  }

  render() {
    const { history, to } = this.props;
    const { validating, toError } = this.state;
    let content = null;
    if (!validating) {
      if (to && !toError) {
        content = this.renderSendContent();
      } else {
        content = this.renderAddRecipient();
      }
    }

    return (
      <div className="page-container">
        <SendHeader history={history} />
        {this.renderInput()}
        {content}
      </div>
    );
  }

  renderInput() {
    const { internalSearch, validating, toError } = this.state;
    return (
      <EnsInput
        className="send__to-row"
        scanQrCode={(_) => {
          this.context.metricsEvent({
            eventOpts: {
              category: 'Transactions',
              action: 'Edit Screen',
              name: 'Used QR scanner',
            },
          });
          this.props.scanQrCode();
        }}
        onChange={this.onRecipientInputChange}
        onValidAddressTyped={(address) => this.props.updateSendTo(address, '')}
        onPaste={(text) => {
          if (isValidReceipt(text)) {
            // TODO: should check address existing first
            this.props.updateSendTo(text) && this.updateGas();
          }
        }}
        onReset={() => this.props.updateSendTo('', '')}
        updateEnsResolution={this.props.updateSendEnsResolution}
        updateEnsResolutionError={this.props.updateSendEnsResolutionError}
        internalSearch={internalSearch}
        validating={validating}
        toError={toError}
      />
    );
  }

  renderAddRecipient() {
    const { toError, toWarning, validating } = this.state;
    return (
      <AddRecipient
        updateGas={({ to, amount, data } = {}) =>
          this.updateGas({ to, amount, data })
        }
        query={this.state.query}
        toError={toError}
        toWarning={toWarning}
        validating={validating}
        setInternalSearch={(internalSearch) =>
          this.setInternalSearch(internalSearch)
        }
      />
    );
  }

  renderSendContent() {
    const { history, showHexData, gasIsExcessive, gasPriceIsExtendMax, gasLimitIsExtendMax, sendNFT, sendToken } = this.props;
    const { toWarning, toError } = this.state;

    return [
      <SendContent
        key="send-content"
        updateGas={({ to, amount, data } = {}) =>
          this.updateGas({ to, amount, data })
        }
        showHexData={showHexData}
        warning={toWarning}
        error={toError}
        gasIsExcessive={gasIsExcessive}
        gasPriceIsExtendMax={gasPriceIsExtendMax}
        gasLimitIsExtendMax={gasLimitIsExtendMax}
        sendNFT={sendNFT}
      />,
      <SendFooter key="send-footer" history={history} />,
    ];
  }
}

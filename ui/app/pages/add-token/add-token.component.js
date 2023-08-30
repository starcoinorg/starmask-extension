import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import {
  getTickerForCurrentProvider,
} from '../../selectors';
import { isValidAddress, isValidChecksumAddress } from '@starcoin-org/stc-util';
import contractMap from '@starcoin-org/contract-metadata';

import { checkExistingCodes } from '../../helpers/utils/util';
import { tokenInfoGetter } from '../../helpers/utils/token-util';
import { CONFIRM_ADD_TOKEN_ROUTE } from '../../helpers/constants/routes';
import TextField from '../../components/ui/text-field';
import PageContainer from '../../components/ui/page-container';
import { Tabs, Tab } from '../../components/ui/tabs';
import TokenList from './token-list';
import TokenSearch from './token-search';

const MIN_DECIMAL_VALUE = 0;
const MAX_DECIMAL_VALUE = 18;

class AddToken extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    history: PropTypes.object,
    setPendingTokens: PropTypes.func,
    pendingTokens: PropTypes.object,
    clearPendingTokens: PropTypes.func,
    tokens: PropTypes.array,
    currentAssetsTokens: PropTypes.array,
    identities: PropTypes.object,
    showSearchTab: PropTypes.bool.isRequired,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    ticker: PropTypes.string,
  };

  state = {
    customCode: '',
    customSymbol: '',
    customDecimals: 0,
    searchResults: [],
    selectedTokens: {},
    tokenSelectorError: null,
    customCodeError: null,
    customSymbolError: null,
    customDecimalsError: null,
    autoFilled: false,
    forceEditSymbol: false,
  };

  componentDidMount() {
    this.tokenInfoGetter = tokenInfoGetter();
    const { pendingTokens = {} } = this.props;
    const pendingTokenKeys = Object.keys(pendingTokens);

    if (pendingTokenKeys.length > 0) {
      let selectedTokens = {};
      let customToken = {};

      pendingTokenKeys.forEach((tokenCode) => {
        const token = pendingTokens[tokenCode];
        const { isCustom } = token;

        if (isCustom) {
          customToken = { ...token };
        } else {
          selectedTokens = { ...selectedTokens, [tokenCode]: { ...token } };
        }
      });

      const {
        code: customCode = '',
        symbol: customSymbol = '',
        decimals: customDecimals = 0,
      } = customToken;

      this.setState({
        selectedTokens,
        customCode,
        customSymbol,
        customDecimals,
      });
    }
  }

  handleToggleToken(token) {
    const { code } = token;
    const { selectedTokens = {} } = this.state;
    const selectedTokensCopy = { ...selectedTokens };

    if (code in selectedTokensCopy) {
      delete selectedTokensCopy[code];
    } else {
      selectedTokensCopy[code] = token;
    }

    this.setState({
      selectedTokens: selectedTokensCopy,
      tokenSelectorError: null,
    });
  }

  hasError() {
    const {
      tokenSelectorError,
      customCodeError,
      customSymbolError,
      customDecimalsError,
    } = this.state;

    return (
      tokenSelectorError ||
      customCodeError ||
      customSymbolError ||
      customDecimalsError
    );
  }

  hasSelected() {
    const { customCode = '', selectedTokens = {} } = this.state;
    return customCode || Object.keys(selectedTokens).length > 0;
  }

  handleNext() {
    if (this.hasError()) {
      return;
    }

    if (!this.hasSelected()) {
      this.setState({ tokenSelectorError: this.context.t('mustSelectOne') });
      return;
    }

    const { setPendingTokens, history } = this.props;
    const {
      customCode: code,
      customSymbol: symbol,
      customDecimals: decimals,
      selectedTokens,
    } = this.state;

    let logo;
    if (contractMap[code]) {
      logo = contractMap[code].logo;
    }

    const customToken = {
      code,
      symbol,
      decimals,
      logo,
    };

    setPendingTokens({ customToken, selectedTokens });
    history.push(CONFIRM_ADD_TOKEN_ROUTE);
  }

  async attemptToAutoFillTokenParams(code) {
    const { ticker } = this.props
    const { symbol = '', decimals = 0 } = await this.tokenInfoGetter(code, ticker);

    const autoFilled = Boolean(symbol && decimals);
    this.setState({ autoFilled });
    this.handleCustomSymbolChange(symbol || '');
    this.handleCustomDecimalsChange(decimals);
  }

  handleCustomCodeChange(value) {
    let customCode = value.trim();
    let isValidCode = false
    if (customCode.includes('<') && customCode.endsWith('>')) {
      isValidCode = true
    } else {
      const arr = customCode.split('::');
      isValidCode = arr.length === 3 && isValidAddress(arr[0]);
      // fix #40
      if (isValidCode) {
        const _isValidChecksumAddress = isValidChecksumAddress(arr[0])
        if (_isValidChecksumAddress) {
          arr[0] = arr[0].toLowerCase()
          customCode = arr.join('::')
        }
      }
    }

    this.setState({
      customCode,
      customCodeError: null,
      tokenSelectorError: null,
      autoFilled: false,
    });

    switch (true) {
      case !isValidCode:
        this.setState({
          customCodeError: this.context.t('invalidContractCode'),
          customSymbol: '',
          customDecimals: 0,
          customSymbolError: null,
          customDecimalsError: null,
        });

        break;
        // case checkExistingCodes(customCode, this.props.currentAssetsTokens):
        //   this.setState({
        //     customCodeError: this.context.t('tokenAlreadyAdded'),
        //   });

        break;
      default:
        this.attemptToAutoFillTokenParams(customCode);
    }
  }

  handleCustomSymbolChange(value) {
    const customSymbol = value.trim();
    const symbolLength = customSymbol.length;
    let customSymbolError = null;

    if (symbolLength <= 0 || symbolLength >= 12) {
      customSymbolError = this.context.t('symbolBetweenZeroTwelve');
    }

    this.setState({ customSymbol, customSymbolError });
  }

  handleCustomDecimalsChange(value) {
    const customDecimals = typeof value === 'string' ? value.trim() : value;
    const validDecimals =
      customDecimals !== null &&
      customDecimals !== '' &&
      customDecimals >= MIN_DECIMAL_VALUE &&
      customDecimals <= MAX_DECIMAL_VALUE;
    let customDecimalsError = null;

    if (!validDecimals) {
      customDecimalsError = this.context.t('decimalsMustZerotoTen');
    }

    this.setState({ customDecimals, customDecimalsError });
  }

  renderCustomTokenForm() {
    const {
      customCode,
      customSymbol,
      customDecimals,
      customCodeError,
      customSymbolError,
      customDecimalsError,
      autoFilled,
      forceEditSymbol,
    } = this.state;

    return (
      <div className="add-token__custom-token-form">
        <TextField
          id="custom-address"
          label={this.context.t('tokenContractCode')}
          type="text"
          value={customCode}
          onChange={(e) => this.handleCustomCodeChange(e.target.value)}
          error={customCodeError}
          fullWidth
          autoFocus
          margin="normal"
          multiline
          rows="3"
          classes={{
            inputMultiline: 'address-book__view-contact__text-area',
            inputRoot: 'address-book__view-contact__text-area-wrapper',
          }}
        />
        <TextField
          id="custom-symbol"
          label={
            <div className="add-token__custom-symbol__label-wrapper">
              <span className="add-token__custom-symbol__label">
                {this.context.t('tokenSymbol')}
              </span>
              {autoFilled && !forceEditSymbol && (
                <div
                  className="add-token__custom-symbol__edit"
                  onClick={() => this.setState({ forceEditSymbol: true })}
                >
                  {this.context.t('edit')}
                </div>
              )}
            </div>
          }
          type="text"
          value={customSymbol}
          onChange={(e) => this.handleCustomSymbolChange(e.target.value)}
          error={customSymbolError}
          fullWidth
          margin="normal"
          disabled={autoFilled && !forceEditSymbol}
        />
        <TextField
          id="custom-decimals"
          label={this.context.t('decimal')}
          type="number"
          value={customDecimals}
          onChange={(e) => this.handleCustomDecimalsChange(e.target.value)}
          error={customDecimalsError}
          fullWidth
          margin="normal"
          disabled={autoFilled}
          min={MIN_DECIMAL_VALUE}
          max={MAX_DECIMAL_VALUE}
        />
      </div>
    );
  }

  renderSearchToken() {
    const { tokenSelectorError, selectedTokens, searchResults } = this.state;

    return (
      <div className="add-token__search-token">
        <TokenSearch
          onSearch={({ results = [] }) =>
            this.setState({ searchResults: results })
          }
          error={tokenSelectorError}
        />
        <div className="add-token__token-list">
          <TokenList
            results={searchResults}
            selectedTokens={selectedTokens}
            onToggleToken={(token) => this.handleToggleToken(token)}
          />
        </div>
      </div>
    );
  }

  renderTabs() {
    const { showSearchTab } = this.props;
    const tabs = [];

    if (showSearchTab) {
      tabs.push(
        <Tab name={this.context.t('search')} key="search-tab">
          {this.renderSearchToken()}
        </Tab>,
      );
    }
    tabs.push(
      <Tab name={this.context.t('customToken')} key="custom-tab">
        {this.renderCustomTokenForm()}
      </Tab>,
    );

    return <Tabs>{tabs}</Tabs>;
  }

  render() {
    const { history, clearPendingTokens, mostRecentOverviewPage } = this.props;

    return (
      <PageContainer
        title={this.context.t('addTokens')}
        tabsComponent={this.renderTabs()}
        onSubmit={() => this.handleNext()}
        disabled={Boolean(this.hasError()) || !this.hasSelected()}
        onCancel={() => {
          clearPendingTokens();
          history.push(mostRecentOverviewPage);
        }}
      />
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
)(AddToken);


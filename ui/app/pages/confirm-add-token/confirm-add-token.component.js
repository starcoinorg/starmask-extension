import React, { Component } from 'react';
import PropTypes from 'prop-types';
import log from 'loglevel';

import {
  ASSET_ROUTE,
  ADD_TOKEN_ROUTE,
  CONFIRM_TRANSACTION_ROUTE,
} from '../../helpers/constants/routes';
import Button from '../../components/ui/button';
import Identicon from '../../components/ui/identicon';
import TokenBalance from '../../components/ui/token-balance';

export default class ConfirmAddToken extends Component {
  static contextTypes = {
    t: PropTypes.func,
    trackEvent: PropTypes.func,
  };

  static propTypes = {
    history: PropTypes.object,
    clearPendingTokens: PropTypes.func,
    addTokens: PropTypes.func,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    pendingTokens: PropTypes.object,
    selectedAddress: PropTypes.string,
    unconfirmedTransactionsCount: PropTypes.number,
    getAutoAcceptToken: PropTypes.func.isRequired,
    checkIsAcceptToken: PropTypes.func.isRequired,
    acceptToken: PropTypes.func.isRequired,
    ticker: PropTypes.string,
  };

  componentDidMount() {
    const { mostRecentOverviewPage, pendingTokens = {}, history } = this.props;

    if (Object.keys(pendingTokens).length === 0) {
      history.push(mostRecentOverviewPage);
    }
  }

  componentDidUpdate(prevProps) {
    const { unconfirmedTransactionsCount, history } = this.props;
    const { unconfirmedTransactionsCount: prevUnconfirmedTransactionsCount } = prevProps;
    if (
      unconfirmedTransactionsCount > 0 &&
      unconfirmedTransactionsCount !== prevUnconfirmedTransactionsCount
    ) {
      history.push(CONFIRM_TRANSACTION_ROUTE);
    }
  }

  getTokenName(name, symbol) {
    return typeof name === 'undefined' ? symbol : `${ name } (${ symbol })`;
  }

  redirect(firstTokenAddress) {
    const { history, mostRecentOverviewPage } = this.props;
    if (firstTokenAddress) {
      history.push(`${ ASSET_ROUTE }/${ firstTokenAddress }`);
    } else {
      history.push(mostRecentOverviewPage);
    }
  }

  render() {
    const {
      history,
      addTokens,
      clearPendingTokens,
      pendingTokens,
      selectedAddress,
      getAutoAcceptToken,
      checkIsAcceptToken,
      acceptToken,
      ticker,
    } = this.props;

    return (
      <div className="page-container">
        <div className="page-container__header">
          <div className="page-container__title">
            {this.context.t('addTokens')}
          </div>
          <div className="page-container__subtitle">
            {this.context.t('likeToAddTokens')}
          </div>
        </div>
        <div className="page-container__content">
          <div className="confirm-add-token">
            <div className="confirm-add-token__header">
              <div className="confirm-add-token__token">
                {this.context.t('token')}
              </div>
              <div className="confirm-add-token__balance">
                {this.context.t('balance')}
              </div>
            </div>
            <div className="confirm-add-token__token-list">
              {Object.entries(pendingTokens).map(([code, token]) => {
                const { name, symbol, logo } = token;
                return (
                  <div
                    className="confirm-add-token__token-list-item"
                    key={code}
                  >
                    <div className="confirm-add-token__token confirm-add-token__data">
                      {logo ? (
                        <div
                          className="token-list__token-icon"
                          style={{
                            backgroundImage: `url(images/contract/${ logo })`,
                          }}
                        />
                      ) : (
                        <Identicon
                          className="confirm-add-token__token-icon"
                          diameter={48}
                          address={code}
                        />
                      )}
                      <div className="confirm-add-token__name">
                        {this.getTokenName(name, symbol)}
                      </div>
                    </div>
                    <div className="confirm-add-token__balance">
                      <TokenBalance token={token} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="page-container__footer">
          <footer>
            <Button
              type="default"
              large
              className="page-container__footer-button"
              onClick={() => history.push(ADD_TOKEN_ROUTE)}
            >
              {this.context.t('back')}
            </Button>
            <Button
              type="secondary"
              large
              className="page-container__footer-button"
              onClick={() => {
                addTokens(pendingTokens).then(() => {
                  const pendingTokenValues = Object.values(pendingTokens);
                  pendingTokenValues.forEach((pendingToken) => {
                    this.context.trackEvent({
                      event: 'Token Added',
                      category: 'Wallet',
                      sensitiveProperties: {
                        token_symbol: pendingToken.symbol,
                        token_contract_code: pendingToken.code,
                        token_decimal_precision: pendingToken.decimals,
                        unlisted: pendingToken.unlisted,
                        source: pendingToken.isCustom ? 'custom' : 'list',
                      },
                    });
                  });
                  clearPendingTokens();
                  const code = pendingTokenValues?.[0].code;
                  const firstTokenAddress = code?.toLowerCase();
                  // trigger an accept token txn if not AutoAcceptToken and not AcceptToken
                  getAutoAcceptToken(selectedAddress, ticker)
                    .then((autoAcceptToken) => {
                      if (autoAcceptToken) {
                        this.redirect(firstTokenAddress);
                      } else {
                        checkIsAcceptToken(selectedAddress, code, ticker).then(
                          (isAcceptToken) => {
                            if (isAcceptToken) {
                              this.redirect(firstTokenAddress);
                            } else {
                              acceptToken(code, selectedAddress, ticker);
                            }
                          },
                        );
                      }
                    })
                    .catch((e) => log.error(e));
                });
              }}
            >
              {this.context.t('addTokens')}
            </Button>
          </footer>
        </div>
      </div>
    );
  }
}

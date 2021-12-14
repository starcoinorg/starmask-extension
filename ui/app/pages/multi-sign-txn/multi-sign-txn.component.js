import React, { Component } from 'react';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Switch, Route, matchPath, withRouter } from 'react-router-dom';
import classnames from 'classnames';
import {
  MULTI_SIGN_TXN_ROUTE,
  MULTI_SIGN_TXN_EXPORT_ROUTE,
  MULTI_SIGN_TXN_HISTORY_ROUTE,
} from '../../helpers/constants/routes';
import { getMostRecentOverviewPage } from '../../ducks/history/history';
import MultiSignTxnSign from './sign.container';
import MultiSignTxnExport from './export';
import MultiSignTxnHistory from './history';
class MultiSignTxnPage extends Component {
  renderTabs() {
    const {
      history,
      location: { pathname },
    } = this.props;
    const getClassNames = (path) =>
      classnames('new-account__tabs__tab', {
        'new-account__tabs__selected': matchPath(pathname, {
          path,
          exact: true,
        }),
      });

    return (
      <div className="new-account__tabs">
        <div
          className={getClassNames(MULTI_SIGN_TXN_ROUTE)}
          onClick={() => history.push(MULTI_SIGN_TXN_ROUTE)}
        >
          {this.context.t('addSign')}
        </div>
        <div
          className={getClassNames(MULTI_SIGN_TXN_EXPORT_ROUTE)}
          onClick={() => history.push(MULTI_SIGN_TXN_EXPORT_ROUTE)}
        >
          {this.context.t('exportTxn')}
        </div>
        <div
          className={getClassNames(MULTI_SIGN_TXN_HISTORY_ROUTE)}
          onClick={() => history.push(MULTI_SIGN_TXN_HISTORY_ROUTE)}
        >
          {this.context.t('history')}
        </div>
      </div>
    );
  }

  render() {
    const { history, mostRecentOverviewPage } = this.props;
    return (
      <div className="page-container">
        <div
          className={classnames(
            'new-account__header__no-boder-bottom',
            'page-container__header',
            'multi-sign-txn__title',
            'new-account__title',
          )}
        >
          {this.context.t('multiSign')}{this.context.t('transaction')}
          <div
            className={classnames(
              'page-container__header-close',
              'multi-sign-txn__header-close',
            )}
            onClick={() => {
              history.push(mostRecentOverviewPage);
            }}
          />
        </div>
        <div className="new-account__header">
          <div className="new-account__header">{this.renderTabs()}</div>
        </div>
        <div className="new-account__form">
          <Switch>
            <Route
              exact
              path={MULTI_SIGN_TXN_ROUTE}
              component={MultiSignTxnSign}
            />
            <Route
              exact
              path={MULTI_SIGN_TXN_EXPORT_ROUTE}
              component={MultiSignTxnExport}
            />
            <Route
              exact
              path={MULTI_SIGN_TXN_HISTORY_ROUTE}
              component={MultiSignTxnHistory}
            />
          </Switch>
        </div>
      </div>
    );
  }
}

MultiSignTxnPage.propTypes = {
  location: PropTypes.object,
  history: PropTypes.object,
  mostRecentOverviewPage: PropTypes.string.isRequired,
};

MultiSignTxnPage.contextTypes = {
  t: PropTypes.func,
};


export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(MultiSignTxnPage);

function mapStateToProps(state) {
  return {
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
  };
}

function mapDispatchToProps(dispatch) {
  return {};
}

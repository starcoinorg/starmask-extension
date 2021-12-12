import React, { Component } from 'react';
import { Switch, Route, matchPath } from 'react-router-dom';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import {
  MULTI_SIGN_TXN_ROUTE,
  MULTI_SIGN_TXN_EXPORT_ROUTE,
} from '../../helpers/constants/routes';
import MultiSignTxnSign from './sign.container';
import MultiSignTxnExport from './export';

export default class MultiSignTxnPage extends Component {
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
      </div>
    );
  }

  render() {
    return (
      <div className="new-account">
        <div
          className={classnames(
            'new-account__header',
            'new-account__header__no-boder-bottom',
            'new-account__title',
            'new-account__tabs',
          )}
        >
          {this.context.t('multiSign')}{this.context.t('transaction')}
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
          </Switch>
        </div>
      </div>
    );
  }
}

MultiSignTxnPage.propTypes = {
  location: PropTypes.object,
  history: PropTypes.object,
};

MultiSignTxnPage.contextTypes = {
  t: PropTypes.func,
};

import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import log from 'loglevel';
import { multiSignTransactionsSelector } from '../../../selectors';
import * as actions from '../../../store/actions';
import Button from '../../../components/ui/button';
import MultiSignTxnListItem from '../../../components/app/multi-sign-txn-list-item';

const PAGE_INCREMENT = 10;

class MultiSignTxnHistory extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    error: PropTypes.node,
    multiSignTransactions: PropTypes.array,
  };

  state = { limit: PAGE_INCREMENT };

  render() {
    const { error, multiSignTransactions } = this.props;
    const { limit } = this.state;

    log.debug({ multiSignTransactions })
    log.debug({ multiSignTransactions })
    return (
      <div className="transaction-list">
        <div className="transaction-list__transactions">
          <div className="transaction-list__completed-transactions">
            {multiSignTransactions.length > 0 ? (
              multiSignTransactions
                .slice(0, limit)
                .map((transactionGroup, index) => (
                  <MultiSignTxnListItem
                    transactionGroup={transactionGroup}
                    key={`${transactionGroup.nonce}:${limit + index - 10}`}
                  />
                ))
            ) : (
              <div className="transaction-list__empty">
                <div className="transaction-list__empty-text">
                  {t('noTransactions')}
                </div>
              </div>
            )}
            {multiSignTransactions.length > limit && (
              <Button
                className="transaction-list__view-more"
                type="secondary"
                rounded
              // onClick={viewMore}
              >
                View More
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    error: state.appState.warning,
    multiSignTransactions: multiSignTransactionsSelector(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    hideModal: () => {
      dispatch(actions.hideModal());
    },
    displayWarning: (warning) => dispatch(actions.displayWarning(warning)),
    importNewJsonAccount: (options) =>
      dispatch(actions.importNewAccount('JSON File', options)),
    setSelectedAddress: (address) =>
      dispatch(actions.setSelectedAddress(address)),
  };
};

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(MultiSignTxnHistory);

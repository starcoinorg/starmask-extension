import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import * as actions from '../../../store/actions';
import Button from '../../../components/ui/button';
import { getMostRecentOverviewPage } from '../../../ducks/history/history';

class MultiSignTxnHistory extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    error: PropTypes.node,
    mostRecentOverviewPage: PropTypes.string.isRequired,
    history: PropTypes.object.isRequired,
  };

  state = {};

  render() {
    const { error, history, mostRecentOverviewPage } = this.props;

    return (
      <div className="new-account-create-form">
        sdfsdf
        <div className="export-private-key-modal__buttons">
          <Button
            onClick={() => history.push(mostRecentOverviewPage)}
            type="secondary"
            large
            className="export-private-key-modal__button"
          >
            {this.context.t('done')}
          </Button>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    error: state.appState.warning,
    mostRecentOverviewPage: getMostRecentOverviewPage(state),
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

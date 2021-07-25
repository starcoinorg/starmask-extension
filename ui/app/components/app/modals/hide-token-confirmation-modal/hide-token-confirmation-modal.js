import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import * as actions from '../../../../store/actions';
import Identicon from '../../../ui/identicon';
import Button from '../../../ui/button';

function mapStateToProps(state) {
  return {
    token: state.appState.modal.modalState.props.token,
    assetImages: state.starmask.assetImages,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    hideModal: () => dispatch(actions.hideModal()),
    hideToken: (code) => {
      dispatch(actions.removeToken(code)).then(() => {
        dispatch(actions.hideModal());
      });
    },
  };
}

class HideTokenConfirmationModal extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    hideToken: PropTypes.func.isRequired,
    hideModal: PropTypes.func.isRequired,
    assetImages: PropTypes.object.isRequired,
    token: PropTypes.shape({
      symbol: PropTypes.string,
      code: PropTypes.string,
    }),
  };

  state = {};

  render() {
    const { token, hideToken, hideModal, assetImages } = this.props;
    const { symbol, code } = token;
    const image = assetImages[code];

    return (
      <div className="hide-token-confirmation">
        <div className="hide-token-confirmation__container">
          <div className="hide-token-confirmation__title">
            {this.context.t('hideTokenPrompt')}
          </div>
          <Identicon
            className="hide-token-confirmation__identicon"
            diameter={45}
            address={code}
            image={image}
          />
          <div className="hide-token-confirmation__symbol">{symbol}</div>
          <div className="hide-token-confirmation__copy">
            {this.context.t('readdToken')}
          </div>
          <div className="hide-token-confirmation__buttons">
            <Button
              type="default"
              className="hide-token-confirmation__button"
              data-testid="hide-token-confirmation__cancel"
              onClick={() => hideModal()}
            >
              {this.context.t('cancel')}
            </Button>
            <Button
              type="secondary"
              className="hide-token-confirmation__button"
              data-testid="hide-token-confirmation__hide"
              onClick={() => hideToken(code)}
            >
              {this.context.t('hide')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(HideTokenConfirmationModal);

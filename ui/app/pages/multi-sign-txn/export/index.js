import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import copyToClipboard from 'copy-to-clipboard';
import * as actions from '../../../store/actions';
import Button from '../../../components/ui/button';
import TextField from '../../../components/ui/text-field';

class ExportMultiSignTxn extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    hideModal: PropTypes.func.isRequired,
    error: PropTypes.node,
  };

  state = {
    txn: "0xb555d8b06fed69769821e189b5168870000000000000000002000000000000000000000000000000010f5472616e73666572536372697074730f706565725f746f5f706565725f76320107000000000000000000000000000000010353544303535443000210dcd7ae3232acb938c68ee088305b83f61000ca9a3b000000000000000000000000809698000000000001000000000000000d3078313a3a5354433a3a535443c0a8000000000000fe0161547c6a1ef36e9e99865ce7ac028ee79aff404d279b568272bc7154802d4856bbc95ddc2b2926d1a451ea68fa74274aa04af97d8e2aefccb297e6ef61992d42e8e8cdd5b17a37fe7e8fe446d067e7a9907cf7783aca204ccb623972176614c0a00244b85039581d7352164ab4805ad0cb2efac0707f19ae4cb238164c89799a8d5d598ecc36ac0aaa2c97c7a5aec5b553586a348d8100735c50afe655e776a529bf0480000000"
  };

  render() {
    const { error } = this.props;

    return (
      <div className="new-account-create-form">
        <TextField
          id="custom-nft-meta"
          label={this.context.t('copyToClipboardOnClick')}
          type="text"
          value={this.state.txn}
          onClick={() => copyToClipboard(this.state.txn)}
          fullWidth
          margin="normal"
          multiline
          rows="5"
          classes={{
            inputMultiline: 'address-book__view-contact__text-area',
            inputRoot: 'address-book__view-contact__text-area-wrapper',
          }}
        />
        <a
          className="warning"
          href={void (0)}
          onClick={() => console.log(123)}
          rel="noopener noreferrer"
        >
          {this.context.t('clickToDownload')}
        </a>
      </div>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    error: state.appState.warning,
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
)(ExportMultiSignTxn);

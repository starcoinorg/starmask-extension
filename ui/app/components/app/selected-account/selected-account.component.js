import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import copyToClipboard from 'copy-to-clipboard';
import { shortenAddress, checksumAddress } from '../../../helpers/utils/util';
import {
  getTickerForCurrentProvider,
} from '../../../selectors';
import Tooltip from '../../ui/tooltip';

class SelectedAccount extends Component {
  state = {
    copied: false,
  };

  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    selectedIdentity: PropTypes.object.isRequired,
    ticker: PropTypes.string,
  };

  componentDidMount() {
    this.copyTimeout = null;
  }

  componentWillUnmount() {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
      this.copyTimeout = null;
    }
  }

  render() {
    const { t } = this.context;
    const { selectedIdentity, ticker } = this.props;
    const checksummedAddress = ticker === 'APT' ? selectedIdentity.address : checksumAddress(selectedIdentity.address);

    return (
      <div className="selected-account">
        <Tooltip
          wrapperClassName="selected-account__tooltip-wrapper"
          position="bottom"
          title={
            this.state.copied ? t('copiedExclamation') : t('copyToClipboard')
          }
        >
          <button
            className="selected-account__clickable"
            onClick={() => {
              this.setState({ copied: true });
              this.copyTimeout = setTimeout(
                () => this.setState({ copied: false }),
                3000,
              );
              copyToClipboard(checksummedAddress);
            }}
          >
            <div className="selected-account__name">
              {selectedIdentity.name}
            </div>
            <div className="selected-account__address">
              {shortenAddress(checksummedAddress)}
            </div>
          </button>
        </Tooltip>
      </div>
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
)(SelectedAccount);



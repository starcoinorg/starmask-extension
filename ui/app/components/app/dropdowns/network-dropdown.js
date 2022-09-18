import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { compose } from 'redux';
import * as actions from '../../../store/actions';
import { openAlert as displayInvalidCustomNetworkAlert } from '../../../ducks/alerts/invalid-custom-network';
import {
  NETWORKS_ROUTE,
  NETWORKS_FORM_ROUTE,
} from '../../../helpers/constants/routes';
import { ENVIRONMENT_TYPE_FULLSCREEN } from '../../../../../shared/constants/app';
import { NETWORK_TYPE_RPC } from '../../../../../shared/constants/network';
import { isPrefixedFormattedHexString } from '../../../../../shared/modules/network.utils';
import { getEnvironmentType } from '../../../../../app/scripts/lib/util';

import ColorIndicator from '../../ui/color-indicator';
import { COLORS, SIZES } from '../../../helpers/constants/design-system';
import { Dropdown, DropdownMenuItem } from './dropdown';
import { defaultNetworksData } from '../../../pages/settings/networks-tab/networks-tab.constants';

// classes from nodes of the toggle element.
const notToggleElementClassnames = [
  'menu-icon',
  'network-name',
  'network-indicator',
  'network-caret',
  'network-component',
  'modal-container__footer-button',
];

const DROP_DOWN_MENU_ITEM_STYLE = {
  fontSize: '16px',
  lineHeight: '20px',
  padding: '12px 0',
};

function mapStateToProps(state) {
  return {
    provider: state.starmask.provider,
    frequentRpcListDetail: state.starmask.frequentRpcListDetail || [],
    networkDropdownOpen: state.appState.networkDropdownOpen,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    setProviderType: (type) => {
      dispatch(actions.setProviderType(type));
    },
    setRpcTarget: (target, chainId, ticker, nickname) => {
      dispatch(actions.setRpcTarget(target, chainId, ticker, nickname));
    },
    hideNetworkDropdown: () => dispatch(actions.hideNetworkDropdown()),
    setNetworksTabAddMode: (isInAddMode) => {
      dispatch(actions.setNetworksTabAddMode(isInAddMode));
    },
    setSelectedSettingsRpcUrl: (url) => {
      dispatch(actions.setSelectedSettingsRpcUrl(url));
    },
    displayInvalidCustomNetworkAlert: (networkName) => {
      dispatch(displayInvalidCustomNetworkAlert(networkName));
    },
    showConfirmDeleteNetworkModal: ({ target, onConfirm }) => {
      return dispatch(
        actions.showModal({
          name: 'CONFIRM_DELETE_NETWORK',
          target,
          onConfirm,
        }),
      );
    },
  };
}

class NetworkDropdown extends Component {
  static contextTypes = {
    t: PropTypes.func,
    metricsEvent: PropTypes.func,
  };

  static propTypes = {
    provider: PropTypes.shape({
      nickname: PropTypes.string,
      rpcUrl: PropTypes.string,
      type: PropTypes.string,
      ticker: PropTypes.string,
    }).isRequired,
    setProviderType: PropTypes.func.isRequired,
    setRpcTarget: PropTypes.func.isRequired,
    hideNetworkDropdown: PropTypes.func.isRequired,
    setNetworksTabAddMode: PropTypes.func.isRequired,
    setSelectedSettingsRpcUrl: PropTypes.func.isRequired,
    frequentRpcListDetail: PropTypes.array.isRequired,
    networkDropdownOpen: PropTypes.bool.isRequired,
    history: PropTypes.object.isRequired,
    displayInvalidCustomNetworkAlert: PropTypes.func.isRequired,
    showConfirmDeleteNetworkModal: PropTypes.func.isRequired,
  };

  handleClick(newProviderType) {
    const {
      provider: { type: providerType },
      setProviderType,
    } = this.props;
    const { metricsEvent } = this.context;

    metricsEvent({
      eventOpts: {
        category: 'Navigation',
        action: 'Home',
        name: 'Switched Networks',
      },
      customVariables: {
        fromNetwork: providerType,
        toNetwork: newProviderType,
      },
    });
    setProviderType(newProviderType);
  }

  renderCustomRpcList(rpcListDetail, provider) {
    const reversedRpcListDetail = rpcListDetail.slice().reverse();

    return reversedRpcListDetail.map((entry) => {
      const { rpcUrl, chainId, ticker = 'STC', nickname = '' } = entry;
      const isCurrentRpcTarget =
        provider.type === NETWORK_TYPE_RPC && rpcUrl === provider.rpcUrl;

      return (
        <DropdownMenuItem
          key={`common${ rpcUrl }`}
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => {
            if (isPrefixedFormattedHexString(chainId)) {
              this.props.setRpcTarget(rpcUrl, chainId, ticker, nickname);
            } else {
              this.props.displayInvalidCustomNetworkAlert(nickname || rpcUrl);
            }
          }}
          style={{
            fontSize: '16px',
            lineHeight: '20px',
            padding: '12px 0',
          }}
        >
          {isCurrentRpcTarget ? (
            <i className="fa fa-check" />
          ) : (
            <div className="network-check__transparent">✓</div>
          )}
          <ColorIndicator
            color={COLORS.UI2}
            size={SIZES.LG}
            type={ColorIndicator.TYPES.FILLED}
            borderColor={isCurrentRpcTarget ? COLORS.WHITE : COLORS.UI2}
          />
          <span
            className="network-name-item"
            style={{
              color: isCurrentRpcTarget ? '#ffffff' : '#9b9b9b',
            }}
          >
            {nickname || rpcUrl} {ticker}
          </span>
          {isCurrentRpcTarget ? null : (
            <i
              className="fa fa-times delete"
              onClick={(e) => {
                e.stopPropagation();
                this.props.showConfirmDeleteNetworkModal({
                  target: rpcUrl,
                  onConfirm: () => undefined,
                });
              }}
            />
          )}
        </DropdownMenuItem>
      );
    });
  }

  getNetworkName() {
    const { provider } = this.props;
    const providerName = provider.type;

    let name;

    if (providerName === 'main') {
      name = this.context.t('main');
    } else if (providerName === 'barnard') {
      name = this.context.t('barnard');
    } else if (providerName === 'proxima') {
      name = this.context.t('proxima');
    } else if (providerName === 'halley') {
      name = this.context.t('halley');
    } else {
      name = provider.nickname || this.context.t('unknownNetwork');
    }

    return name;
  }

  renderNetworkEntry(network) {
    const {
      provider: { type: providerType },
    } = this.props;
    console.log(network, this.props)
    const data = defaultNetworksData.filter(item => item.labelKey === network)[0]
    return (
      <DropdownMenuItem
        key={network}
        closeMenu={this.props.hideNetworkDropdown}
        onClick={() => this.handleClick(network)}
        style={DROP_DOWN_MENU_ITEM_STYLE}
      >
        {providerType === network ? (
          <i className="fa fa-check" />
        ) : (
          <div className="network-check__transparent">✓</div>
        )}
        <ColorIndicator
          color={network}
          size={SIZES.LG}
          type={ColorIndicator.TYPES.FILLED}
          borderColor={providerType === network ? COLORS.WHITE : network}
        />
        <span
          className="network-name-item"
          style={{
            color: providerType === network ? '#ffffff' : '#9b9b9b',
          }}
        >
          {this.context.t(network)} {data.ticker}
        </span>
      </DropdownMenuItem>
    );
  }

  render() {
    const {
      provider: { rpcUrl: activeNetwork },
      setNetworksTabAddMode,
      setSelectedSettingsRpcUrl,
    } = this.props;
    const rpcListDetail = this.props.frequentRpcListDetail;
    console.log({ rpcListDetail })
    const isOpen = this.props.networkDropdownOpen;

    return (
      <Dropdown
        isOpen={isOpen}
        onClickOutside={(event) => {
          const { classList } = event.target;
          const isInClassList = (className) => classList.contains(className);
          const notToggleElementIndex = notToggleElementClassnames.findIndex(
            isInClassList,
          );

          if (notToggleElementIndex === -1) {
            event.stopPropagation();
            this.props.hideNetworkDropdown();
          }
        }}
        containerClassName="network-droppo"
        zIndex={55}
        style={{
          position: 'absolute',
          top: '58px',
          width: '309px',
          zIndex: '55px',
        }}
        innerStyle={{
          padding: '18px 8px',
        }}
      >
        <div className="network-dropdown-header">
          <div className="network-dropdown-title">
            {this.context.t('networks')}
          </div>
          <div className="network-dropdown-divider" />
          <div className="network-dropdown-content">
            {this.context.t('defaultNetwork')}
          </div>
        </div>
        {this.renderNetworkEntry('main')}
        {this.renderNetworkEntry('barnard')}
        {this.renderNetworkEntry('proxima')}
        {this.renderNetworkEntry('halley')}
        {this.renderNetworkEntry('devnet')}

        {this.renderCustomRpcList(rpcListDetail, this.props.provider)}
        <DropdownMenuItem
          closeMenu={() => this.props.hideNetworkDropdown()}
          onClick={() => {
            this.props.history.push(
              getEnvironmentType() === ENVIRONMENT_TYPE_FULLSCREEN
                ? NETWORKS_ROUTE
                : NETWORKS_FORM_ROUTE,
            );
            setSelectedSettingsRpcUrl('');
            setNetworksTabAddMode(true);
          }}
          style={DROP_DOWN_MENU_ITEM_STYLE}
        >
          {activeNetwork === 'custom' ? (
            <i className="fa fa-check" />
          ) : (
            <div className="network-check__transparent">✓</div>
          )}
          <ColorIndicator
            type={ColorIndicator.TYPES.FILLED}
            color={COLORS.TRANSPARENT}
            borderColor={COLORS.UI2}
            size={SIZES.LG}
          />
          <span
            className="network-name-item"
            style={{
              color: activeNetwork === 'custom' ? '#ffffff' : '#9b9b9b',
            }}
          >
            {this.context.t('customRPC')}
          </span>
        </DropdownMenuItem>
      </Dropdown>
    );
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps),
)(NetworkDropdown);

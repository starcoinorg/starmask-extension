import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Button from '../../ui/button';
import LoadingScreen from '../../ui/loading-screen';

export default class LoadingNetworkScreen extends PureComponent {
  state = {
    showErrorScreen: false,
  };

  static contextTypes = {
    t: PropTypes.func,
  };

  static propTypes = {
    loadingMessage: PropTypes.string,
    cancelTime: PropTypes.number,
    provider: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    providerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    showNetworkDropdown: PropTypes.func,
    setProviderArgs: PropTypes.array,
    setProviderType: PropTypes.func,
    rollbackToPreviousProvider: PropTypes.func,
    isNetworkLoading: PropTypes.bool,
  };

  componentDidMount = () => {
    this.cancelCallTimeout = setTimeout(
      this.cancelCall,
      this.props.cancelTime || 15000,
    );
  };

  getConnectingLabel = function (loadingMessage) {
    if (loadingMessage) {
      return loadingMessage;
    }
    const { provider, providerId } = this.props;
    const providerName = provider.type;

    let name;
    if (providerName === 'main') {
      name = this.context.t('connectingToMainnet');
    } else if (providerName === 'barnard') {
      name = this.context.t('connectingToBarnard');
    } else if (providerName === 'halley') {
      name = this.context.t('connectingToHalley');
    } else if (providerName === 'proxima') {
      name = this.context.t('connectingToProxima');
    } else if (providerName === 'devnet') {
      name = this.context.t('connectingToAptosDev');
    } else if (providerName === 'testnet') {
      name = this.context.t('connectingToAptosTest');
    } else if (providerName === 'mainnet') {
      name = this.context.t('connectingToAptosMain');
    } else {
      name = this.context.t('connectingTo', [providerId]);
    }
    return name;
  };

  renderErrorScreenContent = () => {
    const {
      showNetworkDropdown,
      setProviderArgs,
      setProviderType,
    } = this.props;

    return (
      <div className="loading-overlay__error-screen">
        <span className="loading-overlay__emoji">&#128542;</span>
        <span>{this.context.t('somethingWentWrong')}</span>
        <div className="loading-overlay__error-buttons">
          <Button
            type="default"
            onClick={() => {
              window.clearTimeout(this.cancelCallTimeout);
              showNetworkDropdown();
            }}
          >
            {this.context.t('switchNetworks')}
          </Button>

          <Button
            type="primary"
            onClick={() => {
              this.setState({ showErrorScreen: false });
              setProviderType(...setProviderArgs);
              window.clearTimeout(this.cancelCallTimeout);
              this.cancelCallTimeout = setTimeout(
                this.cancelCall,
                this.props.cancelTime || 15000,
              );
            }}
          >
            {this.context.t('tryAgain')}
          </Button>
        </div>
      </div>
    );
  };

  cancelCall = () => {
    const { isNetworkLoading } = this.props;

    if (isNetworkLoading) {
      this.setState({ showErrorScreen: true });
    }
  };

  componentDidUpdate = (prevProps) => {
    const { provider } = this.props;
    const { provider: prevProvider } = prevProps;
    if (provider.type !== prevProvider.type) {
      window.clearTimeout(this.cancelCallTimeout);
      this.setState({ showErrorScreen: false });
      this.cancelCallTimeout = setTimeout(
        this.cancelCall,
        this.props.cancelTime || 15000,
      );
    }
  };

  componentWillUnmount = () => {
    window.clearTimeout(this.cancelCallTimeout);
  };

  render() {
    const { rollbackToPreviousProvider } = this.props;

    return (
      <LoadingScreen
        header={
          <div
            className="page-container__header-close"
            onClick={rollbackToPreviousProvider}
          />
        }
        showLoadingSpinner={!this.state.showErrorScreen}
        loadingMessage={
          this.state.showErrorScreen
            ? this.renderErrorScreenContent()
            : this.getConnectingLabel(this.props.loadingMessage)
        }
      />
    );
  }
}

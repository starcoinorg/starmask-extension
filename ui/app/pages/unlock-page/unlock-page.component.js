import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Button from '@material-ui/core/Button';
import TextField from '../../components/ui/text-field';
import { DEFAULT_ROUTE } from '../../helpers/constants/routes';

export default class UnlockPage extends Component {
  static contextTypes = {
    metricsEvent: PropTypes.func,
    t: PropTypes.func,
  };

  static propTypes = {
    history: PropTypes.object.isRequired,
    isUnlocked: PropTypes.bool,
    onImport: PropTypes.func,
    onRestore: PropTypes.func,
    onSubmit: PropTypes.func,
    forceUpdateMetamaskState: PropTypes.func,
    showOptInModal: PropTypes.func,
  };

  state = {
    password: process.env.CONF?.password ? process.env.CONF?.password : '',
    error: null,
  };

  submitting = false;

  UNSAFE_componentWillMount() {
    const { isUnlocked, history } = this.props;

    if (isUnlocked) {
      history.push(DEFAULT_ROUTE);
    }
  }

  handleSubmit = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const { password } = this.state;
    const { onSubmit, forceUpdateMetamaskState, showOptInModal } = this.props;

    if (password === '' || this.submitting) {
      return;
    }

    this.setState({ error: null });
    this.submitting = true;

    try {
      await onSubmit(password);
      const newState = await forceUpdateMetamaskState();
      this.context.metricsEvent({
        eventOpts: {
          category: 'Navigation',
          action: 'Unlock',
          name: 'Success',
        },
        isNewVisit: true,
      });

      if (
        newState.participateInMetaMetrics === null ||
        newState.participateInMetaMetrics === undefined
      ) {
        showOptInModal();
      }
    } catch ({ message }) {
      if (message === 'Incorrect password') {
        const newState = await forceUpdateMetamaskState();
        this.context.metricsEvent({
          eventOpts: {
            category: 'Navigation',
            action: 'Unlock',
            name: 'Incorrect Password',
          },
          customVariables: {
            numberOfTokens: newState.tokens.length,
            numberOfAccounts: Object.keys(newState.accounts).length,
          },
        });
      }

      this.setState({ error: message });
      this.submitting = false;
    }
  };

  handleInputChange({ target }) {
    this.setState({ password: target.value, error: null });
  }

  renderSubmitButton() {
    const style = {
      backgroundColor: '#f7861c',
      color: 'white',
      marginTop: '20px',
      height: '60px',
      fontWeight: '400',
      boxShadow: 'none',
      borderRadius: '4px',
    };

    return (
      <Button
        type="submit"
        style={style}
        disabled={!this.state.password}
        fullWidth
        variant="contained"
        size="large"
        onClick={this.handleSubmit}
        disableRipple
      >
        {this.context.t('unlock')}
      </Button>
    );
  }

  render() {
    const { password, error } = this.state;
    const { t } = this.context;
    const { onImport, onRestore } = this.props;

    return (
      <div className="unlock-page__container">
        <div className="unlock-page">
          <img src="images/icon-128.png" width="125" height="125" alt="" />
          <h1 className="unlock-page__title">{t('welcomeBack')}</h1>
          <div>{t('unlockMessage')}</div>
          <form className="unlock-page__form" onSubmit={this.handleSubmit}>
            <TextField
              id="password"
              label={t('password')}
              type="password"
              value={password}
              onChange={(event) => this.handleInputChange(event)}
              error={error}
              autoFocus
              autoComplete="current-password"
              theme="material"
              fullWidth
            />
          </form>
          {this.renderSubmitButton()}
          <div className="unlock-page__links">
            <button className="unlock-page__link" onClick={() => onRestore()}>
              {t('restoreFromSeed')}
            </button>
            <button
              className="unlock-page__link unlock-page__link--import"
              onClick={() => onImport()}
            >
              {t('importUsingSeed')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

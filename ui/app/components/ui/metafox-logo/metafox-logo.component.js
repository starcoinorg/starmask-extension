import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

export default class MetaFoxLogo extends PureComponent {
  static propTypes = {
    onClick: PropTypes.func,
    unsetIconHeight: PropTypes.bool,
  };

  static defaultProps = {
    onClick: undefined,
  };

  render() {
    const { onClick, unsetIconHeight } = this.props;
    const iconProps = unsetIconHeight ? {} : { height: 42, width: 42 };

    return (
      <div
        onClick={onClick}
        className={classnames('app-header__logo-container', {
          'app-header__logo-container--clickable': Boolean(onClick),
        })}
      >
        <img
          height="30"
          src="/images/logo/starcoin-lgoo-text-blue.svg"
          className={classnames(
            'app-header__metafox-logo',
            'app-header__metafox-logo--horizontal',
          )}
          alt=""
        />
        <img
          {...iconProps}
          src="/images/logo/stc.svg"
          height="32"
          className={classnames(
            'app-header__metafox-logo',
            'app-header__metafox-logo--icon',
          )}
          alt=""
        />
      </div>
    );
  }
}

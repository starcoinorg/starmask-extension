import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Button from '../../../../components/ui/button';

export default class TokenListPlaceholder extends Component {
  static contextTypes = {
    t: PropTypes.func,
  };

  render() {
    return (
      <div className="token-list-placeholder">
        <img src="images/tokensearch.svg" alt="" width="65" height="58" />
        <div className="token-list-placeholder__text">
          {this.context.t('addAcquiredTokens')}
        </div>
        <Button
          type="link"
          className="token-list-placeholder__link"
          href="https://github.com/starcoinorg/starmask-contract-metadata/blob/master/contract-map.json"
          target="_blank"
          rel="noopener noreferrer"
        >
          {this.context.t('learnMore')}
        </Button>
      </div>
    );
  }
}

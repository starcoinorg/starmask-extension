import { connect } from 'react-redux';
import { STC } from '../../../helpers/constants/common';
import { getIsMainnet, getPreferences } from '../../../selectors';
import CurrencyInput from './currency-input.component';

const mapStateToProps = (state) => {
  const {
    starmask: { nativeCurrency, currentCurrency, conversionRate },
  } = state;
  const { showFiatInTestnets } = getPreferences(state);
  const isMainnet = getIsMainnet(state);

  return {
    nativeCurrency,
    currentCurrency,
    conversionRate,
    // hideFiat: !isMainnet && !showFiatInTestnets,
    hideFiat: true,
  };
};

const mergeProps = (stateProps, dispatchProps, ownProps) => {
  const { nativeCurrency, currentCurrency } = stateProps;

  return {
    ...stateProps,
    ...dispatchProps,
    ...ownProps,
    nativeSuffix: nativeCurrency || STC,
    fiatSuffix: currentCurrency.toUpperCase(),
  };
};

export default connect(mapStateToProps, null, mergeProps)(CurrencyInput);

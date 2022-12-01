import { addHexPrefix } from '../../../app/scripts/lib/util';
import {
  conversionUtil,
  conversionGreaterThan,
} from '../helpers/utils/conversion-util';
import { formatCurrency } from '../helpers/utils/confirm-tx.util';
import { decEthToConvertedCurrency as ethTotalToConvertedCurrency, decimalToHex } from '../helpers/utils/conversions.util';
import { formatETHFee } from '../helpers/utils/formatters';
import { calcGasTotal } from '../pages/send/send.utils';

import { GAS_ESTIMATE_TYPES } from '../helpers/constants/common';
import {
  getCurrentCurrency,
  getIsMainnet,
  getPreferences,
  getGasPrice,
  getGasLimit,
} from '.';

const NUMBER_OF_DECIMALS_SM_BTNS = 5;

export function getCustomGasLimit(state) {
  return state.gas.customData.limit;
}

export function getCustomGasPrice(state) {
  return state.gas.customData.price;
}

export function getBasicGasEstimateLoadingStatus(state) {
  return state.gas.basicEstimateIsLoading;
}

export function getAveragePriceEstimateInHexWEI(state) {
  const {
    starmask: {
      network: { name },
    },
  } = state;
  if (['devnet', 'testnet', 'mainnet'].includes(name)) {
    return addHexPrefix(decimalToHex(150))
  } else {
    const averagePriceEstimate = state.gas.basicEstimates.average;
    return getGasPriceInHexWei(averagePriceEstimate || '0x0');
  }
}

export function getFastPriceEstimateInHexWEI(state) {
  const fastPriceEstimate = getFastPriceEstimate(state);
  return getGasPriceInHexWei(fastPriceEstimate || '0x0');
}

export function getDefaultActiveButtonIndex(
  gasButtonInfo,
  customGasPriceInHex,
  gasPrice,
) {
  return gasButtonInfo
    .map(({ priceInHexWei }) => priceInHexWei)
    .lastIndexOf(addHexPrefix(customGasPriceInHex || gasPrice));
}

export function getSafeLowEstimate(state) {
  const {
    gas: {
      basicEstimates: { safeLow },
    },
  } = state;

  return safeLow;
}

export function getFastPriceEstimate(state) {
  const {
    gas: {
      basicEstimates: { fast },
    },
  } = state;

  return fast;
}

export function getPriceMax(state) {
  const {
    gas: {
      max: { price },
    },
  } = state;

  return price;
}

export function getLimitMax(state) {
  const {
    gas: {
      max: { limit },
    },
  } = state;

  return limit;
}

export function isCustomPriceSafe(state) {
  const safeLow = getSafeLowEstimate(state);
  if (!safeLow) {
    return true;
  }

  const customGasPrice = getCustomGasPrice(state);
  if (!customGasPrice) {
    return true;
  }

  const customPriceSafe = conversionGreaterThan(
    {
      value: customGasPrice,
      fromNumericBase: 'hex',
      fromDenomination: 'NANOSTC',
      toDenomination: 'MILLISTC',
    },
    { value: safeLow, fromNumericBase: 'dec' },
  );

  return customPriceSafe;
}

export function isCustomPriceExtendMax(state, customPrice) {
  const maxPrice = getPriceMax(state);
  if (!customPrice || !maxPrice) {
    return false;
  }

  const customPriceExtendMax = conversionGreaterThan(
    {
      value: customPrice,
      fromNumericBase: 'hex',
    },
    {
      fromNumericBase: 'dec',
      value: maxPrice,
    },
  );
  return customPriceExtendMax;
}

export function isCustomLimitExtendMax(state, customLimit) {
  const maxLimit = getLimitMax(state);
  if (!customLimit || !maxLimit) {
    return false;
  }

  const customLimitExtendMax = conversionGreaterThan(
    {
      value: customLimit,
      fromNumericBase: 'hex',
    },
    {
      fromNumericBase: 'dec',
      value: maxLimit,
    },
  );
  return customLimitExtendMax;
}

export function isCustomPriceExcessive(state, checkSend = false) {
  const customPrice = checkSend ? getGasPrice(state) : getCustomGasPrice(state);
  const fastPrice = getFastPriceEstimate(state);

  if (!customPrice || !fastPrice) {
    return false;
  }

  // Custom gas should be considered excessive when it is 10 times greater than the fastest estimate.
  const customPriceExcessive = conversionGreaterThan(
    {
      value: customPrice,
      fromNumericBase: 'hex',
    },
    {
      fromNumericBase: 'dec',
      value: fastPrice * 10,
      fromDenomination: 'MILLISTC',
      toDenomination: 'NANOSTC',
    },
  );

  return customPriceExcessive;
}

export function basicPriceEstimateToETHTotal(
  estimate,
  gasLimit,
  numberOfDecimals = 9,
) {
  return conversionUtil(calcGasTotal(gasLimit, estimate), {
    fromNumericBase: 'hex',
    toNumericBase: 'dec',
    fromDenomination: 'MILLISTC',
    numberOfDecimals,
  });
}

export function getRenderableEthFee(
  estimate,
  gasLimit,
  numberOfDecimals = 9,
  nativeCurrency = 'STC',
) {
  const value = conversionUtil(estimate, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
  });
  const fee = basicPriceEstimateToETHTotal(value, gasLimit, numberOfDecimals);
  return formatETHFee(fee, nativeCurrency);
}

export function getRenderableConvertedCurrencyFee(
  estimate,
  gasLimit,
  convertedCurrency,
  conversionRate,
) {
  const value = conversionUtil(estimate, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
  });
  const fee = basicPriceEstimateToETHTotal(value, gasLimit);
  const feeInCurrency = ethTotalToConvertedCurrency(
    fee,
    convertedCurrency,
    conversionRate,
  );
  return formatCurrency(feeInCurrency, convertedCurrency);
}

export function priceEstimateToWei(priceEstimate) {
  return conversionUtil(priceEstimate, {
    fromNumericBase: 'hex',
    toNumericBase: 'hex',
    fromDenomination: 'MILLISTC',
    toDenomination: 'NANOSTC',
    numberOfDecimals: 6,
  });
}

export function getGasPriceInHexWei(price) {
  const value = conversionUtil(price, {
    fromNumericBase: 'dec',
    toNumericBase: 'hex',
  });
  return addHexPrefix(priceEstimateToWei(value));
}

export function getRenderableGasButtonData(
  estimates,
  gasLimit,
  showFiat,
  conversionRate,
  currentCurrency,
  nativeCurrency,
) {
  const { safeLow, average, fast } = estimates;

  const slowEstimateData = {
    gasEstimateType: GAS_ESTIMATE_TYPES.SLOW,
    feeInPrimaryCurrency: getRenderableEthFee(
      safeLow,
      gasLimit,
      9,
      nativeCurrency,
    ),
    feeInSecondaryCurrency: showFiat
      ? getRenderableConvertedCurrencyFee(
        safeLow,
        gasLimit,
        currentCurrency,
        conversionRate,
      )
      : '',
    priceInHexWei: getGasPriceInHexWei(safeLow),
  };
  const averageEstimateData = {
    gasEstimateType: GAS_ESTIMATE_TYPES.AVERAGE,
    feeInPrimaryCurrency: getRenderableEthFee(
      average,
      gasLimit,
      9,
      nativeCurrency,
    ),
    feeInSecondaryCurrency: showFiat
      ? getRenderableConvertedCurrencyFee(
        average,
        gasLimit,
        currentCurrency,
        conversionRate,
      )
      : '',
    priceInHexWei: getGasPriceInHexWei(average),
  };
  const fastEstimateData = {
    gasEstimateType: GAS_ESTIMATE_TYPES.FAST,
    feeInPrimaryCurrency: getRenderableEthFee(
      fast,
      gasLimit,
      9,
      nativeCurrency,
    ),
    feeInSecondaryCurrency: showFiat
      ? getRenderableConvertedCurrencyFee(
        fast,
        gasLimit,
        currentCurrency,
        conversionRate,
      )
      : '',
    priceInHexWei: getGasPriceInHexWei(fast),
  };

  return {
    slowEstimateData,
    averageEstimateData,
    fastEstimateData,
  };
}

export function getRenderableBasicEstimateData(state, gasLimit) {
  if (getBasicGasEstimateLoadingStatus(state)) {
    return [];
  }

  const { showFiatInTestnets } = getPreferences(state);
  const isMainnet = getIsMainnet(state);
  const showFiat = isMainnet || Boolean(showFiatInTestnets);
  const { conversionRate } = state.starmask;
  const currentCurrency = getCurrentCurrency(state);

  const {
    slowEstimateData,
    averageEstimateData,
    fastEstimateData,
  } = getRenderableGasButtonData(
    state.gas.basicEstimates,
    gasLimit,
    showFiat,
    conversionRate,
    currentCurrency,
  );

  return [slowEstimateData, averageEstimateData, fastEstimateData];
}

export function getRenderableEstimateDataForSmallButtonsFromGWEI(state) {
  if (getBasicGasEstimateLoadingStatus(state)) {
    return [];
  }

  const { showFiatInTestnets } = getPreferences(state);
  const isMainnet = getIsMainnet(state);
  const showFiat = isMainnet || Boolean(showFiatInTestnets);
  const gasLimit =
    state.starmask.send.gasLimit || getCustomGasLimit(state) || '0x2710';
  const { conversionRate } = state.starmask;
  const currentCurrency = getCurrentCurrency(state);
  const {
    gas: {
      basicEstimates: { safeLow, average, fast },
    },
  } = state;

  return [
    {
      gasEstimateType: GAS_ESTIMATE_TYPES.SLOW,
      feeInSecondaryCurrency: showFiat
        ? getRenderableConvertedCurrencyFee(
          safeLow,
          gasLimit,
          currentCurrency,
          conversionRate,
        )
        : '',
      feeInPrimaryCurrency: getRenderableEthFee(
        safeLow,
        gasLimit,
        NUMBER_OF_DECIMALS_SM_BTNS,
      ),
      priceInHexWei: getGasPriceInHexWei(safeLow, true),
    },
    {
      gasEstimateType: GAS_ESTIMATE_TYPES.AVERAGE,
      feeInSecondaryCurrency: showFiat
        ? getRenderableConvertedCurrencyFee(
          average,
          gasLimit,
          currentCurrency,
          conversionRate,
        )
        : '',
      feeInPrimaryCurrency: getRenderableEthFee(
        average,
        gasLimit,
        NUMBER_OF_DECIMALS_SM_BTNS,
      ),
      priceInHexWei: getGasPriceInHexWei(average, true),
    },
    {
      gasEstimateType: GAS_ESTIMATE_TYPES.FAST,
      feeInSecondaryCurrency: showFiat
        ? getRenderableConvertedCurrencyFee(
          fast,
          gasLimit,
          currentCurrency,
          conversionRate,
        )
        : '',
      feeInPrimaryCurrency: getRenderableEthFee(
        fast,
        gasLimit,
        NUMBER_OF_DECIMALS_SM_BTNS,
      ),
      priceInHexWei: getGasPriceInHexWei(fast, true),
    },
  ];
}

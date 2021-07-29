import {
  multiplyCurrencies,
  subtractCurrencies,
} from '../../../../../helpers/utils/conversion-util';
import { addHexPrefix } from '../../../../../../../app/scripts/lib/util';

export function calcMaxAmount({ balance, gasTotal, sendToken, tokenBalance }) {
  const { decimals } = sendToken || {};
  let multiplier = Math.pow(10, Number(decimals || 0));
  if (sendToken && sendToken.code !== '0x00000000000000000000000000000001::STC::STC') {
    multiplier = 1;
  }

  return sendToken
    ? multiplyCurrencies(tokenBalance, multiplier, {
      toNumericBase: 'hex',
      multiplicandBase: 16,
      multiplierBase: 10,
    })
    : subtractCurrencies(addHexPrefix(balance), addHexPrefix(gasTotal), {
      toNumericBase: 'hex',
      aBase: 16,
      bBase: 16,
    });
}

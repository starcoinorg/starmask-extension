import { connect } from 'react-redux';
import BigNumber from 'bignumber.js';
import {
  getIsMainnet,
  getNativeCurrency,
  getPreferences,
} from '../../../selectors';
import { getHexGasTotal } from '../../../helpers/utils/confirm-tx.util';
import { sumHexes } from '../../../helpers/utils/transactions.util';
import { conversionUtil } from '../../../helpers/utils/conversion-util';
import MultiSignTxnBreakdown from './multi-sign-txn-breakdown.component';

const mapStateToProps = (state, ownProps) => {
  const { transaction, isTokenApprove } = ownProps;
  const {
    txParams: { gas, gasPrice, value } = {},
    txReceipt: { gasUsed: gasUsedStr } = {},
  } = transaction;

  const { showFiatInTestnets } = getPreferences(state);
  const isMainnet = getIsMainnet(state);

  let gasUsed = gasUsedStr;
  // check gasUsedStr first in case txReceipt is undefined before txn is confirmed
  if (gasUsedStr && gasUsedStr.slice(0, 2) !== '0x') {
    gasUsed = conversionUtil(new BigNumber(gasUsedStr, 10), {
      fromNumericBase: 'BN',
      toNumericBase: 'hex',
    });
  }
  const gasLimit = typeof gasUsedStr === 'string' ? gasUsed : gas;
  const hexGasTotal =
    (gasLimit && gasPrice && getHexGasTotal({ gasLimit, gasPrice })) || '0x0';
  const totalInHex = sumHexes(hexGasTotal, value);

  return {
    nativeCurrency: getNativeCurrency(state),
    // Do not show fiat, because we have the only one: STC
    // showFiat: isMainnet || Boolean(showFiatInTestnets),
    showFiat: false,
    totalInHex,
    gas,
    gasPrice,
    gasUsed,
    isTokenApprove,
  };
};

export default connect(mapStateToProps)(MultiSignTxnBreakdown);

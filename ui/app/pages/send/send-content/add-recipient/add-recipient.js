import ethUtil from 'ethereumjs-util';
import contractMap from '@metamask/contract-metadata';
import { isConfusing } from 'unicode-confusables';
import { isValidAddress } from '@starcoin/stc-util';
import {
  REQUIRED_ERROR,
  INVALID_RECIPIENT_ADDRESS_ERROR,
  KNOWN_RECIPIENT_ADDRESS_ERROR,
  INVALID_RECIPIENT_ADDRESS_NOT_ETH_NETWORK_ERROR,
  CONFUSING_ENS_ERROR,
  CONTRACT_ADDRESS_ERROR,
  ACCOUNT_NOT_EXISTS,
} from '../../send.constants';

import {
  isValidReceipt,
  checkExistingAddresses,
  isValidDomainName,
  isOriginContractAddress,
  isDefaultMetaMaskChain,
} from '../../../../helpers/utils/util';

export function getToErrorObject(to, sendTokenAddress, chainId) {
  let toError = null;
  if (!to) {
    toError = REQUIRED_ERROR;
    return { to: toError };
  } else if (!isValidReceipt(to)) {
    toError = isDefaultMetaMaskChain(chainId)
      ? INVALID_RECIPIENT_ADDRESS_ERROR
      : INVALID_RECIPIENT_ADDRESS_NOT_ETH_NETWORK_ERROR;
    return { to: toError };
  } else if (isOriginContractAddress(to, sendTokenAddress)) {
    toError = CONTRACT_ADDRESS_ERROR;
    return { to: toError };
  } else if (isValidAddress(to)) {
    return checkExistingAddressesOnCurrentNetwork(to).then((isExisting) => {
      console.log('isExisting', isExisting);
      if (!isExisting) {
        toError = ACCOUNT_NOT_EXISTS;
      }
      return { to: toError };
    });
  }
  return { to: toError };
}

function checkExistingAddressesOnCurrentNetwork(address) {
  try {
    return new Promise((resolve, reject) => {
      return global.ethQuery.getResource(
        address,
        '0x1::Account::Account',
        (err, res) => {
          if (err) {
            return reject(err);
          }
          console.log('res', res, Boolean(res));
          return resolve(Boolean(res));
        },
      );
    });
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export function getToWarningObject(to, tokens = [], sendToken = null) {
  let toWarning = null;
  if (
    sendToken &&
    (ethUtil.toChecksumAddress(to) in contractMap ||
      checkExistingAddresses(to, tokens))
  ) {
    toWarning = KNOWN_RECIPIENT_ADDRESS_ERROR;
  } else if (isValidDomainName(to) && isConfusing(to)) {
    toWarning = CONFUSING_ENS_ERROR;
  }

  return { to: toWarning };
}

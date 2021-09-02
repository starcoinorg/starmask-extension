import abi from 'human-standard-token-abi';
import { calcGasTotal } from '../pages/send/send.utils';
import {
  accountsWithSendEtherInfoSelector,
  getAddressBook,
  getSelectedAccount,
  getTargetAccount,
  getAveragePriceEstimateInHexWEI,
} from '.';

export function getBlockGasLimit(state) {
  return state.starmask.currentBlockGasLimit;
}

export function getConversionRate(state) {
  return state.starmask.conversionRate;
}

export function getNativeCurrency(state) {
  return state.starmask.nativeCurrency;
}

export function getNFTList(state) {
  const nfts = [
    {
      name: 'CryptoPunks',
      price: 1153844.76,
      image: 'https://lh3.googleusercontent.com/48oVuDyfe_xhs24BC2TTVcaYCX7rrU5mpuQLyTgRDbKHj2PtzKZsQ5qC3xTH4ar34wwAXxEKH8uUDPAGffbg7boeGYqX6op5vBDcbA=s2500',
      gallery: [
        {
          id: 1728,
          name: 'CryptoPunks #1728',
          price: 384614.92,
          image: 'https://lh3.googleusercontent.com/EGcV8ALUJYObT9fBp0gUR-SeYZqRhbhZpSXnBF2X_fZkrv69HWl9cOyc3lLikQeib9hbrkPsFBtG7ODgGle6st3WA5ZMsPFjoQzZ',
        },
        {
          id: 3952,
          name: 'CryptoPunks #3952',
          price: 384614.92,
          image: 'https://lh3.googleusercontent.com/uQxZL3qSkcV53HDFeYDnecFKtOMRAILeRVU1q-Jn5aTSeh5wTzWTZ91TTSqjeyOWorwFSaqVmw0lJkRiPSJ6IE0nSlaaAd6OjbqGlQY',
        },
        {
          id: 5123,
          name: 'CryptoPunks #5123',
          price: 384614.92,
          image: 'https://lh3.googleusercontent.com/CLwn9KH4VOLUr5GdIR2-Cm2Fy2KSOCZzmCW1hEDXn3tJOlQgw-qSoBj0R7uX1XogKI8G2EtUFTvbUo6lFNF7Txj7zavhDLj2QDUbzQ',
        },
      ],
    },
    // {
    //   name: 'Meebits',
    //   price: 30887.53,
    //   image: 'https://lh3.googleusercontent.com/qwnNTSRrf9CVq4LGawMcg7i2KZhD9I5LHA4uSNnB43-UAniBBgpNMSIz013HCKtrB9KFjrJUIRwpGbTzzNA4srJV39t3LnW3vaugmB8=s2500',
    //   gallery: [
    //     {
    //       id: 7962,
    //       name: 'Meebit #7962',
    //       price: 30887.53,
    //       image: 'https://lh3.googleusercontent.com/3T6pYQq90GPWi47MUiPKcqqtU2pykasTyftNUUpuy4EsS7uu3yGKqRWW5LK8k-pbR1Ku7eSicLhwrze4zCQELx8aFJjK7RpuM-BVOg',
    //     },
    //   ],
    // },
    // {
    //   name: 'Crypto Blunt',
    //   price: 31.83,
    //   image: 'https://lh3.googleusercontent.com/kANKHDKWPx2MCMhAmWmJQuEFmnxBATw4bf4N1idVtrAOym5zIDIDKd4XE49DwCBNc5REqq2Trmv__90TH4x_GlXZ5qB1i6hF9bGNPbY=s2500',
    //   gallery: [
    //     {
    //       id: 3,
    //       name: '#003 Pixel Bong',
    //       price: 31.83,
    //       image: 'https://lh3.googleusercontent.com/rWVz4O4Yhy6AqDdUbkk9xjxKIZZEQLJp2_FYJbOvEDLaiAHw25CbEyRpsXGgzzvek5wkrMc1hcrmbArKgx9RQUmiFSKtUKcWFi6QVg',
    //     },
    //   ],
    // },
  ];
  return nfts;
}
export function getGasLimit(state) {
  return state.starmask.send.gasLimit || '0';
}

export function getGasPrice(state) {
  return state.starmask.send.gasPrice || getAveragePriceEstimateInHexWEI(state);
}

export function getGasTotal(state) {
  return calcGasTotal(getGasLimit(state), getGasPrice(state));
}

export function getPrimaryCurrency(state) {
  const sendToken = getSendToken(state);
  return sendToken?.symbol;
}

export function getSendToken(state) {
  return state.starmask.send.token;
}

export function getSendTokenAddress(state) {
  return getSendToken(state)?.address;
}

export function getSendTokenCode(state) {
  return getSendToken(state)?.code;
}

export function getSendTokenContract(state) {
  const sendTokenAddress = getSendTokenAddress(state);
  return sendTokenAddress
    ? global.eth.contract(abi).at(sendTokenAddress)
    : null;
}

export function getSendAmount(state) {
  return state.starmask.send.amount;
}

export function getSendHexData(state) {
  return state.starmask.send.data;
}

export function getSendHexDataFeatureFlagState(state) {
  return state.starmask.featureFlags.sendHexData;
}

export function getSendEditingTransactionId(state) {
  return state.starmask.send.editingTransactionId;
}

export function getSendErrors(state) {
  return state.send.errors;
}

export function sendAmountIsInError(state) {
  return Boolean(state.send.errors.amount);
}

export function getSendFrom(state) {
  return state.starmask.send.from;
}

export function getSendFromBalance(state) {
  const fromAccount = getSendFromObject(state);
  return fromAccount.balance;
}

export function getSendFromObject(state) {
  const fromAddress = getSendFrom(state);
  return fromAddress
    ? getTargetAccount(state, fromAddress)
    : getSelectedAccount(state);
}

export function getSendMaxModeState(state) {
  return state.starmask.send.maxModeOn;
}

export function getSendTo(state) {
  return state.starmask.send.to;
}

export function getSendToNickname(state) {
  return state.starmask.send.toNickname;
}

export function getSendToReceiptIdentifier(state) {
  return state.starmask.send.toReceiptIdentifier;
}

export function getSendToReceiptIdentifierFromIdentities(state) {
  const identify = state.starmask.identities[state.starmask.send.to];
  const receiptIdentifier = identify && identify.receiptIdentifier || undefined;
  return receiptIdentifier || state.starmask.send.toReceiptIdentifier || '';
}

export function getSendToAccounts(state) {
  const fromAccounts = accountsWithSendEtherInfoSelector(state);
  const addressBookAccounts = getAddressBook(state);
  return [...fromAccounts, ...addressBookAccounts];
}
export function getTokenBalance(state) {
  return state.starmask.send.tokenBalance;
}

export function getSendEnsResolution(state) {
  return state.starmask.send.ensResolution;
}

export function getSendEnsResolutionError(state) {
  return state.starmask.send.ensResolutionError;
}

export function getUnapprovedTxs(state) {
  return state.starmask.unapprovedTxs;
}

export function getQrCodeData(state) {
  return state.appState.qrCodeData;
}

export function getGasLoadingError(state) {
  return state.send.errors.gasLoading;
}

export function gasFeeIsInError(state) {
  return Boolean(state.send.errors.gasFee);
}

export function getGasButtonGroupShown(state) {
  return state.send.gasButtonGroupShown;
}

export function getTitleKey(state) {
  const isEditing = Boolean(getSendEditingTransactionId(state));
  const isToken = Boolean(getSendToken(state));

  if (!getSendTo(state)) {
    return 'addRecipient';
  }

  if (isEditing) {
    return 'edit';
  } else if (isToken) {
    return 'sendTokens';
  }
  return 'send';
}

export function isSendFormInError(state) {
  return Object.values(getSendErrors(state)).some((n) => n);
}

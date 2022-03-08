import contractMap from '@starcoin/contract-metadata';

/**
 * A normalized list of addresses exported as part of the contractMap in
 * @starcoin/contract-metadata. Used primarily to validate if manually entered
 * contract addresses do not match one of our listed tokens
 */
export const LISTED_CONTRACT_CODES = Object.keys(contractMap).map((code) =>
  code.toLowerCase(),
);

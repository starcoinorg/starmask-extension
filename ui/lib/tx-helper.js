// import log from 'loglevel';
import { transactionMatchesNetwork } from '../../shared/modules/transaction.utils';
import { valuesFor } from '../app/helpers/utils/util';

export default function txHelper(
  unapprovedTxs,
  unapprovedMsgs,
  personalMsgs,
  decryptMsgs,
  encryptionPublicKeyMsgs,
  typedMessages,
  network,
  chainId,
) {
  const txValues = network
    ? valuesFor(unapprovedTxs).filter((txMeta) =>
      transactionMatchesNetwork(txMeta, chainId, network),
    )
    : valuesFor(unapprovedTxs);

  const msgValues = valuesFor(unapprovedMsgs);
  let allValues = txValues.concat(msgValues);

  const personalValues = valuesFor(personalMsgs);
  allValues = allValues.concat(personalValues);

  const decryptValues = valuesFor(decryptMsgs);
  allValues = allValues.concat(decryptValues);

  const encryptionPublicKeyValues = valuesFor(encryptionPublicKeyMsgs);
  allValues = allValues.concat(encryptionPublicKeyValues);

  const typedValues = valuesFor(typedMessages);
  allValues = allValues.concat(typedValues);

  allValues = allValues.sort((a, b) => {
    return a.time - b.time;
  });

  return allValues;
}

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import {
  nonceSortedCompletedTransactionsSelector,
  nonceSortedPendingTransactionsSelector,
} from '../../../selectors/transactions';
import { getCurrentChainId, getSelectedAddress } from '../../../selectors';
import { useI18nContext } from '../../../hooks/useI18nContext';
import TransactionListItem from '../transaction-list-item';
import Button from '../../ui/button';
import { TOKEN_CATEGORY_HASH } from '../../../helpers/constants/transactions';
import { SWAPS_CHAINID_CONTRACT_ADDRESS_MAP } from '../../../../../shared/constants/swaps';
import { TRANSACTION_TYPES } from '../../../../../shared/constants/transaction';
import { handlePendingTxsOffline } from '../../../store/actions';

const PAGE_INCREMENT = 10;
const DELAY = 10000;

// When we are on a token page, we only want to show transactions that involve that token.
// In the case of token transfers or approvals, these will be transactions sent to the
// token contract. In the case of swaps, these will be transactions sent to the swaps contract
// and which have the token address in the transaction data.
//
// getTransactionGroupRecipientAddressFilter is used to determine whether a transaction matches
// either of those criteria
const getTransactionGroupRecipientAddressFilter = (
  recipientAddress,
  tokenCode,
  chainId,
) => {
  return ({ initialTransaction: { txParams, type, code } }) => {
    return (
      (type === TRANSACTION_TYPES.TOKEN_METHOD_TRANSFER &&
        code === tokenCode &&
        [txParams?.from, txParams?.to].includes(recipientAddress)) ||
      (txParams?.to === SWAPS_CHAINID_CONTRACT_ADDRESS_MAP[chainId] &&
        txParams?.data && txParams?.data.match(recipientAddress.slice(2)))
    );
  };
};

const tokenTransactionFilter = ({
  initialTransaction: { type, destinationTokenSymbol, sourceTokenSymbol },
}) => {
  if (TOKEN_CATEGORY_HASH[type]) {
    return false;
  } else if (type === TRANSACTION_TYPES.SWAP) {
    return destinationTokenSymbol === 'STC' || sourceTokenSymbol === 'STC';
  }
  return true;
};

const getFilteredTransactionGroups = (
  transactionGroups,
  hideTokenTransactions,
  tokenAddress,
  tokenCode,
  chainId,
) => {
  if (hideTokenTransactions) {
    return transactionGroups.filter(tokenTransactionFilter);
  } else if (tokenAddress) {
    return transactionGroups.filter(
      getTransactionGroupRecipientAddressFilter(tokenAddress, tokenCode, chainId),
    );
  }
  return transactionGroups;
};

export default function TransactionList({
  hideTokenTransactions,
  tokenAddress,
  tokenCode,
}) {
  const [limit, setLimit] = useState(PAGE_INCREMENT);
  const t = useI18nContext();

  const unfilteredPendingTransactions = useSelector(
    nonceSortedPendingTransactionsSelector,
  );
  const unfilteredCompletedTransactions = useSelector(
    nonceSortedCompletedTransactionsSelector,
  );
  const chainId = useSelector(getCurrentChainId);
  const selectedAddress = useSelector(getSelectedAddress);
  const pendingTransactions = useMemo(
    () =>
      getFilteredTransactionGroups(
        unfilteredPendingTransactions,
        hideTokenTransactions,
        tokenAddress,
        tokenCode,
        chainId,
      ),
    [
      unfilteredPendingTransactions,
      hideTokenTransactions,
      tokenAddress,
      tokenCode,
      chainId,
    ],
  );
  const completedTransactions = useMemo(
    () =>
      getFilteredTransactionGroups(
        unfilteredCompletedTransactions,
        hideTokenTransactions,
        tokenAddress,
        tokenCode,
        chainId,
      ),
    [
      unfilteredCompletedTransactions,
      hideTokenTransactions,
      tokenAddress,
      tokenCode,
      chainId,
    ],
  );

  const viewMore = useCallback(
    () => setLimit((prev) => prev + PAGE_INCREMENT),
    [],
  );

  const pendingLength = pendingTransactions.length;

  const timer = useRef(null); // we can save timer in useRef and pass it to child

  const dispatch = useDispatch();

  const handlePendingTxs = (selectedAddress) => {
    dispatch(handlePendingTxsOffline(selectedAddress));
  }


  useEffect(() => {
    // first, trigger at component inited
    handlePendingTxs(selectedAddress);
    // then, repeat with interval of 10 seconds
    // useRef value stored in .current property
    timer.current = setInterval(() => handlePendingTxs(selectedAddress), DELAY);
    // clear on component unmount
    return () => {
      clearInterval(timer.current);
    };
  }, []);

  return (
    <div className="transaction-list">
      <div className="transaction-list__transactions">
        {pendingLength > 0 && (
          <div className="transaction-list__pending-transactions">
            <div className="transaction-list__header">
              {`${ t('queue') } (${ pendingTransactions.length })`}
            </div>
            {pendingTransactions.map((transactionGroup, index) => (
              <TransactionListItem
                isEarliestNonce={index === 0}
                transactionGroup={transactionGroup}
                key={`${ transactionGroup.nonce }:${ index }`}
              />
            ))}
          </div>
        )}
        <div className="transaction-list__completed-transactions">
          {pendingLength > 0 ? (
            <div className="transaction-list__header">{t('history')}</div>
          ) : null}
          {completedTransactions.length > 0 ? (
            completedTransactions
              .slice(0, limit)
              .map((transactionGroup, index) => (
                <TransactionListItem
                  transactionGroup={transactionGroup}
                  key={`${ transactionGroup.nonce }:${ limit + index - 10 }`}
                />
              ))
          ) : (
            <div className="transaction-list__empty">
              <div className="transaction-list__empty-text">
                {t('noTransactions')}
              </div>
            </div>
          )}
          {completedTransactions.length > limit && (
            <Button
              className="transaction-list__view-more"
              type="secondary"
              rounded
              onClick={viewMore}
            >
              View More
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

TransactionList.propTypes = {
  hideTokenTransactions: PropTypes.bool,
  tokenAddress: PropTypes.string,
  tokenCode: PropTypes.string,
};

TransactionList.defaultProps = {
  hideTokenTransactions: false,
  tokenAddress: undefined,
  tokenCode: undefined,
};

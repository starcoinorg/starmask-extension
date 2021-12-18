import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { useHistory } from 'react-router-dom';
import log from 'loglevel';
import ListItem from '../../ui/list-item';
import { useMultiSignTxnDisplayData } from '../../../hooks/useMultiSignTxnDisplayData';
import { useI18nContext } from '../../../hooks/useI18nContext';
import MultiSignTxnListItemDetails from '../multi-sign-txn-list-item-details';
import { CONFIRM_TRANSACTION_ROUTE } from '../../../helpers/constants/routes';
import TransactionStatus from '../transaction-status/transaction-status.component';
import TransactionIcon from '../transaction-icon';
import {
  TRANSACTION_GROUP_CATEGORIES,
  TRANSACTION_STATUSES,
} from '../../../../../shared/constants/transaction';

export default function MultiSignTxnListItem({
  transactionGroup,
  isEarliestNonce = false,
}) {
  const t = useI18nContext();
  const history = useHistory();
  const { hasCancelled } = transactionGroup;
  const [showDetails, setShowDetails] = useState(false);

  const err = null;
  const { id, status } = transactionGroup;

  const newTransactionGroup = {
    ...transactionGroup,
    initialTransaction: transactionGroup,
    primaryTransaction: transactionGroup,
  };

  const {
    title,
    subtitle,
    subtitleContainsOrigin,
    date,
    category,
    primaryCurrency,
    recipientAddress,
    secondaryCurrency,
    displayedStatusKey,
    isPending,
    senderAddress,
  } = useMultiSignTxnDisplayData(newTransactionGroup);

  log.debug('useMultiSignTxnDisplayData', {
    title,
    subtitle,
    subtitleContainsOrigin,
    date,
    category,
    primaryCurrency,
    recipientAddress,
    secondaryCurrency,
    displayedStatusKey,
    isPending,
    senderAddress,
  })
  const isSignatureReq =
    category === TRANSACTION_GROUP_CATEGORIES.SIGNATURE_REQUEST;
  const isApproval = category === TRANSACTION_GROUP_CATEGORIES.APPROVAL;
  const isUnapproved = status === TRANSACTION_STATUSES.UNAPPROVED;
  const isSwap = category === TRANSACTION_GROUP_CATEGORIES.SWAP;

  const className = classnames('transaction-list-item', {
    'transaction-list-item--unconfirmed': false,
  });

  const toggleShowDetails = useCallback(() => {
    if (isUnapproved) {
      history.push(`${CONFIRM_TRANSACTION_ROUTE}/${id}`);
      return;
    }
    setShowDetails((prev) => !prev);
  }, [isUnapproved, history, id]);

  return (
    <>
      <ListItem
        onClick={toggleShowDetails}
        className={className}
        title={title}
        icon={
          <TransactionIcon category={category} status={displayedStatusKey} />
        }
        subtitle={
          <h3>
            <TransactionStatus
              isPending={isPending}
              isEarliestNonce={isEarliestNonce}
              error={err}
              date={date}
              status={displayedStatusKey}
            />
            <span
              className={
                subtitleContainsOrigin
                  ? 'transaction-list-item__origin'
                  : 'transaction-list-item__address'
              }
              title={subtitle}
            >
              {subtitle}
            </span>
          </h3>
        }
        rightContent={
          !isSignatureReq &&
          !isApproval && (
            <>
              <h2
                title={primaryCurrency}
                className="transaction-list-item__primary-currency"
              >
                {primaryCurrency}
              </h2>
              <h3 className="transaction-list-item__secondary-currency">
                {secondaryCurrency}
              </h3>
            </>
          )
        }
      />
      {showDetails && (
        <MultiSignTxnListItemDetails
          title={title}
          onClose={toggleShowDetails}
          transactionGroup={newTransactionGroup}
          primaryCurrency={primaryCurrency}
          senderAddress={senderAddress}
          recipientAddress={recipientAddress}
          showRetry={status === TRANSACTION_STATUSES.FAILED && !isSwap}
          isEarliestNonce={isEarliestNonce}
          showCancel={isPending && !hasCancelled}
        />
      )}
    </>
  );
}

MultiSignTxnListItem.propTypes = {
  transactionGroup: PropTypes.object.isRequired,
  isEarliestNonce: PropTypes.bool,
};

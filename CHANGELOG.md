# Changelog

## [2.2.2] - 2021-09-30
- Bug fixes:
    1. do not show NFT gallery image_data field


## [2.2.1] - 2021-09-26
- New features:
    1. support encrypt/decrypt message

## [2.1.0] - 2021-09-18
- New features:
    1. Add a NFT tab in the home page
    2. support `Add NFT Gallery`
    3. support `Transfer NFT`

- Bug fixes:
    1. Do not display `0 STC` in the top of confirm transaction page.

## [2.0.2] - 2021-08-28
- Bug fixes:
    1. Allow multi transactions，nonce is sync with sequenceNumber on chain
    2. If the status of the receipt of a transaction is not Executed(like MoveAbout), then display failed
    3. show transactionErrored in the bottom of transaction-activity-log

## [2.0.0] - 2021-08-26
- New features:
    1. Check the max gasPrice(10000) and the max gasLimit(40000000)
    2. Execute empty_script to miniliaze the gas fee to around 8439

- Bug fixes:
    1. Support cancel all kinds of transactions(send stc and scriptFunction)
    2. Shrink the expire time of a transaction from 12 hours to 30 minutes

## [1.9.7] - 2021-08-19
- Bug fixes:
    1. fix: toUpperCase of undefined
    2. fix: publickKey of undefined

## [1.9.5] - 2021-08-16
- New features:
    1. Enable system notifications for transaction CONFIRMED and FAILED
    2. Update docs about how to enable system notifications on Mac.
    3. Display contract.dry_run_raw error in transaction confirm page

- Bug fixes:
    1. do not fetch https://min-api.cryptocompare.com for CurrencyRate
    2. do not fetch https://api.coingecko.com for updateExchangeRates
    3. do not call eth_call for getContractMethodData and tryReverseResolveAddress
    4. update @starcoin/stc-inpage-provider from 0.3.1 to 0.3.4

## [1.9.1] - 2021-08-07
- New features:
    1. support optional custom expiredSecs in txParams, default value is 43200(12 hours)

- Bug fixes:
    1. add back receiptIdentifier view and search, because other exchange platforms are using it to send STC.

## [1.9.0] - 2021-08-06
- New features:
    1. custom add token, accept token, send token, hide token.
	    - while add token,the token contract code pattern is: address:moduleName:structName
	    - after add a token, you must accept this token first, then you can send or receive this token.
    2. add `how-to-debug.md` in docs

- Bug fixes:
    1. cancel send transaction is not working
    2. account balance and tokens balance should be synced with network switching
    3. hide receiptIdentifier entrances in send search input
    4. shrink minGasLimit from 13000 to 10000 nanoSTC

## [1.8.1] - 2021-07-17
- support Package and ScriptFunction using contract.dry_run_raw in [starmask-test-dapp](https://github.com/starcoinorg/starmask-test-dapp)
- fix txn detail page failed: check gasUsedStr first in case txReceipt is undefined before txn is confirmed

## [1.8.0] - 2021-07-14
- support depoly contract and call contract function in [starmask-test-dapp](https://github.com/starcoinorg/starmask-test-dapp)
- add intro of how to install from latest release zip in docs
- fix: test-dapp failed on chainChanged event while switch to http://localhost:9850

## [1.7.0] - 2021-07-11
- support `Personal Sign' in [starmask-test-dapp](https://github.com/starcoinorg/starmask-test-dapp)
- change explorer url to https://stcscan.io
- fix: create vault by import mnemoonic will get 2 accounts

## [1.6.1] - 2021-07-01
- fix: scannedAddress is not undefined while switch network in the send page
- fix: display errors in the transaction detail page

## [1.6.0] - 2021-06-26
- fix bug: the exported privateKey and receiptIdentifier of HD accounts are the same
- sync with @starcoin/stc-keyring-controller^1.3.1

## [1.5.1] - 2021-06-25
- Do not check the existence on the chain of the 0x's Receipt Address while send STC.

## [1.5.0] - 2021-06-23
- support web Dapps wake up the wallet popup window to confirm a trnasaction(payload type is ScriptFunction), type=CONTRACT_INTERACTION.

## [1.4.2] - 2021-06-10

- fix #6: scan qrImage get address with prefix of `ethereum:`
- fix: the public key shown in the detail page of the account that imported from mnemonic is incorrect

## [1.4.0] - 2021-06-09

- support `Send STC` in [starmask-test-dapp](https://github.com/starcoinorg/starmask-test-dapp)

## [1.3.0] - 2021-06-07

- add public key in the account detail page
- fix explorer url in the transaction detail page

## [1.2.0] - 2021-06-02

- support 2 sections in [starmask-test-dapp](https://github.com/starcoinorg/starmask-test-dapp) :
    - Status
    - Basic Actions (Install/Connect + getSelectedAccount)

## 1.1.1 2021-05-31
- change loading gif

## 1.1.0 2021-05-26
- show the receiptIdentifier in the details popup page for the imported account
- send STC to the imported account in another network using its receiptIdentifier
- the receiptIdentifier should be generated while importing mnemonic to create HD accounts
- do not show fiat in the Main net

## 1.0.0 2021-05-25
- send STC to the receipt using receiptIdentifier
- if the receipt is a valid address, check whether it is exists on the current network first 

## 0.7.0 2021-05-23
- Break Changes:
    The private key curve type of the `HD Key Tree` keyring is changed from secp256k1 to ed25519.
    Therefore the mnemonic is not compatible with the previous versions.
- successful send STC to an non-exists account using account receiptIdentifier, instead of account address
- publish firefox extension also
## 0.6.0 2021-05-19
- fix: created account address length should be 32

## 0.5.1 2021-05-14
- fix conflict with metamask-extension in the chrome browser

## 0.4.0 2021-05-13
- support MainNet

## 0.3.8 2021-05-09
- add CHANGELOG.md
- Replace logo images and colors

## 0.2.2 2021-05-07
- Import account from  privateKey
- Send STC between accounts impoted from privateKey

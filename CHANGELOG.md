# Changelog

## [5.0.5] - 2022-10-31

- New features:
  - Support switch network between Starcoin Mainnet and Aptos Mainnet, which chainId are the same: 0x1

## [5.0.1] - 2022-10-20

- New features:
  - [#80 Support Aptos ](https://github.com/starcoinorg/starmask-extension/issues/80)
    - New features: Support Aptos blockchain
    - Create new vault or import from mnemonic
    - Create account or import from private key
    - Aptos mainnet/testnet/devnet
    - Send APT
    - Add token and Send token
    - Confirm and publish transaction submitted from any Dapps

## [4.8.0] - 2022-10-17

- Bug fixes:

  - [#85 state.get_with_proof_by_root_raw does not exists](https://github.com/starcoinorg/starmask-extension/issues/85)

## [4.7.0] - 2022-07-10

- Bug fixes:

  - [#72 Display token changes while the Dapp submit a transaction using peer_2_peer scriptFunction ](https://github.com/starcoinorg/starmask-extension/issues/72)

- New features:
  - [#78 Add a tab to display IdentifierNFT in the home page ](https://github.com/starcoinorg/starmask-extension/issues/78)

## [4.6.0] - 2022-06-29

- New features:
  - [#55 Display the token changes that caused by a transaction in a DApp ](https://github.com/starcoinorg/starmask-extension/issues/55)

## [4.5.1] - 2022-06-17

- New features:
  - Support display logos for WEN/XUSDT/XETH/STAR/FAI in MAIN network.

## [4.4.0] - 2022-06-15

- Bug fixes:

  - [#67 Couldn't find package "@onekeyhq/connect@8.6.1" required by "@starcoin/stc-onekey-keyring@^1.1.1"](https://github.com/starcoinorg/starmask-extension/issues/67)

  - Chrome extension icon is scaled, should be 48x48

## [4.3.0] - 2022-06-14

- New features:
  - Update STC logos

## [4.2.0] - 2022-05-11

- Bug fixes:

  - [#59 Trim the input text while paste address in the send page](https://github.com/starcoinorg/starmask-extension/issues/59)

  - [#61 Cache address->publicKey while using Onekey](https://github.com/starcoinorg/starmask-extension/issues/61)

## [4.1.0] - 2022-04-07

- Bug fixes:

  - [#56 If an account is just created in the wallet, it is not exists on the chain, should receive token](https://github.com/starcoinorg/starmask-extension/issues/56)

- New features:

  - add switch-starcoin-chain confirmation page to support method `wallet_switchStarcoinChain` from Dapps

## [4.0.1] - 2022-03-31

- Bug fixes:

  - Replace `MultiSign` with `MultiSig` while diplay on the page

## [4.0.0] - 2022-03-20

- New features:

  - Support [multi sign account and transaction](https://starcoin.org/zh/developer/cli/multisig_account/)

## [3.8.1] - 2022-03-08

- Bug fixes:

  - [#50 can not re-add a token if it is hidden](https://github.com/starcoinorg/starmask-extension/issues/50)
  - upgrade check pending interval to 10 seconds
  - copy transaction detail for both FAILED and DROPPED

## [3.8.0] - 2022-03-05

- New features:

  - copy failed transaction detial to clipboard in the transaction detial pop window
  - add 2 token logos for STAR and FAI

- Bug fixes:

  - [#51 Optimize pending transactions handling](https://github.com/starcoinorg/starmask-extension/issues/51)
  - [#52 Hide token with zero balance](https://github.com/starcoinorg/starmask-extension/issues/52)

## [3.7.0] - 2022-02-23

- New features:
  - add chain.get_transaction_info for Dapp' getTransactionReceipt

## [3.6.1] - 2022-02-11

- Bug fixes:
  - [#48 Can not add starswap lp token pair](https://github.com/starcoinorg/starmask-extension/issues/48)
  - fix: if one account added one token, the other account can not add it again

## [3.5.1] - 2022-02-08

- New features:
  - i18n supports francais

## [3.4.0] - 2022-01-12

- Bug fixes:
  - [#40 Import token with checksum address will be failed](https://github.com/starcoinorg/starmask-extension/issues/40)
  - [#42 Automatically display accepted token in the asset list, should not adding token first](https://github.com/starcoinorg/starmask-extension/issues/42)

## [3.3.0] - 2022-01-07

- New features:
  - add english version of Docs
  - Support optional custom `addGasBufferMultiplier` in txParams, the default value is 1.5

## [3.2.0] - 2021-12-23

- New features:

  - Support search and add custom token with customize logo

- Bug fixes:
  - Delete unused token logo images
  - Shrink published zip file size from 10M to 6M

## [3.1.1] - 2021-12-20

- Bug fixes:
  - Support max decimals up to 18

## [3.1.0] - 2021-11-26

- New features:
  - [#30 Automatically trigger an accept token transaction while add token](https://github.com/starcoinorg/starmask-extension/issues/30)
  - [#34 Add an account settings pop window with a switch of AutoAcceptToken inside it](https://github.com/starcoinorg/starmask-extension/issues/34)
  - [#35 Check whether the receiver has accepted the token before sending, if not, give a prompt](https://github.com/starcoinorg/starmask-extension/issues/35)
  - [#36 Check whether the receiver has added the gallery before sending NFT, if not, give a prompt](https://github.com/starcoinorg/starmask-extension/issues/36)

## [3.0.3] - 2021-11-16

- Bug fixes:
  - [#32 OneKey postmessage will get lost if the popup window lost focus](https://github.com/starcoinorg/starmask-extension/issues/32)
  - [#33 Should display the error message while dry_run in the send page](https://github.com/starcoinorg/starmask-extension/issues/33)

## [3.0.1] - 2021-11-13

- New features:

  - Support hardware wallet OneKey (Firmware version >= 2.1.10)

- Bug fixes:
  - [#27 Invalid params: invalid type null, expected a string.](https://github.com/starcoinorg/starmask-extension/issues/27)
  - [#28 The tips icon's color of custom token is yellow](https://github.com/starcoinorg/starmask-extension/issues/28)
  - [#29 Always show 'Gas limit must be at least 13000' in the confirm transaction page](https://github.com/starcoinorg/starmask-extension/issues/29)

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

  1. support optional custom `expiredSecs` in txParams, default value is 43200(12 hours)

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

- Import account from privateKey
- Send STC between accounts impoted from privateKey

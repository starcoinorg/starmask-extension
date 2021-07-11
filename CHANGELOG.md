# Changelog

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

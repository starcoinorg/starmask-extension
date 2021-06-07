# Changelog

## [1.3.0] - 2021-06-07

- add public key in detail page
- fix transaction detail url in explorer

## [1.2.0] - 2021-06-02

- support [starmask-test-dapp](https://github.com/starcoinorg/starmask-test-dapp) for 2 sections:
 - Status
 - Basic Actions (install/connect + get_accounts)

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

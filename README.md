# StarMask

A blockchain wallet browser extension for Starcoin blockchain.

# Initialize

```
yarn setup
cp .starmaskrc.dist .starmaskrc # change the values according to your needs
yarn start
```

# Development

It is convenient to use `yarn link @starcoin-org/xxx` for debugging in localhost,

but dont forget doing the following steps before next release:

```
yarn unlink @starcoin-org/xxx`
yarn add @starcoin-org/xxx
yarn setup:postinstall
```

# How to transfer the old state in local storage to new state

1. check the last_version_number in `app/scripts/migrations/index.js`
2. NEW_VERSION = last_version_number + 1
3. `yarn generate:migration <NEW_VERSION>` to generate `app/scripts/migrations/<NEW_VERSION>.js` and `app/scripts/migrations/<NEW_VERSION>.test.js`
4. modify `transformState` in `app/scripts/migrations/<NEW_VERSION>.js`, add test cases in `app/scripts/migrations/<NEW_VERSION>.test.js`
5. add following line in `app/scripts/migrations/index.js`:

```
require('./<NEW_VERSION>').default,
```

6. run `yarn start` or wait until it reloaded, then the old state will be migrated to the new state.

Tips:

1. check `054.js` and `054.test.js` for demo of handling tokens.

2. if you want to debug and re-run <NEW_VERSION>.js multi times, you can add following in `app/scripts/background.js` -> loadStateFromPersistence

```
 versionedData.meta.version = <last_version_number>;
```

before this line:

```
  const { TransactionController } = versionedData.data;
```

# Add build to Chrome

- For security reason, highly reommand add a new profile:
  - open Chrome
  - At the top right
  - click Profile
  - Click Add. Choose a name, photo and color scheme.
- Open Settings > Extensions.
- Check "Developer mode".
- Alternatively, use the URL chrome://extensions/ in your address bar
- At the top, click Load Unpacked Extension.
- Navigate to `dist/chrome` folder
- Click Select.
- Change to your locale via chrome://settings/languages
- Restart the browser and test the plugin in your locale

# Publish

- change version in `app/manifest/_base.json`
- `yarn dist`

# How to display custom tokens logo in Main network

1. Maintain custom tokens in [@starcoin-org/starmask-contract-metadata](https://github.com/starcoinorg/starmask-contract-metadata)

- add token info in `contract-map.json`
- add logo svg/png in folder `images`
- update version in package.json

2. in `starmask-extension`

- update `@starcoin-org/starmask-contract-metadata` version to the latest one
- copy and paste logo into folder `app/images/contract`

# Docs

- [How to install](./docs/en/how-to-install.md)
- [How to use](./docs/en/how-to-use.md)

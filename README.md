# StarMask
A blockchain wallet browser extension for Starcoin blockchain.

# How to install @onekeyhq/eth-onekey-keyring

1. github->Settings->Developer Settings-> Personal access tokens 

2. add a token with only 2 permissions: repo and read::packages

3. `npm login` with this token as password

4. `npm config set @onekeyhq:registry https://npm.pkg.github.com`

5. `more ~/.npmrc`

```
registry=https://registry.npmjs.org/
@onekeyhq:registry=https://npm.pkg.github.com
```

6. `yarn add @onekeyhq/eth-onekey-keyring`


# Initialize

```
yarn setup
cp .starmaskrc.dist .starmaskrc # change the values according to your needs
yarn start
```
# Development

It is convenient to use `yarn link @starcoin/xxx` for debugging in localhost,

but dont forget doing the following steps before next release:

```
yarn unlink @starcoin/xxx`
yarn add @starcoin/xxx
yarn setup:postinstall
```

# How to transfer the old state in local storage to new state
1. check the last_version_number in `app/scripts/migrations/index.js`
2. NEW_VERSION = last_version_number + 1
3. `yarn generate:migration <NEW_VERSION>` to generate `app/scripts/migrations/<NEW_VERSION>.js` and `app/scripts/migrations/<NEW_VERSION>.test.js`
4. modify `transformState` in  `app/scripts/migrations/<NEW_VERSION>.js`, add test cases in `app/scripts/migrations/<NEW_VERSION>.test.js`
5. add following line in `app/scripts/migrations/index.js`:

```
require('./<NEW_VERSION>').default, 
```

6. run `yarn start` or wait until it reloaded, then the old state will be migrated to the new state.

Tips:
if you want to debug and re-run <NEW_VERSION>.js multi times ,you can add following in `app/scripts/background.js` -> loadStateFromPersistence  

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
- change version in app/manifest/_base.json
- `yarn dist`

# Docs
- [How to install](./docs/how-to-install.md)
- [How to use](./docs/how-to-use.md)
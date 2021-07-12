# StarMask
A blockchain wallet browser extension for Starcoin blockchain.

# Initialize
```
yarn setup
cp .starmaskrc.dist .starmaskrc # change the values according to your needs
yarn start
```
# Development

It is convenient to use `yarn link @starcoin/xxx` for debugging,

but dont forget doing the following steps before next release:

```
yarn unlink @starcoin/xxx`
yarn add @starcoin/xxx
yarn setup:postinstall
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
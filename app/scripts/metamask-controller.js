import EventEmitter from 'events';
import pump from 'pump';
import { ethers } from 'ethers';
import { AptosAccount } from '@starcoin/aptos';
const { arrayify, hexlify } = ethers.utils;
import { ObservableStore } from '@metamask/obs-store';
import { storeAsStream } from '@metamask/obs-store/dist/asStream';
import { JsonRpcEngine } from 'json-rpc-engine';
import { debounce } from 'lodash';
import createEngineStream from 'json-rpc-middleware-stream/engineStream';
import createFilterMiddleware from 'eth-json-rpc-filters';
import createSubscriptionManager from 'eth-json-rpc-filters/subscriptionManager';
import providerAsMiddleware from '@starcoin/stc-json-rpc-middleware/providerAsMiddleware';
import KeyringController from '@starcoin/stc-keyring-controller';
import { Mutex } from 'await-semaphore';
import {
  stripHexPrefix,
  toChecksumAddress,
  privateToPublicED,
  addHexPrefix,
} from '@starcoin/stc-util';
import { utils, starcoin_types, encoding } from '@starcoin/starcoin';
import BigNumber from 'bignumber.js';
import log from 'loglevel';
import OneKeyKeyring from 'stc-lib-onekey-keyring;
import MutiSignKeyring from '@starcoin/stc-multisign-keyring';
// import LedgerBridgeKeyring from '@metamask/eth-ledger-bridge-keyring';
import StcQuery from '@starcoin/stc-query';
import nanoid from 'nanoid';
import contractMap from '@starcoin/contract-metadata';
import {
  AddressBookController,
  ApprovalController,
  CurrencyRateController,
  PhishingController,
} from '@metamask/controllers';
import { TRANSACTION_STATUSES } from '../../shared/constants/transaction';
import { MAINNET_CHAIN_ID } from '../../shared/constants/network';
import { hexToDecimal } from '../../ui/app/helpers/utils/conversions.util';
import { isValidReceiptIdentifier } from '../../ui/app/helpers/utils/util';
import ComposableObservableStore from './lib/ComposableObservableStore';
import AccountTracker from './lib/account-tracker';
import createLoggerMiddleware from './lib/createLoggerMiddleware';
import createMethodMiddleware from './lib/rpc-method-middleware';
import createOriginMiddleware from './lib/createOriginMiddleware';
import createTabIdMiddleware from './lib/createTabIdMiddleware';
import createOnboardingMiddleware from './lib/createOnboardingMiddleware';
import { setupMultiplex } from './lib/stream-utils';
import EnsController from './controllers/ens';
import NetworkController, { NETWORK_EVENTS } from './controllers/network';
import PreferencesController from './controllers/preferences';
import AppStateController from './controllers/app-state';
import CachedBalancesController from './controllers/cached-balances';
import AlertController from './controllers/alert';
import OnboardingController from './controllers/onboarding';
import IncomingTransactionsController from './controllers/incoming-transactions';
import MessageManager from './lib/message-manager';
import DecryptMessageManager from './lib/decrypt-message-manager';
import EncryptionPublicKeyManager from './lib/encryption-public-key-manager';
import PersonalMessageManager from './lib/personal-message-manager';
import TypedMessageManager from './lib/typed-message-manager';
import TransactionController from './controllers/transactions';
import TokenRatesController from './controllers/token-rates';
import DetectTokensController from './controllers/detect-tokens';
import SwapsController from './controllers/swaps';
import { PermissionsController } from './controllers/permissions';
import { NOTIFICATION_NAMES } from './controllers/permissions/enums';
import getRestrictedMethods from './controllers/permissions/restrictedMethods';
import nodeify from './lib/nodeify';
import accountImporter from './account-import-strategies';
import seedPhraseVerifier from './lib/seed-phrase-verifier';
import MetaMetricsController from './controllers/metametrics';
import { segment, segmentLegacy } from './lib/segment';
import createMetaRPCHandler from './lib/createMetaRPCHandler';
import browser from 'webextension-polyfill'

export const METAMASK_CONTROLLER_EVENTS = {
  // Fired after state changes that impact the extension badge (unapproved msg count)
  // The process of updating the badge happens in app/scripts/background.js.
  UPDATE_BADGE: 'updateBadge',
};

const TICKER_HD_KEYRING_TYPE = {
  'STC': 'HD Key Tree',
  'APT': 'Aptos HD Key Tree'
}

const TICKER_SIMPLE_KEYRING_TYPE = {
  'STC': 'Simple Key Pair',
  'APT': 'Aptos Simple Key Pair'
}
export default class MetamaskController extends EventEmitter {
  /**
   * @constructor
   * @param {Object} opts
   */
  constructor(opts) {
    super();

    this.defaultMaxListeners = 20;

    this.sendUpdate = debounce(this.privateSendUpdate.bind(this), 200);
    this.opts = opts;
    this.extension = opts.extension;
    this.platform = opts.platform;
    const initState = opts.initState || {};
    const version = this.platform.getVersion();
    this.recordFirstTimeInfo(initState);

    // this keeps track of how many "controllerStream" connections are open
    // the only thing that uses controller connections are open starmask UI instances
    this.activeControllerConnections = 0;

    this.getRequestAccountTabIds = opts.getRequestAccountTabIds;
    this.getOpenMetamaskTabsIds = opts.getOpenMetamaskTabsIds;

    // observable state store
    this.store = new ComposableObservableStore(initState);

    // external connections by origin
    // Do not modify directly. Use the associated methods.
    this.connections = {};

    // lock to ensure only one vault created at once
    this.createVaultMutex = new Mutex();

    this.extension.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'update' && version === '8.1.0') {
        this.platform.openExtensionInBrowser();
      }
    });

    // next, we will initialize the controllers
    // controller initialization order matters

    this.approvalController = new ApprovalController({
      showApprovalRequest: opts.showUserConfirmation,
    });

    this.networkController = new NetworkController(initState.NetworkController);
    this.networkController.setInfuraProjectId(opts.infuraProjectId);

    this.preferencesController = new PreferencesController({
      initState: initState.PreferencesController,
      initLangCode: opts.initLangCode,
      openPopup: opts.openPopup,
      network: this.networkController,
      migrateAddressBookState: this.migrateAddressBookState.bind(this),
    });

    this.metaMetricsController = new MetaMetricsController({
      segment,
      segmentLegacy,
      preferencesStore: this.preferencesController.store,
      onNetworkDidChange: this.networkController.on.bind(
        this.networkController,
        NETWORK_EVENTS.NETWORK_DID_CHANGE,
      ),
      getNetworkIdentifier: this.networkController.getNetworkIdentifier.bind(
        this.networkController,
      ),
      getCurrentChainId: this.networkController.getCurrentChainId.bind(
        this.networkController,
      ),
      version: this.platform.getVersion(),
      environment: process.env.STARMASK_ENVIRONMENT,
      initState: initState.MetaMetricsController,
      extension: browser
    });

    this.appStateController = new AppStateController({
      addUnlockListener: this.on.bind(this, 'unlock'),
      isUnlocked: this.isUnlocked.bind(this),
      initState: initState.AppStateController,
      onInactiveTimeout: () => this.setLocked(),
      showUnlockRequest: opts.showUserConfirmation,
      preferencesStore: this.preferencesController.store,
    });

    this.currencyRateController = new CurrencyRateController(
      { includeUSDRate: true },
      initState.CurrencyController,
    );

    this.phishingController = new PhishingController();

    // now we can initialize the RPC provider, which other controllers require
    this.initializeProvider();
    this.provider = this.networkController.getProviderAndBlockTracker().provider;
    this.blockTracker = this.networkController.getProviderAndBlockTracker().blockTracker;

    // token exchange rate tracker
    this.tokenRatesController = new TokenRatesController({
      preferences: this.preferencesController.store,
      getNativeCurrency: () => {
        const { ticker } = this.networkController.getProviderConfig();
        return ticker ?? 'STC';
      },
    });

    this.ensController = new EnsController({
      provider: this.provider,
      getCurrentChainId: this.networkController.getCurrentChainId.bind(
        this.networkController,
      ),
      onNetworkDidChange: this.networkController.on.bind(
        this.networkController,
        NETWORK_EVENTS.NETWORK_DID_CHANGE,
      ),
    });

    this.incomingTransactionsController = new IncomingTransactionsController({
      blockTracker: this.blockTracker,
      onNetworkDidChange: this.networkController.on.bind(
        this.networkController,
        NETWORK_EVENTS.NETWORK_DID_CHANGE,
      ),
      getCurrentChainId: this.networkController.getCurrentChainId.bind(
        this.networkController,
      ),
      preferencesController: this.preferencesController,
      initState: initState.IncomingTransactionsController,
    });

    // account tracker watches balances, nonces, and any code at their address
    this.accountTracker = new AccountTracker({
      provider: this.provider,
      blockTracker: this.blockTracker,
      getCurrentChainId: this.networkController.getCurrentChainId.bind(
        this.networkController,
      ),
      getCurrentNetworkTicker: this.networkController.getCurrentNetworkTicker.bind(
        this.networkController,
      ),
    });

    // start and stop polling for balances based on activeControllerConnections
    this.on('controllerConnectionChanged', (activeControllerConnections) => {
      if (activeControllerConnections > 0) {
        this.accountTracker.start();
        this.incomingTransactionsController.start();
        this.tokenRatesController.start();
      } else {
        this.accountTracker.stop();
        this.incomingTransactionsController.stop();
        this.tokenRatesController.stop();
      }
    });

    this.cachedBalancesController = new CachedBalancesController({
      accountTracker: this.accountTracker,
      getCurrentChainId: this.networkController.getCurrentChainId.bind(
        this.networkController,
      ),
      initState: initState.CachedBalancesController,
    });

    this.onboardingController = new OnboardingController({
      initState: initState.OnboardingController,
      preferencesController: this.preferencesController,
    });

    // const additionalKeyrings = [TrezorKeyring, LedgerBridgeKeyring];
    const additionalKeyrings = [OneKeyKeyring, MutiSignKeyring];
    this.keyringController = new KeyringController({
      keyringTypes: additionalKeyrings,
      initState: initState.KeyringController,
      encryptor: opts.encryptor || undefined,
    });
    this.keyringController.memStore.subscribe((state) =>
      this._onKeyringControllerUpdate(state),
    );
    this.keyringController.on('unlock', () => this.emit('unlock'));
    this.keyringController.on('lock', () => this._onLock());

    this.permissionsController = new PermissionsController(
      {
        approvals: this.approvalController,
        getKeyringAccounts: this.keyringController.getAccounts.bind(
          this.keyringController,
        ),
        getRestrictedMethods,
        getUnlockPromise: this.appStateController.getUnlockPromise.bind(
          this.appStateController,
        ),
        isUnlocked: this.isUnlocked.bind(this),
        notifyDomain: this.notifyConnections.bind(this),
        notifyAllDomains: this.notifyAllConnections.bind(this),
        preferences: this.preferencesController.store,
      },
      initState.PermissionsController,
      initState.PermissionsMetadata,
    );

    this.detectTokensController = new DetectTokensController({
      preferences: this.preferencesController,
      network: this.networkController,
      keyringMemStore: this.keyringController.memStore,
    });

    this.addressBookController = new AddressBookController(
      undefined,
      initState.AddressBookController,
    );

    this.alertController = new AlertController({
      initState: initState.AlertController,
      preferencesStore: this.preferencesController.store,
    });

    this.txController = new TransactionController({
      initState:
        initState.TransactionController || initState.TransactionManager,
      getPermittedAccounts: this.permissionsController.getAccounts.bind(
        this.permissionsController,
      ),
      networkStore: this.networkController.networkStore,
      getCurrentChainId: this.networkController.getCurrentChainId.bind(
        this.networkController,
      ),
      getCurrentNetworkTicker: this.networkController.getCurrentNetworkTicker.bind(
        this.networkController,
      ),
      getAptosClient: this.networkController.getAptosClient.bind(
        this.networkController,
      ),
      preferencesStore: this.preferencesController.store,
      txHistoryLimit: 60,
      signTransaction: this.keyringController.signTransaction.bind(
        this.keyringController,
      ),
      getPublicKeyFor: this.keyringController.getPublicKeyFor.bind(
        this.keyringController,
      ),
      exportAccount: this.keyringController.exportAccount.bind(
        this.keyringController,
      ),
      provider: this.provider,
      blockTracker: this.blockTracker,
      trackMetaMetricsEvent: this.metaMetricsController.trackEvent.bind(
        this.metaMetricsController,
      ),
      getParticipateInMetrics: () =>
        this.metaMetricsController.state.participateInMetaMetrics,
    });
    this.txController.on('newUnapprovedTx', () => opts.showUserConfirmation());

    this.txController.on(`tx:status-update`, async (txId, status) => {
      if (
        status === TRANSACTION_STATUSES.CONFIRMED ||
        status === TRANSACTION_STATUSES.FAILED
      ) {
        const txMeta = this.txController.txStateManager.getTx(txId);
        const frequentRpcListDetail = this.preferencesController.getFrequentRpcListDetail();
        let rpcPrefs = {};
        if (txMeta.chainId) {
          const rpcSettings = frequentRpcListDetail.find(
            (rpc) => txMeta.chainId === rpc.chainId,
          );
          rpcPrefs = rpcSettings?.rpcPrefs ?? {};
        }
        this.platform.showTransactionNotification(txMeta, rpcPrefs);

        const { txReceipt } = txMeta;
        const metamaskState = await this.getState();

        if (txReceipt && txReceipt.status === '0x0') {
          this.metaMetricsController.trackEvent(
            {
              category: 'Background',
              properties: {
                action: 'Transactions',
                errorMessage: txMeta.simulationFails?.reason,
                numberOfTokens: metamaskState.tokens.length,
                numberOfAccounts: Object.keys(metamaskState.accounts).length,
              },
            },
            {
              matomoEvent: true,
            },
          );
        }
      }
    });

    this.networkController.on(NETWORK_EVENTS.NETWORK_DID_CHANGE, () => {
      this.setCurrentCurrency(
        this.currencyRateController.state.currentCurrency,
        (error) => {
          if (error) {
            throw error;
          }
        },
      );
    });
    const { ticker } = this.networkController.getProviderConfig();
    this.currencyRateController.configure({ nativeCurrency: ticker ?? 'STC' });
    this.networkController.lookupNetwork();
    this.messageManager = new MessageManager();
    this.personalMessageManager = new PersonalMessageManager();
    this.decryptMessageManager = new DecryptMessageManager();
    this.encryptionPublicKeyManager = new EncryptionPublicKeyManager();
    this.typedMessageManager = new TypedMessageManager({
      getCurrentChainId: this.networkController.getCurrentChainId.bind(
        this.networkController,
      ),
    });

    this.swapsController = new SwapsController({
      getBufferedGasLimit: this.txController.txGasUtil.getBufferedGasLimit.bind(
        this.txController.txGasUtil,
      ),
      networkController: this.networkController,
      provider: this.provider,
      getProviderConfig: this.networkController.getProviderConfig.bind(
        this.networkController,
      ),
      tokenRatesStore: this.tokenRatesController.store,
      getCurrentChainId: this.networkController.getCurrentChainId.bind(
        this.networkController,
      ),
    });

    // ensure accountTracker updates balances after network change
    this.networkController.on(NETWORK_EVENTS.NETWORK_DID_CHANGE, async () => {
      log.debug('this.networkController.on(NETWORK_EVENTS.NETWORK_DID_CHANGE', 'this.accountTracker._updateAccounts()')
      const ticker = this.networkController.getCurrentNetworkTicker()
      const previousTicker = this.networkController.getPreviousNetworkTicker()
      log.debug({ ticker, previousTicker })
      if (ticker !== previousTicker) {
        const exists = this.accountTracker._checkAccountExistsInCurrentTicker();
        log.debug({ exists })
        //TODO: switch selectedAddress if ticker is changed
        if (!exists) {
          const address = await this.addDefaultAccountInCurrentTicker()
          this.preferencesController.setSelectedAddress(address);
        } else {
          const type = TICKER_HD_KEYRING_TYPE[ticker]
          const accounts = await this.keyringController.getKeyringsByType(type)[0].getAccounts()
          this.preferencesController.setSelectedAddress(accounts[0]);
        }
      }
      this.accountTracker._updateAccounts();
    });

    // clear unapproved transactions and messages when the network will change
    this.networkController.on(NETWORK_EVENTS.NETWORK_WILL_CHANGE, () => {
      this.txController.txStateManager.clearUnapprovedTxs();
      this.encryptionPublicKeyManager.clearUnapproved();
      this.personalMessageManager.clearUnapproved();
      this.typedMessageManager.clearUnapproved();
      this.decryptMessageManager.clearUnapproved();
      this.messageManager.clearUnapproved();
    });

    // ensure isClientOpenAndUnlocked is updated when memState updates
    this.on('update', (memState) => this._onStateUpdate(memState));

    this.store.updateStructure({
      AppStateController: this.appStateController.store,
      TransactionController: this.txController.store,
      KeyringController: this.keyringController.store,
      PreferencesController: this.preferencesController.store,
      MetaMetricsController: this.metaMetricsController.store,
      AddressBookController: this.addressBookController,
      CurrencyController: this.currencyRateController,
      NetworkController: this.networkController.store,
      CachedBalancesController: this.cachedBalancesController.store,
      AlertController: this.alertController.store,
      OnboardingController: this.onboardingController.store,
      IncomingTransactionsController: this.incomingTransactionsController.store,
      PermissionsController: this.permissionsController.permissions,
      PermissionsMetadata: this.permissionsController.store,
    });

    this.memStore = new ComposableObservableStore(null, {
      AppStateController: this.appStateController.store,
      NetworkController: this.networkController.store,
      AccountTracker: this.accountTracker.store,
      TxController: this.txController.memStore,
      CachedBalancesController: this.cachedBalancesController.store,
      TokenRatesController: this.tokenRatesController.store,
      MessageManager: this.messageManager.memStore,
      PersonalMessageManager: this.personalMessageManager.memStore,
      DecryptMessageManager: this.decryptMessageManager.memStore,
      EncryptionPublicKeyManager: this.encryptionPublicKeyManager.memStore,
      TypesMessageManager: this.typedMessageManager.memStore,
      KeyringController: this.keyringController.memStore,
      PreferencesController: this.preferencesController.store,
      MetaMetricsController: this.metaMetricsController.store,
      AddressBookController: this.addressBookController,
      CurrencyController: this.currencyRateController,
      AlertController: this.alertController.store,
      OnboardingController: this.onboardingController.store,
      IncomingTransactionsController: this.incomingTransactionsController.store,
      PermissionsController: this.permissionsController.permissions,
      PermissionsMetadata: this.permissionsController.store,
      SwapsController: this.swapsController.store,
      EnsController: this.ensController.store,
      ApprovalController: this.approvalController,
    });

    // if this is the first time, clear the state of by calling these methods
    const resetMethods = [
      this.accountTracker.resetState,
      this.txController.resetState,
      this.messageManager.resetState,
      this.personalMessageManager.resetState,
      this.decryptMessageManager.resetState,
      this.encryptionPublicKeyManager.resetState,
      this.typedMessageManager.resetState,
      this.swapsController.resetState,
      this.ensController.resetState,
      this.approvalController.clear.bind(this.approvalController),
      // WE SHOULD ADD TokenListController.resetState here too. But it's not implemented yet.
    ];

    if (globalThis.isFirstTimeProfileLoaded === true) {
      this.resetStates(resetMethods);
    }

    // Automatic login via config password or loginToken
    if (
      !this.isUnlocked() &&
      this.onboardingController.store.getState().completedOnboarding
    ) {
      this._loginUser();
    } else {
      this._startUISync();
    }

    this.memStore.subscribe(this.sendUpdate.bind(this));

    const password = process.env.CONF?.password;
    if (
      password &&
      !this.isUnlocked() &&
      this.onboardingController.completedOnboarding
    ) {
      this.submitPassword(password);
    }

  }

  /**
   * Constructor helper: initialize a provider.
   */
  initializeProvider() {
    const version = this.platform.getVersion();
    const providerOpts = {
      static: {
        eth_syncing: false,
        web3_clientVersion: `MetaMask/v${ version }`,
      },
      version,
      // account mgmt
      getAccounts: async ({ origin }) => {
        if (origin === 'starmask') {
          const selectedAddress = this.preferencesController.getSelectedAddress();
          return selectedAddress ? [selectedAddress] : [];
        } else if (this.isUnlocked()) {
          return await this.permissionsController.getAccounts(origin);
        }
        return []; // changing this is a breaking change
      },
      // tx signing
      processTransaction: this.newUnapprovedTransaction.bind(this),
      // msg signing
      processEthSignMessage: this.newUnsignedMessage.bind(this),
      processTypedMessage: this.newUnsignedTypedMessage.bind(this),
      processTypedMessageV3: this.newUnsignedTypedMessage.bind(this),
      processTypedMessageV4: this.newUnsignedTypedMessage.bind(this),
      processPersonalMessage: this.newUnsignedPersonalMessage.bind(this),
      processAptSignMessage: this.newUnsignedPersonalMessage.bind(this),
      processDecryptMessage: this.newRequestDecryptMessage.bind(this),
      processEncryptionPublicKey: this.newRequestEncryptionPublicKey.bind(this),
      getPendingNonce: this.getPendingNonce.bind(this),
      getPendingTransactionByHash: (hash) =>
        this.txController.getFilteredTxList({
          hash,
          status: TRANSACTION_STATUSES.SUBMITTED,
        })[0],
    };
    const providerProxy = this.networkController.initializeProvider(
      providerOpts,
    );
    return providerProxy;
  }

  /**
   * Gets relevant state for the provider of an external origin.
   *
   * @param {string} origin - The origin to get the provider state for.
   * @returns {Promise<{
   *  isUnlocked: boolean,
   *  networkVersion: string,
   *  chainId: string,
   *  accounts: string[],
   * }>} An object with relevant state properties.
   */
  async getProviderState(origin) {
    return {
      isUnlocked: this.isUnlocked(),
      ...this.getProviderNetworkState(),
      accounts: await this.permissionsController.getAccounts(origin),
    };
  }

  /**
   * Gets network state relevant for external providers.
   *
   * @param {Object} [memState] - The MetaMask memState. If not provided,
   * this function will retrieve the most recent state.
   * @returns {Object} An object with relevant network state properties.
   */
  getProviderNetworkState(memState) {
    const { network } = memState || this.getState();
    return {
      chainId: this.networkController.getCurrentChainId(),
      networkVersion: network && network.id && network.id.toString() || undefined,
    };
  }

  //=============================================================================
  // EXPOSED TO THE UI SUBSYSTEM
  //=============================================================================

  /**
   * The starmask-state of the various controllers, made available to the UI
   *
   * @returns {Object} status
   */
  getState() {
    const { vault } = this.keyringController.store.getState();
    const isInitialized = Boolean(vault);

    return {
      isInitialized,
      ...this.memStore.getFlatState(),
    };
  }

  /**
   * Returns an Object containing API Callback Functions.
   * These functions are the interface for the UI.
   * The API object can be transmitted over a stream via JSON-RPC.
   *
   * @returns {Object} Object containing API functions.
   */
  getApi() {
    const {
      accountTracker,
      alertController,
      approvalController,
      keyringController,
      metaMetricsController,
      networkController,
      onboardingController,
      permissionsController,
      preferencesController,
      swapsController,
      txController,
    } = this;

    return {
      // etc
      getState: (cb) => cb(null, this.getState()),
      setCurrentCurrency: this.setCurrentCurrency.bind(this),
      setUseBlockie: this.setUseBlockie.bind(this),
      setUseNonceField: this.setUseNonceField.bind(this),
      setUsePhishDetect: this.setUsePhishDetect.bind(this),
      setIpfsGateway: this.setIpfsGateway.bind(this),
      setParticipateInMetaMetrics: this.setParticipateInMetaMetrics.bind(this),
      setMetaMetricsSendCount: this.setMetaMetricsSendCount.bind(this),
      setFirstTimeFlowType: this.setFirstTimeFlowType.bind(this),
      setCurrentLocale: this.setCurrentLocale.bind(this),
      markPasswordForgotten: this.markPasswordForgotten.bind(this),
      unMarkPasswordForgotten: this.unMarkPasswordForgotten.bind(this),
      safelistPhishingDomain: this.safelistPhishingDomain.bind(this),
      getRequestAccountTabIds: (cb) => cb(null, this.getRequestAccountTabIds()),
      getOpenMetamaskTabsIds: (cb) => cb(null, this.getOpenMetamaskTabsIds()),

      // auto accept token
      getAutoAcceptToken: nodeify(this.getAutoAcceptToken, this),
      checkIsAcceptToken: nodeify(this.checkIsAcceptToken, this),

      // NFT
      checkIsAddNFTGallery: nodeify(this.checkIsAddNFTGallery, this),

      // primary HD keyring management
      addNewAccount: nodeify(this.addNewAccount, this),
      verifySeedPhrase: nodeify(this.verifySeedPhrase, this),
      resetAccount: nodeify(this.resetAccount, this),
      removeAccount: nodeify(this.removeAccount, this),
      importAccountWithStrategy: nodeify(this.importAccountWithStrategy, this),
      createMultiSignAccount: nodeify(this.createMultiSignAccount, this),

      // hardware wallets
      connectHardware: nodeify(this.connectHardware, this),
      forgetDevice: nodeify(this.forgetDevice, this),
      checkHardwareStatus: nodeify(this.checkHardwareStatus, this),
      unlockHardwareWalletAccount: nodeify(
        this.unlockHardwareWalletAccount,
        this,
      ),

      // mobile
      fetchInfoToSync: nodeify(this.fetchInfoToSync, this),

      // vault management
      submitPassword: nodeify(this.submitPassword, this),
      verifyPassword: nodeify(this.verifyPassword, this),

      // network management
      setProviderType: nodeify(
        networkController.setProviderType,
        networkController,
      ),
      rollbackToPreviousProvider: nodeify(
        networkController.rollbackToPreviousProvider,
        networkController,
      ),
      setCustomRpc: nodeify(this.setCustomRpc, this),
      updateAndSetCustomRpc: nodeify(this.updateAndSetCustomRpc, this),
      delCustomRpc: nodeify(this.delCustomRpc, this),

      // PreferencesController
      setSelectedAddress: nodeify(
        preferencesController.setSelectedAddress,
        preferencesController,
      ),
      addToken: nodeify(preferencesController.addToken, preferencesController),
      removeToken: nodeify(
        preferencesController.removeToken,
        preferencesController,
      ),
      removeSuggestedTokens: nodeify(
        preferencesController.removeSuggestedTokens,
        preferencesController,
      ),
      setAccountLabel: nodeify(
        preferencesController.setAccountLabel,
        preferencesController,
      ),
      setFeatureFlag: nodeify(
        preferencesController.setFeatureFlag,
        preferencesController,
      ),
      setPreference: nodeify(
        preferencesController.setPreference,
        preferencesController,
      ),
      completeOnboarding: nodeify(
        preferencesController.completeOnboarding,
        preferencesController,
      ),
      addKnownMethodData: nodeify(
        preferencesController.addKnownMethodData,
        preferencesController,
      ),

      // AddressController
      setAddressBook: nodeify(
        this.addressBookController.set,
        this.addressBookController,
      ),
      removeFromAddressBook: nodeify(
        this.addressBookController.delete,
        this.addressBookController,
      ),

      // AppStateController
      setLastActiveTime: nodeify(
        this.appStateController.setLastActiveTime,
        this.appStateController,
      ),
      setDefaultHomeActiveTabName: nodeify(
        this.appStateController.setDefaultHomeActiveTabName,
        this.appStateController,
      ),
      setConnectedStatusPopoverHasBeenShown: nodeify(
        this.appStateController.setConnectedStatusPopoverHasBeenShown,
        this.appStateController,
      ),
      setSwapsWelcomeMessageHasBeenShown: nodeify(
        this.appStateController.setSwapsWelcomeMessageHasBeenShown,
        this.appStateController,
      ),

      // EnsController
      tryReverseResolveAddress: nodeify(
        this.ensController.reverseResolveAddress,
        this.ensController,
      ),

      // KeyringController
      setLocked: nodeify(this.setLocked, this),
      createNewVaultAndKeychain: nodeify(this.createNewVaultAndKeychain, this),
      createNewVaultAndRestore: nodeify(this.createNewVaultAndRestore, this),
      exportAccount: nodeify(
        keyringController.exportAccount,
        keyringController,
      ),
      getPublicKeyFor: nodeify(
        keyringController.getPublicKeyFor,
        keyringController,
      ),
      getReceiptIdentifier: nodeify(
        keyringController.getReceiptIdentifier,
        keyringController,
      ),

      // txController
      cancelTransaction: nodeify(txController.cancelTransaction, txController),
      updateTransaction: nodeify(txController.updateTransaction, txController),
      updateAndApproveTransaction: nodeify(
        txController.updateAndApproveTransaction,
        txController,
      ),
      createCancelTransaction: nodeify(this.createCancelTransaction, this),
      createSpeedUpTransaction: nodeify(this.createSpeedUpTransaction, this),
      getFilteredTxList: nodeify(txController.getFilteredTxList, txController),
      isNonceTaken: nodeify(txController.isNonceTaken, txController),
      estimateGas: nodeify(this.estimateGas, this),
      getPendingNonce: nodeify(this.getPendingNonce, this),
      getNextNonce: nodeify(this.getNextNonce, this),
      addUnapprovedTransaction: nodeify(
        txController.addUnapprovedTransaction,
        txController,
      ),
      handlePendingTxsOffline: nodeify(txController.handlePendingTxsOffline, txController),
      signMultiSignTransaction: nodeify(this.signMultiSignTransaction, this),

      // messageManager
      signMessage: nodeify(this.signMessage, this),
      cancelMessage: this.cancelMessage.bind(this),

      // personalMessageManager
      signPersonalMessage: nodeify(this.signPersonalMessage, this),
      signAptMessage: nodeify(this.signAptMessage, this),
      cancelPersonalMessage: this.cancelPersonalMessage.bind(this),

      // typedMessageManager
      signTypedMessage: nodeify(this.signTypedMessage, this),
      cancelTypedMessage: this.cancelTypedMessage.bind(this),

      // decryptMessageManager
      decryptMessage: nodeify(this.decryptMessage, this),
      decryptMessageInline: nodeify(this.decryptMessageInline, this),
      cancelDecryptMessage: this.cancelDecryptMessage.bind(this),

      // EncryptionPublicKeyManager
      encryptionPublicKey: nodeify(this.encryptionPublicKey, this),
      cancelEncryptionPublicKey: this.cancelEncryptionPublicKey.bind(this),

      // onboarding controller
      setSeedPhraseBackedUp: nodeify(
        onboardingController.setSeedPhraseBackedUp,
        onboardingController,
      ),

      // alert controller
      setAlertEnabledness: nodeify(
        alertController.setAlertEnabledness,
        alertController,
      ),
      setUnconnectedAccountAlertShown: nodeify(
        alertController.setUnconnectedAccountAlertShown,
        alertController,
      ),
      setWeb3ShimUsageAlertDismissed: nodeify(
        alertController.setWeb3ShimUsageAlertDismissed,
        alertController,
      ),

      // permissions
      approvePermissionsRequest: nodeify(
        permissionsController.approvePermissionsRequest,
        permissionsController,
      ),
      clearPermissions: permissionsController.clearPermissions.bind(
        permissionsController,
      ),
      getApprovedAccounts: nodeify(
        permissionsController.getAccounts,
        permissionsController,
      ),
      rejectPermissionsRequest: nodeify(
        permissionsController.rejectPermissionsRequest,
        permissionsController,
      ),
      removePermissionsFor: permissionsController.removePermissionsFor.bind(
        permissionsController,
      ),
      addPermittedAccount: nodeify(
        permissionsController.addPermittedAccount,
        permissionsController,
      ),
      removePermittedAccount: nodeify(
        permissionsController.removePermittedAccount,
        permissionsController,
      ),
      requestAccountsPermissionWithId: nodeify(
        permissionsController.requestAccountsPermissionWithId,
        permissionsController,
      ),

      // swaps
      fetchAndSetQuotes: nodeify(
        swapsController.fetchAndSetQuotes,
        swapsController,
      ),
      setSelectedQuoteAggId: nodeify(
        swapsController.setSelectedQuoteAggId,
        swapsController,
      ),
      resetSwapsState: nodeify(
        swapsController.resetSwapsState,
        swapsController,
      ),
      setSwapsTokens: nodeify(swapsController.setSwapsTokens, swapsController),
      setApproveTxId: nodeify(swapsController.setApproveTxId, swapsController),
      setTradeTxId: nodeify(swapsController.setTradeTxId, swapsController),
      setSwapsTxGasPrice: nodeify(
        swapsController.setSwapsTxGasPrice,
        swapsController,
      ),
      setSwapsTxGasLimit: nodeify(
        swapsController.setSwapsTxGasLimit,
        swapsController,
      ),
      safeRefetchQuotes: nodeify(
        swapsController.safeRefetchQuotes,
        swapsController,
      ),
      stopPollingForQuotes: nodeify(
        swapsController.stopPollingForQuotes,
        swapsController,
      ),
      setBackgroundSwapRouteState: nodeify(
        swapsController.setBackgroundSwapRouteState,
        swapsController,
      ),
      resetPostFetchState: nodeify(
        swapsController.resetPostFetchState,
        swapsController,
      ),
      setSwapsErrorKey: nodeify(
        swapsController.setSwapsErrorKey,
        swapsController,
      ),
      setInitialGasEstimate: nodeify(
        swapsController.setInitialGasEstimate,
        swapsController,
      ),
      setCustomApproveTxData: nodeify(
        swapsController.setCustomApproveTxData,
        swapsController,
      ),
      setSwapsLiveness: nodeify(
        swapsController.setSwapsLiveness,
        swapsController,
      ),

      // MetaMetrics
      trackMetaMetricsEvent: nodeify(
        metaMetricsController.trackEvent,
        metaMetricsController,
      ),
      trackMetaMetricsPage: nodeify(
        metaMetricsController.trackPage,
        metaMetricsController,
      ),

      // approval controller
      resolvePendingApproval: nodeify(
        approvalController.resolve,
        approvalController,
      ),
      rejectPendingApproval: nodeify(
        approvalController.reject,
        approvalController,
      ),

      // aptos
      getAptosTokens: nodeify(this.getAptosTokens, this),
      getAptosTableItem: nodeify(this.getAptosTableItem, this),
      updateAccountNFTs: nodeify(
        accountTracker.updateAccountNFTs,
        accountTracker,
      ),
      updateAccountNFTMetas: nodeify(
        accountTracker.updateAccountNFTMetas,
        accountTracker,
      ),
    };
  }

  //=============================================================================
  // VAULT / KEYRING RELATED METHODS
  //=============================================================================

  /**
   * Creates a new Vault and create a new keychain.
   *
   * A vault, or KeyringController, is a controller that contains
   * many different account strategies, currently called Keyrings.
   * Creating it new means wiping all previous keyrings.
   *
   * A keychain, or keyring, controls many accounts with a single backup and signing strategy.
   * For example, a mnemonic phrase can generate many accounts, and is a keyring.
   *
   * @param {string} password
   * @returns {Object} vault
   */
  async createNewVaultAndKeychain(password) {
    const releaseLock = await this.createVaultMutex.acquire();
    try {
      let vault;
      const accounts = await this.keyringController.getAccounts();
      if (accounts.length > 0) {
        vault = await this.keyringController.fullUpdate();
      } else {
        vault = await this.keyringController.createNewVaultAndKeychain(
          password,
        );
        const addresses = await this.keyringController.getAccounts();
        this.preferencesController.setAddresses(addresses);

        const primaryKeyring = this.keyringController.getKeyringsByType(
          'HD Key Tree',
        )[0];
        if (!primaryKeyring) {
          throw new Error('StarMaskController - No HD Key Tree found');
        }

        this.selectFirstIdentity();
      }
      return vault;
    } finally {
      releaseLock();
    }
  }

  /**
   * Create a new Vault and restore an existent keyring.
   * @param {string} password
   * @param {string} seed
   */
  async createNewVaultAndRestore(password, seed) {
    const releaseLock = await this.createVaultMutex.acquire();
    try {
      let accounts, lastBalance;

      const { keyringController } = this;

      // clear known identities
      this.preferencesController.setAddresses([]);

      // clear permissions
      this.permissionsController.clearPermissions();

      // clear accounts in accountTracker
      this.accountTracker.clearAccounts();

      // clear cachedBalances
      this.cachedBalancesController.clearCachedBalances();

      // clear unapproved transactions
      this.txController.txStateManager.clearUnapprovedTxs();

      // create new vault
      const vault = await keyringController.createNewVaultAndRestore(
        password,
        seed,
      );

      const stcQuery = new StcQuery(this.provider);
      accounts = await keyringController.getAccounts();
      lastBalance = await this.getBalance(
        accounts[accounts.length - 1],
        stcQuery,
      );
      const primaryKeyring = keyringController.getKeyringsByType(
        'HD Key Tree',
      )[0];
      if (!primaryKeyring) {
        throw new Error('StarMaskController - No HD Key Tree found');
      }

      // seek out the first zero balance
      while (lastBalance !== '0x0') {
        await keyringController.addNewAccount(primaryKeyring);
        accounts = await keyringController.getAccounts();
        lastBalance = await this.getBalance(
          accounts[accounts.length - 1],
          stcQuery,
        );
      }

      // set new identities
      this.preferencesController.setAddresses(accounts);

      this.selectFirstIdentity();
      return vault;
    } finally {
      releaseLock();
    }
  }

  /**
   * Get an account balance from the AccountTracker or request it directly from the network.
   * @param {string} address - The account address
   * @param {StcQuery} stcQuery - The StcQuery instance to use when asking the network
   */
  getBalance(address, stcQuery) {
    const networkTicker = this.networkController.getCurrentNetworkTicker()
    return new Promise((resolve, reject) => {
      const cached = this.accountTracker.store.getState().accounts[address];

      if (cached && cached.balance) {
        resolve(cached.balance);
      } else {
        stcQuery.getResource(
          address,
          networkTicker === 'APT' ? '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>' : '0x00000000000000000000000000000001::Account::Balance<0x00000000000000000000000000000001::STC::STC>',
          (error, res) => {
            if (error) {
              log.error(error);
              if (error.message && error.message === 'Invalid params: unable to parse AccoutAddress.') {
                resolve('0x0');
              } else {
                reject(error);
              }
            } else {
              let balanceDecimal
              if (networkTicker === 'APT') {
                balanceDecimal = res?.data?.coin?.value || 0;
              } else {
                balanceDecimal = res && res.value[0][1].Struct.value[0][1].U128 || 0;
              }
              const balanceHex = new BigNumber(balanceDecimal, 10).toString(16);
              const balance = addHexPrefix(balanceHex);
              resolve(balance || '0x0');
            }
          },
        );
      }
    });
  }

  /**
   * Collects all the information that we want to share
   * with the mobile client for syncing purposes
   * @returns {Promise<Object>} Parts of the state that we want to syncx
   */
  async fetchInfoToSync() {
    // Preferences
    const {
      accountTokens,
      currentLocale,
      frequentRpcList,
      identities,
      selectedAddress,
      tokens,
    } = this.preferencesController.store.getState();

    // Filter ERC20 tokens
    const filteredAccountTokens = {};
    Object.keys(accountTokens).forEach((address) => {
      const checksummedAddress = toChecksumAddress(address);
      filteredAccountTokens[checksummedAddress] = {};
      Object.keys(accountTokens[address]).forEach((chainId) => {
        filteredAccountTokens[checksummedAddress][chainId] =
          chainId === MAINNET_CHAIN_ID
            ? accountTokens[address][chainId].filter(
              ({ address: tokenAddress }) => {
                const checksumAddress = toChecksumAddress(
                  tokenAddress,
                );
                return contractMap[checksumAddress]
                  ? contractMap[checksumAddress].erc20
                  : true;
              },
            )
            : accountTokens[address][chainId];
      });
    });

    const preferences = {
      accountTokens: filteredAccountTokens,
      currentLocale,
      frequentRpcList,
      identities,
      selectedAddress,
      tokens,
    };

    // Accounts
    const ticker = this.networkController.getCurrentNetworkTicker()
    const HDtype = TICKER_HD_KEYRING_TYPE[ticker]

    const hdKeyring = this.keyringController.getKeyringsByType(HDtype)[0];
    const Simpletype = TICKER_SIMPLE_KEYRING_TYPE[ticker]

    const simpleKeyPairKeyrings = this.keyringController.getKeyringsByType(Simpletype);
    const hdAccounts = await hdKeyring.getAccounts();
    const simpleKeyPairKeyringAccounts = await Promise.all(
      simpleKeyPairKeyrings.map((keyring) => keyring.getAccounts()),
    );
    const simpleKeyPairAccounts = simpleKeyPairKeyringAccounts.reduce(
      (acc, accounts) => [...acc, ...accounts],
      [],
    );
    const accounts = {
      hd: hdAccounts
        .filter((item, pos) => hdAccounts.indexOf(item) === pos)
        .map((address) => toChecksumAddress(address)),
      simpleKeyPair: simpleKeyPairAccounts
        .filter((item, pos) => simpleKeyPairAccounts.indexOf(item) === pos)
        .map((address) => toChecksumAddress(address)),
      ledger: [],
      onekey: [],
    };

    // transactions

    let { transactions } = this.txController.store.getState();
    // delete tx for other accounts that we're not importing
    transactions = transactions.filter((tx) => {
      const checksummedTxFrom = toChecksumAddress(tx.txParams.from);
      return accounts.hd.includes(checksummedTxFrom);
    });

    return {
      accounts,
      preferences,
      transactions,
      network: this.networkController.store.getState(),
    };
  }

  /*
   * Submits the user's password and attempts to unlock the vault.
   * Also synchronizes the preferencesController, to ensure its schema
   * is up to date with known accounts once the vault is decrypted.
   *
   * @param {string} password - The user's password
   * @returns {Promise<object>} The keyringController update.
   */
  async submitPassword(password) {
    await this.keyringController.submitPassword(password);

    try {
      await this.blockTracker.checkForLatestBlock();
    } catch (error) {
      log.error('Error while unlocking extension.', error);
    }

    return this.keyringController.fullUpdate();
  }

  
  async _loginUser() {
    try {
      // Automatic login via config password
      const password = process.env.CONF?.PASSWORD;
      if (password) {
        await this.submitPassword(password);
      }
      // Automatic login via storage encryption key
      else if (isManifestV3) {
        await this.submitEncryptionKey();
      }
      // Updating accounts in this.accountTracker before starting UI syncing ensure that
      // state has account balance before it is synced with UI
      await this.accountTracker._updateAccounts();
    } finally {
      this._startUISync();
    }
  }

  _startUISync() {
    // Message startUISync is used in MV3 to start syncing state with UI
    // Sending this message after login is completed helps to ensure that incomplete state without
    // account details are not flushed to UI.
    this.emit('startUISync');
    this.startUISync = true;
    this.memStore.subscribe(this.sendUpdate.bind(this));
  }

  /**
   * Submits a user's encryption key to log the user in via login token
   */
  async submitEncryptionKey() {
    try {
      const { loginToken, loginSalt } = await browser.storage.session.get([
        'loginToken',
        'loginSalt',
      ]);
      if (loginToken && loginSalt) {
        const { vault } = this.keyringController.store.getState();

        const jsonVault = JSON.parse(vault);

        if (jsonVault.salt !== loginSalt) {
          console.warn(
            'submitEncryptionKey: Stored salt and vault salt do not match',
          );
          await this.clearLoginArtifacts();
          return;
        }

        await this.keyringController.submitEncryptionKey(loginToken, loginSalt);
      }
    } catch (e) {
      // If somehow this login token doesn't work properly,
      // remove it and the user will get shown back to the unlock screen
      await this.clearLoginArtifacts();
      throw e;
    }
  }

  async clearLoginArtifacts() {
    await browser.storage.session.remove(['loginToken', 'loginSalt']);
  }

  /**
   * Submits a user's password to check its validity.
   *
   * @param {string} password The user's password
   */
  async verifyPassword(password) {
    await this.keyringController.verifyPassword(password);
  }

  /**
   * @type Identity
   * @property {string} name - The account nickname.
   * @property {string} address - The account's ethereum address, in lower case.
   * @property {boolean} mayBeFauceting - Whether this account is currently
   * receiving funds from our automatic Ropsten faucet.
   */

  /**
   * Sets the first address in the state to the selected address
   */
  selectFirstIdentity() {
    const { identities } = this.preferencesController.store.getState();
    const address = Object.keys(identities)[0];
    this.preferencesController.setSelectedAddress(address);
  }

  //
  // Hardware
  //

  async getKeyringForDevice(deviceName, hdPath = null) {
    let keyringName = null;
    switch (deviceName) {
      case 'onekey':
        keyringName = OneKeyKeyring.type;
        break;
      // case 'ledger':
      //   keyringName = LedgerBridgeKeyring.type;
      //   break;
      default:
        throw new Error(
          'StarMaskController:getKeyringForDevice - Unknown device',
        );
    }
    let keyring = await this.keyringController.getKeyringsByType(
      keyringName,
    )[0];
    if (!keyring) {
      keyring = await this.keyringController.addNewKeyring(keyringName);
    }
    if (hdPath && keyring.setHdPath) {
      keyring.setHdPath(hdPath);
    }

    keyring.network = this.networkController.getProviderConfig().type;

    return keyring;
  }

  /**
   * Fetch account list from a onekey device.
   *
   * @returns [] accounts
   */
  async connectHardware(deviceName, page, hdPath) {
    const keyring = await this.getKeyringForDevice(deviceName, hdPath);
    let accounts = [];
    switch (page) {
      case -1:
        accounts = await keyring.getPreviousPage();
        break;
      case 1:
        accounts = await keyring.getNextPage();
        break;
      default:
        accounts = await keyring.getFirstPage();
    }

    // Merge with existing accounts
    // and make sure addresses are not repeated
    const oldAccounts = await this.keyringController.getAccounts();
    const accountsToTrack = [
      ...new Set(
        oldAccounts.concat(accounts.map((a) => a.address.toLowerCase())),
      ),
    ];
    this.accountTracker.syncWithAddresses(accountsToTrack);
    return accounts;
  }

  /**
   * Check if the device is unlocked
   *
   * @returns {Promise<boolean>}
   */
  async checkHardwareStatus(deviceName, hdPath) {
    const keyring = await this.getKeyringForDevice(deviceName, hdPath);
    return keyring.isUnlocked();
  }

  /**
   * Clear
   *
   * @returns {Promise<boolean>}
   */
  async forgetDevice(deviceName) {
    const keyring = await this.getKeyringForDevice(deviceName);
    keyring.forgetDevice();
    return true;
  }

  /**
   * Imports an account from a OneKey or Ledger device.
   *
   * @returns {} keyState
   */
  async unlockHardwareWalletAccount(
    index,
    deviceName,
    hdPath,
    hdPathDescription,
  ) {
    const keyring = await this.getKeyringForDevice(deviceName, hdPath);

    keyring.setAccountToUnlock(index);
    const oldAccounts = await this.keyringController.getAccounts();
    const keyState = await this.keyringController.addNewAccount(keyring);
    const newAccounts = await this.keyringController.getAccounts();
    this.preferencesController.setAddresses(newAccounts);
    newAccounts.forEach((address) => {
      if (!oldAccounts.includes(address)) {
        const label = `${ deviceName[0].toUpperCase() }${ deviceName.slice(1) } ${ parseInt(index, 10) + 1
          } ${ hdPathDescription || '' }`.trim();
        // Set the account label to OneKey 1 /  Ledger 1, etc
        this.preferencesController.setAccountLabel(address, label);
        // Select the account
        this.preferencesController.setSelectedAddress(address);
      }
    });

    const { identities } = this.preferencesController.store.getState();
    return { ...keyState, identities };
  }

  //
  // Account Management
  //

  /**
   * Adds a new account to the default (first) HD seed phrase Keyring.
   *
   * @returns {} keyState
   */
  async addNewAccount(ticker) {
    log.debug('metamaskController addNewAccount', { ticker })
    if (!ticker) {
      log.debug('tiker is undefined')
      ticker = this.networkController.getCurrentNetworkTicker()
    }
    log.debug({ ticker })

    const type = TICKER_HD_KEYRING_TYPE[ticker]
    const primaryKeyring = this.keyringController.getKeyringsByType(type)[0];
    if (!primaryKeyring) {
      throw new Error('StarMaskController - No HD Key Tree found');
    }
    const { keyringController } = this;
    const oldAccounts = await keyringController.getAccounts();
    const keyState = await keyringController.addNewAccount(primaryKeyring);
    const newAccounts = await keyringController.getAccounts();
    await this.verifySeedPhrase();

    this.preferencesController.setAddresses(newAccounts);

    newAccounts.forEach((address) => {
      if (!oldAccounts.includes(address)) {
        this.preferencesController.setSelectedAddress(address);
      }
    });

    const { identities } = this.preferencesController.store.getState();
    return { ...keyState, identities };
  }

  async addDefaultAccountInCurrentTicker() {
    const ticker = this.networkController.getCurrentNetworkTicker()
    const previousTicker = this.networkController.getPreviousNetworkTicker()
    if (ticker === previousTicker) {
      return
    }
    const previousType = TICKER_HD_KEYRING_TYPE[previousTicker]
    const previousPrimaryKeyring = this.keyringController.getKeyringsByType(previousType)[0];
    if (!previousPrimaryKeyring) {
      throw new Error('StarMaskController - No HD Key Tree found');
    }
    const opts = await previousPrimaryKeyring.serialize()
    const type = TICKER_HD_KEYRING_TYPE[ticker]
    let keyring = this.keyringController.getKeyringsByType(type)[0];
    if (!keyring) {
      keyring = await this.keyringController.addNewKeyring(type, {
        mnemonic: opts.mnemonic,
        numberOfAccounts: 1,
      })
    }
    const accounts = await keyring.getAccounts()
    if (accounts.length < 1) {
      throw new Error('StarMaskController - No accounts found');
    }
    return accounts[0]
  }
  /**
   * Verifies the validity of the current vault's seed phrase.
   *
   * Validity: seed phrase restores the accounts belonging to the current vault.
   *
   * Called when the first account is created and on unlocking the vault.
   *
   * @returns {Promise<string>} Seed phrase to be confirmed by the user.
   */
  async verifySeedPhrase() {
    const networkTicker = this.networkController.getCurrentNetworkTicker()
    const type = TICKER_HD_KEYRING_TYPE[networkTicker]
    const primaryKeyring = this.keyringController.getKeyringsByType(type)[0];
    if (!primaryKeyring) {
      throw new Error('StarMaskController - No HD Key Tree found');
    }

    const serialized = await primaryKeyring.serialize();
    const seedWords = serialized.mnemonic;

    const accounts = await primaryKeyring.getAccounts();
    if (accounts.length < 1) {
      throw new Error('StarMaskController - No accounts found');
    }

    try {
      await seedPhraseVerifier.verifyAccounts(accounts, seedWords, networkTicker);
      return seedWords;
    } catch (err) {
      log.error(err.message);
      throw err;
    }
  }

  /**
   * Clears the transaction history, to allow users to force-reset their nonces.
   * Mostly used in development environments, when networks are restarted with
   * the same network ID.
   *
   * @returns {Promise<string>} The current selected address.
   */
  async resetAccount() {
    const selectedAddress = this.preferencesController.getSelectedAddress();
    this.txController.wipeTransactions(selectedAddress);
    this.networkController.resetConnection();

    return selectedAddress;
  }

  /**
   * Removes an account from state / storage.
   *
   * @param {string[]} address - A hex address
   *
   */
  async removeAccount(address) {
    // Remove all associated permissions
    await this.permissionsController.removeAllAccountPermissions(address);
    // Remove account from the preferences controller
    this.preferencesController.removeAddress(address);
    // Remove account from the account tracker controller
    this.accountTracker.removeAccount([address]);

    // Remove account from the keyring
    await this.keyringController.removeAccount(address);
    return address;
  }

  /**
   * Imports an account with the specified import strategy.
   * These are defined in app/scripts/account-import-strategies
   * Each strategy represents a different way of serializing an Ethereum key pair.
   *
   * @param {string} strategy - A unique identifier for an account import strategy.
   * @param {any} args - The data required by that strategy to import an account.
   * @param {Function} cb - A callback function called with a state update on success.
   */
  async importAccountWithStrategy(strategy, args) {
    log.debug('importAccountWithStrategy', { strategy, args })
    const privateKey = await accountImporter.importAccount(strategy, args);
    log.debug({ privateKey })
    const bytes = arrayify(addHexPrefix(privateKey));
    log.debug({ bytes })
    const len = bytes.length;
    log.debug('len=', len, len - 3, (len - 3) / 32, (len - 3) % 32)
    let keyring;
    if ((len - 3) / 32 < 1 && (len - 3) % 32 > 0) {
      // Single
      log.debug('single')
      const publicKeyBuff = await privateToPublicED(privateKey);
      const publicKey = publicKeyBuff.toString('hex');
      const { ticker } = this.networkController.getProviderConfig();
      const type = (ticker === 'APT') ? 'Aptos Simple Key Pair' : 'Simple Key Pair';
      keyring = await this.keyringController.addNewKeyring(type, [
        { privateKey, publicKey },
      ]);
    } else {
      // Multi
      log.debug('multi');
      const {
        publicKeys,
        threshold,
        privateKeys,
      } = utils.account.decodeMultiEd25519AccountPrivateKey(
        addHexPrefix(privateKey),
      );
      keyring = await this.keyringController.addNewKeyring('Multi Sign', [
        { privateKeys, publicKeys, threshold },
      ]);
    }

    const accounts = await keyring.getAccounts();
    // update accounts in preferences controller
    const allAccounts = await this.keyringController.getAccounts();
    this.preferencesController.setAddresses(allAccounts);
    // set new account as selected
    await this.preferencesController.setSelectedAddress(accounts[0]);
  }

  async createMultiSignAccount(args) {
    const keyring = await this.keyringController.addNewKeyring('Multi Sign', [
      { ...args },
    ]);
    const accounts = await keyring.getAccounts();
    // update accounts in preferences controller
    const allAccounts = await this.keyringController.getAccounts();
    this.preferencesController.setAddresses(allAccounts);
    // set new account as selected
    await this.preferencesController.setSelectedAddress(accounts[0]);
  }

  // ---------------------------------------------------------------------------
  // Identity Management (signature operations)

  /**
   * Called when a Dapp suggests a new tx to be signed.
   * this wrapper needs to exist so we can provide a reference to
   *  "newUnapprovedTransaction" before "txController" is instantiated
   *
   * @param {Object} msgParams - The params passed to eth_sign.
   * @param {Object} req - (optional) the original request, containing the origin
   */
  async newUnapprovedTransaction(txParams, req) {
    return await this.txController.newUnapprovedTransaction(txParams, req);
  }

  // eth_sign methods:

  /**
   * Called when a Dapp uses the eth_sign method, to request user approval.
   * eth_sign is a pure signature of arbitrary data. It is on a deprecation
   * path, since this data can be a transaction, or can leak private key
   * information.
   *
   * @param {Object} msgParams - The params passed to eth_sign.
   * @param {Function} cb - The callback function called with the signature.
   */
  newUnsignedMessage(msgParams, req) {
    const promise = this.messageManager.addUnapprovedMessageAsync(
      msgParams,
      req,
    );
    this.sendUpdate();
    this.opts.showUserConfirmation();
    return promise;
  }

  /**
   * Signifies user intent to complete an eth_sign method.
   *
   * @param {Object} msgParams - The params passed to eth_call.
   * @returns {Promise<Object>} Full state update.
   */
  signMessage(msgParams) {
    log.info('StarMaskController - signMessage');
    const msgId = msgParams.metamaskId;

    // sets the status op the message to 'approved'
    // and removes the metamaskId for signing
    return this.messageManager
      .approveMessage(msgParams)
      .then((cleanMsgParams) => {
        // signs the message
        return this.keyringController.signMessage(cleanMsgParams);
      })
      .then((rawSig) => {
        // tells the listener that the message has been signed
        // and can be returned to the dapp
        this.messageManager.setMsgStatusSigned(msgId, rawSig);
        return this.getState();
      });
  }

  /**
   * Used to cancel a message submitted via eth_sign.
   *
   * @param {string} msgId - The id of the message to cancel.
   */
  cancelMessage(msgId, cb) {
    const { messageManager } = this;
    messageManager.rejectMsg(msgId);
    if (!cb || typeof cb !== 'function') {
      return;
    }
    cb(null, this.getState());
  }

  // personal_sign methods:

  /**
   * Called when a dapp uses the personal_sign method.
   * This is identical to the Geth eth_sign method, and may eventually replace
   * eth_sign.
   *
   * We currently define our eth_sign and personal_sign mostly for legacy Dapps.
   *
   * @param {Object} msgParams - The params of the message to sign & return to the Dapp.
   * @param {Function} cb - The callback function called with the signature.
   * Passed back to the requesting Dapp.
   */
  async newUnsignedPersonalMessage(msgParams, req) {
    const promise = this.personalMessageManager.addUnapprovedMessageAsync(
      msgParams,
      req,
    );
    this.sendUpdate();
    this.opts.showUserConfirmation();
    return promise;
  }

  /**
   * Signifies a user's approval to sign a personal_sign message in queue.
   * Triggers signing, and the callback function from newUnsignedPersonalMessage.
   *
   * @param {Object} msgParams - The params of the message to sign & return to the Dapp.
   * @returns {Promise<Object>} A full state update.
   */
  async signPersonalMessage(msgParams) {
    log.info('StarMaskController - signPersonalMessage', { msgParams });
    const msgId = msgParams.metamaskId;
    const signingMessage = new starcoin_types.SigningMessage(arrayify(msgParams.data));
    const chainId = parseInt(msgParams.networkId, 10);
    // sets the status op the message to 'approved'
    // and removes the metamaskId for signing
    return this.personalMessageManager
      .approveMessage(msgParams)
      .then((cleanMsgParams) => {
        // signs the message
        const rawData = Buffer.from(stripHexPrefix(cleanMsgParams.data), 'hex').toString('utf8')
        cleanMsgParams.rawData = rawData;
        return this.keyringController.signPersonalMessage(cleanMsgParams);
      })
      .then((payload) => {
        const { publicKey, signature } = payload;
        return utils.signedMessage.generateSignedMessage(signingMessage, chainId, publicKey, signature)
      })
      .then((rawSig) => {
        // tells the listener that the message has been signed
        // and can be returned to the dapp
        this.personalMessageManager.setMsgStatusSigned(msgId, rawSig);
        return this.getState();
      });
  }

  async signAptMessage(msgParams) {
    // log.info('StarMaskController - signAptMessage', { msgParams });
    const msgId = msgParams.metamaskId;
    const chainId = parseInt(this.networkController.getCurrentChainId(), 16);
    // sets the status op the message to 'approved'
    // and removes the metamaskId for signing
    const signMessageResponse = {
      prefix: 'APTOS',
      address: msgParams.from,
      application: msgParams.origin,
      chainId: chainId,
      message: msgParams.message,
      nonce: msgParams.nonce,
    }
    return this.personalMessageManager
      .approveMessage(msgParams)
      .then((cleanMsgParams) => {
        // signs the message
        delete cleanMsgParams.data
        const getFullMessage = (msgPayload) => {
          const fullMessage = [signMessageResponse.prefix]
          if (msgPayload.address) {
            fullMessage.push(`address: ${ signMessageResponse.address }`)
          }
          if (msgPayload.application) {
            fullMessage.push(`application: ${ signMessageResponse.application }`)
          }
          if (msgPayload.chainId) {
            fullMessage.push(`chainId: ${ signMessageResponse.chainId }`)
          }
          fullMessage.push(`message: ${ signMessageResponse.message }`)
          fullMessage.push(`nonce: ${ signMessageResponse.nonce }`)
          return fullMessage.join('\n')
        }
        const fullMsg = getFullMessage(cleanMsgParams)
        cleanMsgParams.rawData = fullMsg
        signMessageResponse.fullMessage = fullMsg
        return this.keyringController.signPersonalMessage(cleanMsgParams);
      })
      .then((payload) => {
        const { signature } = payload;
        signMessageResponse.signature = signature
        return signMessageResponse
      })
      .then((rawSig) => {
        // tells the listener that the message has been signed
        // and can be returned to the dapp
        this.personalMessageManager.setMsgStatusSigned(msgId, rawSig);
        return this.getState();
      });
  }

  /**
   * Used to cancel a personal_sign type message.
   * @param {string} msgId - The ID of the message to cancel.
   * @param {Function} cb - The callback function called with a full state update.
   */
  cancelPersonalMessage(msgId, cb) {
    const messageManager = this.personalMessageManager;
    messageManager.rejectMsg(msgId);
    if (!cb || typeof cb !== 'function') {
      return;
    }
    cb(null, this.getState());
  }

  // stc_decrypt methods

  /**
   * Called when a dapp uses the stc_decrypt method.
   *
   * @param {Object} msgParams - The params of the message to sign & return to the Dapp.
   * @param {Object} req - (optional) the original request, containing the origin
   * Passed back to the requesting Dapp.
   */
  async newRequestDecryptMessage(msgParams, req) {
    const promise = this.decryptMessageManager.addUnapprovedMessageAsync(
      msgParams,
      req,
    );
    this.sendUpdate();
    this.opts.showUserConfirmation();
    return promise;
  }

  /**
   * Only decrypt message and don't touch transaction state
   *
   * @param {Object} msgParams - The params of the message to decrypt.
   * @returns {Promise<Object>} A full state update.
   */
  async decryptMessageInline(msgParams) {
    log.info('StarMaskController - decryptMessageInline');
    // decrypt the message inline
    const msgId = msgParams.metamaskId;
    const msg = this.decryptMessageManager.getMsg(msgId);
    try {
      const stripped = stripHexPrefix(msgParams.data);
      const buff = Buffer.from(stripped, 'hex');
      msgParams.data = JSON.parse(buff.toString('utf8'));

      msg.rawData = await this.keyringController.decryptMessage(msgParams);
    } catch (e) {
      msg.error = e.message;
    }
    this.decryptMessageManager._updateMsg(msg);

    return this.getState();
  }

  /**
   * Signifies a user's approval to decrypt a message in queue.
   * Triggers decrypt, and the callback function from newUnsignedDecryptMessage.
   *
   * @param {Object} msgParams - The params of the message to decrypt & return to the Dapp.
   * @returns {Promise<Object>} A full state update.
   */
  async decryptMessage(msgParams) {
    log.info('StarMaskController - decryptMessage');
    const msgId = msgParams.metamaskId;
    // sets the status op the message to 'approved'
    // and removes the metamaskId for decryption
    try {
      const cleanMsgParams = await this.decryptMessageManager.approveMessage(
        msgParams,
      );

      const stripped = stripHexPrefix(cleanMsgParams.data);
      const buff = Buffer.from(stripped, 'hex');
      cleanMsgParams.data = JSON.parse(buff.toString('utf8'));

      // decrypt the message
      const rawMess = await this.keyringController.decryptMessage(
        cleanMsgParams,
      );
      // tells the listener that the message has been decrypted and can be returned to the dapp
      this.decryptMessageManager.setMsgStatusDecrypted(msgId, rawMess);
    } catch (error) {
      log.info('StarMaskController - stc_decrypt failed.', error);
      this.decryptMessageManager.errorMessage(msgId, error);
    }
    return this.getState();
  }

  /**
   * Used to cancel a stc_decrypt type message.
   * @param {string} msgId - The ID of the message to cancel.
   * @param {Function} cb - The callback function called with a full state update.
   */
  cancelDecryptMessage(msgId, cb) {
    const messageManager = this.decryptMessageManager;
    messageManager.rejectMsg(msgId);
    if (!cb || typeof cb !== 'function') {
      return;
    }
    cb(null, this.getState());
  }

  // stc_getEncryptionPublicKey methods

  /**
   * Called when a dapp uses the stc_getEncryptionPublicKey method.
   *
   * @param {Object} msgParams - The params of the message to sign & return to the Dapp.
   * @param {Object} req - (optional) the original request, containing the origin
   * Passed back to the requesting Dapp.
   */
  async newRequestEncryptionPublicKey(msgParams, req) {
    const address = msgParams;
    const keyring = await this.keyringController.getKeyringForAccount(address);

    switch (keyring.type) {
      case 'Ledger Hardware': {
        return new Promise((_, reject) => {
          reject(
            new Error('Ledger does not support stc_getEncryptionPublicKey.'),
          );
        });
      }

      case 'OneKey Hardware': {
        return new Promise((_, reject) => {
          reject(
            new Error('OneKey does not support stc_getEncryptionPublicKey.'),
          );
        });
      }

      default: {
        const promise = this.encryptionPublicKeyManager.addUnapprovedMessageAsync(
          msgParams,
          req,
        );
        this.sendUpdate();
        this.opts.showUserConfirmation();
        return promise;
      }
    }
  }

  /**
   * Signifies a user's approval to receiving encryption public key in queue.
   * Triggers receiving, and the callback function from newUnsignedEncryptionPublicKey.
   *
   * @param {Object} msgParams - The params of the message to receive & return to the Dapp.
   * @returns {Promise<Object>} A full state update.
   */
  async encryptionPublicKey(msgParams) {
    log.info('StarMaskController - encryptionPublicKey');
    const msgId = msgParams.metamaskId;
    // sets the status op the message to 'approved'
    // and removes the metamaskId for decryption
    try {
      const params = await this.encryptionPublicKeyManager.approveMessage(
        msgParams,
      );

      // EncryptionPublicKey message
      const publicKey = await this.keyringController.getEncryptionPublicKey(
        params.data,
      );

      // tells the listener that the message has been processed
      // and can be returned to the dapp
      this.encryptionPublicKeyManager.setMsgStatusReceived(msgId, publicKey);
    } catch (error) {
      log.info(
        'StarMaskController - stc_getEncryptionPublicKey failed.',
        error,
      );
      this.encryptionPublicKeyManager.errorMessage(msgId, error);
    }
    return this.getState();
  }

  /**
   * Used to cancel a stc_getEncryptionPublicKey type message.
   * @param {string} msgId - The ID of the message to cancel.
   * @param {Function} cb - The callback function called with a full state update.
   */
  cancelEncryptionPublicKey(msgId, cb) {
    const messageManager = this.encryptionPublicKeyManager;
    messageManager.rejectMsg(msgId);
    if (!cb || typeof cb !== 'function') {
      return;
    }
    cb(null, this.getState());
  }

  // eth_signTypedData methods

  /**
   * Called when a dapp uses the eth_signTypedData method, per EIP 712.
   *
   * @param {Object} msgParams - The params passed to eth_signTypedData.
   * @param {Function} cb - The callback function, called with the signature.
   */
  newUnsignedTypedMessage(msgParams, req, version) {
    const promise = this.typedMessageManager.addUnapprovedMessageAsync(
      msgParams,
      req,
      version,
    );
    this.sendUpdate();
    this.opts.showUserConfirmation();
    return promise;
  }

  /**
   * The method for a user approving a call to eth_signTypedData, per EIP 712.
   * Triggers the callback in newUnsignedTypedMessage.
   *
   * @param {Object} msgParams - The params passed to eth_signTypedData.
   * @returns {Object} Full state update.
   */
  async signTypedMessage(msgParams) {
    log.info('StarMaskController - eth_signTypedData');
    const msgId = msgParams.metamaskId;
    const { version } = msgParams;
    try {
      const cleanMsgParams = await this.typedMessageManager.approveMessage(
        msgParams,
      );

      // For some reason every version after V1 used stringified params.
      if (version !== 'V1') {
        // But we don't have to require that. We can stop suggesting it now:
        if (typeof cleanMsgParams.data === 'string') {
          cleanMsgParams.data = JSON.parse(cleanMsgParams.data);
        }
      }

      const signature = await this.keyringController.signTypedMessage(
        cleanMsgParams,
        { version },
      );
      this.typedMessageManager.setMsgStatusSigned(msgId, signature);
      return this.getState();
    } catch (error) {
      log.info('StarMaskController - eth_signTypedData failed.', error);
      this.typedMessageManager.errorMessage(msgId, error);
      throw error;
    }
  }

  /**
   * Used to cancel a eth_signTypedData type message.
   * @param {string} msgId - The ID of the message to cancel.
   * @param {Function} cb - The callback function called with a full state update.
   */
  cancelTypedMessage(msgId, cb) {
    const messageManager = this.typedMessageManager;
    messageManager.rejectMsg(msgId);
    if (!cb || typeof cb !== 'function') {
      return;
    }
    cb(null, this.getState());
  }

  //=============================================================================
  // END (VAULT / KEYRING RELATED METHODS)
  //=============================================================================

  /**
   * Allows a user to attempt to cancel a previously submitted transaction by creating a new
   * transaction.
   * @param {number} originalTxId - the id of the txMeta that you want to attempt to cancel
   * @param {string} [customGasPrice] - the hex value to use for the cancel transaction
   * @returns {Object} MetaMask state
   */
  async createCancelTransaction(originalTxId, customGasPrice, customGasLimit) {
    await this.txController.createCancelTransaction(
      originalTxId,
      customGasPrice,
      customGasLimit,
    );
    const state = await this.getState();
    return state;
  }

  async createSpeedUpTransaction(originalTxId, customGasPrice, customGasLimit) {
    await this.txController.createSpeedUpTransaction(
      originalTxId,
      customGasPrice,
      customGasLimit,
    );
    const state = await this.getState();
    return state;
  }

  async signMultiSignTransaction(txnHex) {
    const metamaskState = await this.getState();
    await this.txController.signMultiSignTransaction(txnHex, metamaskState.selectedAddress);
    const state = await this.getState();
    return state;
  }

  estimateGas(estimateGasParams) {
    return new Promise((resolve, reject) => {
      const { network } = this.networkController.store.getState();
      if (['devnet', 'testnet', 'mainnet'].includes(network.name)) {
        let payload
        if (estimateGasParams.code) {
          // send other tokens
          payload = {
            type: "entry_function_payload",
            function: "0x1::coin::transfer",
            type_arguments: [estimateGasParams.code],
            arguments: [estimateGasParams.to, 10],
          };
        } else {
          // send APT
          payload = {
            type: "entry_function_payload",
            function: "0x1::aptos_account::transfer",
            type_arguments: [],
            arguments: [estimateGasParams.to, 10],
          };
        }
        const client = this.txController.txGasUtil.getAptosClient()
        return client.generateTransaction(estimateGasParams.from, payload)
          .then((rawTxn) => {
            return this.keyringController.exportAccount(estimateGasParams.from)
              .then((privateKey) => {
                const fromAccount = AptosAccount.fromAptosAccountObject({ privateKeyHex: addHexPrefix(privateKey) });
                return client.simulateTransaction(fromAccount, rawTxn, {
                  estimateGasUnitPrice: true,
                  estimateMaxGasAmount: true,
                  estimatePrioritizedGasUnitPrice: true,
                })
                  .then((result) => {
                    const transactionRespSimulation = result[0]
                    return resolve({
                      gas_unit_price: parseInt(transactionRespSimulation.gas_unit_price, 10),
                      gas_used: parseInt(transactionRespSimulation.gas_used, 10),
                      max_gas_amount: parseInt(transactionRespSimulation.max_gas_amount, 10),
                    });
                  })
              })
          }).catch(error => {
            log.error(error)
            reject(error)
          })
      } else {
        // network = 0xfe for `Localhost 9850`
        // network = { name: XXX, id: XXX_NETWORK_ID } for others
        const chainId = network.id ? network.id : Number(hexToDecimal(network));
        const tokenCode = estimateGasParams.code ? estimateGasParams.code : '0x00000000000000000000000000000001::STC::STC'
        return this.keyringController.getPublicKeyFor(estimateGasParams.from)
          .then((publicKey) => {
            const gas_unit_price = 1
            const max_gas_amount = 10000000
            let gas_used = 0
            if (!estimateGasParams.to) {
              return resolve({ gas_unit_price, gas_used });
            }
            const params = {
              chain_id: chainId,
              gas_unit_price,
              sender: estimateGasParams.from,
              sender_public_key: publicKey,
              sequence_number: estimateGasParams.sequenceNumber,
              max_gas_amount,
              script: {
                code: '0x00000000000000000000000000000001::TransferScripts::peer_to_peer_v2',
                type_args: [tokenCode],
                args: [estimateGasParams.to, `${ hexToDecimal(estimateGasParams.gas) }u128`]
              },
            };
            return this.txController.txGasUtil.query.estimateGas(
              params,
              (err, res) => {
                if (err) {
                  return reject(err);
                }
                gas_used = parseInt(res.gas_used, 10);
                return resolve({ gas_unit_price, gas_used, max_gas_amount });
              },
            );
          });
      }

    });
  }

  //=============================================================================
  // PASSWORD MANAGEMENT
  //=============================================================================

  /**
   * Allows a user to begin the seed phrase recovery process.
   * @param {Function} cb - A callback function called when complete.
   */
  markPasswordForgotten(cb) {
    this.preferencesController.setPasswordForgotten(true);
    this.sendUpdate();
    cb();
  }

  /**
   * Allows a user to end the seed phrase recovery process.
   * @param {Function} cb - A callback function called when complete.
   */
  unMarkPasswordForgotten(cb) {
    this.preferencesController.setPasswordForgotten(false);
    this.sendUpdate();
    cb();
  }

  //=============================================================================
  // SETUP
  //=============================================================================

  /**
   * A runtime.MessageSender object, as provided by the browser:
   * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender
   * @typedef {Object} MessageSender
   */

  /**
   * Used to create a multiplexed stream for connecting to an untrusted context
   * like a Dapp or other extension.
   * @param {*} connectionStream - The Duplex stream to connect to.
   * @param {MessageSender} sender - The sender of the messages on this stream
   */
  setupUntrustedCommunication(connectionStream, sender) {
    const { usePhishDetect } = this.preferencesController.store.getState();
    const { hostname } = new URL(sender.url);
    // Check if new connection is blocked if phishing detection is on
    if (usePhishDetect && this.phishingController.test(hostname)) {
      this.sendPhishingWarning(connectionStream, hostname);
      return;
    }

    // setup multiplexing
    const mux = setupMultiplex(connectionStream);

    // messages between inpage and background
    this.setupProviderConnection(mux.createStream('starmask-provider'), sender);

  }

  /**
   * Used to create a multiplexed stream for connecting to a trusted context,
   * like our own user interfaces, which have the provider APIs, but also
   * receive the exported API from this controller, which includes trusted
   * functions, like the ability to approve transactions or sign messages.
   *
   * @param {*} connectionStream - The duplex stream to connect to.
   * @param {MessageSender} sender - The sender of the messages on this stream
   */
  setupTrustedCommunication(connectionStream, sender) {
    // setup multiplexing
    const mux = setupMultiplex(connectionStream);
    // connect features
    this.setupControllerConnection(mux.createStream('controller'));
    this.setupProviderConnection(mux.createStream('provider'), sender, true);
  }

  /**
   * Called when we detect a suspicious domain. Requests the browser redirects
   * to our anti-phishing page.
   *
   * @private
   * @param {*} connectionStream - The duplex stream to the per-page script,
   * for sending the reload attempt to.
   * @param {string} hostname - The hostname that triggered the suspicion.
   */
  sendPhishingWarning(connectionStream, hostname) {
    const mux = setupMultiplex(connectionStream);
    const phishingStream = mux.createStream('phishing');
    phishingStream.write({ hostname });
  }

  /**
   * A method for providing our API over a stream using JSON-RPC.
   * @param {*} outStream - The stream to provide our API over.
   */
  setupControllerConnection(outStream) {
    const api = this.getApi();

    // report new active controller connection
    this.activeControllerConnections += 1;
    this.emit('controllerConnectionChanged', this.activeControllerConnections);

    // set up postStream transport
    outStream.on('data', createMetaRPCHandler(api, outStream));
    const handleUpdate = (update) => {
      // send notification to client-side
      outStream.write({
        jsonrpc: '2.0',
        method: 'sendUpdate',
        params: [update],
      });
    };
    this.on('update', handleUpdate);
    const startUISync = () => {
      if (outStream._writableState.ended) {
        return;
      }
      // send notification to client-side
      outStream.write({
        jsonrpc: '2.0',
        method: 'startUISync',
      });
    };

    if (this.startUISync) {
      startUISync();
    } else {
      this.once('startUISync', startUISync);
    }
    outStream.on('end', () => {
      this.activeControllerConnections -= 1;
      this.emit(
        'controllerConnectionChanged',
        this.activeControllerConnections,
      );
      this.removeListener('update', handleUpdate);
    });
  }

  /**
   * A method for serving our ethereum provider over a given stream.
   * @param {*} outStream - The stream to provide over.
   * @param {MessageSender} sender - The sender of the messages on this stream
   * @param {boolean} isInternal - True if this is a connection with an internal process
   */
  setupProviderConnection(outStream, sender, isInternal) {
    const origin = isInternal ? 'starmask' : new URL(sender.url).origin;
    let extensionId;
    if (sender.id !== this.extension.runtime.id) {
      extensionId = sender.id;
    }
    let tabId;
    if (sender.tab && sender.tab.id) {
      tabId = sender.tab.id;
    }

    const engine = this.setupProviderEngine({
      origin,
      location: sender.url,
      extensionId,
      tabId,
      isInternal,
    });

    // setup connection
    const providerStream = createEngineStream({ engine });

    const connectionId = this.addConnection(origin, { engine });

    pump(outStream, providerStream, outStream, (err) => {
      // handle any middleware cleanup
      engine._middleware.forEach((mid) => {
        if (mid.destroy && typeof mid.destroy === 'function') {
          mid.destroy();
        }
      });
      connectionId && this.removeConnection(origin, connectionId);
      if (err) {
        log.error(err);
      }
    });

    // update unknown transaction while inited or network re-online
    this.txController.updateUnknownTxs();
  }

  /**
   * A method for creating a provider that is safely restricted for the requesting domain.
   * @param {Object} options - Provider engine options
   * @param {string} options.origin - The origin of the sender
   * @param {string} options.location - The full URL of the sender
   * @param {extensionId} [options.extensionId] - The extension ID of the sender, if the sender is an external extension
   * @param {tabId} [options.tabId] - The tab ID of the sender - if the sender is within a tab
   * @param {boolean} [options.isInternal] - True if called for a connection to an internal process
   **/
  setupProviderEngine({
    origin,
    location,
    extensionId,
    tabId,
    isInternal = false,
  }) {
    // setup json rpc engine stack
    const engine = new JsonRpcEngine();
    const { provider, blockTracker } = this;

    // create filter polyfill middleware
    const filterMiddleware = createFilterMiddleware({ provider, blockTracker });

    // create subscription polyfill middleware
    const subscriptionManager = createSubscriptionManager({
      provider,
      blockTracker,
    });
    subscriptionManager.events.on('notification', (message) =>
      engine.emit('notification', message),
    );

    // append origin to each request
    engine.push(createOriginMiddleware({ origin }));
    // append tabId to each request if it exists
    if (tabId) {
      engine.push(createTabIdMiddleware({ tabId }));
    }
    // logging
    engine.push(createLoggerMiddleware({ origin }));
    engine.push(
      createOnboardingMiddleware({
        location,
        registerOnboarding: this.onboardingController.registerOnboarding,
      }),
    );
    engine.push(
      createMethodMiddleware({
        origin,
        getProviderState: this.getProviderState.bind(this),
        sendMetrics: this.metaMetricsController.trackEvent.bind(
          this.metaMetricsController,
        ),
        handleWatchAssetRequest: this.preferencesController.requestWatchAsset.bind(
          this.preferencesController,
        ),
        getWeb3ShimUsageState: this.alertController.getWeb3ShimUsageState.bind(
          this.alertController,
        ),
        setWeb3ShimUsageRecorded: this.alertController.setWeb3ShimUsageRecorded.bind(
          this.alertController,
        ),
        findCustomRpcBy: this.findCustomRpcBy.bind(this),
        getCurrentChainId: this.networkController.getCurrentChainId.bind(
          this.networkController,
        ),
        getNetworkIdentifier: this.networkController.getNetworkIdentifier.bind(
          this.networkController,
        ),
        setProviderType: this.networkController.setProviderType.bind(
          this.networkController,
        ),
        requestUserApproval: this.approvalController.addAndShowApprovalRequest.bind(
          this.approvalController,
        ),
        updateRpcTarget: ({ rpcUrl, chainId, ticker, nickname }) => {
          this.networkController.setRpcTarget(
            rpcUrl,
            chainId,
            ticker,
            nickname,
          );
        },
        addCustomRpc: async ({
          chainId,
          blockExplorerUrl,
          ticker,
          chainName,
          rpcUrl,
        } = {}) => {
          await this.preferencesController.addToFrequentRpcList(
            rpcUrl,
            chainId,
            ticker,
            chainName,
            {
              blockExplorerUrl,
            },
          );
        },
      }),
    );
    // filter and subscription polyfills
    engine.push(filterMiddleware);
    engine.push(subscriptionManager.middleware);
    if (!isInternal) {
      // permissions
      engine.push(
        this.permissionsController.createMiddleware({ origin, extensionId }),
      );
    }
    // forward to starmask primary provider
    engine.push(providerAsMiddleware(provider));
    return engine;
  }

  /**
   * Adds a reference to a connection by origin. Ignores the 'starmask' origin.
   * Caller must ensure that the returned id is stored such that the reference
   * can be deleted later.
   *
   * @param {string} origin - The connection's origin string.
   * @param {Object} options - Data associated with the connection
   * @param {Object} options.engine - The connection's JSON Rpc Engine
   * @returns {string} The connection's id (so that it can be deleted later)
   */
  addConnection(origin, { engine }) {
    if (origin === 'starmask') {
      return null;
    }

    if (!this.connections[origin]) {
      this.connections[origin] = {};
    }

    const id = nanoid();
    this.connections[origin][id] = {
      engine,
    };

    return id;
  }

  /**
   * Deletes a reference to a connection, by origin and id.
   * Ignores unknown origins.
   *
   * @param {string} origin - The connection's origin string.
   * @param {string} id - The connection's id, as returned from addConnection.
   */
  removeConnection(origin, id) {
    const connections = this.connections[origin];
    if (!connections) {
      return;
    }

    delete connections[id];

    if (Object.keys(connections).length === 0) {
      delete this.connections[origin];
    }
  }

  /**
   * Causes the RPC engines associated with the connections to the given origin
   * to emit a notification event with the given payload.
   *
   * The caller is responsible for ensuring that only permitted notifications
   * are sent.
   *
   * Ignores unknown origins.
   *
   * @param {string} origin - The connection's origin string.
   * @param {any} payload - The event payload.
   */
  notifyConnections(origin, payload) {
    const connections = this.connections[origin];

    if (connections) {
      Object.values(connections).forEach((conn) => {
        if (conn.engine) {
          conn.engine.emit('notification', payload);
        }
      });
    }
  }

  /**
   * Causes the RPC engines associated with all connections to emit a
   * notification event with the given payload.
   *
   * If the "payload" parameter is a function, the payload for each connection
   * will be the return value of that function called with the connection's
   * origin.
   *
   * The caller is responsible for ensuring that only permitted notifications
   * are sent.
   *
   * @param {any} payload - The event payload, or payload getter function.
   */
  notifyAllConnections(payload) {
    const getPayload =
      typeof payload === 'function'
        ? (origin) => payload(origin)
        : () => payload;

    Object.values(this.connections).forEach((origin) => {
      Object.values(origin).forEach((conn) => {
        if (conn.engine) {
          conn.engine.emit('notification', getPayload(origin));
        }
      });
    });
  }

  // handlers

  /**
   * Handle a KeyringController update
   * @param {Object} state - the KC state
   * @returns {Promise<void>}
   * @private
   */
  async _onKeyringControllerUpdate(state) {
    const { keyrings } = state;
    const addresses = keyrings.reduce(
      (acc, { accounts }) => acc.concat(accounts),
      [],
    );

    if (!addresses.length) {
      return;
    }

    // Ensure preferences + identities controller know about all addresses
    this.preferencesController.syncAddresses(addresses);
    this.accountTracker.syncWithAddresses(addresses);
  }

  /**
   * Handle global unlock, triggered by KeyringController unlock.
   * Notifies all connections that the extension is unlocked.
   */
  _onUnlock() {
    this.notifyAllConnections((origin) => {
      return {
        method: NOTIFICATION_NAMES.unlockStateChanged,
        params: {
          isUnlocked: true,
          accounts: this.permissionsController.getAccounts(origin),
        },
      };
    });
    this.emit('unlock');
  }

  /**
   * Handle global lock, triggered by KeyringController lock.
   * Notifies all connections that the extension is locked.
   */
  _onLock() {
    this.notifyAllConnections({
      method: NOTIFICATION_NAMES.unlockStateChanged,
      params: {
        isUnlocked: false,
      },
    });
    this.emit('lock');
  }

  /**
   * Handle memory state updates.
   * - Ensure isClientOpenAndUnlocked is updated
   * - Notifies all connections with the new provider network state
   *   - The external providers handle diffing the state
   */
  _onStateUpdate(newState) {
    this.isClientOpenAndUnlocked = newState.isUnlocked && this._isClientOpen;
    this.notifyAllConnections({
      method: NOTIFICATION_NAMES.chainChanged,
      params: this.getProviderNetworkState(newState),
    });
  }

  // misc

  /**
   * A method for emitting the full MetaMask state to all registered listeners.
   * @private
   */
  privateSendUpdate() {
    this.emit('update', this.getState());
  }

  /**
   * @returns {boolean} Whether the extension is unlocked.
   */
  isUnlocked() {
    return this.keyringController.memStore.getState().isUnlocked;
  }

  //=============================================================================
  // MISCELLANEOUS
  //=============================================================================

  /**
   * Returns the nonce that will be associated with a transaction once approved
   * @param {string} address - The hex string address for the transaction
   * @returns {Promise<number>}
   */
  async getPendingNonce(address) {
    const networkTicker = this.networkController.getCurrentNetworkTicker()
    const {
      nonceDetails,
      releaseLock,
    } = await this.txController.nonceTracker.getNonceLock(address, networkTicker);
    const pendingNonce = nonceDetails.params.highestSuggested;

    releaseLock();
    return pendingNonce;
  }

  /**
   * Returns the next nonce according to the nonce-tracker
   * @param {string} address - The hex string address for the transaction
   * @returns {Promise<number>}
   */
  async getNextNonce(address) {
    const networkTicker = this.networkController.getCurrentNetworkTicker()
    const nonceLock = await this.txController.nonceTracker.getNonceLock(
      address,
      networkTicker
    );
    nonceLock.releaseLock();
    return nonceLock.nextNonce;
  }

  /**
   * Migrate address book state from old to new chainId.
   *
   * Address book state is keyed by the `networkStore` state from the network controller. This value is set to the
   * `networkId` for our built-in Infura networks, but it's set to the `chainId` for custom networks.
   * When this `chainId` value is changed for custom RPC endpoints, we need to migrate any contacts stored under the
   * old key to the new key.
   *
   * The `duplicate` parameter is used to specify that the contacts under the old key should not be removed. This is
   * useful in the case where two RPC endpoints shared the same set of contacts, and we're not sure which one each
   * contact belongs under. Duplicating the contacts under both keys is the only way to ensure they are not lost.
   *
   * @param {string} oldChainId - The old chainId
   * @param {string} newChainId - The new chainId
   * @param {boolean} [duplicate] - Whether to duplicate the addresses on both chainIds (default: false)
   */
  async migrateAddressBookState(oldChainId, newChainId, duplicate = false) {
    const { addressBook } = this.addressBookController.state;

    if (!addressBook[oldChainId]) {
      return;
    }

    for (const address of Object.keys(addressBook[oldChainId])) {
      const entry = addressBook[oldChainId][address];
      this.addressBookController.set(
        address,
        entry.name,
        newChainId,
        entry.memo,
      );
      if (!duplicate) {
        this.addressBookController.delete(oldChainId, address);
      }
    }
  }

  //=============================================================================
  // CONFIG
  //=============================================================================

  // Log blocks

  /**
   * A method for setting the user's preferred display currency.
   * @param {string} currencyCode - The code of the preferred currency.
   * @param {Function} cb - A callback function returning currency info.
   */
  setCurrentCurrency(currencyCode, cb) {
    const { ticker } = this.networkController.getProviderConfig();
    try {
      const currencyState = {
        nativeCurrency: ticker,
        currentCurrency: currencyCode,
      };
      this.currencyRateController.update(currencyState);
      this.currencyRateController.configure(currencyState);
      cb(null, this.currencyRateController.state);
      return;
    } catch (err) {
      cb(err);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  /**
   * A method for selecting a custom URL for an ethereum RPC provider and updating it
   * @param {string} rpcUrl - A URL for a valid Ethereum RPC API.
   * @param {string} chainId - The chainId of the selected network.
   * @param {string} ticker - The ticker symbol of the selected network.
   * @param {string} [nickname] - Nickname of the selected network.
   * @param {Object} [rpcPrefs] - RPC preferences.
   * @param {string} [rpcPrefs.blockExplorerUrl] - URL of block explorer for the chain.
   * @returns {Promise<String>} - The RPC Target URL confirmed.
   */
  async updateAndSetCustomRpc(
    rpcUrl,
    chainId,
    ticker = 'STC',
    nickname,
    rpcPrefs,
  ) {
    this.networkController.setRpcTarget(
      rpcUrl,
      chainId,
      ticker,
      nickname,
      rpcPrefs,
    );
    await this.preferencesController.updateRpc({
      rpcUrl,
      chainId,
      ticker,
      nickname,
      rpcPrefs,
    });
    return rpcUrl;
  }

  /**
   * A method for selecting a custom URL for an ethereum RPC provider.
   * @param {string} rpcUrl - A URL for a valid Ethereum RPC API.
   * @param {string} chainId - The chainId of the selected network.
   * @param {string} ticker - The ticker symbol of the selected network.
   * @param {string} nickname - Optional nickname of the selected network.
   * @returns {Promise<String>} The RPC Target URL confirmed.
   */
  async setCustomRpc(
    rpcUrl,
    chainId,
    ticker = 'STC',
    nickname = '',
    rpcPrefs = {},
  ) {
    const frequentRpcListDetail = this.preferencesController.getFrequentRpcListDetail();
    const rpcSettings = frequentRpcListDetail.find(
      (rpc) => rpcUrl === rpc.rpcUrl,
    );

    if (rpcSettings) {
      this.networkController.setRpcTarget(
        rpcSettings.rpcUrl,
        rpcSettings.chainId,
        rpcSettings.ticker,
        rpcSettings.nickname,
        rpcPrefs,
      );
    } else {
      this.networkController.setRpcTarget(
        rpcUrl,
        chainId,
        ticker,
        nickname,
        rpcPrefs,
      );
      await this.preferencesController.addToFrequentRpcList(
        rpcUrl,
        chainId,
        ticker,
        nickname,
        rpcPrefs,
      );
    }
    return rpcUrl;
  }

  /**
   * A method for deleting a selected custom URL.
   * @param {string} rpcUrl - A RPC URL to delete.
   */
  async delCustomRpc(rpcUrl) {
    await this.preferencesController.removeFromFrequentRpcList(rpcUrl);
  }

  /**
   * Returns the first RPC info object that matches at least one field of the
   * provided search criteria. Returns null if no match is found
   *
   * @param {Object} rpcInfo - The RPC endpoint properties and values to check.
   * @returns {Object} rpcInfo found in the frequentRpcList
   */
  findCustomRpcBy(rpcInfo) {
    const frequentRpcListDetail = this.preferencesController.getFrequentRpcListDetail();
    for (const existingRpcInfo of frequentRpcListDetail) {
      for (const key of Object.keys(rpcInfo)) {
        if (existingRpcInfo[key] === rpcInfo[key]) {
          return existingRpcInfo;
        }
      }
    }
    return null;
  }

  /**
   * Sets whether or not to use the blockie identicon format.
   * @param {boolean} val - True for bockie, false for jazzicon.
   * @param {Function} cb - A callback function called when complete.
   */
  setUseBlockie(val, cb) {
    try {
      this.preferencesController.setUseBlockie(val);
      cb(null);
      return;
    } catch (err) {
      cb(err);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  /**
   * Sets whether or not to use the nonce field.
   * @param {boolean} val - True for nonce field, false for not nonce field.
   * @param {Function} cb - A callback function called when complete.
   */
  setUseNonceField(val, cb) {
    try {
      this.preferencesController.setUseNonceField(val);
      cb(null);
      return;
    } catch (err) {
      cb(err);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  /**
   * Sets whether or not to use phishing detection.
   * @param {boolean} val
   * @param {Function} cb
   */
  setUsePhishDetect(val, cb) {
    try {
      this.preferencesController.setUsePhishDetect(val);
      cb(null);
      return;
    } catch (err) {
      cb(err);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  /**
   * Sets the IPFS gateway to use for ENS content resolution.
   * @param {string} val - the host of the gateway to set
   * @param {Function} cb - A callback function called when complete.
   */
  setIpfsGateway(val, cb) {
    try {
      this.preferencesController.setIpfsGateway(val);
      cb(null);
      return;
    } catch (err) {
      cb(err);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  /**
   * Sets whether or not the user will have usage data tracked with MetaMetrics
   * @param {boolean} bool - True for users that wish to opt-in, false for users that wish to remain out.
   * @param {Function} cb - A callback function called when complete.
   */
  setParticipateInMetaMetrics(bool, cb) {
    try {
      const metaMetricsId = this.metaMetricsController.setParticipateInMetaMetrics(
        bool,
      );
      cb(null, metaMetricsId);
      return;
    } catch (err) {
      cb(err);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  setMetaMetricsSendCount(val, cb) {
    try {
      this.metaMetricsController.setMetaMetricsSendCount(val);
      cb(null);
      return;
    } catch (err) {
      cb(err);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  /**
   * Sets the type of first time flow the user wishes to follow: create or import
   * @param {string} type - Indicates the type of first time flow the user wishes to follow
   * @param {Function} cb - A callback function called when complete.
   */
  setFirstTimeFlowType(type, cb) {
    try {
      this.preferencesController.setFirstTimeFlowType(type);
      cb(null);
      return;
    } catch (err) {
      cb(err);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  /**
   * A method for setting a user's current locale, affecting the language rendered.
   * @param {string} key - Locale identifier.
   * @param {Function} cb - A callback function called when complete.
   */
  setCurrentLocale(key, cb) {
    try {
      const direction = this.preferencesController.setCurrentLocale(key);
      cb(null, direction);
      return;
    } catch (err) {
      cb(err);
      // eslint-disable-next-line no-useless-return
      return;
    }
  }

  /**
   * A method for initializing storage the first time.
   * @param {Object} initState - The default state to initialize with.
   * @private
   */
  recordFirstTimeInfo(initState) {
    if (!('firstTimeInfo' in initState)) {
      const version = this.platform.getVersion();
      initState.firstTimeInfo = {
        version,
        date: Date.now(),
      };
    }
  }

  // TODO: Replace isClientOpen methods with `controllerConnectionChanged` events.
  /* eslint-disable accessor-pairs */
  /**
   * A method for recording whether the MetaMask user interface is open or not.
   * @private
   * @param {boolean} open
   */
  set isClientOpen(open) {
    this._isClientOpen = open;
    this.detectTokensController.isOpen = open;
  }
  /* eslint-enable accessor-pairs */

  /**
   * Adds a domain to the PhishingController safelist
   * @param {string} hostname - the domain to safelist
   */
  safelistPhishingDomain(hostname) {
    return this.phishingController.bypass(hostname);
  }

  /**
   * Locks MetaMask
   */
  setLocked() {
    return this.keyringController.setLocked();
  }

  /**
   * Get AutoAcceptToken for selected account. 
   * @param {string} address - The account address
   */
  getAutoAcceptToken(adress, ticker = 'STC') {
    const stcQuery = new StcQuery(this.provider);
    return new Promise((resolve, reject) => {
      if (ticker === 'STC') {
        stcQuery.sendAsync(
          {
            method: 'state.get_resource',
            params: [adress, '0x1::Account::AutoAcceptToken'],
          },
          (error, result) => {
            if (error) {
              log.error(error);
              reject(error);
            } else {
              const autoAcceptToken = result
                ? result.raw && parseInt(result.raw, 16) > 0
                // If an account is just created in the wallet, result is null, should return true.
                : true;
              resolve(autoAcceptToken);
            }
          },
        )
      } else if (ticker === 'APT') {
        resolve(false);
      }
    });
  }

  /**
   * Check wether an account has accepted the token
   * @param {string} address - The account address
   * @param {string} code - The token code
   */
  checkIsAcceptToken(address, code, ticker = 'STC') {
    const stcQuery = new StcQuery(this.provider);
    return new Promise((resolve, reject) => {
      if (ticker === 'STC') {
        stcQuery.getResource(
          address,
          `0x00000000000000000000000000000001::Account::Balance<${ code }>`,
          (error, res) => {
            if (error) {
              log.error(error);
              reject(error);
            } else {
              resolve(Boolean(res));
            }
          },
        );
      } else if (ticker === 'APT') {
        stcQuery.getAccountResource(
          address,
          `0x1::coin::CoinStore<${ code }>`,
          (err, res) => {
            if (err) {
              if (typeof err?.message === 'string' && err?.message.indexOf('Resource not found')) {
                log.debug('Resource not found,return false')
                resolve(false);
              }
              reject(err);
            } else {
              resolve(Boolean(res));
            }
          },
        );
      }
    });
  }

  /**
   * Check wether an account has added the NFT Gallery
   * @param {string} address - The account address
   * @param {string} meta - The NFT meta
   * @param {string} body - The NFT body
   */
  checkIsAddNFTGallery(address, meta, body) {
    const stcQuery = new StcQuery(this.provider);
    return new Promise((resolve, reject) => {
      stcQuery.getResource(
        address,
        `0x00000000000000000000000000000001::NFTGallery::NFTGallery<${ meta }, ${ body }>`,
        (error, res) => {
          if (error) {
            log.error(error);
            reject(error);
          } else {
            resolve(Boolean(res));
          }
        },
      );
    });
  }

  getAptosTokens(adress) {
    const stcQuery = new StcQuery(this.provider);
    return new Promise((resolve, reject) => {
      const event_handle = '0x3::token::TokenStore'
      const field_name = 'deposit_events'
      const limit = 1000
      stcQuery.sendAsync(
        {
          method: 'getEventsByEventHandle',
          params: [adress, event_handle, field_name, limit],
        },
        (error, result) => {
          if (error) {
            log.error(error);
            reject(error);
          } else {
            resolve(result);
          }
        },
      )
    });
  }

  getAptosTableItem(token_data_handle, key_type, value_type, key) {
    const stcQuery = new StcQuery(this.provider);
    return new Promise((resolve, reject) => {
      stcQuery.sendAsync(
        {
          method: 'getTableItem',
          params: [token_data_handle, key_type, value_type, key],
        },
        (error, result) => {
          if (error) {
            log.error(error);
            reject(error);
          } else {
            resolve(result);
          }
        },
      )
    });
  }
}

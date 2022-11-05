// Type Imports
/**
 * @typedef {import('../../shared/constants/app').EnvironmentType} EnvironmentType
 */

// Type Declarations
/**
 * Used to attach context of where the user was at in the application when the
 * event was triggered. Also included as full details of the current page in
 * page events.
 * @typedef {Object} MetaMetricsPageObject
 * @property {string} [path] - the path of the current page (e.g /home)
 * @property {string} [title] - the title of the current page (e.g 'home')
 * @property {string} [url] - the fully qualified url of the current page
 */

/**
 * For starmask, this is the dapp that triggered an interaction
 * @typedef {Object} MetaMetricsReferrerObject
 * @property {string} [url] - the origin of the dapp issuing the
 *  notification
 */

/**
 * We attach context to every meta metrics event that help to qualify our
 * analytics. This type has all optional values because it represents a
 * returned object from a method call. Ideally app and userAgent are
 * defined on every event. This is confirmed in the getTrackMetaMetricsEvent
 * function, but still provides the consumer a way to override these values if
 * necessary.
 * @typedef {Object} MetaMetricsContext
 * @property {Object} app
 * @property {string} app.name - the name of the application tracking the event
 * @property {string} app.version - the version of the application
 * @property {string} userAgent - the useragent string of the user
 * @property {MetaMetricsPageObject} [page] - an object representing details of
 *  the current page
 * @property {MetaMetricsReferrerObject} [referrer] - for starmask, this is the
 *  dapp that triggered an interaction
 */

/**
 * @typedef {Object} MetaMetricsEventPayload
 * @property {string}  event - event name to track
 * @property {string}  category - category to associate event to
 * @property {string} [environmentType] - The type of environment this event
 *  occurred in. Defaults to the background process type
 * @property {object}  [properties] - object of custom values to track, keys
 *  in this object must be in snake_case
 * @property {object}  [sensitiveProperties] - Object of sensitive values to
 *  track. Keys in this object must be in snake_case. These properties will be
 *  sent in an additional event that excludes the user's metaMetricsId
 * @property {number}  [revenue] - amount of currency that event creates in
 *  revenue for MetaMask
 * @property {string}  [currency] - ISO 4127 format currency for events with
 *  revenue, defaults to US dollars
 * @property {number}  [value] - Abstract business "value" attributable to
 *  customers who trigger this event
 * @property {MetaMetricsPageObject} [page] - the page/route that the event
 *  occurred on
 * @property {MetaMetricsReferrerObject} [referrer] - the origin of the dapp
 *  that triggered the event
 */

/**
 * @typedef {Object} MetaMetricsEventOptions
 * @property {boolean} [isOptIn] - happened during opt in/out workflow
 * @property {boolean} [flushImmediately] - When true will automatically flush
 *  the segment queue after tracking the event. Recommended if the result of
 *  tracking the event must be known before UI transition or update
 * @property {boolean} [excludeMetaMetricsId] - whether to exclude the user's
 *  metametrics id for anonymity
 * @property {string}  [metaMetricsId] - an override for the metaMetricsId in
 *  the event one is created as part of an asynchronous workflow, such as
 *  awaiting the result of the metametrics opt-in function that generates the
 *  user's metametrics id
 * @property {boolean} [matomoEvent] - is this event a holdover from matomo
 *  that needs further migration? when true, sends the data to a special
 *  segment source that marks the event data as not conforming to our schema
 */

/**
 * Represents the shape of data sent to the segment.track method.
 * @typedef {Object} SegmentEventPayload
 * @property {string} [userId] - The metametrics id for the user
 * @property {string} [anonymousId] - An anonymousId that is used to track
 *  sensitive data while preserving anonymity.
 * @property {string} event - name of the event to track
 * @property {Object} properties - properties to attach to the event
 * @property {MetaMetricsContext} context - the context the event occurred in
 */

/**
 * @typedef {Object} MetaMetricsPagePayload
 * @property {string} name - The name of the page that was viewed
 * @property {Object} [params] - The variadic parts of the page url
 *  example (route: `/asset/:asset`, path: `/asset/ETH`)
 *  params: { asset: 'ETH' }
 * @property {EnvironmentType} environmentType - the environment type that the
 *  page was viewed in
 * @property {MetaMetricsPageObject} [page] - the details of the page
 * @property {MetaMetricsReferrerObject} [referrer] - dapp that triggered the page
 *  view
 */

/**
 * @typedef {Object} MetaMetricsPageOptions
 * @property {boolean} [isOptInPath] - is the current path one of the pages in
 *  the onboarding workflow? If true and participateInMetaMetrics is null track
 *  the page view
 */

export const METAMETRICS_ANONYMOUS_ID = '0x0000000000000000';

/**
 * This object is used to identify events that are triggered by the background
 * process.
 * @type {MetaMetricsPageObject}
 */
export const METAMETRICS_BACKGROUND_PAGE_OBJECT = {
  path: '/background-process',
  title: 'Background Process',
  url: '/background-process',
};

/**
 * @typedef {Object} SegmentInterface
 * @property {SegmentEventPayload[]} queue - A queue of events to be sent when
 *  the flushAt limit has been reached, or flushInterval occurs
 * @property {() => void} flush - Immediately flush the queue, resetting it to
 *  an empty array and sending the pending events to Segment
 * @property {(
 *  payload: SegmentEventPayload,
 *  callback: (err?: Error) => void
 * ) => void} track - Track an event with Segment, using the internal batching
 *  mechanism to optimize network requests
 * @property {(payload: Object) => void} page - Track a page view with Segment
 * @property {() => void} identify - Identify an anonymous user. We do not
 *  currently use this method.
 */


/**
 * EVENTS
 */

export const EVENT_NAMES = {
  ACCOUNT_ADDED: 'Account Added',
  ACCOUNT_ADD_SELECTED: 'Account Add Selected',
  ACCOUNT_ADD_FAILED: 'Account Add Failed',
  ACCOUNT_PASSWORD_CREATED: 'Wallet Password Created',
  ACCOUNT_RESET: 'Account Reset',
  APP_INSTALLED: 'App Installed',
  APP_UNLOCKED: 'App Unlocked',
  APP_UNLOCKED_FAILED: 'App Unlocked Failed',
  APP_WINDOW_EXPANDED: 'App Window Expanded',
  DECRYPTION_APPROVED: 'Decryption Approved',
  DECRYPTION_REJECTED: 'Decryption Rejected',
  DECRYPTION_REQUESTED: 'Decryption Requested',
  ENCRYPTION_PUBLIC_KEY_APPROVED: 'Encryption Approved',
  ENCRYPTION_PUBLIC_KEY_REJECTED: 'Encryption Rejected',
  ENCRYPTION_PUBLIC_KEY_REQUESTED: 'Encryption Requested',
  EXTERNAL_LINK_CLICKED: 'External Link Clicked',
  KEY_EXPORT_SELECTED: 'Key Export Selected',
  KEY_EXPORT_REQUESTED: 'Key Export Requested',
  KEY_EXPORT_FAILED: 'Key Export Failed',
  KEY_EXPORT_CANCELED: 'Key Export Canceled',
  KEY_EXPORT_REVEALED: 'Key Material Revealed',
  KEY_EXPORT_COPIED: 'Key Material Copied',
  METRICS_OPT_IN: 'Metrics Opt In',
  METRICS_OPT_OUT: 'Metrics Opt Out',
  NAV_ACCOUNT_MENU_OPENED: 'Account Menu Opened',
  NAV_ACCOUNT_DETAILS_OPENED: 'Account Details Opened',
  NAV_CONNECTED_SITES_OPENED: 'Connected Sites Opened',
  NAV_MAIN_MENU_OPENED: 'Main Menu Opened',
  NAV_NETWORK_MENU_OPENED: 'Network Menu Opened',
  NAV_SETTINGS_OPENED: 'Settings Opened',
  NAV_ACCOUNT_SWITCHED: 'Account Switched',
  NAV_NETWORK_SWITCHED: 'Network Switched',
  NAV_BUY_BUTTON_CLICKED: 'Buy Button Clicked',
  NAV_SEND_BUTTON_CLICKED: 'Send Button Clicked',
  NAV_SWAP_BUTTON_CLICKED: 'Swap Button Clicked',
  SRP_TO_CONFIRM_BACKUP: 'SRP Backup Confirm Displayed',
  WALLET_SETUP_STARTED: 'Wallet Setup Selected',
  WALLET_SETUP_CANCELED: 'Wallet Setup Canceled',
  WALLET_SETUP_FAILED: 'Wallet Setup Failed',
  WALLET_CREATED: 'Wallet Created',
  NFT_ADDED: 'NFT Added',
  ONRAMP_PROVIDER_SELECTED: 'On-ramp Provider Selected',
  PERMISSIONS_APPROVED: 'Permissions Approved',
  PERMISSIONS_REJECTED: 'Permissions Rejected',
  PERMISSIONS_REQUESTED: 'Permissions Requested',
  PORTFOLIO_LINK_CLICKED: 'Portfolio Link Clicked',
  PUBLIC_ADDRESS_COPIED: 'Public Address Copied',
  PROVIDER_METHOD_CALLED: 'Provider Method Called',
  SIGNATURE_APPROVED: 'Signature Approved',
  SIGNATURE_REJECTED: 'Signature Rejected',
  SIGNATURE_REQUESTED: 'Signature Requested',
  TOKEN_IMPORT_BUTTON_CLICKED: 'Import Token Button Clicked',
  TOKEN_SCREEN_OPENED: 'Token Screen Opened',
  SUPPORT_LINK_CLICKED: 'Support Link Clicked',
  TOKEN_ADDED: 'Token Added',
  TOKEN_DETECTED: 'Token Detected',
  TOKEN_HIDDEN: 'Token Hidden',
  TOKEN_IMPORT_CANCELED: 'Token Import Canceled',
  TOKEN_IMPORT_CLICKED: 'Token Import Clicked',
};

export const EVENT = {
  ACCOUNT_TYPES: {
    DEFAULT: 'metamask',
    IMPORTED: 'imported',
    HARDWARE: 'hardware',
  },
  ACCOUNT_IMPORT_TYPES: {
    JSON: 'json',
    PRIVATE_KEY: 'private_key',
    SRP: 'srp',
  },
  CATEGORIES: {
    ACCOUNTS: 'Accounts',
    APP: 'App',
    AUTH: 'Auth',
    BACKGROUND: 'Background',
    ERROR: 'Error',
    FOOTER: 'Footer',
    HOME: 'Home',
    INPAGE_PROVIDER: 'inpage_provider',
    KEYS: 'Keys',
    MESSAGES: 'Messages',
    NAVIGATION: 'Navigation',
    NETWORK: 'Network',
    ONBOARDING: 'Onboarding',
    RETENTION: 'Retention',
    SETTINGS: 'Settings',
    SNAPS: 'Snaps',
    SWAPS: 'Swaps',
    TRANSACTIONS: 'Transactions',
    WALLET: 'Wallet',
  },
  EXTERNAL_LINK_TYPES: {
    TRANSACTION_BLOCK_EXPLORER: 'Transaction Block Explorer',
    BLOCK_EXPLORER: 'Block Explorer',
    ACCOUNT_TRACKER: 'Account Tracker',
    TOKEN_TRACKER: 'Token Tracker',
  },
  KEY_TYPES: {
    PKEY: 'private_key',
    SRP: 'srp',
  },
  ONRAMP_PROVIDER_TYPES: {
    COINBASE: 'coinbase',
    MOONPAY: 'moonpay',
    WYRE: 'wyre',
    TRANSAK: 'transak',
    SELF_DEPOSIT: 'direct_deposit',
  },
  SOURCE: {
    NETWORK: {
      CUSTOM_NETWORK_FORM: 'custom_network_form',
      POPULAR_NETWORK_LIST: 'popular_network_list',
    },
    SWAPS: {
      MAIN_VIEW: 'Main View',
      TOKEN_VIEW: 'Token View',
    },
    TOKEN: {
      CUSTOM: 'custom',
      DAPP: 'dapp',
      DETECTED: 'detected',
      LIST: 'list',
    },
    TRANSACTION: {
      DAPP: 'dapp',
      USER: 'user',
    },
  },
  LOCATION: {
    TOKEN_DETAILS: 'token_details',
    TOKEN_DETECTION: 'token_detection',
    TOKEN_MENU: 'token_menu',
  },
};

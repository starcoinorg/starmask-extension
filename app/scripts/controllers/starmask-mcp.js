import { ObservableStore } from '@metamask/obs-store';
import { debounce } from 'lodash';

export const MCP_CONNECTION_STATUS = {
  disconnected: 'disconnected',
  connecting: 'connecting',
  connected: 'connected',
  error: 'error',
};

export const MCP_PROTOCOL_VERSION = 1;

const DEFAULT_PROFILE_HINT = 'Default';

const DEFAULT_NATIVE_HOST_NAME_BY_ENVIRONMENT = {
  development: 'com.starcoin.starmask.development',
  staging: 'com.starcoin.starmask.staging',
  production: 'com.starcoin.starmask.production',
};

const defaultState = {
  mcpWalletInstanceId: null,
  mcpNativeHostName: null,
  mcpProfileHint: DEFAULT_PROFILE_HINT,
  mcpConnectionStatus: MCP_CONNECTION_STATUS.disconnected,
  mcpRegistered: false,
  mcpDaemonProtocolVersion: null,
  mcpLockState: 'locked',
  mcpAccountsSummary: [],
  mcpLastError: null,
  mcpLastMessageType: null,
  mcpLastRegistrationAt: null,
  mcpLastHeartbeatAt: null,
  mcpLastRequestAvailableAt: null,
  mcpLastPulledRequestId: null,
  mcpPresentedRequestIds: [],
  mcpExtensionId: null,
  mcpExtensionVersion: null,
};

function createId(prefix) {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${timestamp}-${randomPart}`;
}

export default class StarmaskMcpController {
  constructor(opts = {}) {
    const {
      extension,
      keyringController,
      preferencesStore,
      heartbeatIntervalMs = 10_000,
      initState = {},
      nativeHostName,
      profileHint = DEFAULT_PROFILE_HINT,
      protocolVersion = MCP_PROTOCOL_VERSION,
      requestHandler = null,
    } = opts;

    this.extension = extension;
    this.keyringController = keyringController;
    this.preferencesStore = preferencesStore;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.protocolVersion = protocolVersion;
    this.requestHandler = requestHandler;

    const runtime = this.extension?.runtime;
    const manifest = runtime?.getManifest?.() || {};
    const resolvedNativeHostName =
      nativeHostName ||
      initState.mcpNativeHostName ||
      this._getDefaultNativeHostName();

    this.store = new ObservableStore({
      ...defaultState,
      ...initState,
      mcpWalletInstanceId:
        initState.mcpWalletInstanceId || createId('wallet'),
      mcpNativeHostName: resolvedNativeHostName,
      mcpProfileHint: profileHint,
      mcpExtensionId: runtime?.id || null,
      mcpExtensionVersion: manifest.version || null,
    });

    this.port = null;
    this.pendingMessages = new Map();
    this.presentedRequestIds = new Set(
      initState.mcpPresentedRequestIds || [],
    );
    this.heartbeatTimer = null;
    this.isPullingRequest = false;
    this.isDisconnecting = false;

    this._handlePortMessage = this._handlePortMessage.bind(this);
    this._handlePortDisconnect = this._handlePortDisconnect.bind(this);
    this._syncWalletState = debounce(
      this._syncWalletState.bind(this),
      200,
    );

    this._updateWalletState({ shouldNotifyDaemon: false });
    this._registerStoreSubscriptions();
  }

  async connect() {
    if (this.port) {
      return this.store.getState();
    }

    const runtime = this.extension?.runtime;
    const hostName = this.store.getState().mcpNativeHostName;

    if (!runtime || typeof runtime.connectNative !== 'function') {
      this.store.updateState({
        mcpConnectionStatus: MCP_CONNECTION_STATUS.error,
        mcpLastError: 'browser.runtime.connectNative is unavailable',
      });
      return this.store.getState();
    }

    if (!hostName) {
      this.store.updateState({
        mcpConnectionStatus: MCP_CONNECTION_STATUS.error,
        mcpLastError: 'No native host name configured',
      });
      return this.store.getState();
    }

    this.isDisconnecting = false;
    this.store.updateState({
      mcpConnectionStatus: MCP_CONNECTION_STATUS.connecting,
      mcpRegistered: false,
      mcpLastError: null,
    });

    try {
      this.port = runtime.connectNative(hostName);
      this.port.onMessage.addListener(this._handlePortMessage);
      this.port.onDisconnect.addListener(this._handlePortDisconnect);
      this._sendRegister();
    } catch (error) {
      this._setDisconnectedState(error?.message || String(error));
    }

    return this.store.getState();
  }

  setRequestHandler(requestHandler) {
    this.requestHandler = requestHandler;
  }

  async disconnect() {
    this.isDisconnecting = true;
    this._stopHeartbeat();
    this.pendingMessages.clear();
    this.isPullingRequest = false;
    this.presentedRequestIds.clear();

    if (this.port) {
      const port = this.port;
      this.port = null;
      port.disconnect();
    }

    this.store.updateState({
      mcpConnectionStatus: MCP_CONNECTION_STATUS.disconnected,
      mcpRegistered: false,
      mcpDaemonProtocolVersion: null,
      mcpLastError: null,
      mcpPresentedRequestIds: [],
    });

    return this.store.getState();
  }

  async syncAccountState() {
    this._updateWalletState({ shouldNotifyDaemon: true });
    return this.store.getState();
  }

  _registerStoreSubscriptions() {
    this.preferencesStore?.subscribe?.(() => this._syncWalletState());
    this.keyringController?.memStore?.subscribe?.(() => this._syncWalletState());
  }

  _syncWalletState() {
    this._updateWalletState({ shouldNotifyDaemon: true });
  }

  _updateWalletState({ shouldNotifyDaemon }) {
    const snapshot = this._buildWalletSnapshot();
    const currentState = this.store.getState();
    const accountsChanged =
      JSON.stringify(currentState.mcpAccountsSummary) !==
      JSON.stringify(snapshot.mcpAccountsSummary);
    const lockStateChanged = currentState.mcpLockState !== snapshot.mcpLockState;

    if (!accountsChanged && !lockStateChanged) {
      return;
    }

    this.store.updateState(snapshot);

    if (shouldNotifyDaemon && this.port && currentState.mcpRegistered) {
      this._sendUpdateAccounts(snapshot);
    }
  }

  _buildWalletSnapshot() {
    const preferencesState = this.preferencesStore?.getState?.() || {};
    const identities = preferencesState.identities || {};
    const selectedAddress = preferencesState.selectedAddress || null;

    const mcpAccountsSummary = Object.values(identities).map(
      ({ address, name }) => ({
        address,
        label: name,
        is_default: address === selectedAddress,
      }),
    );

    return {
      mcpLockState: this._isUnlocked() ? 'unlocked' : 'locked',
      mcpAccountsSummary,
    };
  }

  _isUnlocked() {
    return Boolean(this.keyringController?.memStore?.getState?.().isUnlocked);
  }

  _sendRegister() {
    const state = this.store.getState();

    this._postMessage('extension.register', {
      protocol_version: this.protocolVersion,
      wallet_instance_id: state.mcpWalletInstanceId,
      extension_id: state.mcpExtensionId,
      extension_version: state.mcpExtensionVersion,
      profile_hint: state.mcpProfileHint,
      lock_state: state.mcpLockState,
      accounts_summary: state.mcpAccountsSummary,
    });
  }

  _sendUpdateAccounts(snapshot = this.store.getState()) {
    const state = {
      ...this.store.getState(),
      ...snapshot,
    };
    this._postMessage('extension.updateAccounts', {
      wallet_instance_id: state.mcpWalletInstanceId,
      lock_state: state.mcpLockState,
      accounts: state.mcpAccountsSummary,
    });
  }

  _sendHeartbeat() {
    if (!this.port || !this.store.getState().mcpRegistered) {
      return;
    }

    this._postMessage('extension.heartbeat', {
      wallet_instance_id: this.store.getState().mcpWalletInstanceId,
      presented_request_ids: [...this.presentedRequestIds],
    });
  }

  _sendPullNext() {
    if (
      !this.port ||
      !this.store.getState().mcpRegistered ||
      this.isPullingRequest
    ) {
      return null;
    }

    this.isPullingRequest = true;
    return this._postMessage('request.pullNext', {
      wallet_instance_id: this.store.getState().mcpWalletInstanceId,
    });
  }

  _sendRequestPresented({ requestId, deliveryLeaseId, presentationId }) {
    this.presentedRequestIds.add(requestId);
    this.store.updateState({
      mcpPresentedRequestIds: [...this.presentedRequestIds],
    });
    this._postMessage('request.presented', {
      wallet_instance_id: this.store.getState().mcpWalletInstanceId,
      request_id: requestId,
      delivery_lease_id: deliveryLeaseId,
      presentation_id: presentationId,
    });
  }

  _sendRequestResolve({
    requestId,
    presentationId,
    resultKind,
    signature,
    signedTxnBcsHex,
  }) {
    this.presentedRequestIds.delete(requestId);
    this.store.updateState({
      mcpPresentedRequestIds: [...this.presentedRequestIds],
    });
    this._postMessage('request.resolve', {
      wallet_instance_id: this.store.getState().mcpWalletInstanceId,
      request_id: requestId,
      presentation_id: presentationId,
      result_kind: resultKind,
      signature,
      signed_txn_bcs_hex: signedTxnBcsHex,
    });
    this._sendPullNext();
  }

  _sendRequestReject({ requestId, presentationId, reasonCode, reasonMessage }) {
    this.presentedRequestIds.delete(requestId);
    this.store.updateState({
      mcpPresentedRequestIds: [...this.presentedRequestIds],
    });
    this._postMessage('request.reject', {
      wallet_instance_id: this.store.getState().mcpWalletInstanceId,
      request_id: requestId,
      presentation_id: presentationId,
      reason_code: reasonCode,
      reason_message: reasonMessage,
    });
    this._sendPullNext();
  }

  _handleRequestNext(message) {
    if (!this.requestHandler) {
      this._sendRequestReject({
        requestId: message.request_id,
        presentationId: message.presentation_id || null,
        reasonCode: 'unsupported_operation',
        reasonMessage: 'No MCP request handler configured',
      });
      return;
    }

    if (message.resume_required && message.presentation_id) {
      this.presentedRequestIds.add(message.request_id);
      this.store.updateState({
        mcpPresentedRequestIds: [...this.presentedRequestIds],
      });
    }

    this.store.updateState({
      mcpLastPulledRequestId: message.request_id,
    });

    try {
      this.requestHandler.startRequest(message, {
        onPresented: ({ requestId, deliveryLeaseId, presentationId }) => {
          this._sendRequestPresented({
            requestId,
            deliveryLeaseId,
            presentationId,
          });
        },
        onResolved: ({
          requestId,
          presentationId,
          resultKind,
          signature,
          signedTxnBcsHex,
        }) => {
          this._sendRequestResolve({
            requestId,
            presentationId,
            resultKind,
            signature,
            signedTxnBcsHex,
          });
        },
        onRejected: ({
          requestId,
          presentationId,
          reasonCode,
          reasonMessage,
        }) => {
          this._sendRequestReject({
            requestId,
            presentationId,
            reasonCode,
            reasonMessage,
          });
        },
      });
    } catch (error) {
      this._sendRequestReject({
        requestId: message.request_id,
        presentationId: message.presentation_id || null,
        reasonCode: 'invalid_request_payload',
        reasonMessage: error?.message || String(error),
      });
    }
  }

  _postMessage(type, payload) {
    if (!this.port) {
      return null;
    }

    const messageId = createId('mcp');
    this.pendingMessages.set(messageId, type);
    this.port.postMessage({
      type,
      message_id: messageId,
      ...payload,
    });

    return messageId;
  }

  _handlePortMessage(message = {}) {
    const messageType = message.type || null;
    const replyType = message.reply_to
      ? this.pendingMessages.get(message.reply_to)
      : null;
    this.store.updateState({
      mcpLastMessageType: messageType,
    });

    if (message.reply_to) {
      this.pendingMessages.delete(message.reply_to);
    }

    if (messageType === 'extension.registered') {
      if (message.accepted === false) {
        this.store.updateState({
          mcpConnectionStatus: MCP_CONNECTION_STATUS.error,
          mcpRegistered: false,
          mcpLastError: 'Native host registration rejected',
        });
        return;
      }

      this.store.updateState({
        mcpConnectionStatus: MCP_CONNECTION_STATUS.connected,
        mcpRegistered: true,
        mcpDaemonProtocolVersion: message.daemon_protocol_version ?? null,
        mcpLastRegistrationAt: Date.now(),
        mcpLastError: null,
      });
      this._startHeartbeat();
      this._sendUpdateAccounts();
      this._sendPullNext();
      return;
    }

    if (messageType === 'extension.ack') {
      const nextState = {
        mcpLastError: null,
      };
      if (replyType === 'extension.heartbeat') {
        nextState.mcpLastHeartbeatAt = Date.now();
      }
      this.store.updateState(nextState);
      return;
    }

    if (messageType === 'request.available') {
      if (
        message.wallet_instance_id &&
        message.wallet_instance_id !== this.store.getState().mcpWalletInstanceId
      ) {
        return;
      }
      this.store.updateState({
        mcpLastRequestAvailableAt: Date.now(),
      });
      this._sendPullNext();
      return;
    }

    if (messageType === 'request.next') {
      this.isPullingRequest = false;
      this._handleRequestNext(message);
      return;
    }

    if (messageType === 'request.none') {
      this.isPullingRequest = false;
      return;
    }

    if (messageType === 'request.cancelled') {
      this.presentedRequestIds.delete(message.request_id);
      this.store.updateState({
        mcpPresentedRequestIds: [...this.presentedRequestIds],
      });
      this.requestHandler?.cancelRequest?.(message.request_id);
      return;
    }

    if (
      messageType === 'extension.error' ||
      messageType === 'protocol_version_mismatch'
    ) {
      this.store.updateState({
        mcpConnectionStatus: MCP_CONNECTION_STATUS.error,
        mcpLastError:
          message.error_message || message.message || messageType,
      });
    }
  }

  _handlePortDisconnect() {
    const lastError = this.extension?.runtime?.lastError?.message;

    if (this.isDisconnecting) {
      this.isDisconnecting = false;
      return;
    }

    this._setDisconnectedState(lastError || 'Native messaging port disconnected');
  }

  _setDisconnectedState(lastError) {
    this.port = null;
    this.pendingMessages.clear();
    this._stopHeartbeat();
    this.isPullingRequest = false;
    this.presentedRequestIds.clear();
    this.store.updateState({
      mcpConnectionStatus: MCP_CONNECTION_STATUS.error,
      mcpRegistered: false,
      mcpDaemonProtocolVersion: null,
      mcpLastError: lastError,
      mcpPresentedRequestIds: [],
    });
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this._sendHeartbeat();
    }, this.heartbeatIntervalMs);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _getDefaultNativeHostName() {
    const environment = process.env.STARMASK_ENVIRONMENT || 'development';
    return (
      DEFAULT_NATIVE_HOST_NAME_BY_ENVIRONMENT[environment] ||
      DEFAULT_NATIVE_HOST_NAME_BY_ENVIRONMENT.development
    );
  }
}

const MCP_REQUEST_ORIGIN = 'StarMask MCP';

export const MCP_REQUEST_KIND = {
  signMessage: 'sign_message',
  signTransaction: 'sign_transaction',
};

const MESSAGE_FORMAT = {
  hex: 'hex',
  utf8: 'utf8',
};

function createId(prefix) {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${timestamp}-${randomPart}`;
}

function normalizeMessageFormat(value) {
  const normalized = String(value || MESSAGE_FORMAT.utf8).toLowerCase();
  if (
    normalized !== MESSAGE_FORMAT.hex &&
    normalized !== MESSAGE_FORMAT.utf8
  ) {
    throw new Error(`Unsupported message format: ${value}`);
  }
  return normalized;
}

function normalizeHex(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('Message payload must be a non-empty string');
  }
  return value.startsWith('0x') ? value : `0x${value}`;
}

function formatMessageAsHex(message, messageFormat) {
  if (typeof message !== 'string' || message.length === 0) {
    throw new Error('Message payload must be a non-empty string');
  }

  if (messageFormat === MESSAGE_FORMAT.hex) {
    return normalizeHex(message);
  }

  return normalizeHex(Buffer.from(message, 'utf8').toString('hex'));
}

export default class StarmaskMcpRequestAdapter {
  constructor(opts = {}) {
    const {
      personalMessageManager,
      showUserConfirmation,
      createPresentationId = createId,
    } = opts;

    this.personalMessageManager = personalMessageManager;
    this.showUserConfirmation = showUserConfirmation;
    this.createPresentationId = createPresentationId;
    this.activeRequests = new Map();
  }

  startRequest(request, callbacks = {}) {
    if (!request?.request_id) {
      throw new Error('MCP request is missing request_id');
    }

    if (this.activeRequests.has(request.request_id)) {
      return this.activeRequests.get(request.request_id);
    }

    if (request.kind !== MCP_REQUEST_KIND.signMessage) {
      callbacks.onRejected?.({
        requestId: request.request_id,
        presentationId: request.presentation_id || null,
        reasonCode: 'unsupported_operation',
        reasonMessage: `Unsupported MCP request kind: ${request.kind}`,
      });
      return null;
    }

    return this._startSignMessageRequest(request, callbacks);
  }

  cancelRequest(requestId) {
    const entry = this.activeRequests.get(requestId);
    if (!entry) {
      return false;
    }

    this.activeRequests.delete(requestId);
    this.personalMessageManager.rejectMsg(entry.localId);
    return true;
  }

  _startSignMessageRequest(request, callbacks) {
    const messageFormat = normalizeMessageFormat(request.message_format);
    const presentationId =
      request.presentation_id || this.createPresentationId('presentation');
    const data = formatMessageAsHex(request.message, messageFormat);
    const msgParams = {
      from: request.account_address,
      data,
      origin: MCP_REQUEST_ORIGIN,
      starmaskMcpClientContext: request.client_context || null,
      starmaskMcpDisplayHint: request.display_hint || null,
      starmaskMcpMessageFormat: messageFormat,
      starmaskMcpPayloadHash: request.payload_hash || null,
      starmaskMcpRequestId: request.request_id,
    };
    const msgId = this.personalMessageManager.addUnapprovedMessage(msgParams, {
      origin: MCP_REQUEST_ORIGIN,
    });
    const entry = {
      kind: request.kind,
      localId: msgId,
      presentationId,
      requestId: request.request_id,
    };

    this.activeRequests.set(request.request_id, entry);

    this.personalMessageManager.once(`${msgId}:signed`, (message) => {
      const currentEntry = this.activeRequests.get(request.request_id);
      if (!currentEntry || currentEntry.localId !== msgId) {
        return;
      }

      this.activeRequests.delete(request.request_id);
      callbacks.onResolved?.({
        requestId: request.request_id,
        presentationId: currentEntry.presentationId,
        resultKind: 'signed_message',
        signature: message.rawSig,
      });
    });

    this.personalMessageManager.once(`${msgId}:rejected`, () => {
      const currentEntry = this.activeRequests.get(request.request_id);
      if (!currentEntry || currentEntry.localId !== msgId) {
        return;
      }

      this.activeRequests.delete(request.request_id);
      callbacks.onRejected?.({
        requestId: request.request_id,
        presentationId: currentEntry.presentationId,
        reasonCode: 'request_rejected',
        reasonMessage: 'User rejected the request',
      });
    });

    Promise.resolve(this.showUserConfirmation?.())
      .then(() => {
        const currentEntry = this.activeRequests.get(request.request_id);
        if (
          !currentEntry ||
          currentEntry.localId !== msgId ||
          request.resume_required
        ) {
          return;
        }

        callbacks.onPresented?.({
          requestId: request.request_id,
          deliveryLeaseId: request.delivery_lease_id,
          presentationId: currentEntry.presentationId,
        });
      })
      .catch((error) => {
        const currentEntry = this.activeRequests.get(request.request_id);
        if (!currentEntry || currentEntry.localId !== msgId) {
          return;
        }

        this.activeRequests.delete(request.request_id);
        this.personalMessageManager.rejectMsg(msgId);
        callbacks.onRejected?.({
          requestId: request.request_id,
          presentationId: currentEntry.presentationId,
          reasonCode: 'presentation_failed',
          reasonMessage: error?.message || String(error),
        });
      });

    return entry;
  }
}

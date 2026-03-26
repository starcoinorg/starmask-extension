import assert from 'assert';
import sinon from 'sinon';
import StarmaskMcpController, {
  MCP_CONNECTION_STATUS,
} from './starmask-mcp';

describe('StarmaskMcpController', function () {
  let connectNativeStub;
  let extension;
  let keyringMemStoreState;
  let keyringSubscription;
  let preferencesState;
  let preferencesSubscription;
  let port;
  let portMessageListener;
  let portDisconnectListener;
  let requestHandler;

  beforeEach(function () {
    keyringMemStoreState = {
      isUnlocked: true,
    };
    preferencesState = {
      identities: {
        '0x1': {
          address: '0x1',
          name: 'Account 1',
        },
      },
      selectedAddress: '0x1',
    };
    keyringSubscription = null;
    preferencesSubscription = null;
    portMessageListener = null;
    portDisconnectListener = null;

    port = {
      postMessage: sinon.spy(),
      disconnect: sinon.spy(),
      onMessage: {
        addListener: sinon.spy((listener) => {
          portMessageListener = listener;
        }),
      },
      onDisconnect: {
        addListener: sinon.spy((listener) => {
          portDisconnectListener = listener;
        }),
      },
    };
    connectNativeStub = sinon.stub().returns(port);
    requestHandler = {
      startRequest: sinon.spy(),
      cancelRequest: sinon.spy(),
    };

    extension = {
      runtime: {
        id: 'kmheclfnfmpacglnpegeohempmedhiaf',
        lastError: null,
        getManifest: () => ({
          version: '5.2.5',
        }),
        connectNative: connectNativeStub,
      },
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  function buildController(overrides = {}) {
    return new StarmaskMcpController({
      extension,
      initState: {
        mcpWalletInstanceId: 'wallet-test-1',
        ...overrides.initState,
      },
      keyringController: {
        memStore: {
          getState: () => keyringMemStoreState,
          subscribe: sinon.spy((listener) => {
            keyringSubscription = listener;
          }),
        },
      },
      preferencesStore: {
        getState: () => preferencesState,
        subscribe: sinon.spy((listener) => {
          preferencesSubscription = listener;
        }),
      },
      nativeHostName:
        overrides.nativeHostName || 'com.starcoin.starmask.development',
      requestHandler: overrides.requestHandler || requestHandler,
    });
  }

  it('connect should create the native port and send extension.register', async function () {
    const controller = buildController();

    await controller.connect();

    assert.equal(connectNativeStub.callCount, 1);
    assert.equal(
      connectNativeStub.firstCall.args[0],
      'com.starcoin.starmask.development',
    );
    assert.equal(port.postMessage.callCount, 1);
    assert.equal(port.postMessage.firstCall.args[0].type, 'extension.register');
    assert.equal(
      port.postMessage.firstCall.args[0].wallet_instance_id,
      'wallet-test-1',
    );
    assert.equal(
      controller.store.getState().mcpConnectionStatus,
      MCP_CONNECTION_STATUS.connecting,
    );
  });

  it('should mark the bridge connected after extension.registered', async function () {
    const clock = sinon.useFakeTimers();
    const controller = buildController();
    await controller.connect();

    portMessageListener({
      type: 'extension.registered',
      reply_to: port.postMessage.firstCall.args[0].message_id,
      accepted: true,
      daemon_protocol_version: 1,
    });

    assert.equal(
      controller.store.getState().mcpConnectionStatus,
      MCP_CONNECTION_STATUS.connected,
    );
    assert.equal(controller.store.getState().mcpRegistered, true);
    assert.equal(controller.store.getState().mcpDaemonProtocolVersion, 1);
    assert.equal(port.postMessage.callCount, 3);
    assert.equal(port.postMessage.secondCall.args[0].type, 'extension.updateAccounts');
    assert.equal(port.postMessage.thirdCall.args[0].type, 'request.pullNext');

    clock.tick(10_000);
    assert.equal(port.postMessage.callCount, 4);
    assert.equal(port.postMessage.getCall(3).args[0].type, 'extension.heartbeat');
  });

  it('should publish extension.updateAccounts when wallet state changes', async function () {
    const clock = sinon.useFakeTimers();
    const controller = buildController();
    await controller.connect();

    portMessageListener({
      type: 'extension.registered',
      reply_to: port.postMessage.firstCall.args[0].message_id,
      accepted: true,
      daemon_protocol_version: 1,
    });

    preferencesState = {
      identities: {
        '0x1': {
          address: '0x1',
          name: 'Account 1',
        },
        '0x2': {
          address: '0x2',
          name: 'Account 2',
        },
      },
      selectedAddress: '0x2',
    };

    preferencesSubscription();
    clock.tick(200);

    assert.equal(port.postMessage.callCount, 4);
    assert.equal(port.postMessage.getCall(3).args[0].type, 'extension.updateAccounts');
    assert.deepEqual(port.postMessage.getCall(3).args[0].accounts, [
      {
        address: '0x1',
        label: 'Account 1',
        is_default: false,
      },
      {
        address: '0x2',
        label: 'Account 2',
        is_default: true,
      },
    ]);
  });

  it('should hand pulled requests to the request handler and report presentation and resolution', async function () {
    requestHandler.startRequest = sinon.spy((request, callbacks) => {
      callbacks.onPresented({
        requestId: request.request_id,
        deliveryLeaseId: request.delivery_lease_id,
        presentationId: 'presentation-1',
      });
      callbacks.onResolved({
        requestId: request.request_id,
        presentationId: 'presentation-1',
        resultKind: 'signed_message',
        signature: '0xsigned',
      });
    });
    const controller = buildController();
    await controller.connect();

    portMessageListener({
      type: 'extension.registered',
      reply_to: port.postMessage.firstCall.args[0].message_id,
      accepted: true,
      daemon_protocol_version: 1,
    });

    const pullNextMessage = port.postMessage.getCall(2).args[0];

    portMessageListener({
      type: 'request.next',
      reply_to: pullNextMessage.message_id,
      request_id: 'req-1',
      kind: 'sign_message',
      account_address: '0x1',
      delivery_lease_id: 'lease-1',
      message: '68656c6c6f',
      message_format: 'hex',
      resume_required: false,
    });

    assert.equal(requestHandler.startRequest.callCount, 1);
    assert.equal(port.postMessage.getCall(3).args[0].type, 'request.presented');
    assert.equal(port.postMessage.getCall(4).args[0].type, 'request.resolve');
    assert.equal(port.postMessage.getCall(5).args[0].type, 'request.pullNext');
    assert.deepEqual(controller.store.getState().mcpPresentedRequestIds, []);
    assert.equal(controller.store.getState().mcpLastPulledRequestId, 'req-1');
  });

  it('should cancel local request state when the daemon cancels a request', async function () {
    const controller = buildController();
    await controller.connect();

    portMessageListener({
      type: 'extension.registered',
      reply_to: port.postMessage.firstCall.args[0].message_id,
      accepted: true,
      daemon_protocol_version: 1,
    });

    portMessageListener({
      type: 'request.cancelled',
      request_id: 'req-1',
    });

    assert.equal(requestHandler.cancelRequest.callCount, 1);
    assert.equal(requestHandler.cancelRequest.firstCall.args[0], 'req-1');
  });

  it('should record disconnect errors from runtime.lastError', async function () {
    const controller = buildController();
    await controller.connect();

    extension.runtime.lastError = {
      message: 'Native host has exited',
    };
    portDisconnectListener();

    assert.equal(
      controller.store.getState().mcpConnectionStatus,
      MCP_CONNECTION_STATUS.error,
    );
    assert.equal(
      controller.store.getState().mcpLastError,
      'Native host has exited',
    );
    assert.equal(controller.store.getState().mcpRegistered, false);
  });
});

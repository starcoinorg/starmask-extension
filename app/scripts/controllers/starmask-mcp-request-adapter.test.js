import assert from 'assert';
import EventEmitter from 'events';
import sinon from 'sinon';
import StarmaskMcpRequestAdapter from './starmask-mcp-request-adapter';

class FakePersonalMessageManager extends EventEmitter {
  constructor() {
    super();
    this.addUnapprovedMessage = sinon.stub().returns('msg-1');
    this.rejectMsg = sinon.spy((msgId) => {
      this.emit(`${msgId}:rejected`);
    });
  }
}

describe('StarmaskMcpRequestAdapter', function () {
  it('should map sign_message requests into personal_sign approvals', async function () {
    const personalMessageManager = new FakePersonalMessageManager();
    const showUserConfirmation = sinon.stub().resolves();
    const adapter = new StarmaskMcpRequestAdapter({
      personalMessageManager,
      showUserConfirmation,
      createPresentationId: () => 'presentation-1',
    });
    const onPresented = sinon.spy();
    const onResolved = sinon.spy();

    adapter.startRequest(
      {
        request_id: 'req-1',
        kind: 'sign_message',
        account_address: '0x1',
        delivery_lease_id: 'lease-1',
        message: '68656c6c6f',
        message_format: 'hex',
        display_hint: 'Sign hello',
        client_context: 'codex',
        payload_hash: '0xabc',
        resume_required: false,
      },
      {
        onPresented,
        onResolved,
      },
    );

    await Promise.resolve();

    assert.equal(showUserConfirmation.callCount, 1);
    assert.equal(personalMessageManager.addUnapprovedMessage.callCount, 1);
    assert.deepEqual(
      personalMessageManager.addUnapprovedMessage.firstCall.args[0],
      {
        from: '0x1',
        data: '0x68656c6c6f',
        origin: 'StarMask MCP',
        starmaskMcpClientContext: 'codex',
        starmaskMcpDisplayHint: 'Sign hello',
        starmaskMcpMessageFormat: 'hex',
        starmaskMcpPayloadHash: '0xabc',
        starmaskMcpRequestId: 'req-1',
      },
    );
    assert.equal(onPresented.callCount, 1);
    assert.deepEqual(onPresented.firstCall.args[0], {
      requestId: 'req-1',
      deliveryLeaseId: 'lease-1',
      presentationId: 'presentation-1',
    });

    personalMessageManager.emit('msg-1:signed', {
      rawSig: '0xsigned',
    });

    assert.equal(onResolved.callCount, 1);
    assert.deepEqual(onResolved.firstCall.args[0], {
      requestId: 'req-1',
      presentationId: 'presentation-1',
      resultKind: 'signed_message',
      signature: '0xsigned',
    });
  });

  it('should reject unsupported request kinds', function () {
    const adapter = new StarmaskMcpRequestAdapter({
      personalMessageManager: new FakePersonalMessageManager(),
    });
    const onRejected = sinon.spy();

    adapter.startRequest(
      {
        request_id: 'req-2',
        kind: 'sign_transaction',
        account_address: '0x1',
      },
      { onRejected },
    );

    assert.equal(onRejected.callCount, 1);
    assert.deepEqual(onRejected.firstCall.args[0], {
      requestId: 'req-2',
      presentationId: null,
      reasonCode: 'unsupported_operation',
      reasonMessage: 'Unsupported MCP request kind: sign_transaction',
    });
  });
});

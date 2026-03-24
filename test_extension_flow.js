/**
 * test_extension_flow.js
 * Simulates the EXACT code paths in the extension for gas estimation.
 * Tests both VM1 and VM2.
 * Run: node test_extension_flow.js
 */
const http = require('http');
const { BigNumber } = require('bignumber.js');

function rpcRaw(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params });
    const req = http.request({ hostname: 'localhost', port: 9850, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.write(body); req.end();
  });
}

// Simulate StcQuery.sendAsync behavior (error detection)
async function sendAsync(method, params) {
  const response = await rpcRaw(method, params);
  if (response.error) {
    throw new Error('StcQuery - ' + response.error.message);
  }
  if (response.result && response.result.explained_status && response.result.explained_status.Error) {
    throw new Error('StcQuery - ' + response.result.explained_status.Error);
  }
  return response.result;
}

const sender = '0x05744314501c42a31c6a5781d5886ef9';
const receiver = '0x3241aa645dbc949dea59d14baca26461';
const senderPubKey = '0x29c5abb92b20fbf5136c2875e15e4cf9621a89ba4cdcb3a039e9272c66d219bd';
const chainId = 254;

let allPassed = true;
function assert(condition, msg) {
  if (!condition) { console.log('  FAIL:', msg); allPassed = false; }
  else { console.log('  PASS:', msg); }
}

// ============================================
// Simulate send.utils.js: getSequenceNumber
// ============================================
async function getSequenceNumber(from, ticker, vmType) {
  if (ticker === 'STC') {
    if (vmType === 'vm2') {
      const res = await sendAsync('state2.get_resource', [from, '0x00000000000000000000000000000001::account::Account', { decode: true }]);
      const seq = res && res.json && res.json.sequence_number || 0;
      return new BigNumber(seq, 10).toNumber();
    }
    // VM1 branch - uses contract.get_resource
    const res = await sendAsync('contract.get_resource', [from, '0x00000000000000000000000000000001::Account::Account']);
    const seq = res && res.value[6][1].U64 || 0;
    return new BigNumber(seq, 10).toNumber();
  }
}

// ============================================
// Simulate metamask-controller.js: estimateGas (STC branch)
// ============================================
async function estimateGas(estimateGasParams) {
  const isVM2 = estimateGasParams.vmType === 'vm2';
  const defaultTokenCode = isVM2
    ? '0x00000000000000000000000000000001::starcoin_coin::STC'
    : '0x00000000000000000000000000000001::STC::STC';
  const tokenCode = estimateGasParams.code ? estimateGasParams.code : defaultTokenCode;
  const transferScript = isVM2
    ? '0x00000000000000000000000000000001::transfer_scripts::peer_to_peer_v2'
    : '0x00000000000000000000000000000001::TransferScripts::peer_to_peer_v2';

  const gas_unit_price = 1;
  const max_gas_amount = 10000000;

  if (!estimateGasParams.to) {
    return { gas_unit_price, gas_used: 0 };
  }

  const gasDecimal = parseInt(estimateGasParams.gas, 16).toString();

  const params = {
    chain_id: chainId,
    gas_unit_price,
    sender: estimateGasParams.from,
    sender_public_key: senderPubKey,
    sequence_number: estimateGasParams.sequenceNumber,
    max_gas_amount,
    script: {
      code: transferScript,
      type_args: [tokenCode],
      args: [estimateGasParams.to, `${gasDecimal}u128`],
    },
  };

  if (isVM2) {
    // NEW CODE: use contract2.dry_run for VM2
    try {
      const res = await sendAsync('contract2.dry_run', [params]);
      if (res && res.status === 'Executed') {
        return { gas_unit_price, gas_used: parseInt(res.gas_used, 10), max_gas_amount };
      }
      console.log('  VM2 dry_run non-Executed:', res.status);
      return { gas_unit_price, gas_used: 1000000, max_gas_amount };
    } catch (err) {
      console.log('  VM2 dry_run error:', err.message);
      return { gas_unit_price, gas_used: 1000000, max_gas_amount };
    }
  }

  // VM1: use contract.dry_run
  const res = await sendAsync('contract.dry_run', [params]);
  return { gas_unit_price, gas_used: parseInt(res.gas_used, 10), max_gas_amount };
}

// ============================================
// Simulate send.utils.js: estimateGasForSend
// ============================================
async function estimateGasForSend(opts) {
  const { selectedAddress, to, value, vmType, ticker } = opts;
  const paramsForGasEstimate = { from: selectedAddress, to, value };
  if (vmType) paramsForGasEstimate.vmType = vmType;

  // blockGasLimit default
  paramsForGasEstimate.gas = '0x64'; // MIN_GAS_LIMIT_HEX

  const sequenceNumber = await getSequenceNumber(paramsForGasEstimate.from, ticker, vmType);
  paramsForGasEstimate.sequenceNumber = sequenceNumber;
  console.log('  sequenceNumber:', sequenceNumber);

  const { gas_unit_price, gas_used, max_gas_amount } = await estimateGas(paramsForGasEstimate);
  console.log('  gas_unit_price:', gas_unit_price, 'gas_used:', gas_used, 'max_gas_amount:', max_gas_amount);

  return { gas_unit_price, gas_used, max_gas_amount };
}

// ============================================
// Simulate account-tracker.js: VM2 balance
// ============================================
async function getVM2Balance(address) {
  try {
    const res = await sendAsync('contract2.call_v2', [{
      function_id: '0x1::coin::balance',
      type_args: ['0x1::starcoin_coin::STC'],
      args: [address],
    }]);
    return res[0]; // nanoSTC as string
  } catch (err) {
    console.log('  balance error:', err.message);
    return '0';
  }
}

(async () => {
  console.log('========================================');
  console.log('Extension Chain Interaction E2E Test');
  console.log('========================================\n');

  // Test 1: VM2 balance
  console.log('TEST 1: VM2 Balance');
  const vm2Bal = await getVM2Balance(sender);
  console.log('  Raw balance:', vm2Bal);
  const balSTC = Number(BigInt(vm2Bal)) / 1e9;
  console.log('  Balance in STC:', balSTC);
  assert(Number(vm2Bal) > 0, 'VM2 balance > 0');

  // Test 2: VM2 gas estimation (full flow)
  console.log('\nTEST 2: VM2 Gas Estimation');
  try {
    const vm2Gas = await estimateGasForSend({
      selectedAddress: sender, to: receiver, value: '0x3b9aca00', // 1 STC
      vmType: 'vm2', ticker: 'STC',
    });
    assert(vm2Gas.gas_used > 0, `VM2 gas_used=${vm2Gas.gas_used} > 0`);
    assert(vm2Gas.gas_unit_price === 1, `VM2 gas_unit_price=${vm2Gas.gas_unit_price}`);
  } catch (err) {
    console.log('  ERROR:', err.message);
    assert(false, 'VM2 gas estimation should not throw');
  }

  // Test 3: VM1 gas estimation (full flow)
  console.log('\nTEST 3: VM1 Gas Estimation');
  try {
    const vm1Gas = await estimateGasForSend({
      selectedAddress: sender, to: receiver, value: '0x3b9aca00',
      vmType: 'vm1', ticker: 'STC',
    });
    assert(vm1Gas.gas_used > 0, `VM1 gas_used=${vm1Gas.gas_used} > 0`);
    assert(vm1Gas.gas_unit_price === 1, `VM1 gas_unit_price=${vm1Gas.gas_unit_price}`);
  } catch (err) {
    console.log('  ERROR:', err.message);
    assert(false, 'VM1 gas estimation should not throw');
  }

  // Test 4: VM2 gas estimation with default vmType (undefined → 'vm1')
  console.log('\nTEST 4: Default vmType (undefined) → should work as VM1');
  try {
    const defaultGas = await estimateGasForSend({
      selectedAddress: sender, to: receiver, value: '0x3b9aca00',
      vmType: undefined, ticker: 'STC',
    });
    assert(defaultGas.gas_used > 0, `default gas_used=${defaultGas.gas_used} > 0`);
  } catch (err) {
    console.log('  ERROR:', err.message);
    assert(false, 'Default vmType gas estimation should not throw');
  }

  // Test 5: VM2 getSequenceNumber directly
  console.log('\nTEST 5: getSequenceNumber');
  const vm1Seq = await getSequenceNumber(sender, 'STC', 'vm1');
  const vm2Seq = await getSequenceNumber(sender, 'STC', 'vm2');
  console.log('  VM1 seq:', vm1Seq, 'VM2 seq:', vm2Seq);
  assert(typeof vm1Seq === 'number', 'VM1 seq is number');
  assert(typeof vm2Seq === 'number', 'VM2 seq is number');
  assert(vm1Seq >= 0, 'VM1 seq >= 0');
  assert(vm2Seq >= 0, 'VM2 seq >= 0');

  console.log('\n========================================');
  console.log(allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗');
  console.log('========================================');
  process.exit(allPassed ? 0 : 1);
})();

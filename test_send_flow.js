/**
 * Test all RPC calls made during the Send page flow:
 * 1. txpool.gas_price (fetchBasicGasEstimates)
 * 2. chain.get_block_by_number (getBlockByNumber for currentBlockGasLimit)
 * 3. getResource for sequence number (VM1)
 * 4. state2.get_resource for sequence number (VM2)
 * 5. contract.dry_run for VM1 gas estimation
 * 6. contract2.dry_run for VM2 gas estimation
 */

const http = require('http');

const NODE_URL = 'http://localhost:9850';
const SENDER = '0x05744314501c42a31c6a5781d5886ef9';
const RECEIVER = '0x3241aa645dbc949dea59d14baca26461';
const PUBLIC_KEY = '0xa701e45abf99a29b47f31f46e7000d2036415fbd09ecb04a43b4c99a29e3c3c2';

function rpcCall(method, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 });
    const req = http.request(NODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Failed to parse: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  let allPassed = true;

  // Test 1: txpool.gas_price
  console.log('\n=== Test 1: txpool.gas_price ===');
  try {
    const res = await rpcCall('txpool.gas_price');
    if (res.error) {
      console.log('FAIL: txpool.gas_price error:', res.error);
      allPassed = false;
    } else {
      console.log('PASS: gas_price =', res.result);
    }
  } catch (e) {
    console.log('FAIL: txpool.gas_price exception:', e.message);
    allPassed = false;
  }

  // Test 2: chain.get_block_by_number (latest)
  console.log('\n=== Test 2: chain.get_block_by_number ===');
  try {
    // First get chain info to know the latest block
    const chainInfo = await rpcCall('chain.info');
    const headNumber = parseInt(chainInfo.result.head.number, 10);
    console.log('  Latest block number:', headNumber);
    
    const blockRes = await rpcCall('chain.get_block_by_number', [headNumber, { raw: false }]);
    if (blockRes.error) {
      console.log('FAIL: get_block_by_number error:', blockRes.error);
      allPassed = false;
    } else {
      const block = blockRes.result;
      console.log('  Block keys:', Object.keys(block));
      console.log('  Block header keys:', Object.keys(block.header || {}));
      console.log('  gas_used:', block.header?.gas_used);
      // Check if there's a gasLimit field
      console.log('  gasLimit:', block.gasLimit);
      console.log('  gas_limit:', block.gas_limit);
      console.log('  header.gas_limit:', block.header?.gas_limit);
      console.log('PASS: block retrieved');
    }
  } catch (e) {
    console.log('FAIL: get_block_by_number exception:', e.message);
    allPassed = false;
  }

  // Test 3: VM1 sequence number via state.get_resource
  console.log('\n=== Test 3: VM1 sequence number (state.get_resource) ===');
  let vm1Seq;
  try {
    const res = await rpcCall('state.get_resource', [SENDER, '0x00000000000000000000000000000001::Account::Account', { decode: true }]);
    if (res.error) {
      console.log('FAIL: state.get_resource error:', res.error);
      allPassed = false;
    } else if (res.result && res.result.value) {
      vm1Seq = parseInt(res.result.value[6][1].U64, 10);
      console.log('PASS: VM1 sequence_number =', vm1Seq);
    } else {
      console.log('FAIL: unexpected result:', JSON.stringify(res.result).substring(0, 200));
      allPassed = false;
    }
  } catch (e) {
    console.log('FAIL: VM1 seq exception:', e.message);
    allPassed = false;
  }

  // Test 4: VM2 sequence number via state2.get_resource
  console.log('\n=== Test 4: VM2 sequence number (state2.get_resource) ===');
  let vm2Seq;
  try {
    const res = await rpcCall('state2.get_resource', [SENDER, '0x00000000000000000000000000000001::account::Account', { decode: true }]);
    if (res.error) {
      console.log('FAIL: state2.get_resource error:', res.error);
      allPassed = false;
    } else if (res.result && res.result.json) {
      vm2Seq = parseInt(res.result.json.sequence_number, 10);
      console.log('PASS: VM2 sequence_number =', vm2Seq);
    } else {
      console.log('FAIL: unexpected result:', JSON.stringify(res.result).substring(0, 200));
      allPassed = false;
    }
  } catch (e) {
    console.log('FAIL: VM2 seq exception:', e.message);
    allPassed = false;
  }

  // Test 5: VM1 contract.dry_run
  console.log('\n=== Test 5: VM1 gas estimation (contract.dry_run) ===');
  if (vm1Seq !== undefined) {
    try {
      const params = {
        chain_id: 254,
        gas_unit_price: 1,
        sender: SENDER,
        sender_public_key: PUBLIC_KEY,
        sequence_number: vm1Seq,
        max_gas_amount: 10000000,
        script: {
          code: '0x00000000000000000000000000000001::TransferScripts::peer_to_peer_v2',
          type_args: ['0x00000000000000000000000000000001::STC::STC'],
          args: [RECEIVER, '100u128']
        },
      };
      const res = await rpcCall('contract.dry_run', [params]);
      if (res.error) {
        console.log('FAIL: VM1 dry_run RPC error:', res.error);
        allPassed = false;
      } else {
        const result = res.result;
        console.log('  status:', result.status);
        console.log('  gas_used:', result.gas_used);
        console.log('  explained_status:', JSON.stringify(result.explained_status));
        if (result.status === 'Executed') {
          console.log('PASS: VM1 dry_run gas_used =', result.gas_used);
        } else {
          console.log('FAIL: VM1 dry_run status is not Executed');
          allPassed = false;
        }
        
        // Check if sendAsync would detect an error
        if (result.explained_status && result.explained_status.Error) {
          console.log('  WARNING: explained_status.Error detected, StcQuery would convert to error:',
            JSON.stringify(result.explained_status.Error));
        }
      }
    } catch (e) {
      console.log('FAIL: VM1 dry_run exception:', e.message);
      allPassed = false;
    }
  }

  // Test 6: VM2 contract2.dry_run
  console.log('\n=== Test 6: VM2 gas estimation (contract2.dry_run) ===');
  if (vm2Seq !== undefined) {
    try {
      const params = {
        chain_id: 254,
        gas_unit_price: 1,
        sender: SENDER,
        sender_public_key: PUBLIC_KEY,
        sequence_number: vm2Seq,
        max_gas_amount: 10000000,
        script: {
          code: '0x00000000000000000000000000000001::transfer_scripts::peer_to_peer_v2',
          type_args: ['0x00000000000000000000000000000001::starcoin_coin::STC'],
          args: [RECEIVER, '100u128']
        },
      };
      const res = await rpcCall('contract2.dry_run', [params]);
      if (res.error) {
        console.log('FAIL: VM2 dry_run RPC error:', res.error);
        allPassed = false;
      } else {
        const result = res.result;
        console.log('  status:', result.status);
        console.log('  gas_used:', result.gas_used);
        console.log('  explained_status:', JSON.stringify(result.explained_status));
        if (result.status === 'Executed') {
          console.log('PASS: VM2 dry_run gas_used =', result.gas_used);
        } else {
          console.log('FAIL: VM2 dry_run status is not Executed');
          allPassed = false;
        }
        
        // Check if sendAsync would detect an error
        if (result.explained_status && result.explained_status.Error) {
          console.log('  WARNING: explained_status.Error detected, StcQuery would convert to error:',
            JSON.stringify(result.explained_status.Error));
        }
      }
    } catch (e) {
      console.log('FAIL: VM2 dry_run exception:', e.message);
      allPassed = false;
    }
  }

  // Test 7: Simulate the StcQuery.sendAsync error detection for VM2
  console.log('\n=== Test 7: Simulate StcQuery.sendAsync error detection ===');
  if (vm2Seq !== undefined) {
    try {
      const params = {
        chain_id: 254,
        gas_unit_price: 1,
        sender: SENDER,
        sender_public_key: PUBLIC_KEY,
        sequence_number: vm2Seq,
        max_gas_amount: 10000000,
        script: {
          code: '0x00000000000000000000000000000001::transfer_scripts::peer_to_peer_v2',
          type_args: ['0x00000000000000000000000000000001::starcoin_coin::STC'],
          args: [RECEIVER, '100u128']
        },
      };
      
      // This is what StcQuery.sendAsync sends via createPayload
      const payload = { jsonrpc: '2.0', method: 'contract2.dry_run', params: [params], id: 1 };
      const body = JSON.stringify(payload);
      
      const response = await new Promise((resolve, reject) => {
        const req = http.request(NODE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        }, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(body);
        req.end();
      });
      
      // Simulate StcQuery.sendAsync error checking:
      let err = null;
      if (response.error) {
        err = new Error('StcQuery - RPC Error - ' + response.error.message);
      }
      if (!err && response.result && response.result.explained_status && response.result.explained_status.Error) {
        const errMessage = JSON.stringify(response.result.explained_status.Error);
        err = new Error('StcQuery - ' + errMessage);
      }
      
      if (err) {
        console.log('  StcQuery would return ERROR:', err.message);
        console.log('  Our callback receives err, falls back to defaults → resolve({gas_unit_price:1, gas_used:1000000, max_gas_amount:10000000})');
      } else {
        console.log('  StcQuery returns result (no error):', response.result?.status, 'gas_used:', response.result?.gas_used);
        console.log('  Our callback checks res.status === "Executed" →', response.result?.status === 'Executed');
      }
      console.log('PASS: StcQuery simulation complete');
    } catch (e) {
      console.log('FAIL: StcQuery simulation exception:', e.message);
      allPassed = false;
    }
  }

  // Test 8: Check what getBlockByNumber returns (simulating StcQuery.getBlockByNumber)
  console.log('\n=== Test 8: Simulate getBlockByNumber for gasLimit ===');
  try {
    const chainInfo = await rpcCall('chain.info');
    const headNumber = parseInt(chainInfo.result.head.number, 10);
    
    // StcQuery.getBlockByNumber calls chain.get_block_by_number
    const blockRes = await rpcCall('chain.get_block_by_number', [headNumber, { raw: false }]);
    const block = blockRes.result;
    
    // The extension reads: currentBlock.gasLimit
    console.log('  block.gasLimit =', block.gasLimit);
    console.log('  block.gas_used =', block.gas_used);
    console.log('  block.header.gas_used =', block.header?.gas_used);
    
    if (!block.gasLimit) {
      console.log('  WARNING: block.gasLimit is undefined/null!');
      console.log('  This means currentBlockGasLimit will be undefined in Redux state');
      console.log('  blockGasLimit prop will be undefined/empty');
      console.log('  estimateGasForSend will use default MIN_GAS_LIMIT_HEX = "64" = 100 decimal');
    } else {
      console.log('PASS: block.gasLimit =', block.gasLimit);
    }
  } catch (e) {
    console.log('FAIL: getBlockByNumber exception:', e.message);
    allPassed = false;
  }

  // Summary
  console.log('\n========== SUMMARY ==========');
  console.log(allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
}

main().catch(console.error);

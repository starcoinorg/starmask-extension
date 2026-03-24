const http = require('http');
function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({jsonrpc:'2.0',id:1,method,params});
    const req = http.request({hostname:'localhost',port:9850,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{try{const r=JSON.parse(d); resolve(r.result!==undefined?r.result:r.error)}catch(e){reject(e)}});
    });
    req.on('error',reject); req.write(body); req.end();
  });
}

const sender = '0x05744314501c42a31c6a5781d5886ef9';
const receiver = '0x3241aa645dbc949dea59d14baca26461';
const senderPubKey = '0x29c5abb92b20fbf5136c2875e15e4cf9621a89ba4cdcb3a039e9272c66d219bd';

(async () => {
  // ============================================
  // Simulate EXACTLY what the extension does
  // ============================================

  // Step 1: getSequenceNumber (from send.utils.js)
  console.log('=== Step 1: getSequenceNumber (send.utils.js VM2 branch) ===');
  const acctRes = await rpc('state2.get_resource', [sender, '0x00000000000000000000000000000001::account::Account', {decode:true}]);
  const seq = acctRes && acctRes.json && acctRes.json.sequence_number || 0;
  console.log('VM2 sequence_number:', seq, '(type:', typeof seq, ')');

  // Step 2: Build params like metamask-controller.estimateGas does
  const blockGasLimit = '0x64'; // MIN_GAS_LIMIT_HEX if currentBlockGasLimit is not set
  console.log('\n=== Step 2: Build params (metamask-controller.estimateGas) ===');
  const gasHex = blockGasLimit;
  const gasDecimal = parseInt(gasHex, 16).toString();
  console.log('gas hex:', gasHex, '-> decimal for args:', gasDecimal);
  
  const chainId = 254;
  const params = {
    chain_id: chainId,
    gas_unit_price: 1,
    sender: sender,
    sender_public_key: senderPubKey,
    sequence_number: seq,
    max_gas_amount: 10000000,
    script: {
      code: '0x00000000000000000000000000000001::transfer_scripts::peer_to_peer_v2',
      type_args: ['0x00000000000000000000000000000001::starcoin_coin::STC'],
      args: [receiver, gasDecimal + 'u128']
    },
  };
  console.log('Params:', JSON.stringify(params, null, 2));

  // Step 3: Call contract2.dry_run
  console.log('\n=== Step 3: contract2.dry_run ===');
  const dryRes = await rpc('contract2.dry_run', [params]);
  console.log('status:', dryRes.status);
  console.log('gas_used:', dryRes.gas_used);
  if (dryRes.status !== 'Executed') {
    console.log('FULL:', JSON.stringify(dryRes, null, 2));
  } else {
    console.log('SUCCESS! gas_unit_price=1, gas_used=' + dryRes.gas_used);
  }

  // Step 4: VM1 dry-run (contract.dry_run)
  console.log('\n=== Step 4: VM1 contract.dry_run ===');
  const vm1Acct = await rpc('state.get_resource', [sender, '0x00000000000000000000000000000001::Account::Account', {decode:true}]);
  const vm1Seq = vm1Acct && vm1Acct.json && vm1Acct.json.sequence_number || 0;
  console.log('VM1 sequence_number:', vm1Seq);
  
  const vm1Params = {
    chain_id: chainId,
    gas_unit_price: 1,
    sender: sender,
    sender_public_key: senderPubKey,
    sequence_number: vm1Seq,
    max_gas_amount: 10000000,
    script: {
      code: '0x00000000000000000000000000000001::TransferScripts::peer_to_peer_v2',
      type_args: ['0x00000000000000000000000000000001::STC::STC'],
      args: [receiver, gasDecimal + 'u128']
    },
  };
  const vm1Res = await rpc('contract.dry_run', [vm1Params]);
  console.log('VM1 status:', vm1Res.status, 'gas_used:', vm1Res.gas_used);

  // Step 5: Get balance
  console.log('\n=== Step 5: VM2 balance ===');
  const balRes = await rpc('contract2.call_v2', [{function_id:'0x1::coin::balance',type_args:['0x1::starcoin_coin::STC'],args:[sender]}]);
  console.log('VM2 balance (nanoSTC):', balRes);
  const balNano = BigInt(balRes[0]);
  console.log('VM2 balance (STC):', Number(balNano) / 1e9);

  console.log('\n=== SUMMARY ===');
  console.log('VM1: seq=' + vm1Seq + ', dry_run=' + vm1Res.status + ', gas=' + vm1Res.gas_used);
  console.log('VM2: seq=' + seq + ', dry_run=' + dryRes.status + ', gas=' + dryRes.gas_used);
  console.log('All chain interactions OK!');
})();

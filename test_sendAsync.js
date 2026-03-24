const http = require('http');
function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({jsonrpc:'2.0',id:1,method,params});
    const req = http.request({hostname:'localhost',port:9850,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}}, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{try{resolve(JSON.parse(d))}catch(e){reject(e)}});
    });
    req.on('error',reject); req.write(body); req.end();
  });
}
const sender = '0x05744314501c42a31c6a5781d5886ef9';
const receiver = '0x3241aa645dbc949dea59d14baca26461';
const pub = '0x29c5abb92b20fbf5136c2875e15e4cf9621a89ba4cdcb3a039e9272c66d219bd';

(async () => {
  // Test 1: contract2.dry_run with CORRECT seq=2 
  console.log('=== contract2.dry_run CORRECT seq=2 ===');
  const r1 = await rpc('contract2.dry_run', [{
    chain_id:254, gas_unit_price:1, sender, sender_public_key:pub,
    sequence_number:2, max_gas_amount:10000000,
    script:{code:'0x00000000000000000000000000000001::transfer_scripts::peer_to_peer_v2',
    type_args:['0x00000000000000000000000000000001::starcoin_coin::STC'],
    args:[receiver,'1000000000u128']}
  }]);
  console.log('status:', r1.result.status);
  console.log('explained_status:', JSON.stringify(r1.result.explained_status));
  console.log('sendAsync would create error?', !!(r1.result.explained_status && r1.result.explained_status.Error));

  // Test 2: contract2.dry_run with WRONG seq=0
  console.log('\n=== contract2.dry_run WRONG seq=0 ===');
  const r2 = await rpc('contract2.dry_run', [{
    chain_id:254, gas_unit_price:1, sender, sender_public_key:pub,
    sequence_number:0, max_gas_amount:10000000,
    script:{code:'0x00000000000000000000000000000001::transfer_scripts::peer_to_peer_v2',
    type_args:['0x00000000000000000000000000000001::starcoin_coin::STC'],
    args:[receiver,'1000000000u128']}
  }]);
  console.log('status:', JSON.stringify(r2.result.status));
  console.log('explained_status:', JSON.stringify(r2.result.explained_status));
  console.log('sendAsync would create error?', !!(r2.result.explained_status && r2.result.explained_status.Error));

  // Test 3: contract.dry_run VM1 CORRECT seq=3
  console.log('\n=== contract.dry_run VM1 CORRECT seq=3 ===');
  const r3 = await rpc('contract.dry_run', [{
    chain_id:254, gas_unit_price:1, sender, sender_public_key:pub,
    sequence_number:3, max_gas_amount:10000000,
    script:{code:'0x00000000000000000000000000000001::TransferScripts::peer_to_peer_v2',
    type_args:['0x00000000000000000000000000000001::STC::STC'],
    args:[receiver,'100u128']}
  }]);
  console.log('status:', r3.result.status);
  console.log('explained_status:', JSON.stringify(r3.result.explained_status));
  console.log('sendAsync would create error?', !!(r3.result.explained_status && r3.result.explained_status.Error));

  // Test 4: contract.dry_run VM1 WRONG seq=2
  console.log('\n=== contract.dry_run VM1 WRONG seq=2 ===');
  const r4 = await rpc('contract.dry_run', [{
    chain_id:254, gas_unit_price:1, sender, sender_public_key:pub,
    sequence_number:2, max_gas_amount:10000000,
    script:{code:'0x00000000000000000000000000000001::TransferScripts::peer_to_peer_v2',
    type_args:['0x00000000000000000000000000000001::STC::STC'],
    args:[receiver,'100u128']}
  }]);
  console.log('status:', JSON.stringify(r4.result.status));
  console.log('explained_status:', JSON.stringify(r4.result.explained_status));
  console.log('sendAsync would create error?', !!(r4.result.explained_status && r4.result.explained_status.Error));
})();

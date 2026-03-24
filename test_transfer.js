const { utils, encoding, bcs } = require('@starcoin/starcoin');
const { arrayify, hexlify } = require('ethers').ethers.utils;
const http = require('http');

function rpc(method, params) {
  return new Promise((resolve, reject) => {
    const d = JSON.stringify({ jsonrpc: '2.0', method, params, id: 1 });
    const r = http.request({ hostname: 'localhost', port: 9850, method: 'POST', headers: { 'Content-Type': 'application/json' } }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => { const j = JSON.parse(b); j.error ? reject(j.error) : resolve(j.result); });
    });
    r.on('error', reject);
    r.write(d);
    r.end();
  });
}

async function getChainTimeSec() {
  const info = await rpc('chain.info', []);
  return Math.floor(parseInt(info.head.timestamp) / 1000);
}

async function testVM1Transfer() {
  console.log('=== VM1 Transfer Test ===');
  const pk = '0x3d155188702071c50b7e7afb6939011dbb7ecc20af811e5efbb57486854c26b8';
  const sender = '0x05744314501c42a31c6a5781d5886ef9';
  const to = '0x3241aa645dbc949dea59d14baca26461';
  const amount = 1000000000; // 1 STC

  // Get sequence number
  const acct = await rpc('contract.get_resource', [sender, '0x00000000000000000000000000000001::Account::Account']);
  const seqNumber = parseInt(acct.value[6][1].U64, 10);
  console.log('seq_number:', seqNumber);

  // Build payload
  const tyArgs = utils.tx.encodeStructTypeTags(['0x1::STC::STC']);
  const se = new bcs.BcsSerializer();
  se.serializeU128(BigInt(amount));
  const amtHex = hexlify(se.getBytes());
  const args = [arrayify(to), arrayify(amtHex)];
  const scriptFunction = utils.tx.encodeScriptFunction('0x1::TransferScripts::peer_to_peer_v2', tyArgs, args);

  // Use chain time for expiration
  const chainTime = await getChainTimeSec();
  const expiration = chainTime + 43200;
  console.log('chain_time:', chainTime, 'expiration:', expiration);

  const rawTx = utils.tx.generateRawUserTransaction(sender, scriptFunction, 10000000, 1, seqNumber, expiration, 254);
  const rawTxHex = encoding.bcsEncode(rawTx);

  const pub = await encoding.privateKeyToPublicKey(pk);

  // Dry run
  const dr = await rpc('contract.dry_run_raw', [rawTxHex, pub]);
  console.log('dry_run status:', dr.status, 'gas_used:', dr.gas_used);

  if (dr.status === 'Executed') {
    const signed = await utils.tx.signRawUserTransaction(pk, rawTx);
    const hash = await rpc('txpool.submit_hex_transaction', [signed]);
    console.log('VM1 tx submitted:', hash);

    // Wait and check
    await new Promise(r => setTimeout(r, 3000));
    const txInfo = await rpc('chain.get_transaction_info', [hash]);
    console.log('VM1 tx status:', txInfo.status, 'gas_used:', txInfo.gas_used);
  }
}

async function testVM2Transfer() {
  console.log('\n=== VM2 Transfer Test ===');
  const pk = '0x3d155188702071c50b7e7afb6939011dbb7ecc20af811e5efbb57486854c26b8';
  const sender = '0x05744314501c42a31c6a5781d5886ef9';
  const to = '0x3241aa645dbc949dea59d14baca26461';
  const amount = 1000000000; // 1 STC

  // Get VM2 sequence number
  const acct2 = await rpc('state2.get_resource', [sender, '0x00000000000000000000000000000001::account::Account', { decode: true }]);
  const seqNumber = parseInt(acct2.json.sequence_number, 10);
  console.log('vm2 seq_number:', seqNumber);

  // Build VM2 payload - uses lowercase module names
  const functionId = '0x1::transfer_scripts::peer_to_peer_v2';
  const tyArgs = utils.tx.encodeStructTypeTags(['0x1::starcoin_coin::STC']);
  const se = new bcs.BcsSerializer();
  se.serializeU128(BigInt(amount));
  const amtHex = hexlify(se.getBytes());
  const args = [arrayify(to), arrayify(amtHex)];
  const scriptFunction = utils.tx.encodeScriptFunction(functionId, tyArgs, args);

  const chainTime = await getChainTimeSec();
  const expiration = chainTime + 43200;
  console.log('chain_time:', chainTime, 'expiration:', expiration);

  const rawTx = utils.tx.generateRawUserTransaction(sender, scriptFunction, 10000000, 1, seqNumber, expiration, 254);
  const rawTxHex = encoding.bcsEncode(rawTx);

  const pub = await encoding.privateKeyToPublicKey(pk);

  // Dry run with VM2 method
  const dr = await rpc('contract2.dry_run_raw', [rawTxHex, pub]);
  console.log('dry_run status:', dr.status, 'gas_used:', dr.gas_used);

  if (dr.status === 'Executed') {
    // Submit with VM2 method
    const signed = await utils.tx.signRawUserTransaction(pk, rawTx);
    const hash = await rpc('txpool.submit_hex_transaction2', [signed]);
    console.log('VM2 tx submitted:', hash);

    // Wait and check
    await new Promise(r => setTimeout(r, 3000));
    const txInfo = await rpc('chain.get_transaction_info', [hash]);
    console.log('VM2 tx status:', txInfo.status, 'gas_used:', txInfo.gas_used);
  }
}

async function main() {
  await testVM1Transfer();
  await testVM2Transfer();
}

main().catch(e => console.error('ERROR:', e));

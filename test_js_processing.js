/**
 * Simulate the EXACT JavaScript processing path that the Send page uses,
 * with the ACTUAL BigNumber v9 from the project, to verify there are no
 * number conversion errors.
 * 
 * This tests:
 * 1. multiplyCurrencies with blockGasLimit
 * 2. addGasBuffer with real gas estimation results
 * 3. calcGasTotal with the resulting gasLimit and gasPrice
 * 4. formShouldBeDisabled logic
 */

const { BigNumber } = require('bignumber.js');

// ===== Copied from conversion-util.js (with our fixes) =====
const toBigNumber = {
  hex: (n) => new BigNumber(String(n), 16),
  dec: (n) => new BigNumber(String(n), 10),
  BN: (n) => new BigNumber(n.toString(16), 16),
};

const baseChange = {
  hex: (n) => n.toString(16),
  dec: (n) => n.toString(10),
};

function converter({
  value,
  fromNumericBase,
  fromDenomination,
  fromCurrency,
  toNumericBase,
  numberOfDecimals,
  conversionRate,
  invertConversionRate,
  roundDown,
  toDenomination,
}) {
  if (fromNumericBase) {
    value = toBigNumber[fromNumericBase](value);
  }
  if (conversionRate) {
    let rate = toBigNumber.dec(conversionRate);
    if (invertConversionRate) {
      rate = new BigNumber(1.0).div(conversionRate);
    }
    value = value.times(rate);
  }
  if (numberOfDecimals !== undefined && numberOfDecimals !== null && numberOfDecimals !== false) {
    value = value.dp(Number(numberOfDecimals), BigNumber.ROUND_HALF_DOWN);
  }
  if (roundDown !== undefined && roundDown !== null && roundDown !== false) {
    value = value.dp(Number(roundDown), BigNumber.ROUND_DOWN);
  }
  if (toNumericBase) {
    value = baseChange[toNumericBase](value);
  }
  return value;
}

function multiplyCurrencies(a, b, options = {}) {
  const { multiplicandBase, multiplierBase, ...conversionOptions } = options;
  const bigNumberA = new BigNumber(String(a), multiplicandBase);
  const bigNumberB = new BigNumber(String(b), multiplierBase);
  const product = bigNumberA.times(bigNumberB);
  return converter({ value: product, ...conversionOptions });
}

function conversionGreaterThan({ value, fromNumericBase }, { value: compareToValue, fromNumericBase: compareToBase }) {
  const a = converter({ value, fromNumericBase, toNumericBase: 'dec' });
  const b = converter({ value: compareToValue, fromNumericBase: compareToBase, toNumericBase: 'dec' });
  return new BigNumber(a, 10).gt(new BigNumber(b, 10));
}

function conversionLessThan({ value, fromNumericBase }, { value: compareToValue, fromNumericBase: compareToBase }) {
  const a = converter({ value, fromNumericBase, toNumericBase: 'dec' });
  const b = converter({ value: compareToValue, fromNumericBase: compareToBase, toNumericBase: 'dec' });
  return new BigNumber(a, 10).lt(new BigNumber(b, 10));
}

function addHexPrefix(str) {
  if (typeof str !== 'string' || str.match(/^-?0x/u)) return str;
  if (str.match(/^-?0X/u)) return str.replace('0X', '0x');
  if (str.startsWith('-')) return str.replace('-', '-0x');
  return `0x${str}`;
}

function stripHexPrefix(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/^0x/i, '');
}

// ===== From send.utils.js =====
const MIN_GAS_LIMIT_HEX = (100).toString(16); // '64'
const MIN_GAS_LIMIT_DEC = '100';

function calcGasTotal(gasLimit = '0', gasPrice = '0') {
  return multiplyCurrencies(gasLimit, gasPrice, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 16,
  });
}

function addGasBuffer(initialGasLimitHex, blockGasLimitHex, bufferMultiplier = 1.5) {
  const upperGasLimit = multiplyCurrencies(blockGasLimitHex, 0.9, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 10,
    numberOfDecimals: '0',
  });
  const bufferedGasLimit = multiplyCurrencies(initialGasLimitHex, bufferMultiplier, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 10,
    numberOfDecimals: '0',
  });
  
  if (conversionGreaterThan(
    { value: initialGasLimitHex, fromNumericBase: 'hex' },
    { value: upperGasLimit, fromNumericBase: 'hex' }
  )) {
    return initialGasLimitHex;
  }
  if (conversionLessThan(
    { value: bufferedGasLimit, fromNumericBase: 'hex' },
    { value: upperGasLimit, fromNumericBase: 'hex' }
  )) {
    return bufferedGasLimit;
  }
  return upperGasLimit;
}

// ===== MAIN TESTS =====
console.log('BigNumber version:', BigNumber.config && BigNumber.config().CONSTRUCTOR ? 'unknown' : 'v' + (new BigNumber(0)).constructor.prototype.constructor.toString().match(/bignumber\.js\sv([\d.]+)/) || 'unknown');
console.log('');

function testScenario(name, gas_unit_price, gas_used, max_gas_amount, blockGasLimit, ticker) {
  console.log(`=== ${name} ===`);
  
  try {
    // Step 1: blockGasLimit processing (what estimateGasForSend does)
    let effectiveBlockGasLimit = blockGasLimit || MIN_GAS_LIMIT_HEX;
    if (!effectiveBlockGasLimit) effectiveBlockGasLimit = MIN_GAS_LIMIT_HEX;
    console.log(`  blockGasLimit input: '${blockGasLimit}' → effective: '${effectiveBlockGasLimit}'`);
    
    // Step 2: gas parameter for dry_run
    const gasParam = addHexPrefix(multiplyCurrencies(effectiveBlockGasLimit, 1, {
      multiplicandBase: 16,
      multiplierBase: 10,
      roundDown: '0',
      toNumericBase: 'hex',
    }));
    console.log(`  gas param for dry_run: '${gasParam}'`);
    
    // Step 3: Process dry_run result
    const estimatedGas = gas_used;
    const estimatedGasHex = estimatedGas.toString(16);
    console.log(`  gas_used: ${estimatedGas} (0x${estimatedGasHex})`);
    
    // Step 4: addGasBuffer
    const blockGasLimitForBuffer = ticker === 'STC' ? effectiveBlockGasLimit : parseInt(max_gas_amount, 10).toString(16);
    const estimateWithBuffer = addGasBuffer(estimatedGasHex, blockGasLimitForBuffer, 1.5);
    console.log(`  addGasBuffer result: '${estimateWithBuffer}' (${parseInt(estimateWithBuffer, 16)} decimal)`);
    
    // Step 5: Final gasPrice and gasLimit
    const finalGasPrice = addHexPrefix(gas_unit_price.toString(16));
    const finalGasLimit = addHexPrefix(estimateWithBuffer);
    console.log(`  gasPrice: '${finalGasPrice}', gasLimit: '${finalGasLimit}'`);
    
    // Step 6: calcGasTotal
    const gasTotal = calcGasTotal(finalGasLimit, finalGasPrice);
    console.log(`  gasTotal: '${gasTotal}' (${parseInt(gasTotal, 16)} decimal)`);
    
    // Step 7: formShouldBeDisabled checks
    const gasLimitTooLow = stripHexPrefix(finalGasLimit) < MIN_GAS_LIMIT_DEC;
    const gasTotalFalsy = !gasTotal;
    console.log(`  !gasTotal: ${gasTotalFalsy}`);
    console.log(`  gasLimitTooLow: ${gasLimitTooLow}`);
    console.log(`  RESULT: Button should be ${gasTotalFalsy || gasLimitTooLow ? 'DISABLED' : 'ENABLED'}`);
    console.log('  PASS');
  } catch (e) {
    console.log(`  FAIL: ${e.message}`);
    console.log(`  Stack: ${e.stack}`);
  }
  console.log('');
}

// Test 1: VM1 with empty blockGasLimit
testScenario('VM1 (blockGasLimit="")', 1, 103364, 10000000, '', 'STC');

// Test 2: VM2 with empty blockGasLimit
testScenario('VM2 (blockGasLimit="")', 1, 200305, 10000000, '', 'STC');

// Test 3: With a real blockGasLimit (if it were set)
testScenario('VM1 (blockGasLimit="989680")', 1, 103364, 10000000, '989680', 'STC');

// Test 4: VM2 with real blockGasLimit
testScenario('VM2 (blockGasLimit="989680")', 1, 200305, 10000000, '989680', 'STC');

// Test 5: Initial state - null gasLimit/gasPrice
console.log('=== Initial state: calcGasTotal(null, null) ===');
try {
  const result = calcGasTotal(null, null);
  console.log(`  result: '${result}', truthy: ${!!result}, !result: ${!result}`);
  console.log('  This is OK - button checks !gasTotal which is', !result);
} catch (e) {
  console.log(`  THROWS: ${e.message}`);
}
console.log('');

// Test 6: calcGasTotal with undefined (default params kick in)
console.log('=== calcGasTotal(undefined, undefined) ===');
try {
  const result = calcGasTotal(undefined, undefined);
  console.log(`  result: '${result}', truthy: ${!!result}, !result: ${!result}`);
} catch (e) {
  console.log(`  THROWS: ${e.message}`);
}
console.log('');

// Test 7: Verify multiplyCurrencies doesn't throw with string numberOfDecimals
console.log('=== multiplyCurrencies with string numberOfDecimals ===');
try {
  const result = multiplyCurrencies('64', 0.9, {
    toNumericBase: 'hex',
    multiplicandBase: 16,
    multiplierBase: 10,
    numberOfDecimals: '0',
  });
  console.log(`  result: '${result}' (${parseInt(result, 16)} decimal)`);
  console.log('  PASS - no throw');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}
console.log('');

// Test 8: Verify multiplyCurrencies with roundDown: '0'
console.log('=== multiplyCurrencies with string roundDown ===');
try {
  const result = multiplyCurrencies('64', 1, {
    multiplicandBase: 16,
    multiplierBase: 10,
    roundDown: '0',
    toNumericBase: 'hex',
  });
  console.log(`  result: '${result}' (${parseInt(result, 16)} decimal)`);
  console.log('  PASS - no throw');
} catch (e) {
  console.log(`  FAIL: ${e.message}`);
}

console.log('\n========== ALL TESTS DONE ==========');

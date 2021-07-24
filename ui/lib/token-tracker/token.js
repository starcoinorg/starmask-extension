import BN from 'bn.js';
import stringifyBalance from './util';

/**
 * Checks whether the given input and base will produce an invalid bn instance.
 *
 * bn.js requires extra validation to safely use, so this function allows
 * us to typecheck the params we pass to it.
 *
 * @see {@link https://github.com/indutny/bn.js/issues/151}
 * @param {any} input - the bn.js input
 * @param {number} base - the bn.js base argument
 * @returns {boolean}
 */
function _isInvalidBnInput(input, base) {
  return (
    typeof input === 'string' &&
    (
      input.startsWith('0x') ||
      Number.isNaN(parseInt(input, base))
    )
  )
}

class Token {
  constructor({
    code,
    symbol,
    balance,
    decimals,
    owner,
    throwOnBalanceError
  } = {}) {
    // if (!contract) {
    //   throw new Error('Missing requried \'contract\' parameter')
    // } else if (!owner) {
    //   throw new Error('Missing requried \'owner\' parameter')
    // }
    if (!owner) {
      throw new Error('Missing requried \'owner\' parameter')
    }
    this.isLoading = !code || !symbol || !balance || !decimals
    this.code = code || '0x0::TKN::TKN'
    this.symbol = symbol
    this.throwOnBalanceError = throwOnBalanceError

    if (!balance) {
      balance = '0'
    } else if (_isInvalidBnInput(balance, 16)) {
      throw new Error('Invalid \'balance\' option provided; must be non-prefixed hex string if given as string')
    }

    if (decimals && _isInvalidBnInput(decimals, 10)) {
      throw new Error('Invalid \'decimals\' option provided; must be non-prefixed hex string if given as string')
    }

    this.balance = new BN(balance, 16)
    this.decimals = decimals ? new BN(decimals) : undefined
    this.owner = owner
    // this.contract = contract
  }

  async update() {
    await Promise.all([
      this.symbol || this.updateSymbol(),
      this.updateBalance(),
      this.decimals || this.updateDecimals(),
    ])
    this.isLoading = false
    return this.serialize()
  }

  serialize() {
    return {
      code: this.code,
      symbol: this.symbol,
      balance: this.balance.toString(10),
      decimals: this.decimals ? parseInt(this.decimals.toString()) : 0,
      string: this.stringify(),
      balanceError: this.balanceError ? this.balanceError : null,
    }
  }

  stringify() {
    return stringifyBalance(this.balance, this.decimals || new BN(0))
  }

  async updateSymbol() {
    const symbol = await this.updateValue('symbol')
    this.symbol = symbol || 'TKN'
    return this.symbol
  }

  async updateBalance() {
    const balance = await this.updateValue('balance')
    this.balance = balance
    return this.balance
  }

  async updateDecimals() {
    if (this.decimals !== undefined) return this.decimals
    var decimals = await this.updateValue('decimals')
    if (decimals) {
      this.decimals = decimals
    }
    return this.decimals
  }

  async updateValue(key) {
    let methodName
    let args = []

    switch (key) {
      case 'balance':
        methodName = 'balanceOf'
        args = [this.owner]
        break
      default:
        methodName = key
    }

    let result
    try {
      // result = await this.contract[methodName](...args)
      if (key === 'balance') {
        this.balanceError === null
      }
    } catch (e) {
      console.warn(`failed to load ${key} for token at ${this.code}`)
      if (key === 'balance') {
        this.balanceError = e
        if (this.throwOnBalanceError) {
          throw e
        }
      }
    }

    if (result) {
      const val = result[0]
      this[key] = val
      return val
    }

    return this[key]
  }

}

export default Token;

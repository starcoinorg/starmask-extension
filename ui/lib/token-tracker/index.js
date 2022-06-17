import StcQuery from '@starcoin/stc-query';
// const EthContract = require('ethjs-contract')
import { PollingBlockTracker } from '@starcoin/stc-block-tracker';
// const abi = require('human-standard-token-abi')
import SafeEventEmitter from 'safe-event-emitter';
import { isEqual } from 'lodash';
import Token from './token';

class TokenTracker extends SafeEventEmitter {

  constructor(opts = {}) {
    super()
    this.includeFailedTokens = opts.includeFailedTokens || false
    this.userAddress = opts.userAddress || '0x0'
    this.provider = opts.provider
    const pollingInterval = opts.pollingInterval || 4000
    this.blockTracker = new PollingBlockTracker({
      provider: this.provider,
      pollingInterval,
    })

    this.query = new StcQuery(this.provider)
    // this.contract = new EthContract(this.query)
    // this.TokenContract = this.contract(abi)

    const tokens = opts.tokens || []

    this.tokens = tokens.map((tokenOpts) => {
      return this.createTokenFrom(tokenOpts)
    })

    // initialize to empty array to ensure a tracker initialized
    // with zero tokens doesn't emit an update until a token is added.
    this._oldBalances = []

    // Promise.all(this.tokens.map((token) => token.update()))
    //   .then((newBalances) => {
    //     this._update(newBalances)
    //   })
    //   .catch((error) => {
    //     this.emit('error', error)
    //   })

    this.updateBalances = this.updateBalances.bind(this)

    this.running = true
    this.blockTracker.on('latest', this.updateBalances)
  }

  serialize() {
    return this.tokens.map(token => token.serialize())
  }

  async updateBalances() {
    try {
      // await Promise.all(this.tokens.map((token) => {
      //   return token.updateBalance()
      // }))

      const newBalances = this.serialize()
      this._update(newBalances)
    } catch (reason) {
      this.emit('error', reason)
    }
  }

  createTokenFrom(opts) {
    const owner = this.userAddress
    const { code, symbol, balance, decimals } = opts
    // const contract = this.TokenContract.at(address)
    return new Token({
      code,
      symbol,
      balance,
      decimals,
      // contract,
      owner,
      throwOnBalanceError: this.includeFailedTokens === false,
    })
  }

  add(opts) {
    const token = this.createTokenFrom(opts)
    this.tokens.push(token)
    // token.update()
    //   .then(() => {
    //     this._update(this.serialize())
    //   })
    //   .catch((error) => {
    //     this.emit('error', error)
    //   })
  }

  stop() {
    this.running = false
    this.blockTracker.removeListener('latest', this.updateBalances)
  }

  _update(newBalances) {
    if (!this.running || isEqual(newBalances, this._oldBalances)) {
      return
    }
    this._oldBalances = newBalances
    this.emit('update', newBalances)
  }
}

export default TokenTracker;

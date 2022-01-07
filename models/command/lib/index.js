'use strict'

const log = require('@hyf-cli/log')

class Command {
  constructor(argv) {
    const name = this.constructor.name
    if (!argv) {
      throw new Error(`${name}实例化的参数不能为空`)
    }
    if (!Array.isArray(argv)) {
      throw new Error(`${name}实例化的参数必须为数组`)
    }
    if (argv.length < 1) {
      throw new Error(`${name}实例化的参数列表不能为空`)
    }
    this._argv = argv
    let chain = Promise.resolve()
    chain = chain.then(() => this.initArgs())
    chain = chain.then(() => this.init())
    chain = chain.then(() => this.exec())
    chain.catch((e) => {
      log.error(e.message ?? e)
      log.verbose(e.stack)
    })
  }

  initArgs() {
    this._cmd = this._argv.pop()
    this._opts = this._argv.pop() ?? {}
  }

  init() {
    throw new Error(`${this.constructor.name}类必须实现init方法`)
  }

  exec() {
    throw new Error(`${this.constructor.name}类必须实现exec方法`)
  }
}

module.exports = Command

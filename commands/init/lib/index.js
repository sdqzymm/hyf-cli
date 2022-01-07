'use strict'

const Command = require('@hyf-cli/command')
const log = require('@hyf-cli/log')

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] ?? ''
    this.force = !!this._opts.force
  }

  exec() {
    log.info('正在执行init命令~~')
  }
}

module.exports = InitCommand

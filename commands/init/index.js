'use strict';

const log = require('@hyf-cli/log');
const Command = require('@hyf-cli/command')
class InitCommand extends Command {
  init() {
    console.log('执行init')
    this.projectName = this._args[0];
    this.force = this._opts.force;
    log.verbose('项目名称', this.projectName);
    log.verbose('是否强制创建项目', this.force);
  }

  exec() {
    console.log('执行业务逻辑')
  }
}

function init(args) {
  new InitCommand(args)
}

module.exports = init;

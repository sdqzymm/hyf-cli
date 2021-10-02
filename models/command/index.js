'use strict';

const semver = require('semver');
const colors = require('colors');

const log = require('@hyf-cli/log');

const LOWEST_NODE_VERSION = '12.0.0';

class Command {
  constructor(args) {
    if (!args) throw new Error('参数不能为空');
    if (!Array.isArray(args)) throw new Error('参数必须为数组');
    if (args.length === 0) throw new Error('参数列表不能为空');
    this._args = args;
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      chain = chain.then(() => this.checkNodeVersion());
      chain = chain.then(() => this.initArgs());
      chain = chain.then(() => this.init());
      chain = chain.then(() => this.exec());

      chain.catch(err => {
        log.error('命令执行错误', err.message)
      })
    })
  }

  init() {
    throw new Error('子类必须实现init方法');
  }

  exec() {
    throw new Error('子类必须实现exec方法')
  }

  checkNodeVersion() {
    const curVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    if (semver.lt(curVersion, lowestVersion)) {
      throw new Error(
        colors.red(`hyf-cli 需要安装 v${lowestVersion} 以上版本的node.js`)
      );
    }
    log.info("当前node版本", curVersion);
  }

  initArgs() {
    this._cmd = this._args.pop();
    this._opts = this._args.pop();
  }
}

module.exports = Command;

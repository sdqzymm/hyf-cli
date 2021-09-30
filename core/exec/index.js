'use strict';

const path = require('path');

const Package = require('@hyf-cli/package');
const log = require('@hyf-cli/log');

const packageMap = require('./lib/package-map');

const CACHE_DIR = 'cli-dependencies'

async function exec(...rest) {
  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  const cmd = rest[rest.length - 1];
  const cmdName = cmd.name();
  const packageName = packageMap[cmdName];
  const packageVersion = 'latest';
  let flag = true  // 去获取本地package来执行命令
  if (!targetPath) {
    // 获取缓存目录
    flag = false  // 安装或更新远程package来执行命令
    targetPath = path.resolve(homePath, CACHE_DIR)
  }
  log.verbose('脚手架根目录: ', homePath);
  log.verbose('包目录: ', targetPath);
  const pkg = new Package({
    targetPath,
    packageName,
    packageVersion,
    flag
  })
  if (!flag) {
    const err = await pkg.prepare();
    if (err) return log.error(`无法获取 ${packageName} 有效版本`, err);
  }
  if (!pkg.exists()) {
    if (flag) return log.error('无法执行命令', '指定目录下无入口文件')
    // 安装远程package
    await pkg.install()
  } else if (!flag) {
    // 从远程库更新package
    const err = await pkg.update();
    if (err) log.warn(`无法更新 ${packageName} 到最新版本`, err)
  }
  // 获取入口文件
  const rootFile = pkg.getRootFilePath();
  // 执行命令
  if (rootFile) require(rootFile).apply(null, rest);
}

module.exports = exec;

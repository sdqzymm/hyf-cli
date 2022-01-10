'use strict'

module.exports = cli

const path = require('path')
const userHome = require('os').homedir()

const semver = require('semver')
const dedent = require('dedent')
const commander = require('commander')
const pathExists = require('path-exists').sync
const rootCheck = require('root-check')
const log = require('@hyf-cli/log')
const exec = require('@hyf-cli/exec')
const { writeDotenv, getInputArgs } = require('@hyf-cli/utils')

const pkg = require('../package.json')
const constants = require('./constants')
const {
  registerGlobalOptions,
  registerCommands,
  registerHelp
} = require('./program')

const program = new commander.Command()
let cliName

async function cli() {
  try {
    welcomeToCli()
    await check()
    registerCommand()
  } catch (e) {
    log.error(e.message ?? e)
    log.verbose(e.stack)
  }
}

function welcomeToCli() {
  cliName = pkg.name.split('/')[0].replace(/^@/, '')
  log.info(`欢迎使用 ${cliName}, 当前版本为 ${pkg.version}`)
}

async function check() {
  log.info(`正在检查当前环境~~`)
  checkNodeVersion()
  checkRoot()
  checkUserHome()
  checkEnv()
  await checkVersion()
}

function registerCommand() {
  log.info(`正在初始化 ${cliName} ~~`)
  // 全局选项
  registerGlobalOptions(program, cliName, pkg.version, log)

  // 注册命令
  registerCommands(program, exec)

  // 自定义帮助信息
  registerHelp(program)

  program.parse(process.argv)

  // 当可识别的参数为0时, 展示帮助信息并退出
  if (program.args.length === 0) {
    program.help()
  }
}

async function checkRoot() {
  rootCheck()
}

function checkNodeVersion() {
  const currentVersion = process.version
  const lowestVersion = constants.LOWEST_NODE_VERSION
  if (semver.lt(currentVersion, lowestVersion)) {
    throw new Error(dedent`hyf-cli要求node版本最低为 V${lowestVersion}
    当前版本为 ${currentVersion}
    请升级node版本后再使用hyf-cli`)
  }
}

function checkUserHome() {
  // 检查用户主目录
  if (!userHome || !pathExists(userHome)) {
    throw new Error('当前登录用户主目录不存在!')
  }
}

function checkEnv() {
  // 写入userHome目录下的.env文件配置
  writeDotenv(userHome)
  // 获取命令行参数
  const args = getInputArgs()
  // 对环境变量做一些默认处理
  processDefaultEnv(args)
}

function processDefaultEnv(args) {
  // 处理运行时环境变量
  process.env.CLI_USER_HOME = userHome
  const cli = process.env.CLI ?? constants.CLI
  process.env.CLI_PATH = path.resolve(userHome, cli)
  process.env.CLI_REGISTRY = process.env.CLI_REGISTRY ?? constants.NPM_REGISTRY
  if (args) {
    // todo
    // 如果用不到, 后续删除相关方法和依赖
  }
}

async function checkVersion() {
  // 检查是否最新版本, 提示升级
  const { getSemverVersion } = require('@hyf-cli/npm-info')
  const semverVersion = await getSemverVersion(pkg.name, pkg.version)
  if (semverVersion) {
    log.warn(dedent`检测到${cliName}有新版本 ${semverVersion}, 可以进行更新
    更新命令: npm install -g ${pkg.name}`)
  }
}

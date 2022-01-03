'use strict'

module.exports = cli

const path = require('path')
const userHome = require('os').homedir()

const semver = require('semver')
const dedent = require('dedent')
const commander = require('commander')
const log = require('@hyf-cli/log')
const init = require('@hyf-cli/init')
const exec = require('@hyf-cli/exec')

const {
  pathExists,
  rootCheck,
  writeDotenv,
  getInputArgs
} = require('./helpers')
const pkg = require('../package.json')
const constants = require('./constants')

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
  checkNodeVersion()
  await checkRoot()
  await checkUserHome()
  checkEnv()
  await checkVersion()
}

function registerCommand() {
  program
    .name(cliName)
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '指定本地调试文件路径', '')

  program
    .command('init <projectName>')
    .option('-f, --force', '是否强制初始化项目', false)
    .action(exec)

  // 监听debug模式
  program.on('option:debug', function () {
    process.env.CLI_LOG_LEVEL = log.level = 'verbose'
  })

  // 监听targetPath
  program.on('option:targetPath', function () {
    process.env.CLI_TARGET_PATH = this.opts().targetPath
  })

  // 监听未知命令
  program.on('command:*', function (operands) {
    const availableCommands = program.commands.map((cmd) => cmd.name())
    log.error(`未知的命令 ${operands[0]}`)
    log.info(`可用命令: ${availableCommands.join(', ')}`)
  })

  program.parse(process.argv)

  // 当可识别的参数为0时, 展示帮助信息并退出
  if (program.args.length === 0) {
    program.help()
  }
}

async function checkRoot() {
  await rootCheck()
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

async function checkUserHome() {
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
    // 如果用不到, 删除相关方法和依赖
  }
  // 在program中监听debug模式
  // if (args.debug) {
  //   process.env.CLI_LOG_LEVEL = log.level = 'verbose'
  // } else {
  //   process.env.CLI_LOG_LEVEL = 'info'
  // }
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

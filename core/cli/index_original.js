// 原index.js 后续我们根据脚手架架构进行改造
module.exports = cli;

const path = require("path");

const semver = require("semver");
const colors = require("colors");
const userHome = require("user-home");
const command = require('commander')
const log = require("@hyf-cli/log");

const pkg = require("./package.json");
const constants = require("./lib/const");

let pathExists;
const program = new command.Command();

async function cli() {
  try {
    checkPkgVersion();
    checkNodeVersion();
    checkRoot();
    checkUserHome();
    checkInputArgs();
    checkEnv();
    await checkGlobalUpdate();
    registerCommand();
  } catch (e) {
    log.error(e.message);
  }
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version);

  program.parse(process.argv);
}

function checkPkgVersion() {
  log.info("当前cli版本", pkg.version);
}

function checkNodeVersion() {
  const curVersion = process.version;
  const lowestVersion = constants.LOWEST_NODE_VERSION;
  if (semver.lt(curVersion, lowestVersion)) {
    throw new Error(
      colors.red(`hyf-cli 需要安装 v${lowestVersion} 以上版本的node.js`)
    );
  }
  log.info("当前node版本", curVersion);
}

function checkRoot() {
  const rootCheck = require("root-check");
  rootCheck();
  // 获取用户euid,0表示root用户(比如sudo ...,root用户创建的文件,其他用户有可能没有权限读写, 所以不要用root用户调脚手架创建,rootCheck会自动做降级)该方法在windows不存在
  // console.log(process.geteuid())
}

function checkUserHome() {
  pathExists = require('path-exists').sync;
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前登录用户主目录不存在!"));
  }
}

function checkInputArgs() {
  const minimist = require("minimist");
  const args = minimist(process.argv.slice(2));
  args.debug && (log.level = process.env.LOG_LEVEL = "verbose");
  switch (args.registry) {
    case 'taobao':
      process.env.REGISTRY = constants.TAO_BAO_REGISTRY;
      break;
    default:
      process.env.REGISTRY = constants.ORIGINAL_REGISTRY;
      break;
  }
}

function checkEnv() {
  const dotenv = require("dotenv");
  const dotenvPath = path.resolve(userHome, ".env");
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    });
  }
  createDefaultConfig();
  log.verbose("用户目录", process.env.USER_HOME);
  log.verbose("cli缓存目录", process.env.CLI_HOME);
}

function createDefaultConfig() {
  let cliHome = process.env.CLI_HOME;
  if (!cliHome) cliHome = constants.DEFAULT_CLI_HOME;
  process.env.CLI_HOME = path.join(userHome, cliHome);
  process.env.USER_HOME = userHome;
}

async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const { getNpmSemverVersion } = require('@hyf-cli/npm-info');
  let [version, err] = await getNpmSemverVersion(npmName, currentVersion);
  if (err) throw new Error(colors.red(err));
  if (version) {
    log.warn('当前cli版本非最新版本', '请升级至', colors.bgCyan(version))
  }
}

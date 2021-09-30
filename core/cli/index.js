module.exports = cli;

const path = require("path");

const semver = require("semver");
const colors = require("colors");
const userHome = require("user-home");
const command = require("commander");

const log = require("@hyf-cli/log");
const init = require("@hyf-cli/init");
const exec = require("@hyf-cli/exec");

const pkg = require("./package.json");
const constants = require("./lib/const");
const { parse } = require("path");

let pathExists;
const program = new command.Command();

async function cli() {
  try {
    await prepareCli();
    registerCommand();
  } catch (e) {
    log.error(e.message);
    log.verbose(e.stack)
  }
}

async function prepareCli() {
  checkPkgVersion();
  checkNodeVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  // await checkGlobalUpdate();
}

function registerCommand() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    // .allowUnknownOption()
    .version(pkg.version)
    .argument("<command>", "命令")
    .option("-r, --registry <npm|taobao>", '选择npm仓库', /^(npm|taobao)$/i, 'npm')
    .option("-d, --debug", "是否开启调试模式", false)
    .option("-tp, --targetPath <targetPath>", "指定本地package路径, 使用本地package的main入口文件执行命令")
  // .showHelpAfterError();

  const initCommand = program
    .command("init")
    .usage("<command> [projectName]")
    // .allowUnknownOption()
    .argument("<projectName>", "项目名称")
    .option("-f, --force", "是否强制初始化项目", false)
    .action(exec);

  program.on("option:registry", () => {
    process.env.REGISTRY = program.opts().registry === 'npm' ? constants.ORIGINAL_REGISTRY : constants.TAO_BAO_REGISTRY;
  });

  program.on("option:debug", () => {
    log.level = process.env.LOG_LEVEL = "verbose";
    // log.verbose('test')
  });

  program.on("option:targetPath", () => {
    process.env.CLI_TARGET_PATH = program.opts().targetPath;
  })

  // 处理未知的命令
  program.on("command:*", (operands) => {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    log.error("未知的命令: ", colors.red(operands[0]));
    log.notice("可用的命令: ", colors.blue(availableCommands.join(", ")));
  });

  program.parse(process.argv);

  // 处理未知的选项
  // const argv = process.argv.slice(2);
  // // if (argv[0].startsWith)
  // const opts = [...Object.keys(program.opts()), ...Object.keys(initCommand.opts())]; // 所有能被识别的选项
  // console.log(opts)
  // const unknownCmdOptions = initCommand.parseOptions(argv).unknown;
  // console.log(unknownCmdOptions);
  // if (unknownCmdOptions) {
  //   const unknownCmdOption = unknownCmdOptions.find(opt => !opts.includes(opt))
  //   if (unknownCmdOption) {
  //     log.error("未知的init命令选项", colors.red(unknownCmdOption));
  //     console.log();
  //     initCommand.help();
  //     console.log();
  //   }
  // }
  // const unknownProgramOptions = program.parseOptions(argv).unknown;
  // if (unknownProgramOptions) {
  //   const unknownProgramOption = unknownProgramOptions.find(opt => !opts.includes(opt))
  //   if (unknownProgramOption) {
  //     log.error("未知的全局选项", colors.red(unknownProgramOption));
  //     console.log();
  //     program.help();
  //     console.log();
  //   }
  // }
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
  pathExists = require("path-exists").sync;
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red("当前登录用户主目录不存在!"));
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
}

function createDefaultConfig() {
  let cliHome = process.env.CLI_HOME_PATH;
  if (!cliHome) cliHome = constants.DEFAULT_CLI_HOME_PATH;
  process.env.CLI_HOME_PATH = path.join(userHome, cliHome);
  process.env.USER_HOME = userHome;
  let registry = process.env.REGISTRY;
  if (!registry) process.env.REGISTRY = registry = constants.ORIGINAL_REGISTRY;
}

async function checkGlobalUpdate() {
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const { getNpmSemverVersion } = require("@hyf-cli/npm-info");
  let [version, err] = await getNpmSemverVersion(npmName, currentVersion);
  if (err) throw new Error(colors.red(err));
  if (version) {
    log.warn("当前cli版本非最新版本", "请升级至", colors.bgCyan(version));
    console.log();
  }
}

function registerGlobalOptions(program, name, version, log) {
  program
    .name(name)
    .usage('<command> [options]')
    .version(version)
    .option('-d, --debug', '是否开启调试模式')
    .option('-tp, --targetPath <targetPath>', '指定本地调试文件路径')

  // 监听debug模式
  program.on('option:debug', function () {
    process.env.CLI_LOG_LEVEL = log.level = 'verbose'
  })

  // 监听targetPath指定目录
  program.on('option:targetPath', function () {
    process.env.CLI_TARGET_PATH = this.opts().targetPath
  })

  // 监听未知命令
  program.on('command:*', function (operands) {
    const availableCommands = program.commands.map((cmd) => cmd.name())
    log.error(`未知的命令 ${operands[0]}`)
    log.info(`可用命令: ${availableCommands.join(', ')}`)
  })
}

function registerCommands(program, exec) {
  registerInitCommand(program, exec)
  // 注册其他命令
}

function registerHelp(program) {
  program
    .addHelpCommand('help [command]', '展示帮助信息')
    .helpOption('-h, --help', '展示帮助信息')
}

function registerInitCommand(program, exec) {
  program
    .command('init')
    .usage('[projectName] [options]')
    .description('初始化项目或组件')
    .argument('[projectName]', '项目或组件名称')
    .option('-f, --force', '是否强制初始化项目或组件', false)
    .action(exec)
}

module.exports = {
  registerGlobalOptions,
  registerCommands,
  registerHelp
}

'use strict'

const Package = require('@hyf-cli/package')
const log = require('@hyf-cli/log')
const { spawn } = require('@hyf-cli/utils')

const { packageMap } = require('./config')

async function exec(...rest) {
  try {
    // 1. 加载命令所需文件
    const targetPath = process.env.CLI_TARGET_PATH
    const cmd = rest[rest.length - 1]
    const cmdName = cmd.name()
    log.verbose(`正在加载${cmdName}命令所需文件~~`)
    const packageName = packageMap[cmdName]
    // 实例化pkg
    const pkg = new Package({
      targetPath,
      packageName
    })
    // flag为true: 使用指定目录下的包执行命令
    // flag为false: 安装或更新远程包到本地缓存目录, 然后执行命令
    const flag = pkg.flag
    // 针对是否指定目录以及是否存在package, 分逻辑处理
    if (!pkg.exists()) {
      // 指定目录不是一个包
      if (flag) throw new Error('无法执行命令, 指定目录不是一个package')
      // 缓存目录下不存在该包, 从远程安装
      await pkg.install()
    } else if (!flag) {
      // 缓存目录下已经存在该包, 从远程更新
      await pkg.update()
    }

    // 2. 获取包的入口文件
    const rootFile = pkg.getRootFilePath()
    if (rootFile) {
      // 3. 执行入口文件(即执行命令)
      const code = getCode(cmd, rest, rootFile)
      // ps: 子进程会重新加载一份自己的资源, 也就是说require同一个文件, 子进程会当做首次require重新执行一次
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit' // 继承: 表示父进程继续子进程的io, 直接输出在父进程中, 无需监听data事件获取
      })
      child.on('error', (e) => {
        log.error(e.message ?? e)
        log.verbose(e.stack)
      })
      child.on('exit', () => {
        log.info(`${cmdName} 命令执行完毕`)
      })
    } else {
      throw new Error('无法执行命令, 无法获取入口文件')
    }
  } catch (e) {
    log.error(e.message ?? e)
    log.verbose(e.stack)
  }
}

function getCode(cmd, rest, rootFile) {
  // cmd对象属性太多, 我们只取一部分传入
  const o = Object.create(null)
  Object.keys(cmd).forEach((key) => {
    if (!key.startsWith('_') && key !== 'parent' && key !== 'options') {
      o[key] = cmd[key]
    }
  })
  rest[rest.length - 1] = o
  // 注意这里require('xxx')要用括号包住当成一个整体, 否则new require()会使用new执行require函数, 报错
  return `new (require('${rootFile}'))(${JSON.stringify(rest)})`
}

module.exports = exec

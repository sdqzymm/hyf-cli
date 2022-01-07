'use strict'

const path = require('path')
const cp = require('child_process')

const Package = require('@hyf-cli/package')
const log = require('@hyf-cli/log')

const { packageMap, CACHE_DIR } = require('./config')

async function exec(...rest) {
  try {
    let targetPath = process.env.CLI_TARGET_PATH
    const cmd = rest[rest.length - 1]
    const cmdName = cmd.name()
    log.info(`正在加载${cmdName}命令所需文件~~`)
    const packageName = packageMap[cmdName]

    // flag为true: 使用指定目录下的包执行命令
    // flag为false: 安装或更新远程包到本地缓存目录, 然后执行命令
    let flag = true
    if (!targetPath) {
      targetPath = path.resolve(process.env.CLI_PATH, CACHE_DIR)
      flag = false
    }
    // 实例化pkg
    const pkg = new Package({
      targetPath,
      packageName,
      flag
    })
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

    // 获取入口文件
    const rootFile = pkg.getRootFilePath()
    if (rootFile) {
      // 执行命令
      const code = getCode(cmd, rest, rootFile)
      const child = spawn('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit'
      })
      child.on('error', (e) => {
        log.error(e.message ?? e)
        log.verbose(e.stack)
        process.exit(1)
      })
      child.on('exit', (code) => {
        log.info(`${cmdName}命令执行完毕`)
        process.exit(code)
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
  const o = Object.create(null)
  Object.keys(cmd).forEach((key) => {
    if (!key.startsWith('_') && key !== 'parent' && key !== 'options') {
      o[key] = cmd[key]
    }
  })
  rest[rest.length - 1] = o
  return `new (require('${rootFile}'))(${JSON.stringify(rest)})`
}

function spawn(command, args, options) {
  const win32 = process.platform === 'win32'
  const cmd = win32 ? 'cmd' : command
  args = win32 ? ['/c', command, ...args] : args
  return cp.spawn(cmd, args, options ?? {})
}

module.exports = exec

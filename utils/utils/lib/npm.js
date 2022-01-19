const path = require('path')
const cp = require('child_process')

const pathExists = require('path-exists').sync

function writeDotenv(dir) {
  // 读取dir目录下的.env配置, 并写入process.env
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(dir, '.env')
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath
    })
  }
}

function getInputArgs() {
  // 获取命令行参数
  const minimist = require('minimist')
  return minimist(process.argv.slice(2))
}

function spawn(command, args, options) {
  // 封装spawn方法, 使其兼容windows系统 /c表示静默处理
  // mac os: cp.spawn('npm', ['install', ...])
  // windows: cp.spawn('cmd', ['-c', 'npm', 'install', ...])
  const win32 = process.platform === 'win32'
  const cmd = win32 ? 'cmd' : command
  args = win32 ? ['/c', command, ...args] : args
  return cp.spawn(cmd, args, options ?? {})
  // 阅读源码后发现将shell设置为true, 会自动判断windows平台, 处理参数, 所以我们这里也可以将shell设置为true(如果是用exec方法是不需要的, 因为会自动将shell设置为true, 然后调用execFile, 最终也是调用spawn), 但是options中也有可能我们会手动传入一个字符串的shell, 所以我们这里自己来处理兼容
}

function spawnAsync(command, args, options, onError) {
  // 对spawn再次封装, 使得我们能够等待子进程执行完毕
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options)
    child.on('error', (e) => {
      onError && onError()
      reject(e)
    })
    child.on('exit', (code) => {
      if (code !== 0) {
        onError && onError()
        reject(code)
      }
      resolve(code)
    })
  })
}

module.exports = {
  writeDotenv,
  getInputArgs,
  spawn,
  spawnAsync
}

const path = require('path')

let pathExistsSync
let rootCheck_

async function pathExists(filename) {
  // 检查filename文件是否存在
  if (!pathExistsSync) {
    pathExistsSync = (await import('path-exists')).pathExistsSync
  }
  return pathExistsSync(filename)
}

async function rootCheck() {
  // 检查是否root用户, 如果是root用户, 降级(如果使用root用户, 后续创建的文件很可能出现权限过高, 导致其他用户无法读写)
  if (!rootCheck_) {
    rootCheck_ = (await import('root-check')).default
  }
  rootCheck_()
}

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

module.exports = {
  pathExists,
  rootCheck,
  writeDotenv,
  getInputArgs
}

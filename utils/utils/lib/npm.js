const path = require('path')
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

module.exports = {
  writeDotenv,
  getInputArgs
}

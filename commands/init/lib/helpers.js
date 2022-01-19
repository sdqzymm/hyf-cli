const fs = require('fs')

const request = require('@hyf-cli/request')
const { spawnAsync } = require('@hyf-cli/utils')
const { WHITE_COMMANDS, EXCLUDE_LIST } = require('./config')

function getTemplateApi() {
  return request({
    url: 'project/template'
  })
}

async function execCommand(command, options, onError, needWhite = true) {
  if (!Array.isArray(command)) {
    command = command.split(' ')
  }
  const cmd = command[0]
  // 设置白名单, 防止rm这种命令
  if (needWhite && !WHITE_COMMANDS.includes(cmd)) {
    throw new Error(`${cmd}命令不在白名单中`)
  }
  const args = command.slice(1)
  await spawnAsync(cmd, args, options ?? {}, onError)
}

function isDirEmpty(dir) {
  let fileList = fs.readdirSync(dir)
  // 当dir目录下只有node_modules, 可以认为是毫无作用的, 我们也当成空目录
  fileList = fileList.filter((file) => !EXCLUDE_LIST.includes(file))
  return fileList.length === 0
}

module.exports = {
  getTemplateApi,
  execCommand,
  isDirEmpty
}

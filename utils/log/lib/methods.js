const colors = require('colors')

function processMethods(log) {
  // 添加, 自定义方法
  log.addLevel('success', 3000, { fg: 'green', bold: true })
  log.addLevel('info', 2000, { fg: 'magenta', bg: 'black' })
  // 修改log方法, 不同方法的message应用不同的颜色
  processMethod(log, 'success', colors.bgGreen)
  processMethod(log, 'error', colors.bgRed)
  processMethod(log, 'info')
  processMethod(log, 'verbose', colors.grey)
  processMethod(log, 'warn', colors.bgYellow)
}

function processMethod(log, method, decorator) {
  // 原方法接收prefix, message, 我们的cli不需要prefix, 只使用message
  const cb = log[method]
  log[method] = (message) => cb('', decorator ? decorator(message) : message)
}

module.exports = processMethods

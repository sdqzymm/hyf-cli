function processConfig(log) {
  // 设置打印级别, 默认info
  log.level = process.env.LOG_LEVEL ?? 'info'

  // 设置heading和heading样式
  log.heading = 'hyf'
  log.headingStyle = { fg: 'yellow', bg: 'white' }

  // 设置前缀样式
  log.prefixStyle = { fg: 'white' }
}

module.exports = processConfig

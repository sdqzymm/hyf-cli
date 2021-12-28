'use strict'

const log = require('npmlog')

// 设置打印级别, 默认info
log.level = process.env.LOG_LEVEL ?? 'info'

// 给log添加监听的方法
log.addLevel('success', 3000, { fg: 'green', bold: true })

// 设置前缀和前缀样式
log.heading = 'hyf'
log.headingStyle = { fg: 'yellow', bg: 'white' }

module.exports = log

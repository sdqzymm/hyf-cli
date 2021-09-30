"use strict";

const log = require("npmlog");

// log.level = 'verbose'; // 设置打印级别, 小于该级别的不会打印
log.level = process.env.LOG_LEVEL ?? 'info'
// 监听: 方法名, 打印级别, 打印样式对象, 只有addLevel添加的方法才能调用
// log.addLevel("success", 2000, { fg: "green", bold: true });
// log.addLevel('info', 2000, { fg: 'green', bg: 'red' })
// 添加前缀和样式
log.heading = 'hyf';
log.headingStyle = { fg: 'yellow', bg: 'white' }

module.exports = log;

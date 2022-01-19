const path = require('path')

function formatPath(p) {
  // 格式化路径: 能够兼容windows版本
  if (p && typeof p === 'string') {
    const sep = path.sep
    if (sep !== '/') {
      return p.replace(/\\/g, '/')
    }
  }
  return p
}

module.exports = {
  formatPath
}

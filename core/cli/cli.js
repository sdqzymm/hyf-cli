#! /usr/bin/env node

'use strict'
const importLocal = require('import-local')

if (importLocal(__filename)) {
  require('@hyf-cli/log').info('hyf', '正在使用 hyf-cli 本地版本')
} else {
  require('./lib/index')(process.argv.slice(2))
}

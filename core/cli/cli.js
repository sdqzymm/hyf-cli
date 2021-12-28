#! /usr/bin/env node

'use strict'
const importLocal = require('import-local')

if (importLocal(__filename)) {
  require('log').info('hyf', '正在使用 hyf-cli 本地版本')
} else {
  require('.')(process.argv.slice(2))
}

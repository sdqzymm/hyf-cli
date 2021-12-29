'use strict'

module.exports = cli

const log = require('@hyf-cli/log')

const pkg = require('./package.json')

function cli() {
  checkPkgVersion()
}

function checkPkgVersion() {
  const { version, name } = pkg
  log.info(version, name)
}

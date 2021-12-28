'use strict'

module.exports = cli

const path = require('path')

const log = require('log')

const pkg = require('./package.json')

function cli() {
  checkPkgVersion()
}

function checkPkgVersion() {
  const { version, name } = pkg
  console.log(version, name)
  console.log(path, log)
}

'use strict'

const log = require('npmlog')

const processConfig = require('./config')
const processMethods = require('./methods')

processConfig(log)
processMethods(log)

module.exports = log

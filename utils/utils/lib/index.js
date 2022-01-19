'use strict'

const format = require('./format')
const npm = require('./npm')

function toString(obj) {
  return Object.prototype.toString.call(obj)
}

function getType(obj) {
  return toString(obj).slice(8, -1)
}

function isPlainObject(obj) {
  return getType(obj) === 'Object'
}

module.exports = {
  toString,
  getType,
  isPlainObject,
  ...format,
  ...npm
}

'use strict';

const path = require('path');

function getType(data) {
  let type = Object.prototype.toString.call(data);
  type = type.slice(8, type.length - 1).toLowerCase()
  return type
}

function isObject(obj) {
  return getType(obj) === 'object'
}

function isString(s) {
  return getType(s) === 'string'
}

function formatPath(p) {
  if (!p) return p;
  if (!isString(p)) throw new Error('路径必须为字符串')
  const sep = path.sep;
  if (sep === '\\') {
    p = p.replace(/\\/g, '/')
  }
  return p
}

module.exports = {
  getType,
  isObject,
  formatPath
}

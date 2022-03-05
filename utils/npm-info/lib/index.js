'use strict'

const axios = require('axios')
const semver = require('semver')
const urlJoin = require('url-join')

async function getNpmInfo(pkgName) {
  // 获取npm中的包信息
  if (!pkgName) return null
  const registry = process.env.CLI_REGISTRY || 'https://registry.npmjs.org'
  const npmUrl = urlJoin(registry, pkgName)
  const data = await axios.get(npmUrl)
  return data.data
}

async function getVersions(pkgName) {
  // 获取版本号信息
  const data = await getNpmInfo(pkgName)
  if (data && data.versions) {
    const versions = Object.keys(data.versions)
    return versions
  }
}

async function getLatestVersion(pkgName) {
  // 获取最新版本号
  const versions = await getVersions(pkgName)
  if (versions && versions.length) {
    sortVersions(versions)
  }
  return versions[0]
}

async function getSemverVersion(pkgName, currentVersion) {
  // 获取大于本地版本的版本号(可供更新的版本号)
  const version = await getLatestVersion(pkgName)
  if (version && semver.gt(version, currentVersion)) {
    return version
  }
}

function sortVersions(versions) {
  versions.sort((a, b) => (semver.gt(b, a) ? 1 : -1))
}

module.exports = {
  getNpmInfo,
  getVersions,
  getLatestVersion,
  getSemverVersion
}

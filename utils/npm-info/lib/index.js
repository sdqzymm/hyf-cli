'use strict'

const axios = require('axios')
const semver = require('semver')
const urlJoin = require('url-join')

async function getNpmInfo(pkgName) {
  if (!pkgName) return null
  const registry = process.env.CLI_REGISTRY
  const npmUrl = urlJoin(registry, pkgName)
  const data = await axios.get(npmUrl)
  return data.data
}

async function getVersions(pkgName) {
  const data = await getNpmInfo(pkgName)
  if (data && data.versions) {
    const versions = Object.keys(data.versions)
    return versions
  }
}

async function getLatestVersion(pkgName) {
  const versions = await getVersions(pkgName)
  if (versions && versions.length) {
    sortVersions(versions)
  }
  return versions[0]
}

/**
 * 获取仓库中最新的包版本号, 如果大于本地版本, 则返回
 * @param pkgName 包名
 * @param currentVersion 当前本地版本
 * @returns
 */
async function getSemverVersion(pkgName, currentVersion) {
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

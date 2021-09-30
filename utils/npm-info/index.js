"use strict";

const axios = require("axios");
const urlJoin = require("url-join");
const semver = require("semver");

async function getNpmInfo(npmName) {
  if (!npmName) return null;
  const registry = process.env.REGISTRY;
  const npmUrl = urlJoin(registry, npmName);
  let err;
  let data = await axios.get(npmUrl).catch((error) => (err = error.message));
  if (data) data = data.data;
  return [data, err];
}

async function getNpmVersions(npmName) {
  const [data, err] = await getNpmInfo(npmName);
  if (err) return [null, err];
  return [Object.keys(data.versions), null];
}

async function getNpmLatestVersion(npmName) {
  let [versions, err] = await getNpmVersions(npmName);
  if (err) return [null, err]
  if (versions && versions.length) {
    sortVersions(versions);
  }
  return [versions[0], err];
}

// 如果最新版本比baseVersion高, 返回
async function getNpmSemverVersion(npmName, baseVersion) {
  let [version, err] = await getNpmLatestVersion(npmName);
  version = filterVersion(baseVersion, version);
  return [version, err];
}

function filterVersion(baseVersion, version) {
  if (!semver.gt(version, baseVersion)) version = null;
  return version;
}

function sortVersions(versions) {
  versions.sort((a, b) => semver.gt(b, a) ? 1 : -1);
  return versions;
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmLatestVersion,
  getNpmSemverVersion,
};

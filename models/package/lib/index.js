'use strict'

const path = require('path')
const fs = require('fs')

const fse = require('fs-extra')
const npminstall = require('npminstall')
const semver = require('semver')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists').sync
const log = require('@hyf-cli/log')
const { isPlainObject, formatPath } = require('@hyf-cli/utils')
const { getSemverVersion, getLatestVersion } = require('@hyf-cli/npm-info')

const JSON_FILE = 'cli.json'
const DEPENDENCE_CACHE = 'dependencies'
const TEMPLATE_CACHE = 'templates'
class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package类的options参数不能为空')
    }
    if (!isPlainObject(options)) {
      throw new Error('Package类的options参数必须为对象')
    }
    // flag: true表示使用指定目录下的包, false表示使用本地缓存目录下的包(从远程安装或更新到缓存目录)
    this.flag = true
    // options中重要的属性如下:
    // packageName: 包名, 必传
    // targetPath: 传表示使用指定目录,flag为true, 不传表示使用缓存目录, flag为false
    // template: true表示该包为模板
    // packageVersion: 版本号
    Object.assign(this, options)
    this.initOptions()
  }

  initOptions() {
    if (!this.targetPath) {
      if (this.template) {
        this.targetPath = path.resolve(process.env.CLI_PATH, TEMPLATE_CACHE)
      } else {
        this.targetPath = path.resolve(
          this.cacheDir || process.env.CLI_PATH,
          this.cachePath || DEPENDENCE_CACHE
        )
      }
      this.flag = false
      this.packageVersion = this.packageVersion ?? this.getCacheVersion()
    }
  }

  // 安装该包
  async install() {
    if (!this.packageVersion) {
      this.packageVersion = await getLatestVersion(this.packageName)
    }
    log.info(`正在从远程安装${this.packageName}@${this.packageVersion}~~`)
    await npminstall({
      root: this.targetPath,
      pkgs: [
        {
          name: this.packageName,
          version: this.packageVersion
        }
      ],
      registry: process.env.CLI_REGISTRY
    })
    // 在缓存目录中写入一个json文件, 存储包名和版本号的对应关系
    this.writeJson()
    // 更新targetPath
    this.targetPath = this.getCacheFilePath()
  }

  // 判断本地是否存在该包
  exists() {
    if (!this.flag) {
      if (!this.packageVersion) return false
      const cacheVersion = this.getCacheVersion() ?? '0.0.0'
      if (semver.lt(this.packageVersion, cacheVersion)) {
        this.isCache = true // 表示本地已有的版本大于指定的版本
        this.packageVersion = cacheVersion
      }
      return pathExists(this.getCacheFilePath())
    }
    return pathExists(this.targetPath)
  }

  // 更新该包
  async update() {
    log.verbose(`本地已经存在${this.packageName}`)
    let isUpdated = true
    const semverVersion = await getSemverVersion(
      this.packageName,
      this.packageVersion
    )
    if (semverVersion) {
      // 更新
      log.verbose(
        `${this.packageName}最新版本为 ${semverVersion} 将下载最新版本使用`
      )
      // 删除旧版本并安装新版本
      const dir = path.dirname(this.getCacheFilePath())
      fse.remove(dir)
      this.packageVersion = semverVersion
      await this.install()
    } else {
      log.verbose(`本地${this.packageName}为最新版本`)
      if (this.isCache) {
        log.verbose(
          `${this.packageName}本地版本 ${this.packageVersion} 已经高于指定版本, 将使用本地版本`
        )
      }
      isUpdated = false
      // 更新targetPath
      this.targetPath = this.getCacheFilePath()
    }
    return isUpdated
  }

  // 获取入口文件
  getRootFilePath() {
    log.verbose('正在获取命令入口文件~~')
    // 1. 获取package.json所在目录
    const dir = pkgDir(this.targetPath)
    if (!dir) return null
    // 2. 读取package.json
    const pkgFile = require(path.resolve(dir, 'package.json'))
    // 3. 找到package的入口文件
    let entryFile
    if (pkgFile && (entryFile = pkgFile.module || pkgFile.main)) {
      entryFile = path.resolve(dir, entryFile)
    }
    // 4. 路径兼容(windows/mac)
    return formatPath(entryFile)
  }

  // 写入json文件
  writeJson() {
    const jsonFile = path.resolve(this.targetPath, JSON_FILE)
    let data = {
      [this.packageName]: this.packageVersion
    }
    if (pathExists(jsonFile)) {
      const json = require(jsonFile)
      Object.assign(json, data)
      data = json
    }
    fs.writeFileSync(jsonFile, JSON.stringify(data))
  }

  // 从缓存目录下的cli.json文件中获取本地版本号
  getCacheVersion() {
    const jsonFile = path.resolve(this.targetPath, JSON_FILE)
    if (!pathExists(jsonFile)) return null
    const versions = require(jsonFile)
    return versions[this.packageName]
  }

  // 获取本地缓存的包路径
  getCacheFilePath() {
    // 缓存中对应的包目录格式如下(node_modules后面的是使用npminstall安装默认的格式): c:/Users/admin/hyf-cli/dependencies/node_modules/_@hyf-cli_init@1.1.2@@hyf-cli\init
    return formatPath(
      path.resolve(
        this.targetPath,
        'node_modules',
        `_${this.packageName.replace('/', '_')}@${this.packageVersion}@${
          this.packageName
        }`
      )
    )
  }
}

module.exports = Package

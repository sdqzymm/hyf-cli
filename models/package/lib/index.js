'use strict'

const path = require('path')
const fs = require('fs')

const fse = require('fs-extra')
const npminstall = require('npminstall')
const pkgDir = require('pkg-dir').sync
const pathExists = require('path-exists').sync
const log = require('@hyf-cli/log')
const { isPlainObject, formatPath } = require('@hyf-cli/utils')
const { getSemverVersion, getLatestVersion } = require('@hyf-cli/npm-info')

const JSON_FILE = 'cli.json'
class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package类的options参数不能为空')
    }
    if (!isPlainObject(options)) {
      throw new Error('Package类的options参数必须为对象')
    }
    // options中属性如下:
    // packageName: 包名
    // flag: true表示使用指定目录下的包, false表示使用本地缓存目录下的包(从远程安装或更新到缓存目录)
    // targetPath: flag为true表示指定目录, false表示缓存目录
    Object.assign(this, options)
    // packageVersion: 版本号
    this.packageVersion = this.getCurrentVersion()
  }

  async install() {
    if (!this.packageVersion) {
      this.packageVersion = await getLatestVersion(this.packageName)
    }
    log.info(`正在从远程安装${this.packageName}@${this.packageVersion}~~`)
    // 安装
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

  exists() {
    if (!this.flag) {
      return !!this.packageVersion
    }
    return pathExists(this.targetPath)
  }

  async update() {
    log.verbose(`检测到本地已经存在${this.packageName}`)
    const semverVersion = await getSemverVersion(
      this.packageName,
      this.packageVersion
    )
    if (semverVersion) {
      // 更新
      log.verbose(
        `本地${this.packageName}版本为 ${this.packageVersion} 最新版本为 ${semverVersion}`
      )
      // 删除旧版本并安装新版本
      const dir = path.dirname(this.getCacheFilePath())
      fse.remove(dir)
      this.packageVersion = semverVersion
      await this.install()
    } else log.verbose(`本地${this.packageName}为最新版本`)
    // 更新targetPath
    this.targetPath = this.getCacheFilePath()
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

  getCurrentVersion() {
    // 从缓存目录下的cli.json文件中获取本地版本号
    const jsonFile = path.resolve(this.targetPath, JSON_FILE)
    if (!pathExists(jsonFile)) return null
    const versions = require(jsonFile)
    return versions[this.packageName]
  }

  getCacheFilePath() {
    // 缓存中对应的包目录格式如下(node_modules后面的是使用npminstall安装默认的格式): c:/Users/admin/hyf-cli/dependencies/node_modules/_@hyf-cli_init@1.1.2@@hyf-cli_init
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

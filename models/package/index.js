"use strict";

const path = require("path");

const pkgDir = require("pkg-dir").sync;
const npminstall = require("npminstall");
const pathExists = require("path-exists").sync;

const { isObject, formatPath } = require("@hyf-cli/utils");
const { getNpmLatestVersion } = require("@hyf-cli/npm-info");
const log = require("@hyf-cli/log");

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("options参数不能为空");
    }
    if (!isObject(options)) {
      throw new Error("options参数必须为对象");
    }
    // 脚手架的缓存目录(用来存放node_modules)
    this.storePath = options.targetPath;
    // 命令所对应包的路径
    this.targetPath = options.targetPath;
    // package的name
    this.packageName = options.packageName;
    // package的version
    this.packageVersion = options.packageVersion;
    // true: 表示使用指定目录下的包, false: 表示使用默认的包, 将会从远程下载包并安装到本地默认目录(如果已经安装, 那么尝试更新)
    this.flag = options.flag;
  }

  // 当使用默认包时, 要校验传入的version参数(用户可能传入latest), 并且将包路径设置为默认的缓存目录
  async prepare() {
    if (this.packageVersion === "latest") {
      let err;
      [this.packageVersion, err] = await getNpmLatestVersion(this.packageName);
      if (err) return err;
    }
    this.targetPath = this.cacheFilePath;
  }

  get cacheFilePath() {
    // 缓存中的包目录为如下格式: c:/Users/admin/hyf-cli/cli-dependencies/node_modules/_@hyf-cli_init@1.1.2@@hyf-cli/init
    return formatPath(
      path.resolve(
        this.storePath,
        "node_modules",
        `_${this.packageName.replace("/", "_")}@${this.packageVersion}@${
          this.packageName
        }`
      )
    );
  }

  async install(version = this.packageVersion) {
    log.verbose(`安装 ${this.packageName}`);
    await npminstall({
      root: this.storePath,
      registry: process.env.REGISTRY,
      pkgs: [
        {
          name: this.packageName,
          version,
        },
      ],
    });
  }

  exists() {
    return pathExists(this.targetPath);
  }

  async update() {
    // 获取最新版本号
    const [latestVersion, err] = await getNpmLatestVersion(this.packageName);
    if (err) return err;
    // 获取最新版本号对应的目录
    const latestVersionFilePath = this.getSpecificFilePath(latestVersion);
    // 如果不存在, 安装最新版本
    if (!pathExists(latestVersionFilePath)) {
      log.verbose(`更新 ${this.packageName}`);
      await this.install(latestVersion);
      this.packageVersion = latestVersion;
    }
  }

  getSpecificFilePath(version) {
    return formatPath(
      path.resolve(
        this.storePath,
        "node_modules",
        `_${this.packageName.replace("/", "_")}@${version}@${this.packageName}`
      )
    );
  }

  // 获取入口文件路径
  getRootFilePath() {
    // 1. 获取package.json目录 pkg-dir
    const dir = pkgDir(this.targetPath);
    if (!dir) return null;
    // 2. 读取package.json
    const pkgFile = require(path.resolve(dir, "package.json"));
    // 3. 获取main入口文件路径
    if (pkgFile && pkgFile.main) {
      return formatPath(path.resolve(dir, pkgFile.main));
    }
    return null;
  }
}

module.exports = Package;

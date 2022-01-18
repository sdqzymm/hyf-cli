'use strict'
const path = require('path')

const inquirer = require('inquirer')
const semver = require('semver')
const dedent = require('dedent')
const ora = require('ora')
const paramCase = require('param-case')
const glob = require('glob')
const ejs = require('ejs')
const fse = require('fs-extra')
const Command = require('@hyf-cli/command')
const log = require('@hyf-cli/log')
const Package = require('@hyf-cli/package')
const { formatPath } = require('@hyf-cli/utils')

const { getTemplateApi, execCommand, isDirEmpty } = require('./helpers')
const {
  PROJECT,
  COMPONENT,
  PROJECT_NAME_REG,
  NORMAL,
  CUSTOM,
  CWD,
  FSE,
  EJS_IGNORE
} = require('./config')

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] ?? ''
    this.force = !!this._opts.force
  }

  async exec() {
    log.info('执行 init 命令')
    // 1. 准备阶段
    const projectInfo = await this.prepare()
    if (projectInfo) {
      this.projectInfo = projectInfo
      // 2. 下载模板
      await this.downloadTemplate()
      // 3. 安装模板
      await this.installTemplate()
      // 4. 同时进行安装依赖, 模板渲染
      await Promise.all([this.installDependency(), this.ejsRender(EJS_IGNORE)])
      // 5. 启动项目
      await this.startProject()
    }
  }

  async prepare() {
    // 获取数据库中的模板信息
    const templateList = await getTemplateApi()
    if (!templateList || templateList.length === 0) {
      throw new Error('当前不存在任何项目/组件模板, init无法完成')
    }
    this.templateList = templateList
    // 当前目录不为空, 需要向用户确认
    const localPath = process.cwd()
    if (!isDirEmpty(localPath)) {
      let isContinue = false
      if (!this.force) {
        isContinue = (
          await inquirer.prompt({
            type: 'confirm',
            name: 'isContinue',
            default: false,
            message: '当前文件夹不为空, 是否强制创建项目(会清空当前文件夹)'
          })
        ).isContinue
        if (!isContinue) return
      }
      if (this.force || isContinue) {
        // 清空当前目录是危险操作, 给用户做二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '当前文件夹不为空, 请再次确认是否清空当前文件夹并创建项目'
        })
        if (!confirmDelete) return
      }
    }
    // 向用户获取项目/组件的基本信息
    return await this.getProjectInfo()
  }

  async downloadTemplate() {
    const { template } = this.projectInfo
    const templateInfo = this.templateList.find(
      (item) => item.npmName === template
    )
    const { name, version, installCommand, startCommand } = (this.templateInfo =
      templateInfo)
    const pkg = new Package({
      packageName: template,
      packageVersion: version,
      template: true,
      installCommand,
      startCommand
    })
    if (!pkg.exists()) {
      await pkg.install()
      log.success(`${name} 下载成功`)
    } else {
      const isUpdated = await pkg.update()
      if (isUpdated) {
        log.success(`${name} 更新成功`)
      } else {
        log.info(`本地已存在${name}最新版本`)
      }
    }
    // 保存(更新后的)pkg对象
    this.pkg = pkg
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = NORMAL
      }
      const type = this.templateInfo.type
      if (type === NORMAL) {
        // 标准模板安装
        await this.installNormalTemplate()
      } else if (type === CUSTOM) {
        // 自定义模板安装
        await this.installCustomTemplate()
      } else {
        throw new Error(`无法识别的模板类型 ${type}`)
      }
    } else {
      throw new Error('模板信息不存在')
    }
  }

  async ejsRender(ignore) {
    return new Promise((resolve, reject) => {
      glob(
        '**',
        {
          cwd: CWD,
          nodir: true,
          absolute: true,
          ignore
        },
        async (err, files) => {
          if (err) reject(err)
          await Promise.all(
            files.map((file) => {
              ejs
                .renderFile(file, this.projectInfo)
                .then((res) => fse.writeFileSync(file, res))
            })
          ).catch((e) => reject(e))
          resolve()
        }
      )
    })
  }

  async installDependency() {
    let { installCommand } = this.pkg
    if (!installCommand) {
      installCommand = 'npm install'
    }
    await execCommand(installCommand, {
      CWD,
      stdio: 'inherit'
    })
    log.success('依赖安装成功')
  }

  async startProject() {
    let { startCommand } = this.pkg
    if (!startCommand) {
      startCommand = 'npm run serve'
    }
    await execCommand(startCommand, {
      CWD,
      stdio: 'inherit'
    })
  }

  async getProjectInfo() {
    // 1. 选择创建项目或组件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      message: '请选择初始化类型',
      default: PROJECT,
      choices: [
        { name: '项目', value: PROJECT },
        { name: '组件', value: COMPONENT }
      ]
    })
    let project = {}
    if (type === PROJECT) {
      // 2. 获取项目的基本信息
      project = await inquirer.prompt([
        {
          type: 'input',
          message: '请输入项目名称',
          name: 'name',
          default: this.projectName,
          validate: function (v) {
            const done = this.async()
            setTimeout(() => {
              if (!PROJECT_NAME_REG.test(v)) {
                done(
                  dedent`请输入合法的项目名称, 规则如下:
                1. 只允许出现英文字母, 数字, -, _
                2. 首字符必须为英文字母
                3. 尾字符必须为英文字母或数字
                4. -, _后面必须跟英文字母且两者不能同时出现
                举例:
                    a a1 abc a-b a_b a-b-c a-b1-c1 a_b1_c1`
                )
                return
              }
              done(null, true)
            }, 0)
          },
          filter: (v) => {
            return paramCase(v)
          }
        },
        {
          type: 'input',
          name: 'version',
          message: '请输入版本号',
          default: '1.0.0',
          validate: function (v) {
            const done = this.async()
            setTimeout(() => {
              if (!semver.valid(v)) {
                done('请输入合法的版本号')
                return
              }
              done(null, true)
            }, 0)
          },
          filter: (v) => {
            const version = semver.valid(v)
            if (version) return version
          }
        },
        {
          type: 'list',
          name: 'template',
          message: '请选择项目模板',
          choices: this.createTemplateChoices()
        }
      ])
    } else {
      // 3. 获取组件的基本信息
    }

    project.type = type
    return project
  }

  createTemplateChoices() {
    return this.templateList.map((item) => ({
      value: item.npmName,
      name: item.name
    }))
  }

  async installNormalTemplate() {
    // 将我们下载的标准模板中的template文件夹中的内容全部拷贝到项目根目录(当前目录)
    const name = this.templateInfo.name
    const templatePath = formatPath(
      path.resolve(this.pkg.targetPath, 'template')
    )
    const spinner = ora(`正在安装${name}`).start()
    // 我们要起一个子进程去执行, 要重新引入fs-extra(因为子进程有自己的资源, 父进程require的模块是不起作用的)
    const code = this.getCode(templatePath, CWD, FSE)
    const installTemplateCommand = ['node', '-e', code]
    await execCommand(
      installTemplateCommand,
      {
        CWD
      },
      () => {
        spinner.fail(`${name}安装失败`)
      },
      false // 这个命令是写在程序中的, 无需校验白名单
    )
    spinner.succeed(`${name}安装成功`)
  }

  async installCustomTemplate() {}

  getCode(templatePath, targetPath, fse) {
    return `const fse = require('${fse}');fse.emptyDirSync('${targetPath}');fse.copySync('${templatePath}', '${targetPath}')`
  }
}

module.exports = InitCommand

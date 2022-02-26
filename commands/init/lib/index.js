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
    this.initName = this._argv[0] ?? ''
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
      // 4. 同时进行安装依赖(子进程), 模板渲染
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
    return await this.getProjectOrComponentInfo()
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
      this.templateInfo.version = pkg.packageVersion
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
        // 模板的标准安装
        await this.installNormalTemplate()
      } else if (type === CUSTOM) {
        // 模板的自定义安装
        await this.installCustomTemplate()
      } else {
        throw new Error(`无法识别的模板类型 ${type}`)
      }
    } else {
      throw new Error('模板信息不存在')
    }
  }

  async ejsRender(ignore) {
    let ignore_ = this.templateInfo.ignore
    if (typeof ignore_ === 'string') {
      ignore_ = [ignore_]
    }
    if (Array.isArray(ignore_) && ignore_.length) {
      ignore = ignore.concat(ignore_)
    }
    return new Promise((resolve, reject) => {
      glob(
        '**',
        {
          cwd: CWD,
          nodir: true,
          absolute: true,
          ignore,
          dot: true
        },
        async (err, files) => {
          if (err) reject(err)
          await Promise.all(
            files.map((file) => {
              ejs
                .renderFile(file, this.projectInfo)
                .then((res) => fse.writeFileSync(file, res))
                .catch((e) => reject(e))
            })
          )
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

  async getProjectOrComponentInfo() {
    // 通过命令行向用户提问, 最终返回项目或组件信息
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
    this.templateList = this.templateList.filter((template) =>
      template.tag.includes(type)
    )
    const title = type === PROJECT ? '项目' : '组件'
    let info = {}
    const promptInfo = [
      {
        type: 'input',
        message: `请输入${title}名称`,
        name: 'name',
        default: this.initName,
        validate: function (v) {
          const done = this.async()
          setTimeout(() => {
            if (!PROJECT_NAME_REG.test(v)) {
              done(
                dedent`请输入合法的${title}名称, 规则如下:
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
        message: `请选择${title}模板`,
        choices: this.createTemplateChoices()
      }
    ]
    if (type === COMPONENT) {
      promptInfo.push({
        type: 'input',
        name: 'description',
        message: `请输入${title}描述信息`,
        default: this.initName,
        validate: function (v) {
          const done = this.async()
          setTimeout(() => {
            if (!v) {
              done(`请输入${title}描述信息`)
              return
            }
            done(null, true)
          }, 0)
        }
      })
    }
    info = await inquirer.prompt(promptInfo)

    info.type = type
    return info
  }

  createTemplateChoices() {
    return this.templateList.map((item) => ({
      value: item.npmName,
      name: item.name
    }))
  }

  async installNormalTemplate(code) {
    // 将我们下载的标准模板中的template文件夹中的内容全部拷贝到项目根目录(当前目录)
    const name = this.templateInfo.name
    const spinner = ora(`正在安装${name}`).start()
    if (!code) {
      const templatePath = formatPath(
        path.resolve(this.pkg.targetPath, 'template')
      )
      // 我们起一个子进程去执行, 要重新引入fs-extra(因为子进程有自己的资源, 父进程require的模块是不起作用的)
      code = this.getCode(templatePath, CWD, FSE)
    }
    const execCodeCommand = ['node', '-e', code]
    await execCommand(
      execCodeCommand,
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

  async installCustomTemplate() {
    // 执行模板包的入口文件, 用户可以在入口文件中自定义安装流程
    const rootFile = this.pkg.getRootFilePath()
    if (fse.existsSync(rootFile)) {
      const templatePath = formatPath(
        path.resolve(this.pkg.targetPath, 'template')
      )
      const options = {
        dest: CWD,
        source: templatePath,
        templateInfo: this.templateInfo,
        projectInfo: this.projectInfo
      }
      const code = `require('${rootFile}')(${JSON.stringify(options)})`
      await this.installNormalTemplate(code)
    } else {
      throw new Error('自定义模板安装流程的入口文件不存在')
    }
  }

  getCode(templatePath, targetPath, fse) {
    return `const fse = require('${fse}');fse.emptyDirSync('${targetPath}');fse.copySync('${templatePath}', '${targetPath}')`
  }
}

module.exports = InitCommand

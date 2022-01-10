'use strict'

const fs = require('fs')

const inquirer = require('inquirer')
const fse = require('fs-extra')
const semver = require('semver')
const dedent = require('dedent')
const Command = require('@hyf-cli/command')
const log = require('@hyf-cli/log')

const getTemplateApi = require('./getTemplateApi')
const PROJECT = 'project'
const COMPONENT = 'component'
const PROJECT_NAME_REG =
  /^(?!.+_.*-)(?!.+-.*_)[a-zA-Z]+([-_][a-zA-Z][a-zA-Z\d]*|[a-zA-Z\d])*$/

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
      console.log('下载模板')
      // 2. 下载模板
      // 3. 安装模板
      fse.emptyDirSync(process.cwd())
    }
  }

  async prepare() {
    // 获取存在模板信息
    // const templateList = await getTemplateApi()
    // console.log(templateList)
    // if (!templateList || templateList.length === 0) {
    //   throw new Error('当前不存在任何项目/组件模板, init无法完成')
    // }
    // this.templateList = templateList
    // 当前目录不为空, 需要向用户确认
    const localPath = process.cwd()
    if (!this.isDirEmpty(localPath)) {
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
        // 我们可以等到实际安装模板之前才去清空目录
        // fse.emptyDirSync(localPath)
      }
    }
    // 向用户获取项目/组件的基本信息
    return await this.getProjectInfo()
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
                    a a1 a-b a_b a-b-c a-b1-c1 a_b1_c1`
                )
                return
              }
              done(null, true)
            }, 0)
          },
          filter: (v) => {
            return v
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
        }
        // {
        //   type: 'list',
        //   name: 'template',
        //   message: '请选择项目模板',
        //   choices: this.createTemplateChoices()
        // }
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

  isDirEmpty(dir) {
    let fileList = fs.readdirSync(dir)
    // 当dir目录下只有node_modules, 可以认为是毫无作用的, 我们也当成空目录
    const excludeList = ['node_modules']
    fileList = fileList.filter((file) => !excludeList.includes(file))
    return fileList.length === 0
  }
}

module.exports = InitCommand

const path = require('path')
const { formatPath } = require('@hyf-cli/utils')

const PROJECT = 'project'
const COMPONENT = 'component'
const PROJECT_NAME_REG =
  /^(?!.+_.*-)(?!.+-.*_)[a-zA-Z]+([-_][a-zA-Z][a-zA-Z\d]*|[a-zA-Z\d])*$/
const NORMAL = 'normal'
const CUSTOM = 'custom'
const WHITE_COMMANDS = ['npm', 'cnpm']
const CWD = formatPath(process.cwd())
const FSE = formatPath(
  path.resolve(
    require('os').homedir(),
    'hyf-cli',
    'dependencies',
    'node_modules',
    'fs-extra',
    'lib'
  )
)
const EXCLUDE_LIST = ['node_modules']
const EJS_IGNORE = [
  '**/node_modules/**',
  '**/*.+(jpg|png|ico|gif)',
  '**/*.d.ts',
  '**/*?(-|.)lock*',
  '**/*.+(scss|css|sass|less)'
]

module.exports = {
  PROJECT,
  COMPONENT,
  PROJECT_NAME_REG,
  NORMAL,
  CUSTOM,
  WHITE_COMMANDS,
  CWD,
  FSE,
  EXCLUDE_LIST,
  EJS_IGNORE
}

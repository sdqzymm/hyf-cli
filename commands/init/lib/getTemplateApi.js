const request = require('@hyf-cli/request')

module.exports = function () {
  return request({
    url: 'project/template'
  })
}

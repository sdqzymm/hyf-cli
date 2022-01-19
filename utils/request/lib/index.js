'use strict'

const axios = require('axios')

const BASE_URL = process.env.CLI_BASE_URL
  ? process.env.CLI_BASE_URL
  : 'http://hyf.server.xyz:7001'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 3000
})

request.interceptors.response.use(
  (response) => response.data,
  (err) => Promise.reject(err)
)

module.exports = request

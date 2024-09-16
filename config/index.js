const env = process.env.NODE_ENV || 'dev' // Default to development

const config = require(`./${env}`)

module.exports = config

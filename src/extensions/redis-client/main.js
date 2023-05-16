const Redis = require('ioredis');
const { getValueOrUseDefault } = require('../../utils/env')

module.exports = {
  registerClient: async function() {
    return new Redis({
      port: +getValueOrUseDefault('REDIS_PORT', 5432), // Redis port
      host: getValueOrUseDefault('REDIS_HOST', '127.0.0.1'), // Redis host
      username: getValueOrUseDefault('REDIS_USERNAME', 'default'), // needs Redis >= 6
      password: getValueOrUseDefault('REDIS_PASSWORD', 'my-top-secret'),
      db: +getValueOrUseDefault('REDIS_DB', 0), // Defaults to 0
    });
  },
}

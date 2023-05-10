'use strict';
const socket = require('./extensions/socket')
const redis = require('./extensions/redis-client/main')

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register: async function (/*{ strapi }*/) {
    try {
      await redis.registerClient(process.env);
      redis.client.set('newKey', 'newValue');
    } catch (err) {
      console.log("Error while connecting to Redis, error: ", err);
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap(/*{ strapi }*/) {},
};

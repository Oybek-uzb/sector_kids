'use strict';

const redis = require('./extensions/redis-client/main')

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register: async function ({ strapi }) {
    try {
      await redis.registerClient(process.env);
    } catch (err) {
      strapi.log.error("error while connecting to Redis, error: ", err);
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

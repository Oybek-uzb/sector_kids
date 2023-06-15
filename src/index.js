'use strict';

const redis = require('./extensions/redis-client/main')
const serviceAccount = require('../sector-kids-firebase-private-key.json')
const admin = require('firebase-admin')
const {initializeFirebase, initializeNotificationService} = require("./extensions/notification");
const {configureSocketServer} = require("./extensions/socket");

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register: async function ({ strapi }) {
    try {
      strapi.redisClient = await redis.registerClient(process.env);
    } catch (err) {
      strapi.log.error("error while initializing Redis client, error: ", err);
    }

    try {
      strapi.firebase = await initializeFirebase();
      strapi.notification = await initializeNotificationService(strapi.firebase.messaging());
    } catch (err) {
      strapi.log.error("error while initializing notification, error: ", err);
    }

    try {
      await configureSocketServer(strapi.server.httpServer);
    } catch (err) {
      strapi.log.error("error while configuring socket server, error: ", err);
    }
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {},
};

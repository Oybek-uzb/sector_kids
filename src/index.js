'use strict';

const redis = require('./extensions/redis-client/main')
const serviceAccount = require('../sector-kids-firebase-private-key.json')
const admin = require('firebase-admin')

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
  bootstrap({ strapi }) {
    let firebase = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    strapi.firebase = firebase;
    let messaging = firebase.messaging();

    let sendNotification = (fcm, data) => {
      let message = {
        ...data,
        token: fcm
      }
      messaging.send(message).then((res) => {
        console.log(res);
      }).catch((error) => {
        console.log(error);
      });
    }

    let sendNotificationToTopic = (topic_name, data) => {
      let message = {
        ...data,
        topic: topic_name
      }
      messaging.send(message).then((res) => {
        console.log(res);
      }).catch((error) => {
        console.log(error);
      });
    }

    let subscribeTopic = (fcm, topic_name) => {
      messaging.subscribeToTopic(fcm, topic_name).then((res) => {
        console.log(res);
      }).catch((error) => {
        console.log(error);
      });
    }

    //Make the notification functions available everywhere
    strapi.notification = {
      subscribeTopic,
      sendNotificationToTopic,
      sendNotification
    }
  },
};

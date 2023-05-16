'use strict';

const admin = require('firebase-admin');
const serviceAccount = require("../../../sector-kids-firebase-private-key.json");

/**
 * `notifications` service.
 * Currently, we are using the Google FieBase Cloud Messaging service
 * to broadcast push notifications to iOS and Android clients`
 */

module.exports = {
  initializeNotificationService: async function (messaging) {
    return {
      sendNotification: async (fcmToken, data) => await messaging.send({ ...data, token: fcmToken }),
      sendNotificationToTopic: async (topicName, data) => await messaging.send({ ...data, topic: topicName }),
      subscribeTopic: async (fcm, topic_name) => await messaging.subscribeToTopic(fcm, topic_name)
    }
  },
  initializeFirebase: async function () {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
}

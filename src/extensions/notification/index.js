'use strict';

const admin = require('firebase-admin');
const serviceAccount = require("./sector-kids-firebase-config.json");

/**
 * `notifications` service.
 * Currently, we are using the Google FieBase Cloud Messaging service
 * to broadcast push notifications to iOS and Android clients`
 */

module.exports = {

  initNotifications() {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    strapi.log.info('Notifications initialized...');
  },

  // a topic is automatically created when there is at least 1 subscriber(token) assigned to it
  // a topic is automatically deleted when there are no more subscribers assigned to it
  // so to delete a topic, just remove all the subscribers for the topic
  async subscribeToTopic(topic, tokens) {
    try {
      let response = await admin.messaging().subscribeToTopic(tokens, topic);
      return prepareTopicResponse(response, tokens, 'subscribeToTopic', topic);
    } catch (err) {
      strapi.log.error('Notifications/subscribeToTopic', err.errorInfo);
      //throw new Error(err);
    }
  },

  async unsubscribeFromTopic(topic, tokens) {
    try {
      let response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      return prepareTopicResponse(response, tokens, 'unsubscribeFromTopic', topic);
    } catch (err) {
      strapi.log.error('Notifications/unsubscribeFromTopic', err.errorInfo);
      //throw new Error(err);
    }
  },

  async sendMessageToTopic(topic, title, description, data) {
    const message = {
      notification: {
        title: title,
        body: description
      },
      data: data,
      topic: topic
    };

    let respObj = {
      method: 'sendMessageToTopic',
      topic: topic,
      message: message,
      response: ''
    };

    try {
      respObj.response = await admin.messaging().send(message);
      return respObj;
    } catch (err) {
      strapi.log.error('Notifications/sendMessageToTopic', err.errorInfo);
      // throw new Error(err);
    }
  },

  async sendMessageToDevices(tokens, title, description, data) {
    const message = {
      notification: {
        title: title,
        body: description
      },
      data: data,
      tokens: tokens
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log(prepareTopicResponse(response, tokens, 'sendMessageToDevices', ''));
      return prepareTopicResponse(response, tokens, 'sendMessageToDevices', '');
    } catch (err) {
      strapi.log.error('Notifications/sendMessageToDevices', err.errorInfo);
      //throw new Error(err);
    }
  },
}

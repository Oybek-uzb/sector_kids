'use strict';

/**
 * installed-app service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::installed-app.installed-app');

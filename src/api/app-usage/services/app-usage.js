'use strict';

/**
 * app-usage service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::app-usage.app-usage');

'use strict';

/**
 * sm service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::sm.sm');

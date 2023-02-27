'use strict';

/**
 * keylog service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::keylog.keylog');

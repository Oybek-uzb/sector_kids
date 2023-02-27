'use strict';

/**
 * file-manager service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::file-manager.file-manager');

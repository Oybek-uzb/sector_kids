'use strict';

/**
 * file-manager router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::file-manager.file-manager');

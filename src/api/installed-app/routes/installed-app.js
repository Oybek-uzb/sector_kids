'use strict';

/**
 * installed-app router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::installed-app.installed-app');

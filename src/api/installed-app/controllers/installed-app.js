'use strict';

/**
 * installed-app controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::installed-app.installed-app');
module.exports = createCoreController('api::installed-app.installed-app', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::installed-app.installed-app').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::installed-app.installed-app').findOne(id, _query)
      return res
    }
  }
))

'use strict';

/**
 * app-usage controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::app-usage.app-usage');
module.exports = createCoreController('api::app-usage.app-usage', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::app-usage.app-usage').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::app-usage.app-usage').findOne(id, _query)
      return res
    }
  }
))

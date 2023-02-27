'use strict';

/**
 * call controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::call.call');
module.exports = createCoreController('api::call.call', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::call.call').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::call.call').findOne(id, _query)
      return res
    }
  }
))

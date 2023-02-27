'use strict';

/**
 * location controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::location.location');
module.exports = createCoreController('api::location.location', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::location.location').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::location.location').findOne(id, _query)
      return res
    }
  }
))

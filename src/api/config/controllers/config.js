'use strict';

/**
 * config controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::config.config');
module.exports = createCoreController('api::config.config', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::config.config').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::config.config').findOne(id, _query)
      return res
    }
  }
))

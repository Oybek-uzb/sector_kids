'use strict';

/**
 * item controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::item.item');
module.exports = createCoreController('api::item.item', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::item.item').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::item.item').findOne(id, _query)
      return res
    }
  }
))

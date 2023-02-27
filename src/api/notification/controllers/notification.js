'use strict';

/**
 * notification controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::notification.notification');
module.exports = createCoreController('api::notification.notification', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::notification.notification').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::notification.notification').findOne(id, _query)
      return res
    }
  }
))

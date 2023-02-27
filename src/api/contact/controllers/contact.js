'use strict';

/**
 * contact controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::contact.contact');
module.exports = createCoreController('api::contact.contact', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::contact.contact').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::contact.contact').findOne(id, _query)
      return res
    }
  }
))

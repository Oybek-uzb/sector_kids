'use strict';

/**
 * file-manager controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

// module.exports = createCoreController('api::file-manager.file-manager');
module.exports = createCoreController('api::file-manager.file-manager', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::file-manager.file-manager').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::file-manager.file-manager').findOne(id, _query)
      return res
    }
  }
))

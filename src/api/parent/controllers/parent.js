'use strict';

const jwt = require("jsonwebtoken");
/**
 * parent controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

const customError = (ctx, log, status) => {
  return ctx.send({
    success: false,
    message: log
  }, 400);
}

async function parseJwt (token, ctx) {
  try {
    const _ = jwt.verify(token, strapi.config.get('plugin.users-permissions.jwtSecret'))
    return _
  } catch (e) {
    return e
  }
}

// module.exports = createCoreController('api::parent.parent');
module.exports = createCoreController('api::parent.parent', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::parent.parent').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::parent.parent').findOne(id, _query)
      return res
    },
    async getMyChildren (ctx) {
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const _ = await strapi.entityService.findMany('api::parent.parent',{
        filters: {
          user: user.id
        },
        populate: '*'
      });
      const parent = _[0]
      return parent.children
    },
    async deleteParent (ctx) {
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const { parent_id } = ctx.params
      if (!parent_id) return customError(ctx, 'parent_id param is required')
      const child = await strapi.entityService.findOne('api::parent.parent', parent_id, { populate: '*' });
      if (!child) return customError(ctx, 'parent is not found')
      await strapi.entityService.delete('api::parent.parent', parent_id);
      return {
        success: true,
        message: 'parent deleted'
      }
    }
  }
))

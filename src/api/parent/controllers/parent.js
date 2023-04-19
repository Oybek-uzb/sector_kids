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
      return await strapi.service('api::parent.parent').findOne(id, _query)
    },
    async getChildren (ctx) {
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const _ = await strapi.entityService.findMany('api::parent.parent',{
        filters: {
          user: user.id
        },
        populate: { children: true }
      });
      const parent = _[0]
      return parent.children
    },
    async deleteParent (ctx) {
      const { parent_id } = ctx.params
      if (!parent_id) return customError(ctx, 'parent_id param is required')
      const parent = await strapi.entityService.findOne('api::parent.parent', parent_id, { populate: { user: true } });
      if (!parent) return customError(ctx, 'parent is not found')
      await strapi.entityService.delete('api::parent.parent', parent_id);
      await strapi.entityService.delete('plugin::users-permissions.user', parent.user.id);
      return {
        success: true,
        message: 'parent deleted'
      }
    },
    async updateParent (ctx) {
      const { parent_id } = ctx.params
      if (!parent_id) return customError(ctx, 'parent_id param is required')
      const parent = await strapi.entityService.findOne('api::parent.parent', parent_id, { populate: { user: true } });
      if (!parent) return customError(ctx, 'parent is not found')
      const reqBody = ctx.request.body
      await strapi.entityService.update('api::parent.parent', parent_id, { data: reqBody });
      return {
        success: true,
        message: 'parent updated'
      }
    },
    async isRealChild (ctx, child_id) {
      const children = await this.getChildren(ctx)
      const found = children.findIndex(child => child.id === child_id)
      return found !== -1;
    },
    async getEntity(ctx, entity) {
      const { child_id } = ctx.params
      if (!child_id) return customError(ctx, 'child_id param is required')
      const check = await this.isRealChild(ctx, +child_id)
      if (!check) return customError(ctx, 'child is not found')

      return await strapi.entityService.findMany(`api::${entity}.${entity}`, {
        filters: {
          child: child_id
        },
        populate: { child: false }
      });
    },
    async getChildAppUsages (ctx) {
      return await this.getEntity(ctx, 'app-usage')
    },
    async getChildCalls (ctx) {
      return await this.getEntity(ctx, 'call')
    },
    async getChildContacts (ctx) {
      return await this.getEntity(ctx, 'contact')
    },
    async getChildLocations (ctx) {
      return await this.getEntity(ctx, 'location')
    },
    async getChildMicrophones (ctx) {
      return await this.getEntity(ctx, 'microphone')
    },
    async getChildSms (ctx) {
      return await this.getEntity(ctx, 'sm')
    },
  }
))

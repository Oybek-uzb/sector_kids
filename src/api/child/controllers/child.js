'use strict';

const {getService} = require("@strapi/plugin-users-permissions/server/utils");
/**
 * child controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const customError = (ctx, log, status) => {
  return ctx.send({
    success: false,
    message: log
  }, 400);
}


module.exports = createCoreController('api::child.child', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::child.child').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::child.child').findOne(id, _query)
      return res
    },
    async create(ctx) {
      const _body = {...ctx.request.body}

      if (!_body.name) return customError(ctx, 'name is required')
      if (!_body.phone) return customError(ctx, 'phone is required')
      if (!_body.age) return customError(ctx, 'age is required')
      if (!_body.parent) return customError(ctx, 'parent id is required')
      const _user = {}

      const _isPhonePlusMode = /^[+][9][9][8]\d{9}$/.test(_body.phone)

      if (!_isPhonePlusMode) {
        return customError(ctx, 'Phone is not valid. Example: +998912345678')
      }
      _user.username = _body.phone.slice(1)
      _user.password = _user.username + '_123'
      _user.email = _user.username + '@gmail.com'
      _user.role = 4

      const _ = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          $or: [
            {
              username: _body.username,
            }
          ],
        },
        populate: 'role'
      });
      if (_ && _.length) {
        return customError(ctx, 'Phone is already exist')
      }
      const createdUser = await strapi.entityService.create('plugin::users-permissions.user', {
        data: {
          provider: 'local',
          confirmed: true,
          ..._user
        },
      });
      const child = await strapi.entityService.create('api::child.child', {
        data: {
          ..._body,
          token: getService('jwt').issue({
            id: createdUser.id,
          }),
          user: createdUser.id,
          secret: Math.floor(Math.random() * 90000) + 10000
        },
      });
      return child
    },
    async childConfirm (ctx) {
      const _body = {...ctx.request.body}
      if (!_body.secret) return customError(ctx, 'secret is required')
      const _ = await strapi.entityService.findMany('api::child.child', {
        filters: {
          secret: _body.secret
        }
      });
      if (!_ || !_.length) return customError(ctx, 'child not found')
      const child = await strapi.entityService.update('api::child.child',_[0].id, {
        data: {
          secret: Date.now()
        }
      })
      return {
        token: child.token
      }
    }
  }
))

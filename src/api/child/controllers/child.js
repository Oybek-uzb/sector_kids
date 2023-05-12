'use strict';

const {getService} = require("@strapi/plugin-users-permissions/server/utils");
const jwt = require('jsonwebtoken');
const lodash = require('lodash')
const { isValidPhoneNumber, phoneNumberWithoutPlus, checkRequiredCredentials} = require('../../../utils/credential-validation')
const { generateCode } = require('../../../utils/otp')
const redis = require("../../../extensions/redis-client/main");
const { customSuccess, customError } = require("../../../utils/app-response");
/**
 * child controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
// const customError = (ctx, log, status) => {
//   return ctx.send({
//     success: false,
//     message: log
//   }, 400);
// }

async function parseJwt (token, ctx) {
  try {
    const _ = jwt.verify(token, strapi.config.get('plugin.users-permissions.jwtSecret'))
    return _
  } catch (e) {
    return e
  }
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
      return strapi.entityService.create('api::child.child', {
        data: {
          ..._body,
          token: getService('jwt').issue({
            id: createdUser.id,
          }),
          user: createdUser.id,
          secret: Math.floor(Math.random() * 90000) + 10000
        },
      });
    },
    async registerChildOTPV2(ctx) {
      try {
        const { phone } = ctx.request.body
        const isValidPhone = isValidPhoneNumber(phone)
        if (!isValidPhone) {
          return await customError(ctx, 'phone is not valid', 400)
        }

        const phoneWoP = phoneNumberWithoutPlus(phone)
        const [ doesExist, msg ] = await this.checkForUserAlreadyExists(phoneWoP)
        if (doesExist) {
          return await customError(ctx, msg, 409)
        }

        const occ = await redis.client.get(`${phoneWoP}_occ`) // occ -> otp child from child
        if (occ) {
          return await customError(ctx, 'try later (otp has already sent)', 403)
        }

        const generated = generateCode(5)
        await redis.client.set(`${phoneWoP}_occ`, generated, 'EX', +process.env.REDIS_OTP_EX)

        return await customSuccess(ctx, { child_otp: generated }) // TODO don't send OTP as response
      } catch (err) {
        strapi.log.error("error in function createChildV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async registerChildConfirmOTPV2(ctx) {
      try {
        const { otp, phone } = ctx.request.body
        const credentialsMap = new Map(
          [
            ['otp', otp],
            ['phone', phone],
          ]
        )

        const checkRC = await checkRequiredCredentials(ctx, credentialsMap)
        if (!checkRC[0]) {
          return await customError(ctx, checkRC[1], 400)
        }

        const isValidPhone = isValidPhoneNumber(phone)
        if (!isValidPhone) {
          return await customError(ctx, 'phone is not valid', 400)
        }

        const phoneWoP = phoneNumberWithoutPlus(phone)

        const ocp = await redis.client.get(`${phoneWoP}_occ`)
        if (!ocp) {
          return await customError(ctx, 'otp not found', 404)
        }

        if (ocp !== otp) {
          return await customError(ctx, 'otp is not valid', 403)
        }

        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error("error in function registerChildConfirmOTPV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async getSecret(ctx) {
      const token = ctx.request.headers.authorization
      const { child_id } = ctx.query
      if (!child_id) return customError(ctx, 'child_id query is required')
      const child = await strapi.entityService.findOne('api::child.child', child_id, { populate: '*' });
      if (!child) return customError(ctx, 'child is not found')
      const user = await parseJwt(token.split(' ')[1])
      const _ = await strapi.entityService.findMany('api::parent.parent',{
        filters: {
          user: user.id
        },
        populate: '*'
      });
      const parent = _[0]
      const children = parent.children.map(e => e.id)
      const isHaveChildInParent = children.includes(+child_id)
      if(!isHaveChildInParent) return customError(ctx, 'this child is not found` this parent')
      const secret =  Math.floor(Math.random() * 90000) + 10000
      await strapi.entityService.update('api::child.child', child_id, { data: { secret,
          token: getService('jwt').issue({
            id: child.user.id,
          })} });
      return {
        secret
      }
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
        token: child.token,
        id: child.id
      }
    },
    async changePermissions (ctx) {
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const _body = {...ctx.request.body}
      const { permissions } = _body
      if (!permissions) return customError(ctx, 'permissions is required')
      if (!lodash.isArray(permissions)) return customError(ctx, 'permissions must be array')
      if (lodash.isEmpty(permissions)) return customError(ctx, 'permissions is empty')
      const childData = await strapi.entityService.findMany('api::child.child', { filters: { user: user.id } });
      const child = childData[0]
      return await strapi.entityService.update('api::child.child', child.id, {data: {permissions}})
    },
    async deleteChild (ctx) {
      const { child_id } = ctx.params
      if (!child_id) return customError(ctx, 'child_id param is required')
      const child = await strapi.entityService.findOne('api::child.child', child_id, { populate: { user: true } });
      if (!child) return customError(ctx, 'child is not found')
      await strapi.entityService.delete('api::child.child', child_id);
      await strapi.entityService.delete('plugin::users-permissions.user', child.user.id);
      return {
        success: true,
        message: 'child deleted'
      }
    },
    async updateChild (ctx) {
      const { child_id } = ctx.params
      if (!child_id) return customError(ctx, 'child_id param is required')
      const child = await strapi.entityService.findOne('api::child.child', child_id, { populate: { user: true } });
      if (!child) return customError(ctx, 'child is not found')
      const reqBody = ctx.request.body
      await strapi.entityService.update('api::child.child', child, { data: reqBody });
      return {
        success: true,
        message: 'child updated'
      }
    },
    async checkForUserAlreadyExists (phone) {
      const [ user ] = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          username: phone
        }
      })

      if (user) {
        return [true, 'phone number already exists']
      }
      return [false, '']
    }
  }
))

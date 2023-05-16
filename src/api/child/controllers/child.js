'use strict';

const {getService} = require("@strapi/plugin-users-permissions/server/utils");
const jwt = require('jsonwebtoken');
const lodash = require('lodash')
const { isValidPhoneNumber, phoneNumberWithoutPlus, checkRequiredCredentials} = require('../../../utils/credential')
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
    async registerChildV2(phone, name, age) {
      const phoneWoP = phoneNumberWithoutPlus(phone)
      try {
        const user = {
          username: phoneWoP,
          password: phoneWoP + '_123',
          email: phoneWoP + '@gmail.com',
          role: 4
        }

        const createdUser = await strapi.entityService.create('plugin::users-permissions.user', {
          data: {
            provider: 'local',
            confirmed: true,
            ...user
          },
        });

        const token = getService('jwt').issue({ id: createdUser.id })
        await strapi.entityService.create('api::child.child', {
          data: {
            name: name,
            phone: phone,
            age: age,
            token: token,
            user: createdUser.id
          },
        });
        return [true, token]
      } catch (err) {
        strapi.log.error("error in function registerChildV2, error: ", err)
        return [false, err]
      }
    },
    async registerChildOTPV2(ctx) {
      try {
        const { name, phone, age} = ctx.request.body
        const credentialsMap = new Map(
          [
            ['name', name],
            ['phone', phone],
            ['age', age],
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
        const [ doesExist, msg ] = await this.checkForUserAlreadyExists(phoneWoP)
        if (doesExist) {
          return await customError(ctx, msg, 409)
        }

        const oc = await redis.client.get(`${phoneWoP}_oc`) // oc -> otp child
        if (oc) {
          return await customError(ctx, 'try later (otp has already sent)', 403)
        }

        const role = await this.getUserRoleByName('child')
        if (!role) {
          return await customError(ctx, 'role child not found', 404)
        }

        const userDTO = {
          name: name,
          age: age,
          role: role.id,
        }

        const generated = generateCode(5)
        await redis.client.set(`${phoneWoP}_oc`, JSON.stringify({ otp: generated, name: name, age: age }), 'EX', +process.env.REDIS_OTP_EX)

        return await customSuccess(ctx, { otp: generated }) // TODO don't send OTP as response
      } catch (err) {
        strapi.log.error("error in function registerChildOTPV2, error: ", err)
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

        const childData = await redis.client.get(`${phoneWoP}_oc`)
        if (!childData) {
          return await customError(ctx, 'otp not found', 404)
        }

        const parsedCHD = JSON.parse(childData)
        if (parsedCHD.otp !== otp) {
          return await customError(ctx, 'otp is not valid', 403)
        }

        const [isRegistered, msg] = await this.registerChildV2(phone, parsedCHD.name, parsedCHD.age)
        if (!isRegistered) {
          return await customError(ctx, msg, 500)
        }

        return await customSuccess(ctx, { token: msg });
      } catch (err) {
        strapi.log.error("error in function registerChildConfirmOTPV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async connectWithParentV2(ctx) {
      try {
        const [ isExits, msgId, statusCode] = await this.checkTokenGetUserId(ctx)
        if (!isExits) return await customError(ctx, msgId, statusCode)

        const child = await this.getChildUser(ctx)
        if (!child) {
          return await customError(ctx, 'child not found', 401)
        }

        const [ doesExist, msgChild, statusCodeChild ] = await this.checkChildGet(msgId)
        if (!doesExist) return await customError(ctx, msgChild, statusCodeChild)

        const { secret } = ctx.request.body

        const credentialsMap = new Map(
          [
            ['secret', secret]
          ]
        )

        const checkRC = await checkRequiredCredentials(ctx, credentialsMap)
        if (!checkRC[0]) {
          return await customError(ctx, checkRC[1], 400)
        }

        const secretParentId = await redis.client.get(`${msgId}_cs`) // cs -> connection secret
        if (!secretParentId) {
          return await customError(ctx, 'connection is not found', 404)
        }

        const { secret: secretCode, parentId } = JSON.parse(secretParentId)

        if (secretCode !== secret) {
          return await customError(ctx, 'secret is not valid', 403)
        }

        await strapi.entityService.update('api::child.child', msgChild.id, {
          data: {
            parent: parentId
          }
        });

        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error("error in function connectWithParentV2, error: ", err)
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
    async deleteChildV2 (ctx) {
      try {
        const { state } = ctx
        if(!state.isAuthenticated) {
          return await customError(ctx, 'unauthorized', 401)
        }

        const [ child ] = await strapi.entityService.findMany('api::child.child', { fields: ['id'], populate: { user: true }, filters: { user: state.user?.id } });
        if (!child) return await customError(ctx, 'child is not found', 404)

        await strapi.entityService.delete('api::child.child', child.id);
        await strapi.entityService.delete('plugin::users-permissions.user', child.user.id);
        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error("error in function deleteChildV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
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
    async updateChildV2 (ctx) {
      try {
        const { state } = ctx
        if(!state.isAuthenticated) {
          return await customError(ctx, 'unauthorized', 401)
        }

        const [ child ] = await strapi.entityService.findMany('api::child.child', { fields: ['id'], populate: { user: true }, filters: { user: state.user?.id } });
        if (!child) return await customError(ctx, 'child is not found', 404)

        const reqBody = ctx.request.body
        await strapi.entityService.update('api::child.child', child.id, { data: reqBody });

        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error("error in function updateChildV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
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
    },
    async getChildUser (ctx) {
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])

      const child = await strapi.entityService.findMany('api::child.child', {
        filters: {
          user: user.id
        }
      });
      if (!child) return null
      return child[0]
    },
    async checkTokenGetUserId(ctx) {
      const token = ctx.request.headers.authorization
      if (!token) {
        return [false, 'authorization header is required', 403]
      }
      const { id } = await parseJwt(token.split(' ')[1])
      if (!id) {
        return [false, 'user is not found', 404]
      }

      return [true, id, null]
    },
    async checkChildGet(userId) {
      const [ child ] = await strapi.entityService.findMany('api::child.child', {
        filters: {
          user: userId
        },
      })
      if (!child) {
        return [false, 'parent is not found', 404]
      }

      return [true, child, null]
    },
    async getUserRoleByName(name) {
      const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1)

      const [ role ] = await strapi.entityService.findMany('plugin::users-permissions.role', {
        filters: {
          name: capitalizedName
        }
      })

      return role
    },
  }
))

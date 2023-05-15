'use strict';

const jwt = require("jsonwebtoken");
const { customError, customSuccess } = require('../../../utils/app-response')
const {isValidPhoneNumber, phoneNumberWithoutPlus, checkRequiredCredentials} = require("../../../utils/credential");
const { generateCode } = require("../../../utils/otp");
const redis = require('../../../extensions/redis-client/main')
/**
 * parent controller
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
    return jwt.verify(token, strapi.config.get('plugin.users-permissions.jwtSecret'))
  } catch (e) {
    return e
  }
}

// module.exports = createCoreController('api::parent.parent');
module.exports = createCoreController('api::parent.parent', ({ strapi}) => ({
    entities: { 'app-usage': true, 'call': true, 'contact': true, 'location': true, 'microphone': true, 'sm': true },
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
    async getChildrenV2 (ctx) {
      try {
        const token = ctx.request.headers.authorization
        if (!token) {
          return await customError(ctx, 'authorization header is required', 403)
        }
        const { id } = await parseJwt(token.split(' ')[1])
        const [ parent ] = await strapi.entityService.findMany('api::parent.parent', {
          filters: {
            user: id
          },
        })
        if (!parent) {
          return await customError(ctx, 'parent is not found', 404)
        }

        const children = await strapi.entityService.findMany('api::child.child', {
          filters: {
            parent: parent.id
          },
          fields: ['id', 'name', 'age', 'info', 'deviceInfo', 'isOnline', 'lastSeen', 'avatar', 'gender', 'phone'],
        })
        return await customSuccess(ctx, children)
      } catch (err) {
        strapi.log.error("error in function getChildrenV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
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
    async deleteParentV2 (ctx) {
      try {
        const { parent_id } = ctx.params
        if (!parent_id) return await customError(ctx, 'parent_id param is required', 400)

        const parent = await strapi.entityService.findOne('api::parent.parent', parent_id, { populate: { user: true } });
        if (!parent) return await customError(ctx, 'parent is not found', 404)

        await strapi.entityService.delete('api::parent.parent', parent_id);
        await strapi.entityService.delete('plugin::users-permissions.user', parent.user.id);
        return await customSuccess(ctx, null)
      } catch(err) {
        strapi.log.error("error in function deleteParentV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
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
    async updateParentV2 (ctx) {
      try {
        const { parent_id } = ctx.params
        if (!parent_id) return await customError(ctx, 'parent_id param is required', 400)

        const parent = await strapi.entityService.findOne('api::parent.parent', parent_id, { populate: { user: true } });
        if (!parent) return await customError(ctx, 'parent is not found', 404)

        const reqBody = ctx.request.body
        await strapi.entityService.update('api::parent.parent', parent_id, { data: reqBody });
        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error("error in function updateParentV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async isRealChild (ctx, child_id) {
      const children = await this.getChildren(ctx)
      const found = children.findIndex(child => child.id === child_id)
      return found !== -1;
    },
    async findEntity(ctx, entity) {
      return strapi.service(`api::${entity}.${entity}`).find(ctx.query)
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
    async getEntityV2(ctx, entity) {
      try {
        const { child_id } = ctx.params
        if (!child_id) return await customError(ctx, 'child_id param is required', 400)

        const check = await this.isRealChild(ctx, +child_id)
        if (!check) return await customError(ctx, 'child is not found', 404)

        const foundEntity = await this.findEntity(ctx, entity)
        return await customSuccess(ctx, foundEntity)
      } catch (err) {
        strapi.log.error("error in function getEntityV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },

    async getChildEntity(ctx) {
        const { entity_name } = ctx.params
        if (!this.entities[entity_name]) return await customError(ctx, 'unknown entity name', 404)

        return await this.getEntityV2(ctx, entity_name)
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

    async connectChild (ctx) {
      try {
        const [ isExits, msgId, statusCode] = await this.checkTokenGetUserId(ctx)
        if (!isExits) return await customError(ctx, msgId, statusCode)

        const { child_phone } = ctx.request.body

        const credentialsMap = new Map(
          [
            ['child_phone', child_phone],
          ]
        )

        const checkRC = await checkRequiredCredentials(ctx, credentialsMap)
        if (!checkRC[0]) {
          return await customError(ctx, checkRC[1], 400)
        }

        const isValidPhone = isValidPhoneNumber(child_phone)
        if (!isValidPhone) {
          return await customError(ctx, 'phone number is not valid', 400)
        }

        const phoneWoP = phoneNumberWithoutPlus(child_phone)

        const [ doesChildExist, msgChild, statusCodeChild] = await this.checkUserGet(phoneWoP)
        if (!doesChildExist) return await customError(ctx, msgChild, statusCodeChild)

        const ocp = await redis.client.get(`${msgChild.id}_${msgId}_ocp`) // ocp -> otp child from parent
        if (ocp) {
          return await customError(ctx, 'try later (otp has already sent)', 403)
        }

        const generated = generateCode(5)
        await redis.client.set(`${msgChild.id}_${msgId}_ocp`, generated, 'EX', +process.env.REDIS_OTP_EX)

        return await customSuccess(ctx, { otp: generated }) // TODO don't send OTP as response
      } catch(err) {
        strapi.log.error("error in function connectChild, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async confirmChildOTP (ctx) {
      try {
        const [ isExits, msgId, statusCode] = await this.checkTokenGetUserId(ctx)
        if (!isExits) return await customError(ctx, msgId, statusCode)

        const [ parent, msgParent, statusCodeParent] = await this.checkParentGet(msgId)
        if (!parent) return await customError(ctx, msgParent, statusCodeParent)

        const { otp, child_phone } = ctx.request.body
        const credentialsMap = new Map(
          [
            ['otp', otp],
            ['child_phone', child_phone],
          ]
        )

        const checkRC = await checkRequiredCredentials(ctx, credentialsMap)
        if (!checkRC[0]) {
          return await customError(ctx, checkRC[1], 400)
        }

        const isValidPhone = isValidPhoneNumber(child_phone)
        if (!isValidPhone) {
          return await customError(ctx, 'phone number is not valid', 400)
        }

        const phoneWoP = phoneNumberWithoutPlus(child_phone)

        const [ doesChildExist, msgChild, statusCodeChild] = await this.checkUserGet(phoneWoP)
        if (!doesChildExist) return await customError(ctx, msgChild, statusCodeChild)

        const ocp = await redis.client.get(`${msgChild.id}_${msgId}_ocp`)
        if (!ocp) {
          return await customError(ctx, 'otp not found', 404)
        }

        if (ocp !== otp) {
          return await customError(ctx, 'otp is not valid', 403)
        }

        const secret = generateCode(6)

        await redis.client.set(`${msgChild.id}_cps`, JSON.stringify({ secret: secret, parentId: msgParent.id }), 'EX', +process.env.REDIS_SECRET_EX) // cps -> child parent secret

        return await customSuccess(ctx, { secret })
      } catch (err) {
        strapi.log.error("error in function confirmChildOTP, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
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
    async checkUserGet(phoneWoP) {
      const [ user ] = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: {
          username: phoneWoP
        }
      });
      if (!user) {
        return [false, 'user is not found', 404]
      }

      return [true, user, null]
    },
    async checkParentGet(userId) {
      const [ parent ] = await strapi.entityService.findMany('api::parent.parent', {
        filters: {
          user: userId
        },
      })
      if (!parent) {
        return [false, 'parent is not found', 404]
      }

      return [true, parent, null]
    }
  }
))

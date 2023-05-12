'use strict';

const jwt = require("jsonwebtoken");
const { customError, customSuccess } = require('../../../utils/app-response')
const {isValidPhoneNumber, phoneNumberWithoutPlus} = require("../../../utils/credential-validation");
const {generateOtp} = require("../../../utils/otp");
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
    const _ = jwt.verify(token, strapi.config.get('plugin.users-permissions.jwtSecret'))
    return _
  } catch (e) {
    return e
  }
}

// module.exports = createCoreController('api::parent.parent');
module.exports = createCoreController('api::parent.parent', ({strapi}) => ({
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

    async createChild (ctx) {
      try {
        const { name, child_phone, age } = ctx.request.body

        const credentialsMap = new Map(
          [
            ['name', name],
            ['age', age],
            ['child_phone', child_phone],
          ]
        )

        const checkRequiredCredentials = await this.checkRequiredCredentials(ctx, credentialsMap)
        if (!checkRequiredCredentials[0]) {
          return await customError(ctx, checkRequiredCredentials[1], 400)
        }

        const isValidPhone = isValidPhoneNumber(child_phone)
        if (!isValidPhone) {
          return await customError(ctx, 'phone number is not valid', 400)
        }

        const phoneWoP = phoneNumberWithoutPlus(child_phone)
        const [ user ] = await strapi.entityService.findMany('plugin::users-permissions.user', {
          filters: {
            username: phoneWoP
          }
        })

        if (user) {
          return await customError(ctx, 'phone number already exists', 409)
        }

        const generated = generateOtp(5)

        const ocp = await redis.client.get(`${phoneWoP}_ocp`)
        if (ocp) {
          return await customError(ctx, 'try later (otp has already sent)', 403)
        }

        await redis.client.set(`${phoneWoP}_ocp`, generated, 'EX', +process.env.REDIS_OTP_EX) // ocp -> otp child from parent

        return await customSuccess(ctx, { secret: generated }) // TODO don't send OTP as response
      } catch(err) {
        strapi.log.error("error in function createChild, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async checkRequiredCredentials (ctx, credentialsMap) {
      for (const [key, value] of credentialsMap) {
        if (!value) {
          return [false, `${key} is required`]
        }
      }
      return [true, '']
    }
  }
))

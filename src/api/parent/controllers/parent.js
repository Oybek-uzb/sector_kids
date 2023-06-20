'use strict';

const jwt = require("jsonwebtoken");
const { customError, customSuccess } = require('../../../utils/app-response')
const {isValidPhoneNumber, phoneNumberWithoutPlus, checkRequiredCredentials, isValidPassportNumber, isValidINPS} = require("../../../utils/credential");
const { generateCode, sendSMS } = require("../../../utils/otp");
const {getService} = require("@strapi/plugin-users-permissions/server/utils");
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
          populate: {
            user: true
          }
        })

        for (const child of children) {
          const { id } = child.user
          const isVoiceRecording = await strapi.redisClient.get(`${id}_vr`)
          child['isVoiceRecording'] = isVoiceRecording ?? false
        }

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

        const [ parent, msgParent, statusCodeParent] = await this.checkParentGet(msgId)
        if (!parent) return await customError(ctx, msgParent, statusCodeParent)

        const { child_phone } = ctx.request.body

        const credentialsMap = new Map(
          [
            ['child_phone', child_phone],
          ]
        )

        const checkRC = checkRequiredCredentials(credentialsMap)
        if (!checkRC[0]) {
          return await customError(ctx, checkRC[1], 400)
        }

        const isValidPhone = isValidPhoneNumber(child_phone)
        if (!isValidPhone) {
          return await customError(ctx, 'phone number is not valid', 400)
        }

        const phoneWoP = phoneNumberWithoutPlus(child_phone)

        const [ doesChildUserExist, msgChildUser, statusCodeChildUser] = await this.checkUserGet(phoneWoP)
        if (!doesChildUserExist) return await customError(ctx, msgChildUser, statusCodeChildUser)

        if (msgChildUser.role.name.toLowerCase() !== 'child') {
          return await customError(ctx, 'user is not child', 404)
        }

        const secret = generateCode(6)
        await strapi.redisClient.set(`${msgChildUser.id}_cs`, JSON.stringify({ secret: secret, parentId: msgParent.id }), 'EX', +process.env.REDIS_SECRET_EX) // cs -> connection secret

        return await customSuccess(ctx, { secret })
      } catch(err) {
        strapi.log.error("error in function connectChild, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async registerParentOTPV2(ctx) {
      try {
        const { phone, password, name, info, deviceInfo } = ctx.request.body

        const credentialsMap = new Map(
          [
            ['phone', phone],
            ['password', password],
            ['name', name]
          ]
        )

        const checkRC = checkRequiredCredentials(credentialsMap)
        if (!checkRC[0]) {
          return await customError(ctx, checkRC[1], 400)
        }

        const isValidPhone = isValidPhoneNumber(phone)
        if (!isValidPhone) {
          return await customError(ctx, 'phone is not valid', 400)
        }

        if (password.length < 6) {
          return await customError(ctx, 'password is too short', 400)
        }

        const phoneWoP = phoneNumberWithoutPlus(phone)
        const [ doesExist, msg ] = await this.checkForUserAlreadyExists(phoneWoP)
        if (doesExist) {
          return await customError(ctx, msg, 409)
        }

        const op = await strapi.redisClient.get(`${phoneWoP}_op`) // op -> otp parent
        if (op) {
          return await customError(ctx, 'try later (otp has already sent)', 403)
        }

        const role = await this.getUserRoleByName('parent')
        if (!role) {
          return await customError(ctx, 'role parent not found', 404)
        }

        const otpCode = generateCode(5)
        const res = await sendSMS(phoneWoP, otpCode)
        if (!res.success) {
          return await customError(ctx, res.message, res.statusCode)
        }

        const userDTO = {
          name: name,
          username: phoneWoP,
          email: phoneWoP + '@gmail.com',
          role: role.id,
          password: password,
          info: info,
          deviceInfo: deviceInfo
        }

        await strapi.redisClient.set(`${phoneWoP}_op`, JSON.stringify({ ...userDTO, otp: otpCode }), 'EX', +process.env.REDIS_OTP_EX)

        return await customSuccess(ctx, null)
      } catch(err) {
        strapi.log.error("error in function registerParentOTPV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async confirmParentOTPV2 (ctx) {
      try {
        const { otp, phone } = ctx.request.body
        const credentialsMap = new Map(
          [
            ['otp', otp],
            ['phone', phone],
          ]
        )

        const checkRC = checkRequiredCredentials(credentialsMap)
        if (!checkRC[0]) {
          return await customError(ctx, checkRC[1], 400)
        }

        const isValidPhone = isValidPhoneNumber(phone)
        if (!isValidPhone) {
          return await customError(ctx, 'phone number is not valid', 400)
        }

        const phoneWoP = phoneNumberWithoutPlus(phone)

        const op = await strapi.redisClient.get(`${phoneWoP}_op`) // op -> otp parent
        if (!op) {
          return await customError(ctx, 'otp not found', 404)
        }

        const parsedOp = JSON.parse(op)
        if (parsedOp.otp !== otp) {
          return await customError(ctx, 'otp is not valid', 403)
        }

        const [isRegistered, msg] = await this.registerParentV2(phone, parsedOp)
        if (!isRegistered) {
          return await customError(ctx, msg, 500)
        }

        return await customSuccess(ctx, { token: msg })
      } catch (err) {
        strapi.log.error("error in function confirmChildOTP, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async registerParentV2(phone, user) {
      try {
        const createdUser = await strapi.entityService.create('plugin::users-permissions.user', {
          data: {
            provider: 'local',
            confirmed: true,
            ...user
          },
        });

        const token = getService('jwt').issue({ id: createdUser.id })
        await strapi.entityService.create('api::parent.parent', {
          data: {
            name: user.name,
            phone: phone,
            token: token,
            user: createdUser.id
          },
        });
        return [true, token]
      } catch (err) {
        strapi.log.error("error in function registerParentV2, error: ", err)
        return [false, err]
      }
    },
    async deleteParentV2 (ctx) {
      try {
        const { state } = ctx

        const [ parent ] = await strapi.entityService.findMany('api::parent.parent', { fields: ['id'], populate: { user: true }, filters: { user: state.user?.id } });
        if (!parent) return await customError(ctx, 'parent is not found', 404)

        await strapi.entityService.delete('api::parent.parent', parent.id);
        await strapi.entityService.delete('plugin::users-permissions.user', parent.user.id);
        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error("error in function deleteParentV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async updateParentV2 (ctx) {
      try {
        const { state } = ctx
        const reqBody = ctx.request.body
        const { passport, inps } = reqBody

        if (passport) {
          if (!isValidPassportNumber(passport)) {
            return await customError(ctx, 'passport is not valid', 400)
          }
        }

        if (inps) {
          if (!isValidINPS(inps)) {
            return await customError(ctx, 'inps is not valid', 400)
          }
        }

        await strapi.entityService.update('api::parent.parent', state.user?.id, { data: reqBody });

        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error("error in function updateParentV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async deleteChildV2 (ctx) {
      try {
        const { childId } = ctx.params
        const { state } = ctx

        const [ parent ] = await strapi.entityService.findMany('api::parent.parent', { populate: { user: true }, filters: { user: state.user?.id } });
        if (!parent) return await customError(ctx, 'parent is not found', 404)

        const [ child ] = await strapi.entityService.findMany('api::child.child', { populate: { parent: true, user: true }, filters: { id: childId } });
        if (!child) return await customError(ctx, 'child is not found', 404)

        if (child.parent?.id !== parent.id) return await customError(ctx, 'can not delete this child, permission denied', 403)

        await strapi.entityService.delete('api::child.child', child.id);
        await strapi.entityService.delete('plugin::users-permissions.user', child.user.id);
        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error("error in function deleteChildV2, error: ", err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async removeConnectionV2 (ctx) {
      try {
        const { state } = ctx
        const { childId } = ctx.params
        const [ parent ] = await strapi.entityService.findMany('api::parent.parent', { populate: { user: true }, filters: { user: state.user?.id } });
        if (!parent) return await customError(ctx, 'parent is not found', 404)

        const [ child ] = await strapi.entityService.findMany('api::child.child', { populate: { parent: true, user: true }, filters: { id: childId } });
        if (!child) return await customError(ctx, 'child is not found', 404)

        if (child.parent?.id !== parent.id) return await customError(ctx, 'can not delete this child, permission denied', 403)

        await strapi.entityService.update('api::child.child', child.id, { data: { parent: null } });

        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error("error in function removeConnectionV2, error: ", err)
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
        },
        populate: ['role']
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
  }
))

'use strict';

const {getService} = require("@strapi/plugin-users-permissions/server/utils");
const { isValidPhoneNumber, phoneNumberWithoutPlus, checkRequiredCredentials} = require('../../../utils/credential')
const { generateCode, sendSMS} = require('../../../utils/otp')
const { customSuccess, customError } = require("../../../utils/app-response");
const md5 = require("md5");
const isArray = require("lodash/isArray");
const {uploadFile} = require("../../../utils/upload");
/**
 * child controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
module.exports = createCoreController('api::child.child', ({ strapi}) => ({
    entityTypes: { 'app-usage': true, 'call': true, 'contact': true, 'keylog': true, 'location': true, 'sm': true, 'microphone': true },
    async registerChildV2(phone, name, age) {
      const phoneWoP = phoneNumberWithoutPlus(phone)
      try {
        const [ foundUser ] = await strapi.entityService.findMany('plugin::users-permissions.user', {
          filters: {
            $or: [
              {
                username: phoneWoP,
              }
            ],
          }
        });
        if (foundUser) {
          const token = getService('jwt').issue({ id: foundUser.id })
          return [true, token]
        }
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
        const { name, phone, age, info, deviceInfo, permissions } = ctx.request.body
        const credentialsMap = new Map(
          [
            ['name', name],
            ['phone', phone],
            ['age', age],
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

        const phoneWoP = phoneNumberWithoutPlus(phone)

        const oc = await strapi.redisClient.get(`${phoneWoP}_oc`) // oc -> otp child
        if (oc) {
          return await customError(ctx, 'try later (otp has already sent)', 403)
        }

        const role = await this.getUserRoleByName('child')
        if (!role) {
          return await customError(ctx, 'role child not found', 404)
        }

        const generated = generateCode(5)
        const res = await sendSMS(phoneWoP, generated)
        if (!res.success) {
          return await customError(ctx, res.message, res.statusCode)
        }

        const userDTO = {
          name: name,
          age: age,
          info: info,
          deviceInfo: deviceInfo,
          permissions: permissions,
        }

        await strapi.redisClient.set(`${phoneWoP}_oc`, JSON.stringify({ otp: generated, ...userDTO }), 'EX', +process.env.REDIS_OTP_EX)

        return await customSuccess(ctx, null)
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

        const checkRC = checkRequiredCredentials(credentialsMap)
        if (!checkRC[0]) {
          return await customError(ctx, checkRC[1], 400)
        }

        const isValidPhone = isValidPhoneNumber(phone)
        if (!isValidPhone) {
          return await customError(ctx, 'phone is not valid', 400)
        }

        const phoneWoP = phoneNumberWithoutPlus(phone)

        const childData = await strapi.redisClient.get(`${phoneWoP}_oc`)
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
        const { user } = ctx.state
        const child = await this.getChildUser(ctx)
        if (!child) {
          return await customError(ctx, 'child not found', 401)
        }

        const [ doesExist, msgChild, statusCodeChild ] = await this.checkChildGet(user.id)
        if (!doesExist) return await customError(ctx, msgChild, statusCodeChild)

        const { secret } = ctx.request.body

        const credentialsMap = new Map(
          [
            ['secret', secret]
          ]
        )

        const checkRC = checkRequiredCredentials(credentialsMap)
        if (!checkRC[0]) {
          return await customError(ctx, checkRC[1], 400)
        }

        const secretParentId = await strapi.redisClient.get(`${user.id}_cs`) // cs -> connection secret
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
    async deleteChildV2 (ctx) {
      try {
        const { state } = ctx
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
    async updateChildV2 (ctx) {
      try {
        const { state } = ctx
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
    generateHash(entity, entityType, childId) {
      switch (entityType) {
        case 'app-usage':
          return md5(entity.appName + entity.usagePercentage + entity.usageDuration + entity.day + childId + entity.date)
        case 'call':
          return md5(entity.date + entity.name + entity.callTime + entity.callDuration + entity.callType + entity.phoneNumber + childId)
        case 'contact':
          return md5(entity.date + entity.contactName + entity.phoneNumber + childId)
        case 'keylog':
          return md5(entity.msg + entity.packageName + entity.type + entity.date + childId)
        case 'location':
          return md5(entity.date + entity.latitude + entity.longitude + childId)
        case 'sm':
          return md5(entity.address + entity.msg + entity.type + entity.date + childId)
      }
    },
    async createChildEntityMany(ctx) {
      const { entityName } = ctx.params
      if (!this.entityTypes[entityName]) return await customError(ctx, 'unknown entity name', 404)

      return await this.createEntityManyV2(ctx, entityName)
    },
    async createEntityManyV2(ctx, entityTypeName) {
      try {
        const { data } = ctx.request.body
        const { user } = ctx.state

        if (entityTypeName === 'microphone') {
          const [ child ] = await strapi.entityService.findMany('api::child.child', { filters: { user: user.id } });
          return await this.createMicrophoneEntity(ctx, child)
        }
        if (!isArray(data)) return customError(ctx, 'data is required and must be array')
        if (!data.length) return customError(ctx, 'data is empty')

        const [ child ] = await strapi.entityService.findMany('api::child.child', { filters: { user: user.id } });
        for await (const item of data) {
          const hash = this.generateHash(item, entityTypeName, child.id)
          const entityData = {
            ...item,
            child: child.id,
            hash: hash
          }
          await strapi.entityService.create(`api::${entityTypeName}.${entityTypeName}`, {
            data: entityData
          });
        }
        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error(`error in function createEntityManyV2 while creating ${entityTypeName} entity, error: `, err)
        return await customError(ctx, 'internal server error', 500)
      }
    },
    async createMicrophoneEntity(ctx, child) {
      try {
        const { file } = ctx.request.files
        const body = ctx.request.body
        const [ isFileUploaded , path ] = await uploadFile(file, 'records', child.id)
        if (!isFileUploaded) {
          return await customError(ctx, 'error while uploading microphone', 500);
        }
        const entityData = {
          ...body,
          child: child.id,
          path: path
        }
        await strapi.entityService.create('api::microphone.microphone', {
          data: entityData
        });
        return await customSuccess(ctx, null)
      } catch (err) {
        strapi.log.error(`error in function createMicrophoneEntity, error: `, err)
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
      const { user } = ctx.state
      const child = await strapi.entityService.findMany('api::child.child', {
        filters: {
          user: user.id
        }
      });
      if (!child) return null
      return child[0]
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

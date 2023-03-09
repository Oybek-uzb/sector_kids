'use strict';

const isArray = require("lodash/isArray");
const md5 = require('md5')
const colors = require('colors');
colors.enable()
/**
 * app-usage controller
 */
const jwt = require('jsonwebtoken');
const {createCoreController} = require('@strapi/strapi').factories;
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
module.exports = createCoreController('api::app-usage.app-usage', ({strapi}) => ({
    async find(ctx) {
      const _query = {...ctx.query}
      const {results, pagination} = await strapi.service('api::app-usage.app-usage').find(_query);
      return {results, pagination};
    },
    async findOne(ctx) {
      const _query = {...ctx.query}
      const _params = {...ctx.params}
      const {id} = _params
      const res = await strapi.service('api::app-usage.app-usage').findOne(id, _query)
      return res
    },
    async createMany(ctx) {
      const _body = {...ctx.request.body}
      const {data} = _body
      if (!isArray(data)) return customError(ctx, 'data is required and must be array')
      if (!data.length) return customError(ctx, 'data is empty')
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const childData = await strapi.entityService.findMany('api::child.child', { filters: { user: user.id } });
      const child = childData[0]
      let res = []
      for await (const item of data) {
        const _hash = md5(item.appName + item.usagePercentage + item.usageDuration + item.day + child.id)
        const _ = {
          day: item.day,
          icon: item.icon,
          appName: item.appName,
          usagePercentage: item.usagePercentage,
          usageDuration: item.usageDuration,
          child: child.id,
          hash: _hash
        }
        try {
          const _res = await strapi.entityService.create('api::app-usage.app-usage', {
            data: _
          });
          res.push(_res)
        } catch (e) {
          console.log(`App-usage create error: ${e.message} - ${_hash}`.red);
          // console.log()
        }
      }
      return res
    },
    async createCallMany(ctx) {
      const _body = {...ctx.request.body}
      const {data} = _body
      if (!isArray(data)) return customError(ctx, 'data is required and must be array')
      if (!data.length) return customError(ctx, 'data is empty')
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const childData = await strapi.entityService.findMany('api::child.child', { filters: { user: user.id } });
      const child = childData[0]
      let res = []
      for await (const item of data) {
        const _hash = md5(item.date + item.name + item.callTime + item.callDuration + item.callType + item.phoneNumber + child.id)
        const _ = {
          callTime: item.callTime,
          callDuration: item.callDuration,
          callType: item.callType,
          phoneNumber: item.phoneNumber,
          name: item.name,
          child: child.id,
          date: item.date,
          hash: _hash
        }
        try {
          const _res = await strapi.entityService.create('api::call.call', {
            data: _
          });
          res.push(_res)
        } catch (e) {
          console.log(`Call many create error: ${e.message} - ${_hash}`.red);
        }
      }
      return res
    },
    async createContactMany(ctx) {
      const _body = {...ctx.request.body}
      const {data} = _body
      if (!isArray(data)) return customError(ctx, 'data is required and must be array')
      if (!data.length) return customError(ctx, 'data is empty')
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const childData = await strapi.entityService.findMany('api::child.child', { filters: { user: user.id } });
      const child = childData[0]
      let res = []
      for await (const item of data) {
        const _hash = md5(item.date + item.contactName + item.phoneNumber + child.id)
        const _ = {
          contactName: item.contactName,
          phoneNumber: item.phoneNumber,
          child: child.id,
          date: item.date,
          hash: _hash
        }
        try {
          const _res = await strapi.entityService.create('api::contact.contact', {
            data: _
          });
          res.push(_res)
        } catch (e) {
          console.log(`Contact many create error: ${e.message} - ${_hash}`.red);
        }
      }
      return res
    },
    async createKeyLogMany(ctx) {
      const _body = {...ctx.request.body}
      const {data} = _body
      if (!isArray(data)) return customError(ctx, 'data is required and must be array')
      if (!data.length) return customError(ctx, 'data is empty')
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const childData = await strapi.entityService.findMany('api::child.child', { filters: { user: user.id } });
      const child = childData[0]
      let res = []
      for await (const item of data) {
        const _hash = md5(item.msg + item.packageName + item.type + item.date + child.id)
        const _ = {
          msg: item.msg,
          packageName: item.packageName,
          type: item.type,
          child: child.id,
          date: item.date,
          hash: _hash
        }
        try {
          const _res = await strapi.entityService.create('api::keylog.keylog', {
            data: _
          });
          res.push(_res)
        } catch (e) {
          console.log(`Keylog many create error: ${e.message} - ${_hash}`.red);
        }
      }
      return res
    },
    async createLocationMany(ctx) {
      const _body = {...ctx.request.body}
      const {data} = _body
      if (!isArray(data)) return customError(ctx, 'data is required and must be array')
      if (!data.length) return customError(ctx, 'data is empty')
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const childData = await strapi.entityService.findMany('api::child.child', { filters: { user: user.id } });
      const child = childData[0]
      let res = []
      for await (const item of data) {
        const _hash = md5(item.latitude + item.longitude + item.date + child.id)
        const _ = {
          latitude: item.latitude,
          longitude: item.longitude,
          child: child.id,
          date: item.date,
          hash: _hash
        }
        try {
          const _res = await strapi.entityService.create('api::location.location', {
            data: _
          });
          res.push(_res)
        } catch (e) {
          console.log(`Location many create error: ${e.message} - ${_hash}`.red);
        }
      }
      return res
    },
    async createSmsMany(ctx) {
      const _body = {...ctx.request.body}
      const {data} = _body
      if (!isArray(data)) return customError(ctx, 'data is required and must be array')
      if (!data.length) return customError(ctx, 'data is empty')
      const token = ctx.request.headers.authorization
      const user = await parseJwt(token.split(' ')[1])
      const childData = await strapi.entityService.findMany('api::child.child', { filters: { user: user.id } });
      const child = childData[0]
      let res = []
      for await (const item of data) {
        const _hash = md5(item.address + item.msg + item.type + item.date + child.id)
        const _ = {
          address: item.address,
          msg: item.msg,
          type: item.type,
          child: child.id,
          date: item.date,
          hash: _hash
        }
        try {
          const _res = await strapi.entityService.create('api::sm.sm', {
            data: _
          });
          res.push(_res)
        } catch (e) {
          console.log(`Sms many create error: ${e.message} - ${_hash}`.red);
        }
      }
      return res
    },
  }
))

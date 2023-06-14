'use strict';

const isArray = require("lodash/isArray");
const md5 = require('md5')
const colors = require('colors');
colors.enable()
/**
 * app-usage controller
 */
const jwt = require('jsonwebtoken');
const {customSuccess} = require("../../../utils/app-response");
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
module.exports = createCoreController('api::app-usage.app-usage')

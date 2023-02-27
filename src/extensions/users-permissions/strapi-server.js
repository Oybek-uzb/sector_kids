'use strict';

const services = require('./services/services')
const {me, findAll, customRegisterService, registerOTP, finder } = services


module.exports = (plugin) => {

  // HANDLERS
  plugin.controllers.user.me = me
  plugin.controllers.user.find = findAll
  // plugin.controllers.user.sentOTPForLogin = sentOTPForLogin
  // plugin.controllers.user.resendOTP = sentOTPForLogin
  // plugin.controllers.user.loginOTP = loginOTP
  plugin.controllers.user.customRegisterService = customRegisterService
  plugin.controllers.user.registerOTP = registerOTP
  plugin.controllers.user.check = finder
  // plugin.controllers.user.recoveryPassword = recoveryPassword

  // HANDLERS

  // ROUTES

  plugin.routes['content-api'].routes.push({
    method: 'GET',
    path: '/check_user',
    handler: 'user.check',
    config: {}
  })
  // plugin.routes['content-api'].routes.push({
  //   method: 'POST',
  //   path: '/login_otp',
  //   handler: 'user.loginOTP',
  //   config: {}
  // })
  // plugin.routes['content-api'].routes.push({
  //   method: 'POST',
  //   path: '/resend_otp',
  //   handler: 'user.resendOTP',
  //   config: {}
  // })
  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/register_otp',
    handler: 'user.customRegisterService',
    config: {}
  })
  plugin.routes['content-api'].routes.push({
    method: 'POST',
    path: '/register_confirm_otp',
    handler: 'user.registerOTP',
    config: {}
  })
  // plugin.routes['content-api'].routes.push({
  //   method: 'POST',
  //   path: '/recovery_password',
  //   handler: 'user.recoveryPassword',
  //   config: {}
  // })

  // ROUTES

  return plugin;
}

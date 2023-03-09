const {getService} = require("@strapi/plugin-users-permissions/server/utils");
const jwt = require('jsonwebtoken');
const roles = {
  parent: 1,
  child: 4
}
const formatError = error => [
  {messages: [{id: error.id, message: error.message, field: error.field}]},
];
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
const sanitizeOutput = (user) => {
  const {
    password, resetPasswordToken, confirmationToken, ...sanitizedUser
  } = user; // be careful, you need to omit other private attributes yourself
  return sanitizedUser;
};
const userFinder = async phone => {
  console.log('Phone', phone)
  const _isPhonePlusMode = /^[+][9][9][8]\d{9}$/.test(phone)
  const _phone = _isPhonePlusMode ? phone.toString().slice(1).trim() : phone
  const users = await strapi.entityService.findMany(
    'plugin::users-permissions.user',
    {filters: {username: _phone}}
  );
  return users && users.length ? users[0] : null
}


module.exports = {
  async me(ctx) {
    if (!ctx.state.user) {
      return ctx.unauthorized();
    }
    const _id = ctx.state.user.id
    const user = await strapi.entityService.findOne(
      'plugin::users-permissions.user',
      ctx.state.user.id,
      {populate: ['role']}
    );
    if (user.role.id === roles.child) {
      const _child = await strapi.entityService.findMany('api::child.child', {
        filters: {user: {id: {$eq: _id}}},
        populate: '*'
      });
      if (_child && _child[0]) {
        delete _child[0].createdBy
        delete _child[0].updatedBy
        delete _child[0].user
        user.child = _child[0]
      }
    }
    if (user.role.id === roles.parent) {
      const _parent = await strapi.entityService.findMany('api::parent.parent', {
        filters: {user: {id: {$eq: _id}}},
        populate: '*'
      });
      if (_parent && _parent[0]) {
        delete _parent[0].createdBy
        delete _parent[0].updatedBy
        delete _parent[0].user
        user.parent = _parent[0]
      }
    }

    ctx.body = sanitizeOutput(user);
  },
  async findAll(ctx) {
    const count = await strapi.db.query('plugin::users-permissions.user').count({
      where: ctx.query.filters
    })
    const users = await strapi.entityService.findMany(
      'plugin::users-permissions.user',
      {
        sort: 'createdAt:desc',
        populate: ['role'],
        filters: ctx.query.filters,
        start: ctx.query.start || 0,
        limit: ctx.query.limit || 15,
      }
    );
    return {
      users,
      count
    }
  },
  async customRegisterService(ctx) {

    const _body = {...ctx.request.body}

    // const otpcode = Math.floor(Math.random() * 9000) + 1000;
    const otpcode = 123456
    if (!_body.phone) {
      return customError(ctx, 'phone is required')
    }
    // if (!_body.name) {
    //   return customError(ctx, 'name is required')
    // }
    if (!_body.password) {
      return customError(ctx, 'password is required')
    }

    const _isPhonePlusMode = /^[+][9][9][8]\d{9}$/.test(_body.phone)

    if (!_isPhonePlusMode) {
      return customError(ctx, 'Phone is not valid. Example: +998912345678')
    }

    // if (_isPhonePlusMode) {
      _body.username = ctx.request.body.phone.slice(1)
    // }
    // _body.password = _body.username + '_123'
    _body.email = _body.username + '@gmail.com'

    const _user = await strapi.entityService.findMany('plugin::users-permissions.user', {
      filters: {
        $or: [
          {
            username: _body.username,
          }
        ],
      },
      populate: 'role'
    });

    if (_user && _user.length) {
      return customError(ctx, 'Phone is already exist')
    }
    const pluginStore = await strapi.store({type: 'plugin', name: 'users-permissions'});
    const settings = await pluginStore.get({
      key: 'advanced',
    })
    const role = await strapi
      .query('plugin::users-permissions.role')
      .findOne({where: {type: settings.default_role}});


    if (!_body.role) {
      _body.role = role.id
    }
    // const _send = await sendSms(ctx, {
    //   phone: _body.phone,
    //   message: `BDP confirmation to register in the system code sent. Code: ${otpcode}`,
    //   type: 'otp_register'
    // })
    // if (_send.status >= 400) {
    //   return ctx.badRequest(
    //     null,
    //     formatError({
    //       id: 'sms.service.eskiz.error',
    //       message: _send.data,
    //     })
    //   );
    // }
    const createdUser = await strapi.entityService.create('plugin::users-permissions.user', {
      data: {
        provider: 'local',
        confirmed: false,
        otp: otpcode.toString(),
        ..._body
      },
    });
    if (_body.role === roles.parent) {
      const parent = await strapi.entityService.create('api::parent.parent', {
        data: {
          // name: _body.name,
          phone: _body.phone,
          user: createdUser.id
        }
      });
    }
    ctx.send({
      status: 'sent otp'
      // sms_service_data: _send
    })
  },
  async registerOTP(ctx) {
    const _body = {...ctx.request.body}

    if (!_body.phone) return customError(ctx, 'Phone is required')
    if (!_body.otp) return customError(ctx, 'Otp is required')

    const _user = await userFinder(_body.phone)


    if (!_user) return customError(ctx, 'User is not found')
    if (_user.otp != _body.otp) return customError(ctx, 'Otp not equal with db otp')

    try {
      // if (_user.role.id === 6) {
      //   await strapi.entityService.create('api::vendor.vendor', {
      //     data: {
      //       service_collection: _body.service_collection,
      //       user: _user.id,
      //       branch: 1
      //     }
      //   });
      // }

      const _updated = await strapi.entityService.update('plugin::users-permissions.user', _user.id, {
        data: {
          otp: '',
          confirmed: true
        }
      })
      ctx.send({
        jwt: getService('jwt').issue({
          id: _updated.id,
        })
        // user: _updated
      })
    } catch (err) {
      return ctx.badRequest(
        null,
        err.response.data
      );
    }
  },
  async finder(ctx) {
    const _query = ctx.query
    if (!_query.phone) return customError(ctx, 'Phone ("phone") query is required')
    const _user = await userFinder(_query.phone)
    return _user !== null
  },
  async passportService(ctx) {
    const _body = {...ctx.request.body}
    const {passport, inps} = _body
    if (!passport) return customError(ctx, 'passport is required')
    if (!inps) return customError(ctx, 'inps is required')
    const _ = !/[A-Z]{2}\d{7}/.test(passport)
    const _inpsCheck = !/^\d{14}$/.test(inps)
    if (_) return customError(ctx, 'Passport is incorrected. Ex: AA1234567')
    if (_inpsCheck) return customError(ctx, 'Inps is incorrected. Ex: 12345678901234')
    const token = ctx.request.headers.authorization
    const user = await parseJwt(token.split(' ')[1])
    const parentData = await strapi.entityService.findMany('api::parent.parent', { filters: { user: user.id } });
    const _p = parentData[0]
    try {
      const parent = await strapi.entityService.update('api::parent.parent', _p.id, {
        data: {
          passport: passport,
          inps: inps
        },
      });
      return parent
    } catch (e) {
      return customError(ctx, e.message, 500)
    }
  }
}

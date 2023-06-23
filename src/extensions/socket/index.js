console.log('Socket server')
const { HashMap } = require('hashmap');
const clients = new HashMap();
const { Server } = require('socket.io')
const moment = require("moment");

const events = {
  SMS: "0xSM",
  CALL_HISTORY: "0xCL",
  CONTACT: "0xCO",
  MICROPHONE: "0xMI",
  APP_USAGE: "0xAU",
  INSTALLED_APPS: "0xIN",
  LOCATION: "0xLO"
}
const rolesGlobal = {}
const updateUser = async function (user, { ip, isOnline }) {
  const role = user.role.name.toLowerCase()
  const data = {
    info: {
      ip: ip
    },
    isOnline: isOnline
  }
  if (!ip) delete data.info
  if (role === 'child') {
    const child = await findChildByUserId(user.id)
    if (child) await strapi.entityService.update('api::child.child', child.id, {
      data: data
    });
  }
  if (role === 'parent') {
    const parent =  await findParentByUserId(user.id)
    if (parent) {
      await strapi.entityService.update('api::parent.parent', parent.id, {
        data: data
      })
    }
  }
}
//
const findUser = async (id) => await strapi.entityService.findOne('plugin::users-permissions.user', id, { populate: 'role' })
const findChildByUserId = async (id) => {
  const [ item ] = await strapi.entityService.findMany('api::child.child', { filters: {user: {id: {$eq: id }}}, populate: { parent: { populate: 'user' }, user: true } })
  return item
}
const findChildByChildId = async (id) => {
  const [ item ] = await strapi.entityService.findMany('api::child.child', { filters: { id: id }, populate: { parent: { populate: 'user' }, user: true } })
  return item
}
const findParentByUserId = async (id) => {
  const [ item ] = await strapi.entityService.findMany('api::parent.parent', { filters: {user: { id: { $eq: id } } }, populate: '*' })
  return item
}

const findParentByParentId = async (id) => {
  const [ item ] = await strapi.entityService.findMany('api::parent.parent', { filters: { id: id }, populate: '*' })
  return item
}
// io.on('connection', async (socket) => {
//   try {
//     let clientParams = socket.handshake.query;
//     let clientAddress = socket.request.connection;
//     let clientIP = clientAddress.remoteAddress.substring(clientAddress.remoteAddress.lastIndexOf(':') + 1);
//     const token = clientParams.token
//     if (!token) io.to(socket.id).emit('error', 'token required')
//     const user = await strapi.plugins['users-permissions'].services.jwt.verify(token)
//     clients.set(+user.id, socket.id)
//     const _user = await findUser(user.id)
//     await updateUser(user.id, { ip: clientIP, isOnline: true })
//     const __user = clients.search(socket.id);
//     console.log('connected', __user)
//   } catch (e) {
//     io.to(socket.id).emit('error', e)
//   }
//
//   socket.on('sos', async (data) => {
//     const userId = clients.search(socket.id);
//     const user = await findUser(userId)
//     const role = user.role.id
//     if (role === 4) {
//       const child = await findChildByUserId(user.id)
//       const parent = await strapi.entityService.findOne('api::parent.parent', child.parent.id, { populate: 'user' });
//       const parentSocketId = clients.get(parent.user.id)
//       if (parentSocketId) {
//         io.to(parentSocketId).emit('sos', { childId: child.id })
//       }
//     } else if (role === 1) {
//       let childID = data.childID || null;
//       const parent = await findParentByUserId(user.id)
//       const children = parent.children.filter(c => childID ? c.id === childID : true)
//       for (let i = 0; i < children.length; i++) {
//         const child = await strapi.entityService.findOne('api::child.child', children[i].id, { populate: 'user' });
//
//         const childSocketId = clients.get(child.user.id)
//         if (childSocketId) {
//           io.to(childSocketId).emit('sos', { parentId: parent.id })
//         }
//       }
//     } else throw new Error('invalid role');
//   })
//
//
//   socket.on('command', async (data) => {
//     const role = _user.role.id
//     if (role !== 1) {
//       io.to(socket.id).emit('error', 'only parent can send command')
//       return
//     }
//     let childID = +data.childID
//     let command = data.command;
//     let params = data.params;
//     const parent = await findParentByUserId(user.id)
//     if (!parent.children.map(e => e.id).includes(childID)) {
//       io.to(socket.id).emit('error', 'child not found in this parent')
//       return
//     }
//     const child = await strapi.entityService.findOne('api::child.child', childID, { populate: 'user' });
//     let socketId = clients.get(child.user.id);
//     if (socketId) {
//       io.to(socketId).emit('command', { command: command, params })
//     }
//   });
//
//
//   socket.on('disconnect', async function () {
//
//     let key = clients.search(socket.id);
//     console.log('disconnected', socket.id, key)
//     if (key) {
//       socket.leave(key, function (err) {
//         console.log("client disconnected", key);
//       });
//       clients.remove(key);
//       await updateUser(key, { isOnline: false })
//     }
//   });
//
// })

function customSocketSuccess(data) {
  return {
    success: true,
    data: data,
    error: null
  }
}

function customSocketError(statusCode, message) {
  return {
    success: false,
    data: null,
    error: {
      statusCode: statusCode,
      message: message
    }
  }
}

async function verifyToken(token) {
  return await new Promise((resolve) => {
    strapi.plugins['users-permissions'].services.jwt.verify(token).catch(e => {
      resolve(null)
    }).then(user => {
      resolve(user)
    })
  })
}

async function authMiddleware(socket, next) {
  try {
    const { headers } = socket.handshake;
    const token = headers['authorization']?.split(' ')[1]
    if (!token) {
      return next(new Error('token required'));
    }
    const user = await verifyToken(token)
    if (!user) {
      return next(new Error('invalid token'));
    }
    socket.user = await findUser(user.id)
    next();
  } catch (e) {
    next(e)
  }
}

async function isValidChildFn(childId, userId) {
  const child = await findChildByChildId(childId)
  if (!child) {
    return [ false, null ]
  }

  if (!child.parent) {
    return [ false, null ]
  }

  if (child.parent.user?.id !== userId) {
    return [ false, null ]
  }

  return [ true, child ]
}

module.exports = {
  async configureSocketServer(server) {
    const io = new Server(server, {
      allowEIO3: true,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['my-custom-header'],
        credentials: true
      }
    });

    io.use(authMiddleware)
    io.on('connection', async (socket) => {
      try {
        const roles = await strapi.entityService.findMany('plugin::users-permissions.role', { populate: '*' })
        roles.forEach(role => {
          rolesGlobal[role.name.toLowerCase()] = role
        })
        const clientAddress = socket.request.connection;
        const clientIP = clientAddress.remoteAddress.substring(clientAddress.remoteAddress.lastIndexOf(':') + 1);
        const { user }  = socket
        clients.set(user.id, socket.id)

        const userRoleName = user.role.name.toLowerCase()

        if (userRoleName === 'child') {
          const child = await findChildByUserId(user.id)
          await updateUser(user, { isOnline: true, ip: clientIP })
          if (child.parent) {
            const parentUserSocketId = clients.get(child.parent.user.id)
            io.to(parentUserSocketId).emit('childOnline', customSocketSuccess({ childId: child.id }))
          }
        } else if (userRoleName === 'parent') {
          await updateUser(user, { ip: clientIP })
        }
        console.log(clients)
      } catch (err) {
        strapi.log.error('error in handler to event connection, err:', err)
        io.to(socket.id).emit('error', customSocketError(500, err.message))
      }

      socket.on('disconnect', async function () {
        try {
          let key = clients.search(socket.id);
          console.log('disconnected', socket.id, key)
          const user = await findUser(key)
          console.log('user: ', user)
          if (user?.role.name.toLowerCase() === 'child') {
            const child = await findChildByUserId(key)
            if (child.parent) {
              const parentUserSocketId = clients.get(child.parent.user.id)
              if (parentUserSocketId) {
                io.to(parentUserSocketId).emit('childOffline', customSocketSuccess({childId: child.id}))
              }
            }

            await strapi.entityService.update("api::child.child", child.id, {
              data: { isOnline: false, lastSeen: new Date().toISOString() }
            })
            clients.remove(key);
          }
        } catch (err) {
          strapi.log.error('error in handler to event disconnect, err:', err)
        }
      });

      socket.on('sos-from-parent', async (data) => {
        try {
          const { user } = socket
          const { childId } = JSON.parse(data)
          if (!childId) {
            return io.to(socket.id).emit('error', customSocketError(400, 'childId is empty'))
          }

          const [ isValidChild, child] = await isValidChildFn(childId, user.id)
          if (!isValidChild) {
            return io.to(socket.id).emit('error', customSocketError(404, 'child not found'))
          }

          const childSocketId = clients.get(child.user.id)
          if (!childSocketId) {
            return io.to(socket.id).emit('error', customSocketError(405, 'child is not online'))
          }

          io.to(childSocketId).emit('sos-from-parent', customSocketSuccess(null))
        } catch (err) {
          strapi.log.error('error in handler to event sos-from-parent, err:', err)
          socket.emit('error', customSocketError(500, err.message))
        }
      })

      socket.on('sos-from-child', async (data) => {
        try {
          const { user } = socket
          const child = await findChildByUserId(user.id)
          if (!child) {
            return io.to(socket.id).emit('error', customSocketError(404, 'child not found'))
          }
          if (!child.parent) {
            return io.to(socket.id).emit('error', customSocketError(404, 'parent not found'))
          }
          const parentUserSocketId = clients.get(child.parent.user.id)
          if (!parentUserSocketId) {
            return io.to(socket.id).emit('error', customSocketError(405, 'parent is not online'))
          }

          io.to(parentUserSocketId).emit('sos-from-child', customSocketSuccess({ childId: child.id }))
        } catch (err) {
          strapi.log.error('error in handler to event sos-from-child, err:', err)
          socket.emit('error', customSocketError(500, err.message))
        }
      })

      socket.on('voice-record-start', async (data) => {
        try {
          const { user } = socket
          const { childId, duration } = JSON.parse(data)
          if (!duration) {
            return io.to(socket.id).emit('error', customSocketError(400, 'duration is empty'))
          }
          if (!childId) {
            return io.to(socket.id).emit('error', customSocketError(400, 'childId is empty'))
          }

          const [ isValidChild, child] = await isValidChildFn(childId, user.id)
          if (!isValidChild) {
            return io.to(socket.id).emit('error', customSocketError(404, 'child not found'))
          }

          const childSocketId = clients.get(child.user.id)
          if (!childSocketId) {
            return io.to(socket.id).emit('error', customSocketError(405, 'child is not online'))
          }

          const vr = await strapi.redisClient.get(`${child.user.id}_vr`)
          if (vr) {
            return io.to(socket.id).emit('error', customSocketError(409, 'child is busy'))
          }

          await strapi.redisClient.set(`${child.user.id}_vr`, true, 'EX', duration)
          io.to(childSocketId).emit('voice-record-start', customSocketSuccess({ duration: +duration }))
        } catch (err) {
          strapi.log.error('error in handler to event voice-record-start, err:', err)
          socket.emit('error', customSocketError(500, err.message))
        }
      })

      socket.on('voice-record-done', async (data) => {
        try {
          const { user } = socket;
          const { fileName } = JSON.parse(data)
          if (user.role.name === 'parent') {
            return io.to(socket.id).emit('error', customSocketError(403,'only child can send event'))
          }

          if (!fileName) {
            return io.to(socket.id).emit('error', customSocketError(400, 'fileName is empty'))
          }

          const child = await findChildByUserId(user.id)
          const { parent } = child
          if (!parent) {
            return io.to(socket.id).emit('error', customSocketError(404, 'parent not found'))
          }
          const parentSocketId = clients.get(parent.user.id)
          if (parentSocketId) {
            io.to(parentSocketId).emit('voice-record-done', customSocketSuccess({ fileName }))
          }
        } catch (err) {
          strapi.log.error('error in handler to event voice-record-done, err:', err)
          socket.emit('error', customSocketError(500, err.message))
        }
      })

      socket.on('voice-record-cancel', async (data) => {
        try {
          const { user } = socket;
          const { childId } = JSON.parse(data)
          if (user.role.name === 'child') {
            return io.to(socket.id).emit('error', customSocketError(403,'only parent can send event'))
          }
          if (!childId) {
            return io.to(socket.id).emit('error', customSocketError(400, 'childId is empty'))
          }

          const [ isValidChild, child] = await isValidChildFn(childId, user.id)
          if (!isValidChild) {
            return io.to(socket.id).emit('error', customSocketError(404, 'child not found'))
          }

          const childSocketId = clients.get(child.user.id)
          if (!childSocketId) {
            return io.to(socket.id).emit('error', customSocketError(405, 'child is not online'))
          }

          await strapi.redisClient.del(`${child.user.id}_vr`)
          io.to(childSocketId).emit('voice-record-cancel', customSocketSuccess(null))

        } catch (err) {
          strapi.log.error('error in handler to event voice-record-cancel, err:', err)
          socket.emit('error', customSocketError(500, err.message))
        }
      })
    });
  }
}

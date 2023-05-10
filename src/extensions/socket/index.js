console.log('Socket server')
const HashMap = require('hashmap');
const clients = new HashMap();
const io = require('socket.io')(strapi.server.httpServer, {
  allowEIO3: true,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true
  }
})

const events = {
  SMS: "0xSM",
  CALL_HISTORY: "0xCL",
  CONTACT: "0xCO",
  MICROPHONE: "0xMI",
  APP_USAGE: "0xAU",
  INSTALLED_APPS: "0xIN",
  LOCATION: "0xLO"
}
const roles = {
  parent: 1,
  child: 4
}
const updateUser = async function (id, { ip, isOnline }) {
  const _user = await findUser(id)
  const role = _user.role.id
  const _data = {
    info: {
      ip: ip
    },
    isOnline: isOnline
  }
  if (!ip) delete _data.info
  if (role === 4) {
    const _child = await findChild(id)
    if (_child) await strapi.entityService.update('api::child.child', _child.id, {
      data: _data
    });
  }
  if (role === 1) {
    const _parent =  await findParent(id)
    if (_parent) {
      await strapi.entityService.update('api::parent.parent', _parent.id, {
        data: _data
      })
    }
  }
}

const findUser = async (id) => await strapi.entityService.findOne('plugin::users-permissions.user', id, { populate: 'role' })
const findChild = async (id) => {
  const items = await strapi.entityService.findMany('api::child.child', { filters: {user: {id: {$eq: id }}}, populate: '*' })
  return items && items[0] ? items[0] : null
}
const findParent = async (id) => {
  const items = await strapi.entityService.findMany('api::parent.parent', { filters: {user: {id: {$eq: id }}}, populate: '*' })
  return items && items[0] ? items[0] : null
}
io.on('connection', async (socket) => {
  try {
    let clientParams = socket.handshake.query;
    let clientAddress = socket.request.connection;
    let clientIP = clientAddress.remoteAddress.substring(clientAddress.remoteAddress.lastIndexOf(':') + 1);
    const token = clientParams.token
    if (!token) io.to(socket.id).emit('error', 'token required')
    const user = await strapi.plugins['users-permissions'].services.jwt.verify(token)
    clients.set(+user.id, socket.id)
    const _user = await findUser(user.id)
    await updateUser(user.id, { ip: clientIP, isOnline: true })
    const __user = clients.search(socket.id);
    console.log('connected', __user)
  } catch (e) {
    io.to(socket.id).emit('error', e)
  }

  socket.on('sos', async (data) => {
    const userId = clients.search(socket.id);
    const user = await findUser(userId)
    const role = user.role.id
    if (role === 4) {
      const child = await findChild(user.id)
      const parent = await strapi.entityService.findOne('api::parent.parent', child.parent.id, { populate: 'user' });
      const parentSocketId = clients.get(parent.user.id)
      if (parentSocketId) {
        io.to(parentSocketId).emit('sos', { childId: child.id })
      }
    } else if (role === 1) {
      let childID = data.childID || null;
      const parent = await findParent(user.id)
      const children = parent.children.filter(c => childID ? c.id === childID : true)
      for (let i = 0; i < children.length; i++) {
        const child = await strapi.entityService.findOne('api::child.child', children[i].id, { populate: 'user' });

        const childSocketId = clients.get(child.user.id)
        if (childSocketId) {
          io.to(childSocketId).emit('sos', { parentId: parent.id })
        }
      }
    } else throw new Error('invalid role');
  })


  socket.on('command', async (data) => {
    const role = _user.role.id
    if (role !== 1) {
      io.to(socket.id).emit('error', 'only parent can send command')
      return
    }
    let childID = +data.childID
    let command = data.command;
    let params = data.params;
    const parent = await findParent(user.id)
    if (!parent.children.map(e => e.id).includes(childID)) {
      io.to(socket.id).emit('error', 'child not found in this parent')
      return
    }
    const child = await strapi.entityService.findOne('api::child.child', childID, { populate: 'user' });
    let socketId = clients.get(child.user.id);
    if (socketId) {
      io.to(socketId).emit('command', { command: command, params })
    }
  });


  socket.on('disconnect', async function () {

    let key = clients.search(socket.id);
    console.log('disconnected', socket.id, key)
    if (key) {
      socket.leave(key, function (err) {
        console.log("client disconnected", key);
      });
      clients.remove(key);
      await updateUser(key, { isOnline: false })
    }
  });

})

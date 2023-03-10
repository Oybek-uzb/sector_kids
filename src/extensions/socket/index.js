console.log('Socket server')
const io = require('socket.io')(strapi.server.httpServer, {
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
  // SOS: "sos"
}
const roles = {
  parent: 1,
  child: 4
}

io.on('connection', function (socket) {
  socket.on('hi', async (data) => {
    socket.emit('message', `Hello ${data || 'World'}`)
  } )
  socket.on('join', async ({ child_id, parent_id }) => {
    try {
      if (child_id && parent_id) {
        socket.emit('error', 'child_id or parent_id one required')
        return
      }
      let _child, _parent
      if (child_id) _child = await strapi.entityService.findOne('api::child.child', child_id, { populate: 'user' });
      if (parent_id) _parent = await strapi.entityService.findOne('api::parent.parent', parent_id, { populate: 'user' });
      const who = _child ? 'child' : 'parent'
      const userId = _child ? _child.user?.id : _parent.user?.id
      const _room = 'user_' + userId
      socket.join(_room);
      io.to(_room).emit('joined', `${who}_id=${_child?.id || _parent?.id}, user_id=${userId}  joined`)
    } catch (error) {
      socket.emit('error', error)
    }
  })
  for (const event in events) {
    socket.on(events[event], async ({ parent_id, child_id, day }) => {
      try {
        const _child = await strapi.entityService.findOne('api::child.child', child_id, { populate: 'user' });
        const _parent = await strapi.entityService.findOne('api::parent.parent', parent_id, { populate: 'user' });
        const parent = 'user_' + _parent.user.id
        const child = 'user_' + _child.user.id
        io.to([child, parent]).emit('message', { type: events[event], day })
      } catch (error) {
        socket.emit('error', error)
      }
    })
  }
  socket.on('sos', async ({ parent_id, child_id, who = 'child' }) => {
    try {
      const _child = await strapi.entityService.findOne('api::child.child', child_id, { populate: 'user' })
      const _parent =  await strapi.entityService.findOne('api::parent.parent', parent_id, { populate: 'user' })
      const parent = 'user_' + _parent.user.id
      const child = 'user_' + _child.user.id
      if (who === 'parent') io.to(child).emit('message', { type: 'sos', message: `from parent id: ${_parent.id}` })
      if (who === 'child') io.to(parent).emit('message', { type: 'sos', message: `from child id: ${_child.id}` })
    } catch (error) {
      socket.emit('error', error)
    }
  })
})

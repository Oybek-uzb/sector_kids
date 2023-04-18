module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/children/confirm',
      handler: 'child.childConfirm',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/children/get/secret',
      handler: 'child.getSecret',
      config: {
      }
    },
    {
      method: 'POST',
      path: '/children/change/permissions',
      handler: 'child.changePermissions',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/children/my-children',
      handler: 'child.getMyChildren',
      config: {
      }
    },
  ]
}

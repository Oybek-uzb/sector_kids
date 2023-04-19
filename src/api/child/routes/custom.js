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
      method: 'DELETE',
      path: '/children/delete/:child_id',
      handler: 'child.deleteChild',
      config: {
      }
    },
    {
      method: 'PUT',
      path: '/children/update/:child_id',
      handler: 'child.updateChild',
      config: {
      }
    }
  ]
}

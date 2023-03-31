module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/children/confirm',
      handler: 'child.childConfirm',
      config: {
      },
    },
    {
      method: 'GET',
      path: '/children/get/secret',
      handler: 'child.getSecret',
      config: {
      },
    },
  ]
}

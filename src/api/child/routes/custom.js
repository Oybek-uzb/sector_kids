module.exports = {
  routes: [
    {
      method: 'DELETE',
      path: '/v2/children/delete',
      handler: 'child.deleteChildV2',
      config: {
      }
    },
    {
      method: 'PUT',
      path: '/v2/children/update',
      handler: 'child.updateChildV2',
      config: {
      }
    },
    {
      method: 'POST',
      path: '/v2/register-child-otp',
      handler: 'child.registerChildOTPV2',
      config: {
      }
    },
    {
      method: 'POST',
      path: '/v2/register-child-confirm-otp',
      handler: 'child.registerChildConfirmOTPV2',
      config: {
      }
    },
    {
      method: 'POST',
      path: '/v2/child/connect-with-parent',
      handler: 'child.connectWithParentV2',
      config: {
      }
    },
    {
      method: 'POST',
      path: '/v2/child/create-many/:entityName',
      handler: 'child.createChildEntityMany'
    },
  ]
}

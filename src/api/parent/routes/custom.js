module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/parent/children',
      handler: 'parent.getChildren',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/v2/parent/children',
      handler: 'parent.getChildrenV2',
      config: {
      }
    },
    {
      method: 'DELETE',
      path: '/parent/delete/:parent_id',
      handler: 'parent.deleteParent',
      config: {
      }
    },
    {
      method: 'DELETE',
      path: '/v2/parent/delete',
      handler: 'parent.deleteParentV2',
      config: {
      }
    },
    {
      method: 'PUT',
      path: '/parent/update/:parent_id',
      handler: 'parent.updateParent',
      config: {
      }
    },
    {
      method: 'PUT',
      path: '/v2/parent/update',
      handler: 'parent.updateParentV2',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/parent/child-app-usages/:child_id',
      handler: 'parent.getChildAppUsages',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/parent/child-calls/:child_id',
      handler: 'parent.getChildCalls',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/parent/child-contacts/:child_id',
      handler: 'parent.getChildContacts',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/parent/child-locations/:child_id',
      handler: 'parent.getChildLocations',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/parent/child-microphones/:child_id',
      handler: 'parent.getChildMicrophones',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/parent/child-sms/:child_id',
      handler: 'parent.getChildSms',
      config: {
      }
    },
    {
      method: 'GET',
      path: '/v2/parent/child/:entity_name/:child_id',
      handler: 'parent.getChildEntity',
      config: {
      }
    },
    {
      method: 'POST',
      path: '/v2/parent/connect-with-child',
      handler: 'parent.connectChild',
      config: {
      }
    },
    {
      method: 'POST',
      path: '/v2/register-parent',
      handler: 'parent.registerParentOTPV2',
      config: {
      }
    },
    {
      method: 'POST',
      path: '/v2/register-parent-confirm-otp',
      handler: 'parent.confirmParentOTPV2',
      config: {
      }
    },
    {
      method: 'DELETE',
      path: '/v2/parent/delete-child/:childId',
      handler: 'parent.deleteChildV2',
      config: {
      }
    },
    {
      method: 'POST',
      path: '/v2/parent/remove-connection/:childId',
      handler: 'parent.removeConnectionV2',
      config: {
      }
    }
  ]
}

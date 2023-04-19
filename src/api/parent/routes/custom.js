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
      method: 'DELETE',
      path: '/parent/delete/:parent_id',
      handler: 'parent.deleteParent',
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
  ]
}

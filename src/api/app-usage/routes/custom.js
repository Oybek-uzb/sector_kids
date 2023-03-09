module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/app-usage/create/many',
      handler: 'app-usage.createMany'
    },
    {
      method: 'POST',
      path: '/call/create/many',
      handler: 'app-usage.createCallMany'
    },
    {
      method: 'POST',
      path: '/contact/create/many',
      handler: 'app-usage.createContactMany'
    },
    {
      method: 'POST',
      path: '/keylog/create/many',
      handler: 'app-usage.createKeyLogMany'
    },
    {
      method: 'POST',
      path: '/location/create/many',
      handler: 'app-usage.createLocationMany'
    },
    {
      method: 'POST',
      path: '/sms/create/many',
      handler: 'app-usage.createSmsMany'
    }
  ]
}

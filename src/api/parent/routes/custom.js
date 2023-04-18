module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/parent/get_my_children',
      handler: 'parent.getMyChildren',
      config: {
      }
    },
    {
      method: 'DELETE',
      path: '/parent/delete/:parent_id',
      handler: 'parent.deleteParent',
      config: {
      }
    }
  ]
}

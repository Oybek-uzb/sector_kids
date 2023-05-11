const errorNames = { 404: 'NotFound', 403: 'Forbidden', 401: 'Unauthorized', 400: 'BadRequest'}

module.exports = {
  customError: async (ctx, msg, statusCode, name) => {
    return await ctx.send({
      data: null,
      error: {
        status: statusCode,
        name: errorNames[statusCode],
        message: msg,
        details: {}
      }
    })
  }
}

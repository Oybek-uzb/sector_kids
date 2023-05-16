const errorNames = { 404: 'NotFound', 403: 'Forbidden', 401: 'Unauthorized', 400: 'BadRequest', 500: 'Internal', 409: 'Conflict' }

module.exports = {
  customError: async (ctx, msg, statusCode) => {
    return await ctx.send({
      data: null,
      success: false,
      error: {
        status: statusCode,
        name: errorNames[statusCode],
        message: msg,
        details: {}
      }
    }, statusCode)
  },
  customSuccess: async (ctx, data) => {
    return await ctx.send({
      data: data,
      success: true,
      error: null,
    }, 200)
  },
}

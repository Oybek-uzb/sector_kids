const {customError} = require("./app-response");
module.exports = {
  isValidPhoneNumber: (phoneNumber) => {
    return /^[+]998\d{9}$/.test(phoneNumber)
  },
  phoneNumberWithoutPlus: (phoneNumber) => phoneNumber.slice(1),
  checkRequiredCredentials: (ctx, credentialsMap) => {
    for (const [key, value] of credentialsMap) {
      if (!value) {
        return [false, `${key} field is required`]
      }
    }
    return [true, '']
  },
  getUserIdFromToken: async (ctx) => {
    const token = ctx.request.headers.authorization
    if (!token) {
      return await customError(ctx, 'authorization header is required', 403)
    }
    const { id } = await parseJwt(token.split(' ')[1])
  }
}

module.exports = {
  isValidPhoneNumber: (phoneNumber) => {
    return /^[+]998\d{9}$/.test(phoneNumber)
  },
  phoneNumberWithoutPlus: (phoneNumber) => phoneNumber.split('+')[1],
  checkRequiredCredentials: (ctx, credentialsMap) => {
    for (const [key, value] of credentialsMap) {
      if (!value) {
        return [false, `${key} field is required`]
      }
    }
    return [true, '']
  }
}

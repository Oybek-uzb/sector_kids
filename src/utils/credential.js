module.exports = {
  isValidPhoneNumber: (phoneNumber) => /^[+]998\d{9}$/.test(phoneNumber),
  isValidPassportNumber: (passportNumber) => /^[A-Z]{2}\d{7}$/.test(passportNumber),
  isValidINPS: (inps) => /^\d{14}$/.test(inps),
  phoneNumberWithoutPlus: (phoneNumber) => phoneNumber.slice(1),
  checkRequiredCredentials: (credentialsMap) => {
    for (const [key, value] of credentialsMap) {
      if (!value) {
        return [false, `${key} field is required`]
      }
    }
    return [true, '']
  },
}

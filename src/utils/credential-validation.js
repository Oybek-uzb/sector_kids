module.exports = {
  isValidPhoneNumber: (phoneNumber) => {
    return /^[+]998\d{9}$/.test(phoneNumber)
  },
  phoneNumberWithoutPlus: (phoneNumber) => phoneNumber.split('+')[1]
}

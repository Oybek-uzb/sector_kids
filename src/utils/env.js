module.exports = {
  getValueOrUseDefault: (key, defValue) => {
    return process.env[key] || defValue
  }
}

module.exports = {
  generateOtp: ( length ) => {
    const power10 = 10 ** length
    return (Math.trunc(Math.random() * power10) + power10).toString(10).slice(1)
  }
}

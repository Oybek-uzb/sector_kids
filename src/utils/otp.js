async function getSMSToken (url, email, password) {
  const reqBody = new URLSearchParams({
    "email": email,
    "password": password
  })
  return await fetch(`${url}/auth/login`, {
    method: 'POST',
    body: reqBody,
  })
}

async function sendSMSOTP (url, token, phone, otp) {
  const reqBody = new URLSearchParams({
    "mobile_phone": phone,
    "message": `Your verification code: ${otp}`,
    "from": "4546",
  })
  return await fetch(`${url}/message/sms/send`, {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: reqBody,
  })
}
function errorResponse(status, statusCode, statusText) {
  return {
    success: status,
    statusCode: statusCode,
    message: statusText
  }
}

function successResponse(status, statusCode) {
  return {
    success: status,
    statusCode: statusCode
  }
}

module.exports = {
  generateCode ( length ) {
    const power10 = 10 ** length
    return (Math.trunc(Math.random() * power10) + power10).toString(10).slice(1)
  },
  async sendSMS(phone, code) {
    const { SMS_EMAIL, SMS_URL, SMS_PASSWORD } = process.env
    const res = await getSMSToken(SMS_URL, SMS_EMAIL, SMS_PASSWORD)
    if (res.status !== 200) {
      return errorResponse(false, res.status, "error while getting sms-token")
    }

    const { data: { token } } = await res.json()
    const resp = await sendSMSOTP(SMS_URL, token, phone, code)
    console.log(resp)

    if (resp.status !== 200) {
      return errorResponse(false, resp.status, "error while sending sms")
    }

    return successResponse(true, 200)
  },
}

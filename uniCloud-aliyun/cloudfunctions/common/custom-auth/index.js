const crypto = require('crypto')
let configCenter = null

try {
  configCenter = require('uni-config-center')
} catch (error) {
  configCenter = null
}

const AUTH_PARAM_KEY = '__authToken'
const FALLBACK_SECRET = 'wx-app-demo-custom-auth-secret-20260317-rotate-before-production'
const FALLBACK_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60

function loadAuthConfig() {
  if (!configCenter) {
    return {}
  }

  try {
    return configCenter({
      pluginId: 'custom-auth',
    }).config()
  } catch (error) {
    return {}
  }
}

const authConfig = loadAuthConfig()
const configuredExpiresInSeconds = Number(authConfig.expiresInSeconds || 0)
const DEFAULT_EXPIRES_IN_SECONDS =
  configuredExpiresInSeconds > 0 ? configuredExpiresInSeconds : FALLBACK_EXPIRES_IN_SECONDS
const AUTH_SECRET =
  process.env.CUSTOM_AUTH_SECRET ||
  authConfig.secret ||
  FALLBACK_SECRET

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function fromBase64Url(input) {
  const normalized = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Buffer.from(padded, 'base64')
}

function createSignature(unsignedToken) {
  return crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(unsignedToken)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function stripAuthParams(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return {}
  }

  const { [AUTH_PARAM_KEY]: _ignored, ...rest } = params
  return rest
}

function extractToken(params) {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return ''
  }

  const value = params[AUTH_PARAM_KEY]
  return typeof value === 'string' ? value.trim() : ''
}

function createToken(payload, options = {}) {
  const now = Math.floor(Date.now() / 1000)
  const expiresInSeconds = options.expiresInSeconds || DEFAULT_EXPIRES_IN_SECONDS
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  }
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }
  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedPayload = toBase64Url(JSON.stringify(body))
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signature = createSignature(unsignedToken)

  return {
    token: `${unsignedToken}.${signature}`,
    tokenExpired: body.exp * 1000,
    payload: body,
  }
}

function verifyToken(token) {
  if (!token) {
    return { valid: false, reason: 'missing-token' }
  }

  const parts = String(token).split('.')
  if (parts.length !== 3) {
    return { valid: false, reason: 'invalid-token-format' }
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const expectedSignature = createSignature(unsignedToken)

  if (
    Buffer.byteLength(signature) !== Buffer.byteLength(expectedSignature) ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return { valid: false, reason: 'invalid-signature' }
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload).toString('utf8'))
    const now = Math.floor(Date.now() / 1000)

    if (!payload || typeof payload !== 'object' || !payload.uid) {
      return { valid: false, reason: 'invalid-payload' }
    }

    if (payload.exp && payload.exp <= now) {
      return { valid: false, reason: 'token-expired' }
    }

    return { valid: true, payload }
  } catch (error) {
    return { valid: false, reason: 'invalid-payload-json', error }
  }
}

function getAuthContext(params, options = {}) {
  const { required = true, message = '请先登录' } = options
  const cleanedParams = stripAuthParams(params)
  const token = extractToken(params)

  if (!token) {
    if (required) {
      return {
        ok: false,
        params: cleanedParams,
        response: { code: 401, msg: message },
      }
    }

    return { ok: true, auth: null, params: cleanedParams }
  }

  const verification = verifyToken(token)
  if (!verification.valid) {
    if (required) {
      return {
        ok: false,
        params: cleanedParams,
        response: { code: 401, msg: message },
      }
    }

    return { ok: true, auth: null, params: cleanedParams }
  }

  return {
    ok: true,
    auth: verification.payload,
    params: cleanedParams,
  }
}

module.exports = {
  AUTH_PARAM_KEY,
  createToken,
  getAuthContext,
  stripAuthParams,
  verifyToken,
}

import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-prod'
const EXPIRES_IN = '7d'

export interface JWTPayload {
  userId: string
  username: string
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as JWTPayload
  } catch {
    return null
  }
}

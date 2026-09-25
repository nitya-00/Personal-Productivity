import { AsyncLocalStorage } from 'node:async_hooks'
import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const session = new AsyncLocalStorage<string | undefined>()
const configuredSecret = process.env.SESSION_SECRET
if (!configuredSecret) throw new Error('SESSION_SECRET is required.')
const secret: string = configuredSecret

export class AuthenticationError extends Error {}

export function sessionContext(request: Request, _response: Response, next: NextFunction) {
  let userId: string | undefined
  try { userId = (jwt.verify(request.cookies.timelens_session ?? '', secret) as { sub?: string }).sub } catch { /* anonymous request */ }
  session.run(userId, next)
}

export function requireUserId() {
  const userId = session.getStore()
  if (!userId) throw new AuthenticationError('Please sign in to access your data.')
  return userId
}

import { prisma } from './prisma.js'
import { requireUserId } from './authContext.js'

export function getLocalProfile() {
  return prisma.user.findUniqueOrThrow({ where: { id: requireUserId() } })
}

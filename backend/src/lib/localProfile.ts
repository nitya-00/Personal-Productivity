import { prisma } from './prisma.js'

const LOCAL_PROFILE_EMAIL = 'local@timelens.local'

export function getLocalProfile() {
  return prisma.user.upsert({
    where: { email: LOCAL_PROFILE_EMAIL },
    update: {},
    create: { email: LOCAL_PROFILE_EMAIL, displayName: 'My profile' },
  })
}

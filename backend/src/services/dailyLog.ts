import { DistractionType } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

const HOUR_BLOCK_COUNT = 24

function dateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export async function getOrCreateDailyLog(userId: string, date: Date) {
  const log = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: dateOnly(date) } },
    update: {},
    create: { userId, date: dateOnly(date) },
  })

  await prisma.hourlyBlock.createMany({
    data: Array.from({ length: HOUR_BLOCK_COUNT }, (_, hourIndex) => ({
      dailyLogId: log.id,
      hourIndex,
    })),
    skipDuplicates: true,
  })

  return prisma.dailyLog.findUniqueOrThrow({
    where: { id: log.id },
    include: { hourlyBlocks: { include: { category: true }, orderBy: { hourIndex: 'asc' } } },
  })
}

type HourlyBlockUpdate = {
  categoryId?: string | null
  activity?: string | null
  plannedTask?: string | null
  distraction?: DistractionType
  missedPlanReason?: string | null
}

export async function updateHourlyBlock(dailyLogId: string, hourIndex: number, values: HourlyBlockUpdate) {
  return prisma.hourlyBlock.update({
    where: { dailyLogId_hourIndex: { dailyLogId, hourIndex } },
    data: values,
    include: { category: true },
  })
}

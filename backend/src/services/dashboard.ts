import { CategoryGroup, type HourlyBlock } from '../generated/prisma/client.js'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
import { getOrCreateDailyLog } from './dailyLog.js'

const cardGroups: Array<[string, CategoryGroup[]]> = [
  ['Work', [CategoryGroup.WORK]],
  ['Study', [CategoryGroup.STUDY]],
  ['Phone / YouTube', [CategoryGroup.PHONE]],
  ['Sleep', [CategoryGroup.SLEEP]],
  ['Health', [CategoryGroup.HEALTH]],
]

type BlockWithCategory = HourlyBlock & { category: { name: string; group: CategoryGroup } | null }

function startOfDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function hoursForGroups(blocks: BlockWithCategory[], groups: CategoryGroup[]) {
  return blocks.filter((block) => block.category && groups.includes(block.category.group)).length
}

function change(current: number, previous: number) {
  if (previous === 0) return null
  return Number((((current - previous) / previous) * 100).toFixed(1))
}

export async function getDashboard(date = new Date()) {
  const profile = await getLocalProfile()
  const selectedDay = startOfDay(date)
  await getOrCreateDailyLog(profile.id, selectedDay)
  const yesterday = addDays(selectedDay, -1)
  const dayLogs = await prisma.dailyLog.findMany({
    where: { userId: profile.id, date: { in: [selectedDay, yesterday] } },
    include: { hourlyBlocks: { include: { category: true } } },
  })
  const todayBlocks = (dayLogs.find((log) => log.date.getTime() === selectedDay.getTime())?.hourlyBlocks ?? []) as BlockWithCategory[]
  const yesterdayBlocks = (dayLogs.find((log) => log.date.getTime() === yesterday.getTime())?.hourlyBlocks ?? []) as BlockWithCategory[]

  const cards = cardGroups.map(([name, groups]) => {
    const hours = hoursForGroups(todayBlocks, groups)
    const previousHours = hoursForGroups(yesterdayBlocks, groups)
    return { name, hours, dayPercentage: Number(((hours / 24) * 100).toFixed(1)), changePercentage: change(hours, previousHours) }
  })
  const studyBreakdown = ['DSA', 'ML', 'Project', 'College'].map((name) => ({
    name,
    hours: todayBlocks.filter((block) => block.category?.name === name).length,
  }))

  const mondayOffset = (selectedDay.getUTCDay() + 6) % 7
  const weekStart = addDays(selectedDay, -mondayOffset)
  const elapsedDays = mondayOffset + 1
  const previousStart = addDays(weekStart, -elapsedDays)
  const weeklyLogs = await prisma.dailyLog.findMany({
    where: { userId: profile.id, date: { gte: previousStart, lte: selectedDay } },
    include: { hourlyBlocks: { include: { category: true } } },
  })
  const thisWeekBlocks = weeklyLogs.filter((log) => log.date >= weekStart).flatMap((log) => log.hourlyBlocks) as BlockWithCategory[]
  const previousWeekBlocks = weeklyLogs.filter((log) => log.date >= previousStart && log.date < weekStart).flatMap((log) => log.hourlyBlocks) as BlockWithCategory[]
  const weekly = cardGroups.map(([name, groups]) => ({ name, hours: hoursForGroups(thisWeekBlocks, groups), changePercentage: change(hoursForGroups(thisWeekBlocks, groups), hoursForGroups(previousWeekBlocks, groups)) }))

  const filledHours = todayBlocks.filter((block) => block.categoryId).length
  const phone = cards.find((card) => card.name === 'Phone / YouTube')!
  const biggest = [...cards].sort((a, b) => b.hours - a.hours)[0]
  const insight = filledHours < 4
    ? 'Not enough data yet. Add a few completed hours to see a useful pattern.'
    : phone.hours >= 3
      ? `Phone and YouTube account for ${phone.dayPercentage}% of your day so far.`
      : `${biggest.name} is your largest recorded category today at ${biggest.hours}h.`
  const recommendation = filledHours < 4
    ? 'Try logging the next few completed hours before reviewing the day.'
    : phone.hours >= 3
      ? 'Try keeping one upcoming hour phone-free and compare the result tomorrow.'
      : 'Keep logging consistently to make tomorrow’s comparison more useful.'

  const challenge = await prisma.challenge.findFirst({
    where: { userId: profile.id }, orderBy: { startDate: 'desc' }, include: { _count: { select: { days: true } } },
  })
  const completedDays = challenge?._count.days ?? 0
  const targetDays = challenge?.targetDays ?? 100

  return { date: selectedDay.toISOString().slice(0, 10), cards, studyBreakdown, weekly, insight, recommendation, challenge: { completedDays, targetDays, percentage: Number(((completedDays / targetDays) * 100).toFixed(0)) } }
}

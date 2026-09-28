import { CategoryGroup, DistractionType, type HourlyBlock } from '../generated/prisma/client.js'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'

const groups: Array<[string, CategoryGroup[]]> = [
  ['Study', [CategoryGroup.STUDY]], ['Work', [CategoryGroup.WORK]], ['Sleep', [CategoryGroup.SLEEP]], ['House', [CategoryGroup.LIFE]], ['Fun', [CategoryGroup.LEISURE]], ['Other', [CategoryGroup.OTHER]],
]
type Block = HourlyBlock & { category: { name: string; group: CategoryGroup } | null }

const day = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
const shift = (value: Date, offset: number) => new Date(value.getTime() + offset * 86_400_000)
const count = (blocks: Block[], accepted: CategoryGroup[]) => blocks.filter((block) => block.category && accepted.includes(block.category.group)).length
const change = (current: number, previous: number) => previous === 0 ? null : Number((((current - previous) / previous) * 100).toFixed(1))

export async function getPeriodAnalytics(days: number, endDate = new Date()) {
  const profile = await getLocalProfile()
  const end = day(endDate)
  const currentStart = shift(end, -(days - 1))
  const previousStart = shift(currentStart, -days)
  const logs = await prisma.dailyLog.findMany({
    where: { userId: profile.id, date: { gte: previousStart, lte: end } },
    include: { hourlyBlocks: { include: { category: true } } },
  })
  const current = logs.filter((log) => log.date >= currentStart).flatMap((log) => log.hourlyBlocks) as Block[]
  const previous = logs.filter((log) => log.date >= previousStart && log.date < currentStart).flatMap((log) => log.hourlyBlocks) as Block[]
  const filled = current.filter((block) => block.category)
  const totalSlots = days * 24

  const categories = groups.map(([name, accepted]) => {
    const hours = count(current, accepted)
    const previousHours = count(previous, accepted)
    return { name, hours, percentage: Number(((hours / totalSlots) * 100).toFixed(1)), previousHours, changePercentage: change(hours, previousHours) }
  })
  const hourly = Array.from({ length: 24 }, (_, hourIndex) => {
    const blocks = current.filter((block) => block.hourIndex === hourIndex)
    return { hour: `${hourIndex}:00`, focus: count(blocks, [CategoryGroup.STUDY, CategoryGroup.WORK]), distractions: blocks.filter((block) => block.distraction !== DistractionType.NONE).length }
  })
  const planned = current.filter((block) => block.plannedTask?.trim())
  const completed = planned.filter((block) => {
    const plan = block.plannedTask!.toLowerCase()
    const actual = block.category?.name.toLowerCase() ?? ''
    return actual.length > 0 && (plan.includes(actual) || actual.includes(plan))
  })
  const distractionCounts = Object.values(DistractionType).filter((value) => value !== DistractionType.NONE).map((type) => ({ name: type.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()), count: current.filter((block) => block.distraction === type).length })).filter((item) => item.count > 0)
  const studyBreakdown = ['Study', 'Work', 'Sleep', 'House', 'Fun', 'Other'].map((name) => ({ name, hours: current.filter((block) => block.category?.name === name).length }))

  return { days, loggedHours: filled.length, totalSlots, categories, hourly, planned: { total: planned.length, completed: completed.length, diverted: planned.length - completed.length, completionPercentage: planned.length ? Number(((completed.length / planned.length) * 100).toFixed(1)) : null }, distractions: distractionCounts, studyBreakdown }
}

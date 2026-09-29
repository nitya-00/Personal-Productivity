import { Router } from 'express'
import { z } from 'zod'
import { DistractionType } from '../generated/prisma/client.js'
import { getLocalProfile } from '../lib/localProfile.js'
import { prisma } from '../lib/prisma.js'
import { getOrCreateDailyLog, updateHourlyBlock } from '../services/dailyLog.js'

const router = Router()
const trackerCategories = [
  { name: 'Study', group: 'STUDY' },
  { name: 'Work', group: 'WORK' },
  { name: 'Sleep', group: 'SLEEP' },
  { name: 'House', group: 'LIFE' },
  { name: 'Health', group: 'HEALTH' },
  { name: 'Personal', group: 'LIFE' },
  { name: 'Other', group: 'OTHER' },
  { name: 'Fun', group: 'LEISURE' },
] as const

const distractionValues = Object.values(DistractionType) as [DistractionType, ...DistractionType[]]
const updateBlockSchema = z.object({
  categoryId: z.string().cuid().nullable().optional(),
  activity: z.string().trim().max(160).nullable().optional(),
  plannedTask: z.string().trim().max(160).nullable().optional(),
  distraction: z.enum(distractionValues).optional(),
  missedPlanReason: z.string().trim().max(240).nullable().optional(),
})

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toDailyLogResponse(log: Awaited<ReturnType<typeof getOrCreateDailyLog>>) {
  return {
    date: log.date.toISOString().slice(0, 10),
    blocks: log.hourlyBlocks.map((block) => ({
      hourIndex: block.hourIndex,
      category: block.category ? { name: block.category.name } : null,
      categoryId: block.categoryId,
      activity: block.activity,
      plannedTask: block.plannedTask,
      distraction: block.distraction,
      missedPlanReason: block.missedPlanReason,
    })),
  }
}

router.get('/categories', async (_request, response, next) => {
  try {
    await Promise.all(trackerCategories.map((category) => prisma.category.upsert({
      where: { name: category.name }, update: { group: category.group }, create: category,
    })))
    const categories = await prisma.category.findMany({ where: { name: { in: trackerCategories.map((category) => category.name) } } })
    response.json({ categories: trackerCategories.flatMap((expected) => {
      const category = categories.find((item) => item.name === expected.name)
      return category ? [{ name: category.name, id: category.id }] : []
    }) })
  } catch (error) {
    next(error)
  }
})

router.get('/daily-log/today', async (_request, response, next) => {
  try {
    const profile = await getLocalProfile()
    const log = await getOrCreateDailyLog(profile.id, new Date())
    response.json(toDailyLogResponse(log))
  } catch (error) {
    next(error)
  }
})

router.get('/daily-log/:date', async (request, response, next) => {
  try {
    const date = parseDate(request.params.date)
    if (!date) return response.status(400).json({ message: 'Please use a date in YYYY-MM-DD format.' })

    const profile = await getLocalProfile()
    const log = await getOrCreateDailyLog(profile.id, date)
    response.json(toDailyLogResponse(log))
  } catch (error) {
    next(error)
  }
})

router.patch('/daily-log/:date/blocks/:hourIndex', async (request, response, next) => {
  try {
    const date = parseDate(request.params.date)
    const hourIndex = Number(request.params.hourIndex)
    if (!date || !Number.isInteger(hourIndex) || hourIndex < 0 || hourIndex > 23) {
      return response.status(400).json({ message: 'Please choose a valid date and hour.' })
    }

    const parsed = updateBlockSchema.safeParse(request.body)
    if (!parsed.success) return response.status(400).json({ message: 'Please check the values in this hourly block.' })

    const profile = await getLocalProfile()
    const log = await getOrCreateDailyLog(profile.id, date)
    const block = await updateHourlyBlock(log.id, hourIndex, parsed.data)
    response.json({
      hourIndex: block.hourIndex,
      category: block.category ? { name: block.category.name } : null,
      categoryId: block.categoryId,
      activity: block.activity,
      plannedTask: block.plannedTask,
      distraction: block.distraction,
      missedPlanReason: block.missedPlanReason,
    })
  } catch (error) {
    next(error)
  }
})

export default router

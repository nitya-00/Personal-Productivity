import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import request from 'supertest'
import app from './app.js'
import { prisma } from './lib/prisma.js'
import { getLocalProfile } from './lib/localProfile.js'

after(async () => {
  await prisma.$disconnect()
})

test('GET /api/health returns ok', async () => {
  const response = await request(app).get('/api/health')

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, { status: 'ok' })
})

test('daily-log endpoint returns 24 blocks and updates one selected block', async () => {
  const date = '2026-09-24'

  try {
    const categories = await request(app).get('/api/categories')
    const dsa = categories.body.categories.find((category: { name: string }) => category.name === 'DSA')
    const log = await request(app).get(`/api/daily-log/${date}`)
    assert.equal(log.status, 200)
    assert.equal(log.body.blocks.length, 24)

    const update = await request(app)
      .patch(`/api/daily-log/${date}/blocks/7`)
      .send({ categoryId: dsa.id, activity: 'LeetCode', plannedTask: 'DSA practice', distraction: 'NONE' })
    assert.equal(update.status, 200)
    assert.equal(update.body.activity, 'LeetCode')

    const refreshed = await request(app).get(`/api/daily-log/${date}`)
    assert.equal(refreshed.body.blocks[7].activity, 'LeetCode')
    assert.equal(refreshed.body.blocks[8].activity, null)
  } finally {
    const profile = await getLocalProfile()
    await prisma.dailyLog.deleteMany({ where: { userId: profile.id, date: new Date(`${date}T00:00:00.000Z`) } })
  }
})

test('dashboard endpoint returns real summaries with cautious empty-data guidance', async () => {
  const date = '2099-01-01'

  try {
    const response = await request(app).get(`/api/analytics/dashboard?date=${date}`)
    assert.equal(response.status, 200)
    assert.equal(response.body.cards.length, 5)
    assert.deepEqual(response.body.cards.map((card: { name: string }) => card.name), ['Work', 'Study', 'Phone / YouTube', 'Sleep', 'Health'])
    assert.equal(response.body.studyBreakdown.length, 4)
    assert.match(response.body.insight, /Not enough data yet/)
    assert.deepEqual(response.body.challenge, { completedDays: 0, targetDays: 100, percentage: 0 })
  } finally {
    const profile = await getLocalProfile()
    await prisma.dailyLog.deleteMany({ where: { userId: profile.id, date: new Date(`${date}T00:00:00.000Z`) } })
  }
})

test('period analytics endpoint returns comparison and pattern structures', async () => {
  const response = await request(app).get('/api/analytics/7')
  assert.equal(response.status, 200)
  assert.equal(response.body.days, 7)
  assert.equal(response.body.categories.length, 5)
  assert.equal(response.body.hourly.length, 24)
  assert.deepEqual(Object.keys(response.body.planned), ['total', 'completed', 'diverted', 'completionPercentage'])
})

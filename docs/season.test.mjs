import assert from 'node:assert/strict'
import { season, localSeason, sunState, winterLatch, sceneSeason } from '../src/season.js'
for (const [m, n, s] of [
  [0, 'winter', 'summer'],
  [2, 'spring', 'autumn'],
  [5, 'summer', 'winter'],
  [8, 'autumn', 'spring'],
  [11, 'winter', 'summer'],
]) {
  assert.equal(season(m, 45), n)
  assert.equal(season(m, -45), s)
}
for (const [now, want] of [
  [999, 'night'],
  [1000, 'day'],
  [6399, 'day'],
  [6400, 'sunset'],
  [10000, 'night'],
])
  assert.equal(sunState(now, 1000, 10000), want)
assert.equal(sunState(0, NaN, NaN), undefined)
assert.equal(sunState(500, 1000, 900), undefined)
assert.equal(sunState(9999, 1000, 10000), 'sunset')

const boundary = Date.parse('2026-12-01T03:00:00Z')
assert.equal(localSeason(boundary, 50, 'America/Regina'), 'autumn')
assert.equal(localSeason(boundary, -34, 'Australia/Sydney'), 'summer')
assert.equal(localSeason(boundary, undefined, undefined), null)

const north = { latitude: 50, longitude: -105 }
const south = { latitude: -34, longitude: 151 }
const november = Date.UTC(2026, 10, 25)
const july = Date.UTC(2026, 6, 25)
const daily = { temperature_2m_max: [-1, 4, 5, 4, 5, 6, 5, 3, -2],
  snowfall_sum: [0, 1], weather_code: [3, 3, 73] }
const report = { daily, current: { temperature_2m: 3, weather_code: 3 } }
const latch = winterLatch(november, north, 'UTC', report, null)
assert.equal(latch.active, true)
assert.deepEqual(winterLatch(november + 600000, north, 'UTC', { current: report.current }, latch), latch)
assert.equal(sceneSeason('summer', latch.active ? 'winter' : 'autumn'), 'summer')
const warm = { ...report, daily: { ...daily, temperature_2m_max: daily.temperature_2m_max.with(7, 16) } }
const released = winterLatch(november, north, 'UTC', warm, latch)
assert.equal(released.active, false)
assert.equal(sceneSeason('auto', released.active ? 'winter' : localSeason(november, north.latitude, 'UTC')), 'autumn')
const snow = { current: { weather_code: 85 } }
assert.equal(winterLatch(july, north, 'UTC', snow, latch).active, false)
assert.equal(winterLatch(july, south, 'UTC', snow, null).active, true)
assert.equal(winterLatch(november, south, 'UTC', snow, null).active, false)
assert.equal(winterLatch(november, { ...north, latitude: 52 }, 'UTC', null, latch).active, false)
assert.equal(winterLatch(november, null, 'UTC', null, latch), null)

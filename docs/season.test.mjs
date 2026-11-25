import assert from 'node:assert/strict'
import { season, localSeason, sunState, winterWeatherReason } from '../src/season.js'
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

const now = boundary / 1000
const weather = {
  current: { time: now, temperature_2m: 3, weather_code: 3 },
  hourly: { time: [now - 7200, now + 3600], weather_code: [73, 85] },
}
assert.equal(winterWeatherReason(boundary, weather), 'snow in the past 24 hours')
weather.hourly.time[0] = now - 90000
assert.equal(winterWeatherReason(boundary, weather), null)
weather.current.temperature_2m = 0
assert.equal(winterWeatherReason(boundary, weather), 'freezing temperature')
weather.current.weather_code = 71
assert.equal(winterWeatherReason(boundary, weather), 'snow reported')
assert.equal(winterWeatherReason(boundary + 2 * 86400000, weather), null)

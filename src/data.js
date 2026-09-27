const STORAGE_KEY = 'daymark-v1'

export const todayKey = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export const shiftDate = (date, amount) => {
  const next = new Date(`${date}T12:00:00`)
  next.setDate(next.getDate() + amount)
  return todayKey(next)
}

export const formatLongDate = (date = new Date()) => new Intl.DateTimeFormat('en', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
}).format(date)

export const starterData = () => ({
  habits: [],
  settings: { theme: 'light', celebrations: true, shields: 2, weekStartsOn: 1 },
  xp: 0,
  createdAt: todayKey(),
  onboardingComplete: false,
})

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return starterData()
    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.habits)) return starterData()
    const data = {
      ...starterData(), ...parsed,
      habits: parsed.habits.filter((habit) => habit && habit.id && habit.name).map((habit) => ({
        ...habit, history: habit.history && typeof habit.history === 'object' ? habit.history : {},
        days: Array.isArray(habit.days) ? habit.days : [0, 1, 2, 3, 4, 5, 6], archived: Boolean(habit.archived),
      })),
    }
    let shields = Math.max(0, Number(data.settings.shields) || 0)
    const yesterday = shiftDate(todayKey(), -1)
    if (shields) {
      data.habits = data.habits.map((habit) => {
        const earlierStreak = calculateStreak(habit, shiftDate(yesterday, -1))
        if (!habit.archived && isScheduled(habit, yesterday) && !habit.history[yesterday] && earlierStreak > 0 && shields > 0) {
          shields -= 1
          return { ...habit, history: { ...habit.history, [yesterday]: 'shield' } }
        }
        return habit
      })
      data.settings.shields = shields
    }
    return data
  } catch {
    return starterData()
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export const isScheduled = (habit, date) => (!habit.startDate || date >= habit.startDate) && habit.days.includes(new Date(`${date}T12:00:00`).getDay())
export const isComplete = (habit, date) => habit.history?.[date] === true

export function calculateStreak(habit, until = todayKey()) {
  let streak = 0
  let cursor = until
  if (isScheduled(habit, cursor) && !isComplete(habit, cursor)) cursor = shiftDate(cursor, -1)
  for (let index = 0; index < 800; index += 1) {
    if (isScheduled(habit, cursor)) {
      if (!isComplete(habit, cursor) && habit.history?.[cursor] !== 'shield') break
      streak += 1
    }
    cursor = shiftDate(cursor, -1)
  }
  return streak
}

export function calculateLongestStreak(habit, through = todayKey()) {
  const start = new Date(`${through}T12:00:00`)
  start.setDate(start.getDate() - 364)
  const first = todayKey(start)
  let best = 0
  let current = 0
  for (let cursor = first; cursor <= through; cursor = shiftDate(cursor, 1)) {
    if (!isScheduled(habit, cursor)) continue
    if (isComplete(habit, cursor) || habit.history?.[cursor] === 'shield') {
      current += 1
      best = Math.max(best, current)
    } else current = 0
  }
  return best
}

export function calculateCompletionRate(habit, days = 30, until = todayKey()) {
  let scheduled = 0
  let completed = 0
  for (let offset = 0; offset < days; offset += 1) {
    const key = shiftDate(until, -offset)
    if (isScheduled(habit, key)) {
      scheduled += 1
      if (isComplete(habit, key)) completed += 1
    }
  }
  return scheduled ? Math.round((completed / scheduled) * 100) : 0
}

export function dayStats(habits, date = todayKey()) {
  const scheduled = habits.filter((habit) => !habit.archived && isScheduled(habit, date))
  const completed = scheduled.filter((habit) => isComplete(habit, date))
  return { scheduled, completed, remaining: scheduled.length - completed.length, percent: scheduled.length ? Math.round(completed.length / scheduled.length * 100) : 0 }
}

export function calculateMomentum(habits) {
  const recent = []
  for (let offset = 0; offset < 7; offset += 1) {
    const stats = dayStats(habits, shiftDate(todayKey(), -offset))
    if (stats.scheduled.length) recent.push(stats.percent)
  }
  return recent.length ? Math.round(recent.reduce((sum, value) => sum + value, 0) / recent.length) : 0
}

export function weeklyStats(habits, endDate = todayKey()) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftDate(endDate, index - 6)
    const stats = dayStats(habits, date)
    return { date, label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(new Date(`${date}T12:00:00`)), done: stats.completed.length, total: stats.scheduled.length, percent: stats.percent }
  })
}

export function unlockedAchievements(habits) {
  const completions = habits.flatMap((habit) => Object.values(habit.history || {})).filter((value) => value === true).length
  const bestStreak = Math.max(0, ...habits.map((habit) => calculateLongestStreak(habit)))
  return [
    { id: 'first', icon: 'Flame', name: 'First flame', detail: 'Complete your first habit', progress: Math.min(completions, 1), target: 1 },
    { id: 'week', icon: 'Zap', name: 'Week warrior', detail: 'Build a 7-day streak', progress: Math.min(bestStreak, 7), target: 7 },
    { id: 'month', icon: 'Gem', name: 'Diamond discipline', detail: 'Build a 30-day streak', progress: Math.min(bestStreak, 30), target: 30 },
    { id: 'century', icon: 'Trophy', name: 'Unstoppable', detail: 'Build a 100-day streak', progress: Math.min(bestStreak, 100), target: 100 },
    { id: 'hundred', icon: 'Sparkles', name: 'One hundred', detail: 'Log 100 habit completions', progress: Math.min(completions, 100), target: 100 },
  ].map((item) => ({ ...item, unlocked: item.progress >= item.target }))
}

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `daymark-backup-${todayKey()}.json`
  link.click()
  URL.revokeObjectURL(link.href)
}
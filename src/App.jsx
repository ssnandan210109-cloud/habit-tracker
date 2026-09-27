import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppIcon, EmptyState, HabitCard, HabitDialog, ProgressRing, SectionHeading } from './components.jsx'
import Onboarding from './Onboarding.jsx'
import { calculateCompletionRate, calculateLongestStreak, calculateMomentum, calculateStreak, dayStats, exportData, formatLongDate, isComplete, isScheduled, loadData, saveData, shiftDate, starterData, todayKey, unlockedAchievements, weeklyStats } from './data.js'

const NAV = [
  { id: 'dashboard', label: 'Overview', icon: 'LayoutDashboard' },
  { id: 'today', label: 'Today', icon: 'Sun' },
  { id: 'habits', label: 'My habits', icon: 'ListChecks' },
  { id: 'calendar', label: 'Calendar', icon: 'CalendarDays' },
  { id: 'insights', label: 'Insights', icon: 'ChartNoAxesCombined' },
  { id: 'achievements', label: 'Milestones', icon: 'Award' },
]
const QUOTES = ['Small progress is still progress.', 'You do not have to be perfect to be consistent.', 'Begin again. As many times as you need.', 'A little done is better than a lot planned.', 'Make space for the person you are becoming.']
const SUGGESTIONS = [
  { name: 'Take a mindful walk', category: 'Fitness', icon: 'Footprints', color: '#b4d98e', goal: '15 minutes', description: 'A little fresh air, every day' },
  { name: 'Read a few pages', category: 'Study', icon: 'BookOpen', color: '#f3c782', goal: '10 pages', description: 'Make room for a good story' },
  { name: 'Write down one thought', category: 'Personal', icon: 'NotebookPen', color: '#e5b8d5', goal: '5 minutes', description: 'A gentle end to the day' },
]

function getGreeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

function App() {
  const [data, setData] = useState(loadData)
  const protectedHabit = data.habits.find((habit) => habit.history?.[shiftDate(todayKey(), -1)] === 'shield')
  const [page, setPage] = useState('dashboard')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedHabitId, setSelectedHabitId] = useState(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState(() => protectedHabit ? [{ id: Date.now(), message: `${protectedHabit.name} streak protected by a Streak Shield.`, icon: 'Shield' }] : [])
  const [toast, setToast] = useState(() => protectedHabit ? 'Your streak was protected by a Streak Shield.' : '')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [focusHabit, setFocusHabit] = useState('')
  const [focusMinutes, setFocusMinutes] = useState(25)
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [todayTab, setTodayTab] = useState('all')
  const activeHabits = data.habits.filter((habit) => !habit.archived)
  const today = dayStats(activeHabits)
  const selectedHabit = data.habits.find((habit) => habit.id === selectedHabitId)

  useEffect(() => {
    if (!saveData(data)) setToast('Could not save locally. Check available browser storage.')
  }, [data])

  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme
  }, [data.settings.theme])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const handleKey = (event) => {
      const target = event.target
      const typing = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); return }
      if (event.key === 'Escape') { setCommandOpen(false); setDialogOpen(false); setSearchOpen(false); setNotificationOpen(false); return }
      if (typing || event.ctrlKey || event.metaKey || event.altKey) return
      const shortcuts = { n: () => openAdd(), t: () => setPage('today'), i: () => setPage('insights'), f: () => setPage('focus'), d: () => setData((current) => ({ ...current, settings: { ...current.settings, theme: current.settings.theme === 'light' ? 'dark' : 'light' } })) }
      shortcuts[event.key.toLowerCase()]?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  useEffect(() => {
    if (!timerRunning) return undefined
    const interval = window.setInterval(() => setSecondsLeft((left) => {
      if (left <= 1) { window.clearInterval(interval); setTimerRunning(false); setToast('Focus session complete. You showed up for yourself.'); return 0 }
      return left - 1
    }), 1000)
    return () => window.clearInterval(interval)
  }, [timerRunning])

  function openAdd() { setEditing(null); setDialogOpen(true) }
  function addNotification(message, icon = 'Sparkles') {
    setNotifications((current) => [{ id: Date.now(), message, icon }, ...current].slice(0, 8))
  }
  function toggleCompletion(habitId, date) {
    const existing = data.habits.find((habit) => habit.id === habitId)
    if (!existing || !isScheduled(existing, date)) return
    const wasComplete = isComplete(existing, date)
    const nextHabits = data.habits.map((habit) => habit.id === habitId ? { ...habit, history: { ...habit.history, [date]: !wasComplete } } : habit)
    const nextDay = dayStats(nextHabits.filter((habit) => !habit.archived), date)
    const beforeAchievements = unlockedAchievements(data.habits).filter((item) => item.unlocked).map((item) => item.id)
    const afterAchievements = unlockedAchievements(nextHabits)
    const rewarded = data.awardedAchievements || []
    const newlyEarned = afterAchievements.filter((item) => item.unlocked && !beforeAchievements.includes(item.id) && !rewarded.includes(item.id))
    const milestoneXp = newlyEarned.reduce((total, item) => total + ({ week: 100, month: 500 }[item.id] || 0), 0)
    const earnsXp = date === todayKey() && !wasComplete
    const firstPerfectDay = earnsXp && nextDay.percent === 100 && !(data.perfectDays || []).includes(date)
    setData((current) => ({ ...current, habits: nextHabits, xp: Math.max(0, current.xp + (earnsXp ? 10 : 0) + (firstPerfectDay ? 50 : 0) + milestoneXp), perfectDays: firstPerfectDay ? [...(current.perfectDays || []), date] : current.perfectDays || [], awardedAchievements: [...(current.awardedAchievements || []), ...newlyEarned.map((item) => item.id)] }))
    if (!wasComplete) {
      setToast(firstPerfectDay ? 'Perfect day. That is worth celebrating.' : earnsXp ? `+10 XP · ${existing.name} complete` : `${existing.name} updated.`)
      addNotification(firstPerfectDay ? 'A perfect day, all yours.' : `${existing.name} checked off.`, firstPerfectDay ? 'PartyPopper' : 'Check')
      const earned = newlyEarned[0]
      if (earned) { setToast(`Milestone unlocked · ${earned.name}`); addNotification(`${earned.name} milestone unlocked.`, earned.icon) }
    } else setToast('Habit updated.')
  }

  function saveHabit(habit) {
    const savedHabit = { ...habit, startDate: habit.startDate || todayKey() }
    const exists = data.habits.some((item) => item.id === habit.id)
    setData((current) => ({ ...current, habits: exists ? current.habits.map((item) => item.id === habit.id ? savedHabit : item) : [savedHabit, ...current.habits] }))
    setDialogOpen(false)
    setEditing(null)
    setToast(exists ? 'Your changes are saved.' : 'A good thing to come back to.')
  }
  function archiveHabit(habit) {
    setData((current) => ({ ...current, habits: current.habits.map((item) => item.id === habit.id ? { ...item, archived: !item.archived } : item) }))
    setToast(habit.archived ? 'Habit restored.' : 'Habit moved to your archive.')
    if (page === 'habit-detail') setPage('habits')
  }
  function deleteHabit(habit) {
    if (!window.confirm(`Delete “${habit.name}” and its history? This cannot be undone.`)) return
    setData((current) => ({ ...current, habits: current.habits.filter((item) => item.id !== habit.id) }))
    setPage('habits')
    setToast('Habit and its history deleted.')
  }
  function selectPage(nextPage) { setPage(nextPage); setSelectedHabitId(null); setNotificationOpen(false) }

  const visibleHabits = activeHabits.filter((habit) => `${habit.name} ${habit.description} ${habit.category}`.toLowerCase().includes(query.toLowerCase()))
  const week = useMemo(() => weeklyStats(activeHabits), [activeHabits])
  const achievements = useMemo(() => unlockedAchievements(data.habits), [data.habits])
  const totalCompletions = data.habits.reduce((total, habit) => total + Object.values(habit.history || {}).filter((value) => value === true).length, 0)
  const averageRate = activeHabits.length ? Math.round(activeHabits.reduce((total, habit) => total + calculateCompletionRate(habit), 0) / activeHabits.length) : 0
  const momentum = calculateMomentum(activeHabits)
  const allDays = useMemo(() => Array.from({ length: 365 }, (_, index) => shiftDate(todayKey(), index - 364)), [])

  function renderDashboard() {
    const level = Math.floor(data.xp / 500) + 1
    const levelProgress = data.xp % 500
    return <>
      <section className="welcome-row"><div><span className="eyebrow">{formatLongDate()}</span><h1>{getGreeting()}, Shiva<span className="greeting-dot">.</span></h1><p>A little consistency goes a long way. Here's your day, at a glance.</p></div><button className="button button-primary desktop-add" onClick={openAdd}><AppIcon name="Plus" size={18} /> New habit <kbd>N</kbd></button></section>
      <section className="overview-banner">
        <div className="overview-copy"><span className="eyebrow light">YOUR DAILY RHYTHM</span><h2>{today.percent === 100 ? 'You did it. A day well kept.' : today.completed.length ? 'Look at you, showing up.' : 'Make today count, gently.'}</h2><p>{today.scheduled.length ? `${today.completed.length} of ${today.scheduled.length} habits complete` : 'Set up your first small promise to begin.'}</p><div className="overview-actions"><button className="button button-lime" onClick={() => selectPage('today')}>Your day <AppIcon name="ArrowUpRight" size={16} /></button><span className="xp-note"><AppIcon name="Sparkles" size={15} /> Level {level} <span className="xp-track"><i style={{ width: `${levelProgress / 5}%` }} /></span> {levelProgress}/500 XP</span></div></div>
        <div className="overview-ring"><ProgressRing value={today.percent} size={142} stroke={9} label="of today" dark /></div>
        <div className="banner-orbit orbit-one" /><div className="banner-orbit orbit-two" />
      </section>
      <div className="section-heading dashboard-habits-heading"><div><span className="eyebrow">YOUR ROUTINE</span><h2>Today's habits <span className="count-chip">{today.scheduled.length}</span></h2></div><button className="text-link" onClick={() => selectPage('habits')}>All habits <AppIcon name="ArrowRight" size={15} /></button></div>
      {visibleHabits.length ? <div className="habit-grid">{visibleHabits.slice(0, 4).map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={toggleCompletion} onEdit={() => { setEditing(habit); setDialogOpen(true) }} onArchive={() => archiveHabit(habit)} onSelect={() => { setSelectedHabitId(habit.id); setPage('habit-detail') }} />)}</div> : <EmptyState icon="Sprout" title="Your journey starts here" detail="Choose one small thing you would like to make room for." action="Create your first habit" onAction={openAdd} />}
      <div className="dashboard-lower"><section className="panel weekly-panel"><div className="panel-title"><div><span className="eyebrow">A WEEK IN VIEW</span><h3>Your rhythm</h3></div><span className="panel-note">last 7 days</span></div><WeeklyChart data={week} /></section><section className="panel suggestion-panel"><div className="panel-title"><div><span className="eyebrow">A PLACE TO BEGIN</span><h3>Try something small</h3></div><AppIcon name="Sprout" size={20} /></div><div className="suggestion-list">{SUGGESTIONS.slice(0, 2).map((suggestion) => <button key={suggestion.name} className="suggestion-row" onClick={() => saveHabit({ ...suggestion, id: Math.random().toString(36).slice(2), frequency: 'Daily', days: [0, 1, 2, 3, 4, 5, 6], history: {} })}><span className="suggestion-icon" style={{ '--habit-color': suggestion.color }}><AppIcon name={suggestion.icon} size={18} /></span><span><strong>{suggestion.name}</strong><small>{suggestion.goal}</small></span><span className="suggest-add">Add <AppIcon name="Plus" size={14} /></span></button>)}</div></section></div>
      <div className="dashboard-footer-grid"><section className="mini-stat-panel"><span className="stat-icon coral"><AppIcon name="Flame" size={18} /></span><div><strong>{Math.max(0, ...activeHabits.map((habit) => calculateStreak(habit)))} days</strong><span>Longest current streak</span></div></section><section className="mini-stat-panel"><span className="stat-icon blue"><AppIcon name="Activity" size={18} /></span><div><strong>{momentum}%</strong><span>Your 7-day momentum</span></div></section><section className="mini-stat-panel"><span className="stat-icon green"><AppIcon name="CheckCheck" size={18} /></span><div><strong>{totalCompletions}</strong><span>Moments you showed up</span></div></section></div>
    </>
  }

  function renderToday() {
    const filtered = todayTab === 'done' ? today.scheduled.filter((habit) => isComplete(habit, todayKey())) : todayTab === 'remaining' ? today.scheduled.filter((habit) => !isComplete(habit, todayKey())) : today.scheduled
    return <>
      <SectionHeading eyebrow={formatLongDate()} title="Today, your way." detail="No perfect days required. Just the next small thing." action="Add a habit" onAction={openAdd} />
      <div className="today-summary"><ProgressRing value={today.percent} size={104} stroke={8} /><div><span className="eyebrow">A GOOD START</span><h3>{today.completed.length} of {today.scheduled.length} done</h3><p>{today.remaining ? `${today.remaining} more ${today.remaining === 1 ? 'habit' : 'habits'} whenever you're ready.` : today.scheduled.length ? 'Everything you planned, done. Lovely.' : 'Pick a small thing to start.'}</p></div><span className="today-xp"><AppIcon name="Sparkles" size={18} /> {today.completed.length * 10} XP today</span></div>
      <div className="segmented-control">{[['all', 'Everything'], ['remaining', 'To do'], ['done', 'Done']].map(([id, label]) => <button key={id} className={todayTab === id ? 'active' : ''} onClick={() => setTodayTab(id)}>{label}</button>)}</div>
      <div className="today-list">{filtered.map((habit) => <HabitCard key={habit.id} habit={habit} compact onToggle={toggleCompletion} onEdit={() => { setEditing(habit); setDialogOpen(true) }} onArchive={() => archiveHabit(habit)} onSelect={() => { setSelectedHabitId(habit.id); setPage('habit-detail') }} />)}</div>
      {!today.scheduled.length && <EmptyState icon="Sun" title="A fresh page" detail="Add a habit and give today a gentle shape." action="Add your first habit" onAction={openAdd} />}
      <section className="quote-strip"><AppIcon name="Quote" size={19} /><p>{QUOTES[new Date().getDate() % QUOTES.length]}</p><span>— a note for today</span></section>
    </>
  }

  function renderHabits() {
    const archived = data.habits.filter((habit) => habit.archived)
    return <>
      <SectionHeading eyebrow="YOUR PRACTICE" title="Habits" detail={`${activeHabits.length} small promises, all in one place.`} action="Add a habit" onAction={openAdd} />
      <div className="filter-row"><div className="inline-search"><AppIcon name="Search" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a habit or category" /></div><span>{visibleHabits.length} showing</span></div>
      {visibleHabits.length ? <div className="habit-grid">{visibleHabits.map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={toggleCompletion} onEdit={() => { setEditing(habit); setDialogOpen(true) }} onArchive={() => archiveHabit(habit)} onSelect={() => { setSelectedHabitId(habit.id); setPage('habit-detail') }} />)}</div> : <EmptyState icon="Leaf" title="No habits found" detail="Try another search, or begin with one small habit." action="Create a habit" onAction={openAdd} />}
      {archived.length > 0 && <section className="archived-section"><h3><AppIcon name="Archive" size={18} /> Archived <span>{archived.length}</span></h3><div className="archived-list">{archived.map((habit) => <div key={habit.id} className="archived-item"><span className="habit-icon"><AppIcon name={habit.icon} size={18} /></span><strong>{habit.name}</strong><button className="text-link" onClick={() => archiveHabit(habit)}>Restore <AppIcon name="RotateCcw" size={14} /></button></div>)}</div></section>}
    </>
  }

  function renderCalendar() {
    const year = calendarMonth.getFullYear()
    const month = calendarMonth.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const monthDays = new Date(year, month + 1, 0).getDate()
    const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: monthDays }, (_, index) => index + 1)]
    const stats = dayStats(activeHabits, selectedDate)
    const monthLabel = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(calendarMonth)
    return <>
      <SectionHeading eyebrow="YOUR HISTORY" title="Calendar" detail="Every day is part of the practice." />
      <section className="calendar-layout panel"><div className="calendar-main"><div className="calendar-month-heading"><button className="icon-button" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} aria-label="Previous month"><AppIcon name="ChevronLeft" /></button><h3>{monthLabel}</h3><button className="icon-button" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} aria-label="Next month"><AppIcon name="ChevronRight" /></button><button className="button button-quiet today-button" onClick={() => { setCalendarMonth(new Date()); setSelectedDate(todayKey()) }}>Today</button></div>
        <div className="calendar-grid">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`} className="calendar-weekday">{day}</span>)}{cells.map((day, index) => {
          if (!day) return <span key={`blank-${index}`} />
          const date = todayKey(new Date(year, month, day))
          const dayStat = dayStats(activeHabits, date)
          const isToday = date === todayKey()
          const intensity = dayStat.scheduled.length ? Math.ceil(dayStat.percent / 25) : 0
          return <button key={date} className={`calendar-day intensity-${intensity} ${date === selectedDate ? 'selected' : ''} ${isToday ? 'is-today' : ''}`} onClick={() => setSelectedDate(date)} aria-label={`${date}, ${dayStat.completed.length} of ${dayStat.scheduled.length} habits complete`}><span>{day}</span>{dayStat.scheduled.length > 0 && <i />}</button>
        })}</div><div className="calendar-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((value) => <i key={value} className={`intensity-${value}`} />)}<span>More</span></div></div>
        <aside className="calendar-detail"><span className="eyebrow">DAY IN REVIEW</span><h3>{formatLongDate(new Date(`${selectedDate}T12:00:00`))}</h3><div className="calendar-day-score"><ProgressRing value={stats.percent} size={75} stroke={6} /><span><strong>{stats.completed.length} / {stats.scheduled.length}</strong><small>habits complete</small></span></div><div className="calendar-habit-list">{stats.scheduled.length ? stats.scheduled.map((habit) => <div key={habit.id} className="calendar-habit-row"><span className="tiny-habit-icon" style={{ '--habit-color': habit.color }}><AppIcon name={habit.icon} size={14} /></span><span>{habit.name}</span><AppIcon name={isComplete(habit, selectedDate) ? 'CircleCheck' : 'Circle'} size={16} className={isComplete(habit, selectedDate) ? 'text-green' : 'text-muted'} /></div>) : <p className="muted-copy">Nothing scheduled on this day.</p>}</div></aside></section>
    </>
  }

  function renderInsights() {
    const completionsByDay = (date) => activeHabits.filter((habit) => isComplete(habit, date)).length
    const best = [...activeHabits].sort((a, b) => calculateCompletionRate(b) - calculateCompletionRate(a))[0]
    const missed = [...activeHabits].sort((a, b) => calculateCompletionRate(a) - calculateCompletionRate(b))[0]
    const bestStreak = Math.max(0, ...activeHabits.map((habit) => calculateLongestStreak(habit)))
    return <>
      <SectionHeading eyebrow="THE BIGGER PICTURE" title="Your insights" detail="Patterns, not pressure. Here's what your days are telling you." />
      <div className="insight-stats"><InsightStat icon="Target" label="Consistency" value={`${averageRate}%`} tint="lime" /><InsightStat icon="Flame" label="Longest streak" value={`${bestStreak} days`} tint="coral" /><InsightStat icon="CheckCheck" label="Total check-ins" value={totalCompletions} tint="blue" /><InsightStat icon="Sparkles" label="Experience" value={`${data.xp} XP`} tint="violet" /></div>
      <div className="insights-grid"><section className="panel chart-panel"><div className="panel-title"><div><span className="eyebrow">LAST SEVEN DAYS</span><h3>Consistency, day by day</h3></div><span className="chart-legend"><i /> Completed</span></div><WeeklyChart data={week} large /></section><section className="panel momentum-panel"><span className="eyebrow">RIGHT NOW</span><h3>Your momentum</h3><div className="momentum-number">{momentum}<small>%</small></div><div className="momentum-track"><i style={{ width: `${momentum}%` }} /></div><p>{momentum >= 75 ? 'A steady rhythm is taking shape.' : momentum >= 40 ? 'Every check-in is building a little more trust.' : 'There is no late. Begin again, right here.'}</p><span className="momentum-caption"><AppIcon name="Activity" size={15} /> Based on your last 7 days</span></section></div>
      <section className="panel heatmap-panel"><div className="panel-title"><div><span className="eyebrow">ONE DAY AT A TIME</span><h3>Your year in little wins</h3></div><span className="panel-note">365 days</span></div><div className="heatmap-months"><span>Sep</span><span>Oct</span><span>Nov</span><span>Dec</span><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span></div><div className="heatmap-grid">{allDays.map((date) => { const stat = dayStats(activeHabits, date); const intensity = stat.scheduled.length ? Math.ceil(stat.percent / 25) : 0; return <button key={date} className={`heatmap-cell intensity-${intensity}`} title={`${date} · ${stat.completed.length} / ${stat.scheduled.length} habits`} aria-label={`${date}: ${stat.completed.length} of ${stat.scheduled.length} completed`} onClick={() => { setSelectedDate(date); setPage('calendar') }} /> })}</div><div className="heatmap-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((value) => <i key={value} className={`intensity-${value}`} />)}<span>More</span></div></section>
      <section className="insight-bottom"><div className="panel performance-panel"><span className="eyebrow">A FEW NOTABLES</span><h3>What stands out</h3><PerformanceRow icon="Star" label="Most consistent" habit={best} value={best ? `${calculateCompletionRate(best)}% completion` : 'No habits yet'} /><PerformanceRow icon="RotateCcw" label="Needs a softer start" habit={missed} value={missed ? `${calculateCompletionRate(missed)}% completion` : 'No habits yet'} /><PerformanceRow icon="Trophy" label="Best streak" habit={activeHabits.sort((a, b) => calculateLongestStreak(b) - calculateLongestStreak(a))[0]} value={`${bestStreak} days`} /></div><div className="recovery-panel"><span className="recovery-spark"><AppIcon name="HeartHandshake" size={22} /></span><span className="eyebrow">A GENTLE REMINDER</span><h3>Missed a few days?</h3><p>That's part of being human. Pick your easiest habit and begin again today.</p><button className="button button-secondary" onClick={() => setPage('today')}>Reset & recover <AppIcon name="ArrowRight" size={15} /></button></div></section>
    </>
  }

  function renderAchievements() {
    const unlocked = achievements.filter((item) => item.unlocked).length
    return <><SectionHeading eyebrow="MILESTONES, NOT MILESTONES TO CHASE" title="The little things add up." detail={`${unlocked} of ${achievements.length} milestones found along the way.`} /><div className="achievement-banner"><span className="achievement-big-icon"><AppIcon name="Award" size={27} /></span><div><span className="eyebrow light">YOUR JOURNEY SO FAR</span><h3>{totalCompletions} times you chose to show up.</h3><p>That counts for more than you think.</p></div><ProgressRing value={achievements.length ? Math.round(unlocked / achievements.length * 100) : 0} size={95} stroke={7} dark /></div><div className="achievement-grid">{achievements.map((item, index) => <motion.article key={item.id} className={`achievement-card ${item.unlocked ? 'unlocked' : 'locked'}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}><span className={`achievement-icon ${item.unlocked ? '' : 'is-locked'}`}><AppIcon name={item.icon} size={24} /></span><span className="achievement-status">{item.unlocked ? 'UNLOCKED' : 'IN PROGRESS'}</span><h3>{item.name}</h3><p>{item.detail}</p><div className="achievement-progress"><span><i style={{ width: `${Math.min(100, item.progress / item.target * 100)}%` }} /></span><small>{item.progress} / {item.target}</small></div></motion.article>)}</div></>
  }

  function renderFocus() {
    const active = activeHabits.find((habit) => habit.id === focusHabit) || activeHabits[0]
    const ringValue = focusMinutes ? 100 * secondsLeft / (focusMinutes * 60) : 0
    return <section className="focus-screen"><span className="eyebrow">A LITTLE SPACE FOR YOU</span><h1>Focus on one thing.</h1><p className="focus-subtitle">Nothing else needs your attention for a moment.</p><div className="focus-card"><div className="focus-decoration" /><div className="focus-task-select"><span className="habit-icon" style={{ '--habit-color': active?.color }}><AppIcon name={active?.icon || 'Sparkles'} size={22} /></span><select aria-label="Choose a habit to focus on" value={active?.id || ''} onChange={(event) => setFocusHabit(event.target.value)}>{activeHabits.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}</select><AppIcon name="ChevronDown" size={15} /></div><div className="focus-timer"><ProgressRing value={ringValue} size={232} stroke={5} /><div className="timer-readout">{String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}</div></div><div className="timer-presets">{[5, 15, 25, 45, 60].map((minutes) => <button className={focusMinutes === minutes ? 'active' : ''} key={minutes} onClick={() => { setFocusMinutes(minutes); setSecondsLeft(minutes * 60); setTimerRunning(false) }}>{minutes} min</button>)}</div><button className="button button-primary focus-start" onClick={() => { if (!active) { setToast('Add a habit before starting a focus session.'); return } if (secondsLeft === 0) setSecondsLeft(focusMinutes * 60); setTimerRunning(!timerRunning) }}><AppIcon name={timerRunning ? 'Pause' : 'Play'} size={17} /> {timerRunning ? 'Pause session' : 'Start focusing'}</button></div><button className="text-link focus-exit" onClick={() => setPage('dashboard')}><AppIcon name="ArrowLeft" size={15} /> Back to your day</button></section>
  }

  function renderSettings() {
    return <><SectionHeading eyebrow="MAKE IT YOURS" title="Settings" detail="A few preferences to make Daymark feel like home." /><div className="settings-layout"><section className="panel settings-panel"><div className="settings-group"><span className="eyebrow">APPEARANCE</span><SettingRow icon="Moon" title="Dark mode" detail="A softer view for evening check-ins"><button className={`toggle ${data.settings.theme === 'dark' ? 'on' : ''}`} role="switch" aria-checked={data.settings.theme === 'dark'} onClick={() => setData((current) => ({ ...current, settings: { ...current.settings, theme: current.settings.theme === 'dark' ? 'light' : 'dark' } }))}><i /></button></SettingRow><SettingRow icon="PartyPopper" title="Celebrations" detail="Small moments of joy when you finish"><button className={`toggle ${data.settings.celebrations ? 'on' : ''}`} role="switch" aria-checked={Boolean(data.settings.celebrations)} onClick={() => setData((current) => ({ ...current, settings: { ...current.settings, celebrations: !current.settings.celebrations } }))}><i /></button></SettingRow><SettingRow icon="Shield" title="Streak shields" detail="A gentle safety net for a missed day"><span className="shield-count"><AppIcon name="Shield" size={15} /> {data.settings.shields ?? 2} available</span></SettingRow></div><div className="settings-group"><span className="eyebrow">YOUR DATA</span><SettingRow icon="Download" title="Export your data" detail="Download a private JSON backup"><button className="button button-secondary small" onClick={() => exportData(data)}>Export <AppIcon name="Download" size={15} /></button></SettingRow><SettingRow icon="Upload" title="Import a backup" detail="Restore habits from a Daymark JSON file"><label className="button button-secondary small upload-button">Choose file <AppIcon name="Upload" size={15} /><input type="file" accept="application/json,.json" onChange={(event) => importBackup(event)} /></label></SettingRow><SettingRow icon="RotateCcw" title="Start fresh" detail="Remove your habits and begin again"><button className="button button-danger small" onClick={() => { if (window.confirm('This will remove all habits and history. Continue?')) { setData({ ...starterData(), habits: [] }); setPage('dashboard'); setToast('Your space is fresh and ready.') } }}>Reset data</button></SettingRow></div><div className="settings-group"><span className="eyebrow">KEYBOARD SHORTCUTS</span><div className="shortcut-list"><Shortcut label="Open command center" keys="Ctrl K" /><Shortcut label="New habit" keys="N" /><Shortcut label="Today" keys="T" /><Shortcut label="Insights" keys="I" /><Shortcut label="Focus mode" keys="F" /><Shortcut label="Toggle theme" keys="D" /></div></div></section><aside className="settings-aside"><div className="about-mark"><span className="brand-mark"><AppIcon name="SunMedium" size={22} /></span><strong>Daymark</strong><span>Make room for better.</span></div><p>Your habits and history stay on this device. Nothing is sent to a server.</p><span className="version-label">VERSION 1.0 · PRIVATE BY DESIGN</span></aside></div></>
  }

  function importBackup(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result)
        const validHistory = (history) => history === undefined || (history && typeof history === 'object' && !Array.isArray(history) && Object.entries(history).every(([date, value]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && [true, false, 'shield'].includes(value)))
        const validHabit = (habit) => habit && typeof habit.id === 'string' && typeof habit.name === 'string' && habit.name.trim() && (habit.days === undefined || (Array.isArray(habit.days) && habit.days.every((day) => Number.isInteger(day) && day >= 0 && day <= 6))) && validHistory(habit.history)
        if (!imported || !Array.isArray(imported.habits) || !imported.habits.every(validHabit) || (imported.settings !== undefined && (!imported.settings || typeof imported.settings !== 'object' || Array.isArray(imported.settings)))) throw new Error('Invalid backup')
        const defaults = starterData()
        setData({ ...defaults, ...imported, onboardingComplete: true, xp: Number.isFinite(imported.xp) && imported.xp >= 0 ? imported.xp : 0, settings: { ...defaults.settings, ...imported.settings, theme: ['light', 'dark'].includes(imported.settings?.theme) ? imported.settings.theme : defaults.settings.theme }, habits: imported.habits.map((habit) => ({ ...habit, days: Array.isArray(habit.days) ? habit.days : [0, 1, 2, 3, 4, 5, 6], history: habit.history || {} })) })
        setToast('Your backup is restored.')
      } catch { setToast('That file does not look like a Daymark backup.') }
      event.target.value = ''
    }
    reader.onerror = () => setToast('The file could not be read. Please try again.')
    reader.readAsText(file)
  }

  function renderDetail() {
    if (!selectedHabit) return <EmptyState icon="Leaf" title="Habit not found" detail="It may have been removed from your list." action="Back to habits" onAction={() => setPage('habits')} />
    const streak = calculateStreak(selectedHabit)
    const rate = calculateCompletionRate(selectedHabit)
    const historyDays = Array.from({ length: 84 }, (_, index) => shiftDate(todayKey(), index - 83))
    const completionCount = Object.values(selectedHabit.history).filter((value) => value === true).length
    return <><button className="text-link back-link" onClick={() => setPage('habits')}><AppIcon name="ArrowLeft" size={15} /> All habits</button><section className="detail-hero" style={{ '--habit-color': selectedHabit.color }}><span className="habit-icon detail-icon"><AppIcon name={selectedHabit.icon} size={26} /></span><div className="detail-heading-copy"><span className="eyebrow">{selectedHabit.category} · {selectedHabit.frequency}</span><h1>{selectedHabit.name}</h1><p>{selectedHabit.description || 'A small promise, kept your way.'}</p></div><button className="button button-secondary" onClick={() => { setEditing(selectedHabit); setDialogOpen(true) }}><AppIcon name="Pencil" size={16} /> Edit habit</button></section><div className="detail-stats"><InsightStat icon="Flame" label="Current streak" value={`${streak} days`} tint="coral" /><InsightStat icon="Trophy" label="Longest streak" value={`${Math.max(streak, calculateLongestStreak(selectedHabit))} days`} tint="lime" /><InsightStat icon="Target" label="Completion rate" value={`${rate}%`} tint="blue" /><InsightStat icon="CheckCheck" label="Total check-ins" value={completionCount} tint="violet" /></div><section className="panel detail-history"><div className="panel-title"><div><span className="eyebrow">LAST 12 WEEKS</span><h3>Your consistency, day by day</h3></div></div><div className="detail-heatmap">{historyDays.map((date) => <button key={date} className={`heatmap-cell ${isComplete(selectedHabit, date) ? 'intensity-4' : 'intensity-0'}`} title={`${date}${isComplete(selectedHabit, date) ? ' · complete' : ''}`} aria-label={`${date}${isComplete(selectedHabit, date) ? ', completed' : ', not completed'}`} onClick={() => toggleCompletion(selectedHabit.id, date)} />)}</div></section><div className="detail-actions"><button className="button button-secondary" onClick={() => archiveHabit(selectedHabit)}><AppIcon name={selectedHabit.archived ? 'ArchiveRestore' : 'Archive'} size={16} /> {selectedHabit.archived ? 'Restore habit' : 'Archive habit'}</button><button className="button button-danger" onClick={() => deleteHabit(selectedHabit)}><AppIcon name="Trash2" size={16} /> Delete habit</button></div></>
  }

  function runCommand(command) {
    setCommandOpen(false)
    if (command === 'add') openAdd()
    else if (command === 'theme') setData((current) => ({ ...current, settings: { ...current.settings, theme: current.settings.theme === 'light' ? 'dark' : 'light' } }))
    else if (command === 'search') setSearchOpen(true)
    else selectPage(command)
  }

  const currentTitle = ({ dashboard: 'Overview', today: 'Today', habits: 'My habits', calendar: 'Calendar', insights: 'Insights', achievements: 'Milestones', focus: 'Focus mode', settings: 'Settings', 'habit-detail': selectedHabit?.name || 'Habit details' })[page] || 'Overview'

  if (!data.onboardingComplete) {
    return <Onboarding onComplete={(habits) => setData((current) => ({ ...current, habits, onboardingComplete: true }))} />
  }

  return <MotionConfig reducedMotion="user"><div className="app-shell">
    <aside className="sidebar"><button className="brand-lockup" onClick={() => selectPage('dashboard')}><span className="brand-mark"><AppIcon name="SunMedium" size={22} /></span><span><strong>daymark</strong><small>MAKE ROOM FOR BETTER</small></span></button><span className="nav-caption">YOUR SPACE</span><nav className="side-nav" aria-label="Main navigation">{NAV.map((item) => <button key={item.id} className={`nav-item ${page === item.id || (page === 'habit-detail' && item.id === 'habits') ? 'active' : ''}`} onClick={() => selectPage(item.id)}><AppIcon name={item.icon} size={18} /><span>{item.label}</span>{item.id === 'today' && today.remaining > 0 && <i className="nav-count">{today.remaining}</i>}</button>)}</nav><div className="sidebar-spacer" /><button className={`nav-item focus-nav ${page === 'focus' ? 'active' : ''}`} onClick={() => selectPage('focus')}><AppIcon name="Timer" size={18} /><span>Focus mode</span><kbd>F</kbd></button><button className={`nav-item ${page === 'settings' ? 'active' : ''}`} onClick={() => selectPage('settings')}><AppIcon name="Settings2" size={18} /><span>Settings</span></button><div className="sidebar-profile"><span className="avatar">S</span><span><strong>Shiva</strong><small>Making it count</small></span><button className="icon-button quiet" title="Toggle color theme" aria-label="Toggle color theme" onClick={() => setData((current) => ({ ...current, settings: { ...current.settings, theme: current.settings.theme === 'light' ? 'dark' : 'light' } }))}><AppIcon name={data.settings.theme === 'light' ? 'Moon' : 'Sun'} size={17} /></button></div></aside>
    <main className="main-area"><header className="topbar"><div className="mobile-brand"><span className="brand-mark"><AppIcon name="SunMedium" size={20} /></span><strong>daymark</strong></div><div className="breadcrumb"><span>YOUR SPACE</span><AppIcon name="ChevronRight" size={13} /><strong>{currentTitle}</strong></div><div className="topbar-actions"><button className="search-trigger" onClick={() => setSearchOpen(true)}><AppIcon name="Search" size={16} /><span>Search anything</span><kbd>⌘ K</kbd></button><button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotificationOpen((value) => !value)}><AppIcon name="Bell" size={18} />{notifications.length > 0 && <i />}</button><button className="avatar top-avatar" aria-label="Open settings" onClick={() => selectPage('settings')}>S</button></div></header>
      <div className={`page-content ${page === 'focus' ? 'focus-page' : ''}`} key={page}><AnimatePresence mode="wait"><motion.div key={page} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
        {page === 'dashboard' && renderDashboard()}{page === 'today' && renderToday()}{page === 'habits' && renderHabits()}{page === 'calendar' && renderCalendar()}{page === 'insights' && renderInsights()}{page === 'achievements' && renderAchievements()}{page === 'focus' && renderFocus()}{page === 'settings' && renderSettings()}{page === 'habit-detail' && renderDetail()}
      </motion.div></AnimatePresence></div>
    </main>
    <nav className="mobile-nav" aria-label="Mobile navigation">{[['dashboard', 'Home', 'LayoutDashboard'], ['today', 'Today', 'Sun'], ['habits', 'Habits', 'ListChecks'], ['insights', 'Insights', 'ChartNoAxesCombined'], ['settings', 'More', 'Menu']].map(([id, label, icon]) => <button key={id} className={page === id || (page === 'habit-detail' && id === 'habits') ? 'active' : ''} onClick={() => selectPage(id)}><AppIcon name={icon} size={19} /><span>{label}</span></button>)}</nav>
    <HabitDialog open={dialogOpen} habit={editing} onClose={() => setDialogOpen(false)} onSave={saveHabit} />
    <AnimatePresence>{notificationOpen && <motion.div className="notification-popover" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}><div className="popover-heading"><strong>Notifications</strong><button className="text-link" onClick={() => setNotifications([])}>Clear</button></div>{notifications.length ? notifications.map((item) => <div key={item.id} className="notification-item"><span><AppIcon name={item.icon} size={16} /></span><p>{item.message}</p></div>) : <div className="notification-empty"><AppIcon name="BellOff" size={21} /><p>You're all caught up.</p></div>}</motion.div>}</AnimatePresence>
    <AnimatePresence>{(commandOpen || searchOpen) && <CommandPalette search={searchOpen} habits={data.habits} onClose={() => { setCommandOpen(false); setSearchOpen(false); setQuery('') }} onRun={runCommand} onQuery={setQuery} onOpenHabit={(habit) => { setSelectedHabitId(habit.id); setPage('habit-detail'); setCommandOpen(false); setSearchOpen(false) }} />}</AnimatePresence>
    <AnimatePresence>{toast && <motion.div className="toast-message" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><AppIcon name="Sparkles" size={16} />{toast}</motion.div>}</AnimatePresence>
  </div></MotionConfig>
}

function WeeklyChart({ data, large = false }) {
  return <div className={`weekly-chart ${large ? 'large' : ''}`}><ResponsiveContainer width="100%" height={large ? 250 : 172}><BarChart data={data} margin={{ top: 8, right: 4, left: -25, bottom: 0 }}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} dy={8} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 10 }} /><Tooltip cursor={{ fill: 'var(--chart-hover)' }} contentStyle={{ border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 10, color: 'var(--text)', fontSize: 12 }} formatter={(value, name, item) => [`${value} / ${item.payload.total}`, 'Habits completed']} /><Bar dataKey="done" fill="var(--chart-fill)" radius={[5, 5, 1, 1]} maxBarSize={30} /></BarChart></ResponsiveContainer></div>
}

function InsightStat({ icon, label, value, tint }) { return <div className="insight-stat"><span className={`stat-icon ${tint}`}><AppIcon name={icon} size={18} /></span><span className="eyebrow">{label}</span><strong>{value}</strong></div> }
function PerformanceRow({ icon, label, habit, value }) { return <div className="performance-row"><span className="performance-icon"><AppIcon name={icon} size={17} /></span><span><small>{label}</small><strong>{habit?.name || 'Not enough data yet'}</strong></span><em>{value}</em></div> }
function SettingRow({ icon, title, detail, children }) { return <div className="setting-row"><span className="setting-icon"><AppIcon name={icon} size={17} /></span><span className="setting-copy"><strong>{title}</strong><small>{detail}</small></span>{children}</div> }
function Shortcut({ label, keys }) { return <div className="shortcut-row"><span>{label}</span><kbd>{keys}</kbd></div> }

function CommandPalette({ search, habits, onClose, onRun, onQuery, onOpenHabit }) {
  const [filter, setFilter] = useState('')
  function navigateResults(event) {
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return
    const buttons = [...event.currentTarget.parentElement.nextElementSibling.querySelectorAll('button')]
    if (!buttons.length) return
    event.preventDefault()
    const activeIndex = buttons.indexOf(document.activeElement)
    if (event.key === 'Enter') buttons[activeIndex < 0 ? 0 : activeIndex].click()
    else buttons[(activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length].focus()
  }
  const commands = [{ id: 'add', label: 'Create a new habit', icon: 'Plus', hint: 'N' }, { id: 'search', label: 'Search habits', icon: 'Search' }, ...NAV.map((item) => ({ id: item.id, label: `Go to ${item.label}`, icon: item.icon })), { id: 'focus', label: 'Start focus mode', icon: 'Timer', hint: 'F' }, { id: 'theme', label: 'Toggle dark mode', icon: 'Moon', hint: 'D' }]
  const filteredCommands = commands.filter((command) => command.label.toLowerCase().includes(filter.toLowerCase()))
  const filteredHabits = habits.filter((habit) => `${habit.name} ${habit.category}`.toLowerCase().includes(filter.toLowerCase()))
  return <motion.div className="command-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}><motion.div className="command-palette" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }}><div className="command-input"><AppIcon name="Search" size={19} /><input autoFocus onKeyDown={navigateResults} placeholder={search ? 'Search habits, categories...' : 'What would you like to do?'} value={filter} onChange={(event) => { setFilter(event.target.value); onQuery(event.target.value) }} /><kbd>ESC</kbd></div><div className="command-results">{search && filteredHabits.length > 0 && <><span className="command-label">HABITS</span>{filteredHabits.slice(0, 5).map((habit) => <button key={habit.id} onClick={() => onOpenHabit(habit)}><span className="command-icon" style={{ '--habit-color': habit.color }}><AppIcon name={habit.icon} size={16} /></span>{habit.name}<small>{habit.category}</small></button>)}</>}{filteredCommands.length > 0 && <><span className="command-label">{search ? 'ACTIONS & PAGES' : 'QUICK ACTIONS'}</span>{filteredCommands.slice(0, 8).map((command) => <button key={command.id} onClick={() => onRun(command.id)}><span className="command-icon"><AppIcon name={command.icon} size={16} /></span>{command.label}{command.hint && <kbd>{command.hint}</kbd>}</button>)}</>}{!filteredCommands.length && !filteredHabits.length && <p className="command-no-results">Nothing found. Try another search.</p>}</div><div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to select</span><span>Daymark command center</span></div></motion.div></motion.div>
}

export default App
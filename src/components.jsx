import { useEffect, useState } from 'react'
import {
  Activity, Archive, ArchiveRestore, ArrowLeft, ArrowRight, ArrowUpRight, Award, Bell, BellOff,
  BookOpen, Brain, CalendarDays, ChartNoAxesCombined, Check, CheckCheck, ChevronDown, ChevronLeft,
  ChevronRight, Circle, CircleCheck, Coffee, Download, Droplets, Dumbbell, Flame, Footprints, Gem,
  Heart, HeartHandshake, HeartPulse, LayoutDashboard, Leaf, ListChecks, ListTodo, LockKeyhole, Menu,
  Moon, NotebookPen, PartyPopper, Pause, Pencil, PenLine, Play, Plus, Quote, RotateCcw, Search,
  Settings2, Shield, Sparkles, Sprout, Star, Sun, SunMedium, Target, Timer, Trophy, Trash2, Upload,
  X, Zap,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { calculateCompletionRate, calculateLongestStreak, calculateStreak, isComplete, isScheduled, shiftDate, todayKey } from './data.js'

const LUCIDE_ICONS = {
  Activity, Archive, ArchiveRestore, ArrowLeft, ArrowRight, ArrowUpRight, Award, Bell, BellOff,
  BookOpen, Brain, CalendarDays, ChartNoAxesCombined, Check, CheckCheck, ChevronDown, ChevronLeft,
  ChevronRight, Circle, CircleCheck, Coffee, Download, Droplets, Dumbbell, Flame, Footprints, Gem,
  Heart, HeartHandshake, HeartPulse, LayoutDashboard, Leaf, ListChecks, ListTodo, LockKeyhole, Menu,
  Moon, NotebookPen, PartyPopper, Pause, Pencil, PenLine, Play, Plus, Quote, RotateCcw, Search,
  Settings2, Shield, Sparkles, Sprout, Star, Sun, SunMedium, Target, Timer, Trophy, Trash2, Upload,
  X, Zap,
}

export function AppIcon({ name = 'Circle', size = 20, ...props }) {
  const Component = LUCIDE_ICONS[name] || Circle
  return <Component size={size} strokeWidth={1.8} {...props} />
}

export function ProgressRing({ value = 0, size = 104, stroke = 8, label, dark = false }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  return (
    <div className={`progress-ring ${dark ? 'progress-ring-dark' : ''}`} style={{ width: size, height: size }} role="img" aria-label={`${value}% complete`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} />
        <motion.circle className="ring-value" cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference * (1 - value / 100) }} transition={{ duration: 0.9, ease: 'easeOut' }} style={{ strokeDasharray: circumference }} />
      </svg>
      <div className="ring-copy"><strong>{value}%</strong>{label && <span>{label}</span>}</div>
    </div>
  )
}

export function HabitCard({ habit, onToggle, onEdit, onArchive, onSelect, compact = false }) {
  const streak = calculateStreak(habit)
  const rate = calculateCompletionRate(habit)
  const isDone = isComplete(habit, todayKey())
  const days = Array.from({ length: 7 }, (_, index) => shiftDate(todayKey(), index - 6))
  return (
    <motion.article layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} whileHover={{ y: -3 }} className={`habit-card ${isDone ? 'is-complete' : ''}`} style={{ '--habit-color': habit.color }}>
      <div className="habit-topline">
        <button className="habit-identity" onClick={onSelect} aria-label={`Open ${habit.name} details`}>
          <span className="habit-icon"><AppIcon name={habit.icon} size={21} /></span>
          <span className="habit-title-wrap"><strong>{habit.name}</strong><small>{habit.description || habit.category}</small></span>
        </button>
        <div className="habit-actions">
          <button className="icon-button quiet" aria-label={`Edit ${habit.name}`} title="Edit habit" onClick={onEdit}><AppIcon name="Pencil" size={16} /></button>
          <button className="icon-button quiet" aria-label={`Archive ${habit.name}`} title="Archive habit" onClick={onArchive}><AppIcon name="Archive" size={16} /></button>
        </div>
      </div>
      {!compact && <div className="habit-metrics">
        <span className="streak-label"><AppIcon name="Flame" size={15} /> {streak} day streak</span>
        <span className="metric-muted">Best {Math.max(streak, calculateLongestStreak(habit))} days</span>
        <span className="metric-muted">{rate}% this month</span>
      </div>}
      <div className="habit-bottomline">
        <div className="week-strip" aria-label={`Last seven days for ${habit.name}`}>
          {days.map((date) => {
            const completed = isComplete(habit, date)
            const scheduled = isScheduled(habit, date)
            const today = date === todayKey()
            return <button key={date} className={`week-day ${completed ? 'done' : ''} ${!scheduled ? 'unscheduled' : ''} ${today ? 'today' : ''}`} onClick={() => onToggle(habit.id, date)} aria-label={`${date}: ${completed ? 'completed' : scheduled ? 'not completed' : 'not scheduled'}`} title={`${date}${scheduled ? completed ? ' · complete' : ' · not complete' : ' · not scheduled'}`}><span>{new Intl.DateTimeFormat('en', { weekday: 'narrow' }).format(new Date(`${date}T12:00:00`))}</span><i>{completed ? <AppIcon name="Check" size={12} /> : ''}</i></button>
          })}
        </div>
        <button className={`complete-button ${isDone ? 'checked' : ''}`} onClick={() => onToggle(habit.id, todayKey())} aria-label={isDone ? `Mark ${habit.name} incomplete` : `Complete ${habit.name}`}>
          {isDone ? <><AppIcon name="Check" size={16} /> Done</> : <>Mark done <AppIcon name="ArrowUpRight" size={15} /></>}
        </button>
      </div>
    </motion.article>
  )
}

const COLORS = ['#a7c9ff', '#f3c782', '#b4d98e', '#e5b8d5', '#9ddbd2', '#ffad97']
const ICONS = ['Droplets', 'BookOpen', 'Footprints', 'NotebookPen', 'Dumbbell', 'Brain', 'Moon', 'Leaf', 'Pencil', 'Heart', 'Sun', 'Coffee']
const CATEGORIES = ['Health', 'Fitness', 'Study', 'Productivity', 'Personal', 'Finance', 'Sleep', 'Other']
const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function HabitDialog({ open, habit, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', description: '', category: 'Personal', icon: 'Sparkles', color: COLORS[0], frequency: 'Daily', days: [0, 1, 2, 3, 4, 5, 6], goal: '', reminder: '', startDate: todayKey() })
  const [error, setError] = useState('')
  useEffect(() => {
    if (!open) return
    setForm(habit ? { ...form, ...habit } : { name: '', description: '', category: 'Personal', icon: 'Sparkles', color: COLORS[0], frequency: 'Daily', days: [0, 1, 2, 3, 4, 5, 6], goal: '', reminder: '', startDate: todayKey() })
    setError('')
  }, [open, habit])
  const update = (field, value) => setForm((previous) => ({ ...previous, [field]: value }))
  const setFrequency = (frequency) => {
    const days = frequency === 'Weekdays' ? [1, 2, 3, 4, 5] : frequency === 'Weekends' ? [0, 6] : frequency === 'Daily' ? [0, 1, 2, 3, 4, 5, 6] : form.days
    setForm((previous) => ({ ...previous, frequency, days }))
  }
  const toggleDay = (day) => update('days', form.days.includes(day) ? form.days.filter((value) => value !== day) : [...form.days, day].sort())
  const submit = (event) => {
    event.preventDefault()
    if (!form.name.trim()) return setError('Give this habit a name to get started.')
    if (!form.days.length) return setError('Choose at least one day for this habit.')
    onSave({ ...form, name: form.name.trim(), id: habit?.id || Math.random().toString(36).slice(2), history: habit?.history || {} })
  }
  return <AnimatePresence>
    {open && <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.div className="habit-dialog" role="dialog" aria-modal="true" aria-labelledby="habit-dialog-title" initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.98 }}>
        <div className="dialog-heading"><div><span className="eyebrow">A SMALL PROMISE</span><h2 id="habit-dialog-title">{habit ? 'Edit habit' : 'Make it a habit'}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><AppIcon name="X" /></button></div>
        <div className="dialog-layout">
          <form className="habit-form" onSubmit={submit}>
            <label>Habit name<input autoFocus maxLength={50} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Take a morning walk" /></label>
            <label>A little note <span className="optional">Optional</span><input maxLength={80} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="What does this look like for you?" /></label>
            <div className="form-row"><label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label>Daily goal<input value={form.goal} onChange={(event) => update('goal', event.target.value)} placeholder="e.g. 20 minutes" /></label></div>
            <div className="form-label">Choose an icon</div><div className="icon-picker">{ICONS.map((icon) => <button type="button" key={icon} className={form.icon === icon ? 'selected' : ''} onClick={() => update('icon', icon)} aria-label={icon}><AppIcon name={icon} size={18} /></button>)}</div>
            <div className="form-label">A little color</div><div className="color-picker">{COLORS.map((color) => <button key={color} type="button" aria-label={`Choose ${color}`} className={form.color === color ? 'selected' : ''} style={{ '--swatch': color }} onClick={() => update('color', color)} />)}</div>
            <label>When does it happen?<select value={form.frequency} onChange={(event) => setFrequency(event.target.value)}><option>Daily</option><option>Weekdays</option><option>Weekends</option><option>Custom days</option></select></label>
            {form.frequency === 'Custom days' && <div className="day-picker">{WEEK.map((day, index) => <button type="button" key={day} className={form.days.includes(index) ? 'selected' : ''} onClick={() => toggleDay(index)}>{day}</button>)}</div>}
            <div className="form-row"><label>Reminder <span className="optional">Optional</span><input type="time" value={form.reminder || ''} onChange={(event) => update('reminder', event.target.value)} /></label><label>Start date<input type="date" value={form.startDate || todayKey()} onChange={(event) => update('startDate', event.target.value)} /></label></div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="dialog-footer"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{habit ? 'Save changes' : 'Add this habit'} <AppIcon name="ArrowRight" size={16} /></button></div>
          </form>
          <div className="preview-column"><span className="eyebrow">A LITTLE PREVIEW</span><div className="preview-card" style={{ '--habit-color': form.color }}><span className="habit-icon"><AppIcon name={form.icon} size={22} /></span><strong>{form.name || 'Your new habit'}</strong><p>{form.description || 'A little progress, every day.'}</p><span className="preview-goal">{form.goal || form.category}</span></div><p className="preview-note">Habits work best when they feel like yours.</p></div>
        </div>
      </motion.div>
    </motion.div>}
  </AnimatePresence>
}

export function EmptyState({ icon = 'Sprout', title, detail, action, onAction }) {
  return <div className="empty-state"><span className="empty-icon"><AppIcon name={icon} size={25} /></span><h3>{title}</h3><p>{detail}</p>{action && <button className="button button-primary" onClick={onAction}>{action}<AppIcon name="ArrowRight" size={16} /></button>}</div>
}

export function SectionHeading({ eyebrow, title, detail, action, onAction }) {
  return <div className="section-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action && <button className="button button-secondary" onClick={onAction}>{action}<AppIcon name="Plus" size={16} /></button>}</div>
}
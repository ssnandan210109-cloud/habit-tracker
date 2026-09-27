import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AppIcon } from './components.jsx'
import { todayKey } from './data.js'

const CATEGORIES = [
  { name: 'Health', icon: 'HeartPulse', color: '#f3c782' },
  { name: 'Fitness', icon: 'Footprints', color: '#b4d98e' },
  { name: 'Study', icon: 'BookOpen', color: '#a7c9ff' },
  { name: 'Productivity', icon: 'ListTodo', color: '#e5b8d5' },
  { name: 'Sleep', icon: 'Moon', color: '#c1b8e7' },
  { name: 'Personal', icon: 'Leaf', color: '#9ddbd2' },
]
const IDEAS = [
  { name: 'Drink a glass of water', description: 'A small reset, throughout the day', category: 'Health', icon: 'Droplets', color: '#a7c9ff', goal: '8 glasses' },
  { name: 'Take a mindful walk', description: 'Fresh air, at your own pace', category: 'Health', icon: 'Footprints', color: '#b4d98e', goal: '15 minutes' },
  { name: 'Stretch for a moment', description: 'Make a little room to move', category: 'Fitness', icon: 'Activity', color: '#b4d98e', goal: '10 minutes' },
  { name: 'Read a few pages', description: 'Make room for a good story', category: 'Study', icon: 'BookOpen', color: '#f3c782', goal: '10 pages' },
  { name: 'Plan tomorrow', description: 'Leave a note for your future self', category: 'Productivity', icon: 'NotebookPen', color: '#e5b8d5', goal: '5 minutes' },
  { name: 'Wind down without a screen', description: 'Give your evening a softer edge', category: 'Sleep', icon: 'Moon', color: '#c1b8e7', goal: '30 minutes' },
  { name: 'Write one honest thought', description: 'A few lines, just for you', category: 'Personal', icon: 'PenLine', color: '#9ddbd2', goal: '5 minutes' },
]

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [categories, setCategories] = useState(['Health'])
  const [selected, setSelected] = useState([])
  const ideas = useMemo(() => IDEAS.filter((idea) => categories.includes(idea.category)), [categories])

  function toggleCategory(name) {
    setCategories((current) => current.includes(name)
      ? current.filter((item) => item !== name)
      : current.length < 3 ? [...current, name] : current)
    setSelected([])
  }
  function toggleIdea(name) {
    setSelected((current) => current.includes(name)
      ? current.filter((item) => item !== name)
      : current.length < 3 ? [...current, name] : current)
  }
  function finish() {
    const habits = IDEAS.filter((idea) => selected.includes(idea.name)).map((idea) => ({
      ...idea, id: Math.random().toString(36).slice(2), frequency: 'Daily', days: [0, 1, 2, 3, 4, 5, 6], startDate: todayKey(), history: {},
    }))
    onComplete(habits)
  }

  return <main className="onboarding-screen">
    <header className="onboarding-top"><span className="brand-mark"><AppIcon name="SunMedium" size={22} /></span><strong>daymark</strong><button className="onboarding-skip" onClick={() => onComplete([])}>Skip setup <AppIcon name="ArrowRight" size={14} /></button></header>
    <section className="onboarding-content">
      <motion.div key={step} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25 }}>
        <span className="eyebrow">A FRESH START · {step + 1} OF 2</span>
        {step === 0 ? <>
          <h1>What would you like<br />to make room for?</h1>
          <p className="onboarding-subtitle">Pick up to three. You can always change direction later.</p>
          <div className="onboarding-categories">{CATEGORIES.map((category) => <button key={category.name} className={categories.includes(category.name) ? 'selected' : ''} onClick={() => toggleCategory(category.name)}><span style={{ '--habit-color': category.color }}><AppIcon name={category.icon} size={20} /></span><strong>{category.name}</strong>{categories.includes(category.name) && <AppIcon name="Check" size={15} className="category-check" />}</button>)}</div>
          <button className="button button-primary onboarding-next" onClick={() => setStep(1)}>Find a few ideas <AppIcon name="ArrowRight" size={16} /></button>
        </> : <>
          <button className="onboarding-back" onClick={() => setStep(0)}><AppIcon name="ArrowLeft" size={14} /> Your focus</button>
          <h1>Start small.<br />Start with what fits.</h1>
          <p className="onboarding-subtitle">Choose one to three to try. Nothing here is set in stone.</p>
          <div className="onboarding-ideas">{ideas.map((idea) => <button key={idea.name} className={selected.includes(idea.name) ? 'selected' : ''} onClick={() => toggleIdea(idea.name)}><span className="onboarding-idea-icon" style={{ '--habit-color': idea.color }}><AppIcon name={idea.icon} size={19} /></span><span><strong>{idea.name}</strong><small>{idea.description}</small></span><span className="idea-check">{selected.includes(idea.name) && <AppIcon name="Check" size={14} />}</span></button>)}</div>
          <button className="button button-primary onboarding-next" disabled={!selected.length} onClick={finish}>Make these mine <AppIcon name="ArrowRight" size={16} /></button>
        </>}
      </motion.div>
      <div className="onboarding-note"><AppIcon name="LockKeyhole" size={14} /> Your habits are private and stay on this device.</div>
    </section>
  </main>
}

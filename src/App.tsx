import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpLeft, BarChart3, BookOpen, Brain, Check, ChevronDown, Clock3, Code2, Command, Compass, Database, Download, HeartPulse, History, Layers3, Minus, Plus, Search, Settings2, Sparkles, Target, X, Zap } from 'lucide-react'
import type { Question, QuestionType, Subject } from './types'

const imported = import.meta.glob('../Sub/*.json', { eager: true, import: 'default' }) as Record<string, { subject?: { name?: string }; lectures?: { lecture_title: string; topics?: { topic_name?: string; questions?: Question[] }[] }[] }>
const catalog = [
  { file: 'Ai.json', ar: 'Artificial Intelligence', name: 'Artificial Intelligence', code: 'CS 204', icon: 'brain' },
  { file: 'Ai App.json', ar: 'AI Applications', name: 'AI Applications', code: 'AI 210', icon: 'spark' },
  { file: 'Data Science.json', ar: 'Data Science', name: 'Data Science', code: 'DS 201', icon: 'database' },
  { file: 'Expert Systems.json', ar: 'Expert Systems', name: 'Expert Systems', code: 'AI 308', icon: 'layers' },
  { file: 'Health and Safety.json', ar: 'Health and Safety', name: 'Health and Safety', code: 'HSE 101', icon: 'health' },
  { file: 'History of Technology.json', ar: 'History of Technology', name: 'History of Technology', code: 'HUM 103', icon: 'history' },
  { file: 'Introduction to Technology.json', ar: 'Introduction to Technology', name: 'Introduction to Technology', code: 'TECH 101', icon: 'compass' },
  { file: 'Java.json', ar: 'Java Programming', name: 'Java Programming', code: 'CS 102', icon: 'code' },
]
const iconMap: Record<string, typeof Brain> = { brain: Brain, spark: Sparkles, database: Database, layers: Layers3, health: HeartPulse, history: History, compass: Compass, code: Code2 }
const types: { key: QuestionType; title: string; english: string; icon: typeof Brain }[] = [
  { key: 'mcq', title: 'Multiple Choice', english: 'Choose one answer', icon: Command },
  { key: 'true_false', title: 'True or False', english: 'Quick concept check', icon: Check },
  { key: 'essay', title: 'Essay', english: 'Written response', icon: BookOpen },
]
const allSubjects: Subject[] = catalog.map(item => {
  const module = imported[`../Sub/${item.file}`]
  const questions = (module?.lectures ?? []).flatMap(lecture => (lecture.topics ?? []).flatMap(topic => (topic.questions ?? []).map(question => ({
    ...question,
    source: { ...question.source, lecture: question.source?.lecture || lecture.lecture_title, topic: question.source?.topic || topic.topic_name },
  }))))
  return { ...item, total: questions.length, questions }
})
type Screen = 'home' | 'courses' | 'setup' | 'exam' | 'result' | 'history'
type Reply = { value: string; checked: boolean }
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }> }
type Attempt = { id: string; subjectFile: string; subjectName: string; subjectCode: string; type: QuestionType; score: number; gradedTotal: number; questionCount: number; accuracy: number; durationSeconds: number; completedAt: string }

function readAttempts(): Attempt[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('mihakk-attempts') || '[]')
    if (!Array.isArray(stored)) return []
    return stored.filter(isAttempt).slice(0, 200)
  } catch { return [] }
}
function isAttempt(value: unknown): value is Attempt {
  if (!value || typeof value !== 'object') return false
  const attempt = value as Partial<Attempt>
  return typeof attempt.id === 'string'
    && typeof attempt.subjectFile === 'string'
    && typeof attempt.subjectName === 'string'
    && typeof attempt.subjectCode === 'string'
    && (attempt.type === 'mcq' || attempt.type === 'true_false' || attempt.type === 'essay')
    && Number.isInteger(attempt.score) && Number.isFinite(attempt.score) && attempt.score! >= 0
    && Number.isInteger(attempt.gradedTotal) && Number.isFinite(attempt.gradedTotal) && attempt.gradedTotal! >= 0
    && Number.isInteger(attempt.questionCount) && Number.isFinite(attempt.questionCount) && attempt.questionCount! >= attempt.gradedTotal!
    && Number.isFinite(attempt.accuracy) && attempt.accuracy! >= 0 && attempt.accuracy! <= 100
    && Number.isFinite(attempt.durationSeconds) && attempt.durationSeconds! >= 0
    && typeof attempt.completedAt === 'string' && Number.isFinite(Date.parse(attempt.completedAt))
}
function readLegacyCounts() {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('mihakk-history') || '{}')
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {}
    return Object.fromEntries(Object.entries(stored).filter((entry): entry is [string, number] => Number.isFinite(entry[1]) && Number(entry[1]) >= 0))
  } catch { return {} }
}
function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [active, setActive] = useState<Subject>(allSubjects[0])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [type, setType] = useState<QuestionType>('mcq')
  const [count, setCount] = useState(10)
  const [selectedLecture, setSelectedLecture] = useState('All lectures')
  const [selectedDifficulty, setSelectedDifficulty] = useState('Any difficulty')
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [reply, setReply] = useState<Reply[]>([])
  const [history, setHistory] = useState<Attempt[]>(readAttempts)
  const [legacyCounts] = useState(readLegacyCounts)
  const [seconds, setSeconds] = useState(25 * 60)
  const [showAnswers, setShowAnswers] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [isScrolled, setIsScrolled] = useState(false)
  const finishExamRef = useRef<() => void>(() => {})
  const leaveDialogRef = useRef<HTMLDivElement>(null)
  const questionHeadingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent) }
    const onInstalled = () => setInstallPrompt(null)
    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('beforeinstallprompt', onInstall)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>('[data-reveal]')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(target => target.classList.add('is-visible'))
      return
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        observer.unobserve(entry.target)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })
    targets.forEach(target => observer.observe(target))
    return () => observer.disconnect()
  }, [screen])

  useEffect(() => {
    const title = screen === 'home' ? 'MIHAKK — Your Study Space'
      : screen === 'courses' ? 'Courses | MIHAKK'
      : screen === 'setup' ? `${active.name} Quiz Setup | MIHAKK`
      : screen === 'exam' ? `${active.name} Quiz | MIHAKK`
      : screen === 'result' ? `Results | ${active.name} | MIHAKK`
      : 'Session Log | MIHAKK'
    document.title = title
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [screen, active.name])

  useEffect(() => {
    if (screen === 'exam') questionHeadingRef.current?.focus({ preventScroll: true })
  }, [screen, index])

  useEffect(() => {
    if (!showAnswers) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = leaveDialogRef.current
    const focusable = dialog?.querySelectorAll<HTMLElement>('button:not([disabled])')
    focusable?.[0]?.focus()
    const onDialogKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setShowAnswers(false); return }
      if (event.key !== 'Tab' || !focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onDialogKeyDown)
    return () => {
      document.removeEventListener('keydown', onDialogKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [showAnswers])

  useEffect(() => {
    if (screen !== 'exam') return
    const timer = window.setInterval(() => setSeconds(value => {
      if (value <= 1) {
        window.clearInterval(timer)
        finishExamRef.current()
        return 0
      }
      return value - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [screen, active.file])

  const filtered = useMemo(() => allSubjects.filter(s => `${s.name} ${s.code}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All' || (filter === 'Computing' ? ['CS 204', 'CS 102', 'AI 308', 'AI 210'].includes(s.code) : !['CS 204', 'CS 102', 'AI 308', 'AI 210'].includes(s.code)))), [query, filter])
  const current = questions[index]
  const lectureOptions = useMemo(() => [...new Set(active.questions.filter(q => q.type === type).map(q => q.source?.lecture).filter((lecture): lecture is string => Boolean(lecture)))].sort(), [active, type])
  const difficultyOptions = [...new Set(active.questions.filter(q => q.type === type && (selectedLecture === 'All lectures' || q.source?.lecture === selectedLecture)).map(q => q.difficulty).filter((difficulty): difficulty is string => Boolean(difficulty)))].sort()
  const filteredQuestions = active.questions.filter(q => q.type === type && (selectedLecture === 'All lectures' || q.source?.lecture === selectedLecture) && (selectedDifficulty === 'Any difficulty' || q.difficulty === selectedDifficulty))
  const available = filteredQuestions.length
  const done = history.length + Object.values(legacyCounts).reduce((a, b) => a + b, 0)
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0

  function selectSubject(subject: Subject) { setActive(subject); setType('mcq'); setCount(10); setSelectedLecture('All lectures'); setSelectedDifficulty('Any difficulty'); setScreen('setup'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function startExam() {
    const pool = filteredQuestions.slice().sort(() => Math.random() - .5)
    if (!pool.length) return
    const sessionQuestions = pool.slice(0, Math.min(count, pool.length))
    setQuestions(sessionQuestions); setIndex(0); setReply([]); setSeconds(Math.max(5 * 60, sessionQuestions.length * 90)); setScreen('exam'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function finishExam() {
    const attempt: Attempt = { id: `${Date.now()}`, subjectFile: active.file, subjectName: active.name, subjectCode: active.code, type, score, gradedTotal, questionCount: questions.length, accuracy, durationSeconds: Math.max(0, Math.max(5 * 60, questions.length * 90) - seconds), completedAt: new Date().toISOString() }
    const updated = [attempt, ...readAttempts()].slice(0, 200)
    setHistory(updated)
    try { localStorage.setItem('mihakk-attempts', JSON.stringify(updated)) } catch { /* Keep the result available for this session when browser storage is unavailable. */ }
    setScreen('result'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  finishExamRef.current = finishExam
  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }
  function check() {
    const value = reply[index]?.value
    if (!value?.trim()) return
    const next = [...reply]; next[index] = { value, checked: true }; setReply(next)
  }
  function moveNext() { if (index >= questions.length - 1) finishExam(); else setIndex(i => i + 1) }
  function isRight(q: Question, value?: string) {
    if (!value) return false
    if (q.type === 'mcq') return value === String(q.correct_answer)
    const correct = q.correct_answer === true || String(q.correct_answer).toLowerCase() === 'true'
    return (value === 'true') === correct
  }
  const score = questions.reduce((total, q, i) => q.type === 'essay' ? total : total + (isRight(q, reply[i]?.value) ? 1 : 0), 0)
  const gradedTotal = questions.filter(q => q.type !== 'essay').length
  const accuracy = gradedTotal ? Math.round(score / gradedTotal * 100) : 0
  const arType = types.find(t => t.key === type)?.title
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  const gradedAttempts = history.filter(attempt => attempt.gradedTotal > 0)
  const averageAccuracy = gradedAttempts.length ? Math.round(gradedAttempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / gradedAttempts.length) : 0
  const bestAccuracy = gradedAttempts.length ? Math.max(...gradedAttempts.map(attempt => attempt.accuracy)) : 0

  useEffect(() => {
    if (screen !== 'exam') return
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (event.key === 'ArrowLeft') { event.preventDefault(); setIndex(value => Math.max(0, value - 1)); return }
      if (event.key === 'ArrowRight') { event.preventDefault(); setIndex(value => Math.min(questions.length - 1, value + 1)); return }
      if (event.key === 'Escape') { if (!showAnswers) setShowAnswers(true); return }
      if (event.key === 'Enter') { event.preventDefault(); if (reply[index]?.checked) moveNext(); else check(); return }
      if (!reply[index]?.checked && current?.type === 'mcq' && /^[1-4]$/.test(event.key)) {
        const option = current.options?.[Number(event.key) - 1]
        if (option) setReply(previous => { const next = [...previous]; next[index] = { value: option.option_id, checked: false }; return next })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [screen, index, questions.length, current, reply, showAnswers])

  return <div className="app-shell" dir="ltr">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div className="main-column">
      <header className={`topbar ${isScrolled ? 'topbar-scrolled' : ''}`}>
        <a className="brand topbar-brand" href="#home" onClick={event=>{event.preventDefault();setScreen('home')}}><span className="brand-icon">M<span>✳</span></span><span><b>MIHAKK</b><small>HUNTER SYSTEM · HITU</small></span></a>
        <nav className="top-nav" aria-label="Main navigation"><button className={screen==='home'?'top-nav-active':''} aria-current={screen==='home'?'page':undefined} onClick={()=>setScreen('home')}>Home</button><button className={screen==='courses'||screen==='setup'?'top-nav-active':''} aria-current={screen==='courses'||screen==='setup'?'page':undefined} onClick={()=>setScreen('courses')}>Courses <span>08</span></button><button className={screen==='history'?'top-nav-active':''} aria-current={screen==='history'?'page':undefined} onClick={()=>setScreen('history')}>Session log</button></nav>
        <div className="top-actions">{installPrompt&&<button className="install-app" onClick={installApp}><Download size={14}/><span>Install</span></button>}<span className={`top-status ${isOnline?'':'top-offline'}`} role="status" aria-live="polite"><i/>{isOnline?'Online':'Offline'}</span><span className="rank-chip"><Sparkles size={13}/> RANK B</span></div>
      </header>
      {screen === 'home' && <main className="dashboard" id="main-content">
        <section className="welcome-row" data-reveal><div><div className="welcome-kicker"><span className="kicker-line"/> HUNTER SYSTEM // ONLINE</div><h1>Welcome to <em>MIHAKK.</em></h1><p>Ready to test yourself? Choose a course and jump right in.</p></div><div className="date-stamp"><span>SEMESTER</span><b>01 <i>/</i> 26</b><small>HELUAN INTERNATIONAL TECH</small></div></section>
        <section className="hero-card" data-reveal><div className="hero-text"><div className="hero-tag"><Sparkles size={13}/> SYSTEM QUEST · ACTIVE</div><h2>Awaken your<br/><em>inner rank.</em></h2><p>Enter the gate. Clear your questions. Rise through every rank.</p><button className="hero-button" onClick={() => setScreen('courses')}>Enter the gate <ArrowUpLeft size={16}/></button><div className="hero-sign">DAILY QUEST <span/> READY</div></div><div className="hero-visual"><div className="visual-circle circle-one"/><div className="visual-circle circle-two"/><div className="visual-circle circle-three"/><div className="hero-mascot"><img src={`${import.meta.env.BASE_URL}miha-hunter.svg`} alt="Original MIHAKK shadow hunter"/></div><div className="orbit-label label-top">HITU <span>✳</span> 2026</div><div className="orbit-label label-bottom">FOCUS MODE / ON</div><div className="visual-cross">✳</div><div className="visual-tiny">M</div></div><div className="hero-side-note">HUNTER LICENSE<br/><b>RANK B · ACTIVE</b></div></section>
        <section className="stats-row" data-reveal><div className="stat-card"><div className="stat-icon icon-gold"><BookOpen size={18}/></div><div><small>Courses ready for you</small><b>08 <span>courses</span></b></div><div className="stat-edge">01—08</div></div><div className="stat-card"><div className="stat-icon icon-blue"><Target size={18}/></div><div><small>Question bank</small><b>{allSubjects.reduce((n,s)=>n+s.total,0)} <span>questions</span></b></div><div className="stat-edge">QUESTION BANK</div></div><div className="stat-card"><div className="stat-icon icon-peach"><Zap size={18}/></div><div><small>Sessions completed</small><b>{done.toString().padStart(2,'0')} <span>sessions</span></b></div><div className="stat-edge">KEEP GOING</div></div></section>
        <section className="home-launch" data-reveal><div className="launch-copy"><div className="section-overline">YOUR NEXT QUEST</div><h2>Ready to <em>level up?</em></h2><p>Choose a course, set your challenge, and start your next run.</p><button className="start-session" onClick={()=>setScreen('courses')}>Browse all courses <ArrowRight size={16}/></button></div><div className="launch-symbol"><span>✦</span><b>08</b><small>GATES OPEN</small></div><div className="launch-decoration"/></section>        <footer className="footer"><span>MIHAKK <b>✳</b> BUILT FOR BETTER STUDY DAYS</span><span>HELWAN INTERNATIONAL TECHNOLOGICAL UNIVERSITY · 2026</span></footer>
      </main>}

      {screen === 'courses' && <main id="main-content" className="dashboard courses-page"><section className="courses-heading" data-reveal><div><div className="welcome-kicker"><span className="kicker-line"/> SELECT YOUR GATE</div><h1>Choose a <em>course.</em></h1><p>Pick a subject and build a challenge around what you want to master.</p></div><div className="courses-total"><b>08</b><span>ACTIVE<br/>COURSES</span></div></section><section className="subjects-section courses-catalog" data-reveal id="subjects"><div className="toolbar"><label className="search-box"><Search size={17}/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search courses..."/><kbd>/</kbd></label><div className="filter-tabs"><button className={filter==='All'?'filter-on':''} onClick={()=>setFilter('All')}>All <span>08</span></button><button className={filter==='Computing'?'filter-on':''} onClick={()=>setFilter('Computing')}>Computing</button><button className={filter==='Other'?'filter-on':''} onClick={()=>setFilter('Other')}>Other</button></div></div><div className="subject-grid">{filtered.length?filtered.map((subject,index)=><SubjectCard key={subject.file} subject={subject} index={index} onClick={()=>selectSubject(subject)} sessions={history.filter(attempt=>attempt.subjectFile===subject.file).length+(legacyCounts[subject.file]||0)}/>):<div className="empty-search">No courses match your search. <Search size={20}/></div>}</div><div className="subject-foot"><span>Showing <b>{filtered.length.toString().padStart(2,'0')}</b> of 08 courses</span><span>Choose a course to enter its gate <ArrowRight size={14}/></span></div></section><footer className="footer"><span>MIHAKK <b>✳</b> HUNTER ACADEMY</span><span>HELWAN INTERNATIONAL TECHNOLOGICAL UNIVERSITY · 2026</span></footer></main>}
      {screen === 'setup' && <main id="main-content" className="workspace"><button className="back-link" onClick={() => setScreen('home')}><ArrowLeft size={15}/> Back to courses</button><div className="workspace-head"><div><div className="section-overline">02 / BUILD YOUR QUIZ</div><h1>{active.name}<em>.</em></h1><p>{active.name} <span>·</span> {active.code} <span>·</span> {active.total} questions in the course bank</p></div><div className="course-icon large"><Icon name={active.icon} size={30}/></div></div><div className="setup-layout"><section className="setup-main"><div className="setup-block" data-reveal><div className="block-title"><span>01</span><div><b>Choose a question type</b><small>Build a session around what you want to practice</small></div></div><div className="type-grid">{types.map(t => {const Icon=t.icon;const total=active.questions.filter(q=>q.type===t.key).length;return <button key={t.key} className={`type-card ${type===t.key?'type-selected':''}`} onClick={()=>{setType(t.key);setSelectedLecture("All lectures");setSelectedDifficulty("Any difficulty")}}><span className="type-icon"><Icon size={18}/></span><b>{t.title}</b><small>{t.english}</small><span className="type-total">{total} questions</span><span className="type-check">{type===t.key?<Check size={13}/>:<Plus size={13}/>}</span></button>})}</div></div><div className="setup-block filter-setup-block"><div className="block-title"><span>02</span><div><b>Filter your practice</b><small>Focus on a lecture or difficulty level</small></div></div><div className="setup-filters"><label>Lecture<select value={selectedLecture} onChange={event=>{setSelectedLecture(event.target.value);setSelectedDifficulty('Any difficulty')}}><option>All lectures</option>{lectureOptions.map(lecture=><option key={lecture} value={lecture}>{lecture}</option>)}</select></label><label>Difficulty<select value={selectedDifficulty} onChange={event=>setSelectedDifficulty(event.target.value)}><option>Any difficulty</option>{difficultyOptions.map(difficulty=><option key={difficulty} value={difficulty}>{difficulty.charAt(0).toUpperCase()+difficulty.slice(1)}</option>)}</select></label></div><div className="filter-match-count">{available} matching questions</div></div><div className="setup-block" data-reveal><div className="block-title"><span>03</span><div><b>Session length</b><small>Choose a length that fits your time</small></div></div><div className="count-control"><button onClick={()=>setCount(Math.max(5,count-5))} aria-label="Decrease"><Minus size={15}/></button><div><b>{Math.min(count,available)}</b><small>questions</small></div><button onClick={()=>setCount(Math.min(available,count+5))} aria-label="Increase"><Plus size={15}/></button><span className="count-of">{available} available</span></div><div className="preset-row">{[5,10,20,available].filter((n,i,a)=>n<=available&&a.indexOf(n)===i).map(n=><button className={count===n?'preset-active':''} key={n} onClick={()=>setCount(n)}>{n===available?'All':`${n} questions`}</button>)}</div></div></section><aside className="session-summary" data-reveal><div className="summary-head"><Settings2 size={16}/> Session summary</div><div className="summary-course"><div className="course-icon"><Icon name={active.icon} size={20}/></div><div><b>{active.name}</b><small>{active.code} · {active.name}</small></div></div><div className="summary-line"><span>Question type</span><b>{arType}</b></div><div className="summary-line"><span>Questions</span><b>{Math.min(count,available)} questions</b></div><div className="summary-line"><span>Estimated time</span><b>About {Math.max(5,Math.round(Math.min(count,available)*1.5))} min</b></div><div className="summary-total"><span>Available in this format</span><b>{available}</b></div><button className="start-session" disabled={available===0} onClick={startExam}>{available===0?"No matching questions":"Start quiz"} <ArrowUpLeft size={16}/></button><p className="no-pressure"><Sparkles size={13}/> No pressure. This is your space to learn.</p></aside></div></main>}

      {screen === 'exam' && current && <main id="main-content" className="exam-workspace"><div className="exam-toolbar"><button className="exit-exam" onClick={() => setShowAnswers(true)}><X size={16}/> Exit</button><div className="exam-title"><div className="exam-title-icon"><Icon name={active.icon} size={16}/></div><span>{active.ar}<small>{arType} · {active.code}</small></span></div><div className={`timer ${seconds<300?'timer-low':''}`}><Clock3 size={15}/>{formatTime(seconds)}</div></div><div className="exam-progress-line"><span style={{width:`${progress}%`}}/></div><div className="exam-body"><div className="exam-meta"><span>Question {String(index+1).padStart(2,'0')} <i/> {String(questions.length).padStart(2,'0')}</span><span className="difficulty-pill">{current.difficulty === 'easy' ? 'Easy' : current.difficulty === 'hard' ? 'Advanced' : 'Medium'} · {current.source?.lecture || active.name}</span></div><div className="question-jump" role="group" aria-label="Jump to a question">{questions.map((question,questionIndex)=>{const answer=reply[questionIndex];const status=!answer?.value?'jump-unanswered':question.type==='essay'?'jump-answered':isRight(question,answer.value)?'jump-correct':'jump-incorrect';return <button key={question.question_id} className={`question-dot ${status} ${questionIndex===index?'jump-current':''}`} aria-current={questionIndex===index?'step':undefined} aria-label={`Question ${questionIndex+1}, ${answer?.value?'answered':'not answered'}`} onClick={()=>setIndex(questionIndex)}>{questionIndex+1}</button>})}</div><div className="question-jump-legend"><span><i className="legend-answered"/>Answered</span><span><i className="legend-unanswered"/>Not answered</span><span><i className="legend-current"/>Current</span></div><h1 ref={questionHeadingRef} tabIndex={-1} aria-live="polite" className="question-heading">{current.question_text}</h1>{current.type === 'mcq' ? <div className="answer-list">{(current.options ?? []).map((option,i)=>{const checked=reply[index]?.checked;const right=String(current.correct_answer)===option.option_id;const chosen=reply[index]?.value===option.option_id;return <button aria-pressed={chosen} key={option.option_id} className={`answer-choice ${chosen?'answer-chosen':''} ${checked&&right?'answer-right':''} ${checked&&chosen&&!right?'answer-wrong':''}`} disabled={checked} onClick={()=>{const n=[...reply];n[index]={value:option.option_id,checked:false};setReply(n)}}><span className="choice-key">{String.fromCharCode(65+i)}</span><span>{option.text}</span>{checked&&right&&<Check className="choice-result" size={17}/>}</button>})}</div> : current.type === 'true_false' ? <div className="answer-list answer-list-two">{[['true','True'],['false','False']].map(([v,label])=>{const checked=reply[index]?.checked;const right=isRight(current,v);const chosen=reply[index]?.value===v;return <button aria-pressed={chosen} key={v} className={`answer-choice ${chosen?'answer-chosen':''} ${checked&&right?'answer-right':''} ${checked&&chosen&&!right?'answer-wrong':''}`} disabled={checked} onClick={()=>{const n=[...reply];n[index]={value:v,checked:false};setReply(n)}}><span className="choice-key">{v==='true'?'✓':'×'}</span><span>{label}</span></button>})}</div> : <textarea className="essay-input" placeholder="Write your answer here..." value={reply[index]?.value||''} disabled={reply[index]?.checked} onChange={e=>{const n=[...reply];n[index]={value:e.target.value,checked:false};setReply(n)}}/>}
            {reply[index]?.checked && <div aria-live="polite" className={`answer-feedback ${current.type==='essay'?'feedback-neutral':isRight(current,reply[index].value)?'feedback-good':'feedback-bad'}`}><b>{current.type==='essay'?'Model answer for review':isRight(current,reply[index].value)?'Correct answer — nice work!':'Not quite'}</b><p>{current.type==='essay'?current.model_answer:current.explanation || `Correct answer: ${current.correct_answer}`}</p></div>}
            <div className="exam-nav"><button className="previous-question" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ArrowLeft size={15}/> Previous</button><span>{reply.filter(r=>r?.checked).length} of {questions.length} answered</span><button className="confirm-answer" onClick={reply[index]?.checked?moveNext:check}>{reply[index]?.checked?(index===questions.length-1?'Finish quiz':'Next question'):current.type==='essay'?'Show model answer':'Check answer'} <ArrowRight size={15}/></button></div>
          </div><div className="exam-shortcuts">Keyboard: ← / → move · 1–4 choose · Enter confirm · Esc exit</div><div className="exam-bottom"><span><span className="live-dot"/> Your progress is saved on this device</span><span>MIHAKK <b>✳</b> FOCUS MODE</span></div></main>}

{screen === 'history' && <main id="main-content" className="workspace history-workspace"><div className="section-overline">04 / YOUR STUDY RECORD</div><div className="history-heading" data-reveal><div><h1>Session <em>history</em></h1><p>See how your practice is adding up across every course.</p></div><button className="secondary-action" onClick={()=>setScreen('courses')}><ArrowLeft size={15}/> Back to courses</button></div><div className="history-summary-grid" data-reveal><div className="history-stat"><span>Total sessions</span><b>{done}</b><small>Across your courses</small></div><div className="history-stat"><span>Average score</span><b>{history.length?`${averageAccuracy}%`:'—'}</b><small>Auto-graded questions</small></div><div className="history-stat"><span>Personal best</span><b>{history.length?`${bestAccuracy}%`:'—'}</b><small>Your highest session</small></div></div><div className="history-section-heading"><h2>Course progress</h2><span>BEST &amp; AVERAGE</span></div><div className="course-performance-grid">{allSubjects.map(subject=>{const attempts=history.filter(attempt=>attempt.subjectFile===subject.file);const graded=attempts.filter(attempt=>attempt.gradedTotal>0);const average=graded.length?Math.round(graded.reduce((sum,attempt)=>sum+attempt.accuracy,0)/graded.length):0;const best=graded.length?Math.max(...graded.map(attempt=>attempt.accuracy)):0;return <article className="course-performance" data-reveal key={subject.file}><div className="performance-course"><span className="course-icon"><Icon name={subject.icon} size={18}/></span><div><b>{subject.name}</b><small>{subject.code}</small></div></div><div className="performance-metrics"><span>Sessions <b>{attempts.length+(legacyCounts[subject.file]||0)}</b></span><span>Average <b>{attempts.length?`${average}%`:'—'}</b></span><span>Best <b>{attempts.length?`${best}%`:'—'}</b></span></div></article>})}</div><div className="history-section-heading recent-heading"><h2>Recent sessions</h2><span>{history.length} SAVED LOCALLY</span></div>{history.length?<div className="attempt-list">{history.map(attempt=><article className="attempt-row" data-reveal key={attempt.id}><div className="attempt-course"><b>{attempt.subjectName}</b><small>{attempt.subjectCode} · {types.find(item=>item.key===attempt.type)?.title} · {new Date(attempt.completedAt).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</small></div><div className="attempt-score"><b>{attempt.gradedTotal?`${attempt.accuracy}%`:'Self review'}</b><small>{attempt.score} / {attempt.gradedTotal} correct · {attempt.questionCount} questions</small></div><span className="attempt-duration"><Clock3 size={13}/>{Math.ceil(attempt.durationSeconds/60)} min</span></article>)}</div>:<div className="history-empty"><span className="history-empty-icon"><BarChart3 size={22}/></span><b>No sessions saved yet</b><p>Complete a quiz to see your scores and course averages here.</p><button className="start-session" onClick={()=>setScreen('courses')}>Choose a course <ArrowUpLeft size={15}/></button></div>}</main>}
      {screen === 'result' && <main id="main-content" className="workspace result-workspace"><div className="result-confetti">✳</div><div className="section-overline">03 / QUIZ COMPLETE</div><h1>Well done, <em>you did it.</em></h1><p className="result-lead">Every session counts. You just took another step forward.</p><div className="result-overview" data-reveal><div className="result-ring" style={{'--score':`${accuracy}%`} as React.CSSProperties}><div><b>{gradedTotal?accuracy:100}<small>%</small></b><span>Accuracy</span></div></div><div className="result-summary"><span className="result-course">{active.ar} · {arType}</span><div className="result-score-line"><b>{score}</b><span>of {gradedTotal} graded answers</span></div><div className="result-bar"><span style={{width:`${accuracy}%`}}/></div><p>{questions.length-gradedTotal ? `${questions.length-gradedTotal} essay question(s) for self-review` : accuracy>=80?'Excellent work! Review the tricky questions, then move on to another course.':'Review the explanations and try another round.'}</p></div></div><div className="result-review" data-reveal><button className="review-toggle" onClick={()=>setExpanded(v=>!v)}><span><BookOpen size={17}/> Review your answers <small>{questions.length} questions</small></span><ChevronDown size={17}/></button>{expanded&&<div className="review-list">{questions.map((q,i)=><div className="review-item" key={q.question_id}><span className={`review-mark ${q.type==='essay'?'review-essay':isRight(q,reply[i]?.value)?'review-correct':'review-incorrect'}`}>{q.type==='essay'?'E':isRight(q,reply[i]?.value)?'✓':'×'}</span><div><b>{q.question_text}</b><small>{q.type==='essay'?q.model_answer:isRight(q,reply[i]?.value)?'Your answer was correct':`Correct answer: ${q.type==='mcq'?q.options?.find(o=>o.option_id===q.correct_answer)?.text: String(q.correct_answer)==='true'?'True':'False'}`}</small></div></div>)}</div>}</div><div className="result-actions"><button className="start-session" onClick={()=>setScreen('setup')}>Try again <ArrowUpLeft size={16}/></button><button className="secondary-action" onClick={()=>setScreen('history')}><History size={15}/> Session history</button><button className="secondary-action" onClick={()=>setScreen('home')}>Choose another course <ArrowLeft size={15}/></button></div></main>}
    </div>
    {showAnswers&&<div className="modal-backdrop" onClick={()=>setShowAnswers(false)}><div ref={leaveDialogRef} className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="leave-quiz-title" aria-describedby="leave-quiz-description" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowAnswers(false)}><X size={17}/></button><span className="modal-icon"><Clock3 size={20}/></span><h3 id="leave-quiz-title">Leave this quiz?</h3><p id="leave-quiz-description">If you leave now, this session will not be added to your progress.</p><div><button className="secondary-action" onClick={()=>setShowAnswers(false)}>Keep going</button><button className="leave-action" onClick={()=>{setShowAnswers(false);setScreen('home')}}>Leave quiz</button></div></div></div>}
  </div>
}

function Icon({ name, size=20 }: { name: string; size?: number }) { const Component=iconMap[name] || BookOpen; return <Component size={size}/> }
function SubjectCard({ subject, index, onClick, sessions }: { subject: Subject; index: number; onClick: () => void; sessions: number }) {
  const questions: Record<string,string> = { 'Ai.json':'Explore how machines learn', 'Ai App.json':'AI ideas in the real world', 'Data Science.json':'Find the story in data', 'Expert Systems.json':'Reasoning, one step at a time', 'Health and Safety.json':'Knowledge that keeps people safe', 'History of Technology.json':'From first ideas to today', 'Introduction to Technology.json':'Build your technology foundation', 'Java.json':'Make every line of code count' }
  return <button data-reveal className={`subject-card card-${index%4}`} onClick={onClick}><div className="card-top"><span className="course-code">{subject.code}</span><span className="card-arrow"><ArrowUpLeft size={17}/></span></div><div className="card-content"><div className="course-icon"><Icon name={subject.icon}/></div><div><h3>{subject.ar}</h3><p>{questions[subject.file]}</p></div></div><div className="card-bottom"><span><BookOpen size={13}/>{subject.total} questions</span><span>{sessions ? `${sessions} session` : 'Start here'}<span className="card-status">●</span></span></div><span className="card-watermark">{String(index+1).padStart(2,'0')}</span></button>
}
export default App

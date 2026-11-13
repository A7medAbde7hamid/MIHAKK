import { useEffect, useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpLeft, BookOpen, Brain, Check, ChevronDown, Clock3, Code2, Command, Compass, Database, Flame, GraduationCap, HeartPulse, History, Layers3, ListFilter, Menu, Minus, Plus, Search, Settings2, Sparkles, Target, X, Zap } from 'lucide-react'
import type { Question, QuestionType, Subject } from './types'

const imported = import.meta.glob('../Sub/*.json', { eager: true, import: 'default' }) as Record<string, { subject?: { name?: string }; lectures?: { lecture_title: string; topics?: { questions?: Question[] }[] }[] }>
const catalog = [
  { file: 'Ai.json', ar: 'الذكاء الاصطناعي', name: 'Artificial Intelligence', code: 'CS 204', icon: 'brain' },
  { file: 'Ai App.json', ar: 'تطبيقات الذكاء الاصطناعي', name: 'AI Applications', code: 'AI 210', icon: 'spark' },
  { file: 'Data Science.json', ar: 'علم البيانات', name: 'Data Science', code: 'DS 201', icon: 'database' },
  { file: 'Expert Systems.json', ar: 'النظم الخبيرة', name: 'Expert Systems', code: 'AI 308', icon: 'layers' },
  { file: 'Health and Safety.json', ar: 'الصحة والسلامة', name: 'Health and Safety', code: 'HSE 101', icon: 'health' },
  { file: 'History of Technology.json', ar: 'تاريخ التكنولوجيا', name: 'History of Technology', code: 'HUM 103', icon: 'history' },
  { file: 'Introduction to Technology.json', ar: 'مقدمة في التكنولوجيا', name: 'Introduction to Technology', code: 'TECH 101', icon: 'compass' },
  { file: 'Java.json', ar: 'برمجة Java', name: 'Java Programming', code: 'CS 102', icon: 'code' },
]
const iconMap: Record<string, typeof Brain> = { brain: Brain, spark: Sparkles, database: Database, layers: Layers3, health: HeartPulse, history: History, compass: Compass, code: Code2 }
const types: { key: QuestionType; title: string; english: string; icon: typeof Brain }[] = [
  { key: 'mcq', title: 'اختيار من متعدد', english: 'Multiple choice', icon: Command },
  { key: 'true_false', title: 'صح أم غلط', english: 'True or false', icon: Check },
  { key: 'essay', title: 'مقالي', english: 'Essay questions', icon: BookOpen },
]
const allSubjects: Subject[] = catalog.map(item => {
  const module = imported[`../Sub/${item.file}`]
  const questions = (module?.lectures ?? []).flatMap(lecture => (lecture.topics ?? []).flatMap(topic => topic.questions ?? []))
  return { ...item, total: questions.length, questions }
})
type Screen = 'home' | 'setup' | 'exam' | 'result'
type Reply = { value: string; checked: boolean }

function readHistory() {
  try { return JSON.parse(localStorage.getItem('mihakk-history') || '{}') as Record<string, number> } catch { return {} }
}
function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [active, setActive] = useState<Subject>(allSubjects[0])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('الكل')
  const [type, setType] = useState<QuestionType>('mcq')
  const [count, setCount] = useState(10)
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [reply, setReply] = useState<Reply[]>([])
  const [history, setHistory] = useState(readHistory)
  const [seconds, setSeconds] = useState(25 * 60)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAnswers, setShowAnswers] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (screen !== 'exam') return
    const timer = window.setInterval(() => setSeconds(value => {
      if (value <= 1) {
        window.clearInterval(timer)
        const updated = { ...readHistory(), [active.file]: (readHistory()[active.file] || 0) + 1 }
        localStorage.setItem('mihakk-history', JSON.stringify(updated))
        setHistory(updated)
        setScreen('result')
        return 0
      }
      return value - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [screen, active.file])

  const filtered = useMemo(() => allSubjects.filter(s => `${s.ar} ${s.name} ${s.code}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'الكل' || (filter === 'علوم الحاسب' ? ['CS 204', 'CS 102', 'AI 308', 'AI 210'].includes(s.code) : !['CS 204', 'CS 102', 'AI 308', 'AI 210'].includes(s.code)))), [query, filter])
  const current = questions[index]
  const available = active.questions.filter(q => q.type === type).length
  const done = Object.values(history).reduce((a, b) => a + b, 0)
  const progress = questions.length ? Math.round(((index + 1) / questions.length) * 100) : 0

  function selectSubject(subject: Subject) { setActive(subject); setType('mcq'); setCount(10); setScreen('setup'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function startExam() {
    const pool = active.questions.filter(q => q.type === type).sort(() => Math.random() - .5)
    const sessionQuestions = pool.slice(0, Math.min(count, pool.length))
    setQuestions(sessionQuestions); setIndex(0); setReply([]); setSeconds(Math.max(5 * 60, sessionQuestions.length * 90)); setScreen('exam'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function finishExam() {
    const updated = { ...history, [active.file]: (history[active.file] || 0) + 1 }
    setHistory(updated); localStorage.setItem('mihakk-history', JSON.stringify(updated)); setScreen('result'); window.scrollTo({ top: 0, behavior: 'smooth' })
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
    const correct = q.correct_answer === true || String(q.correct_answer).toLowerCase() === 'true' || String(q.correct_answer).toLowerCase() === 'صح'
    return (value === 'true') === correct
  }
  const score = questions.reduce((total, q, i) => q.type === 'essay' ? total : total + (isRight(q, reply[i]?.value) ? 1 : 0), 0)
  const gradedTotal = questions.filter(q => q.type !== 'essay').length
  const accuracy = gradedTotal ? Math.round(score / gradedTotal * 100) : 0
  const arType = types.find(t => t.key === type)?.title
  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return <div className="app-shell" dir="rtl">
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#home" onClick={e => { e.preventDefault(); setScreen('home'); setMenuOpen(false) }}><div className="brand-icon">م<span>✳</span></div><div><b>MIHAKK</b><small>STUDY CLUB · HITU</small></div></a>
      <div className="side-caption">مساحتك</div>
      <button className={`nav-item ${screen === 'home' ? 'nav-active' : ''}`} onClick={() => { setScreen('home'); setMenuOpen(false) }}><Command size={17}/><span>لوحة المذاكرة</span><span className="nav-hot">●</span></button>
      <button className="nav-item" onClick={() => document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' })}><BookOpen size={17}/><span>كل المواد</span><span className="nav-count">08</span></button>
      <div className="side-caption side-caption-spaced">حسابك</div>
      <div className="streak-card"><div className="streak-icon"><Flame size={19} fill="currentColor"/></div><div><b>{done} جلسات</b><small>كل بداية بتحسب</small></div><span className="streak-spark">✳</span></div>
      <div className="sidebar-bottom"><div className="campus-badge"><img src={`${import.meta.env.BASE_URL}logo.jpg`} /><span><b>Helwan Tech</b><small>Student edition · 2026</small></span><span className="online-dot"/></div><div className="sidebar-foot">نسخة الطلاب <span>v1.0</span></div></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(v => !v)} aria-label="القائمة">{menuOpen ? <X/> : <Menu/>}</button><div className="breadcrumb">مساحتك <ArrowLeft size={13}/> <b>{screen === 'home' ? 'الرئيسية' : screen === 'setup' ? active.ar : screen === 'exam' ? 'جلسة امتحان' : 'النتيجة'}</b></div><div className="top-actions"><span className="top-status"><i/> المساحة مفتوحة</span><button className="avatar" title="أهلًا بيك">م</button></div></header>
      {screen === 'home' && <main className="dashboard" id="home">
        <section className="welcome-row"><div><div className="welcome-kicker"><span className="kicker-line"/> مساحة مذاكرتك، على مزاجك</div><h1>أهلاً بيك في <em>MIHAKK.</em></h1><p>مستعد تختبر نفسك؟ اختار مادة وابدأ من حيث أنت.</p></div><div className="date-stamp"><span>SEMESTER</span><b>01 <i>/</i> 26</b><small>HELUAN INTERNATIONAL TECH</small></div></section>
        <section className="hero-card"><div className="hero-text"><div className="hero-tag"><Sparkles size={13}/> تحديك الجاي</div><h2>كل إجابة<br/>بتقرّبك <em>لهدفك.</em></h2><p>محتوى محاضراتك، متحوّل لتحديات قصيرة تساعدك تثبّت المعلومة وتعرف مستواك.</p><button className="hero-button" onClick={() => document.getElementById('subjects')?.scrollIntoView({ behavior: 'smooth' })}>اختار مادتك <ArrowUpLeft size={16}/></button><div className="hero-sign">01 <span/> MAKE IT COUNT</div></div><div className="hero-visual"><div className="visual-circle circle-one"/><div className="visual-circle circle-two"/><div className="visual-circle circle-three"/><div className="hero-planet"><img src={`${import.meta.env.BASE_URL}logo.jpg`} alt="شعار جامعة حلوان التكنولوجية الدولية"/></div><div className="orbit-label label-top">HITU <span>✳</span> 2026</div><div className="orbit-label label-bottom">FOCUS MODE / ON</div><div className="visual-cross">✳</div><div className="visual-tiny">M</div></div><div className="hero-side-note">YOUR SPACE<br/><b>TO GET BETTER</b></div></section>
        <section className="stats-row"><div className="stat-card"><div className="stat-icon icon-gold"><BookOpen size={18}/></div><div><small>مواد جاهزة ليك</small><b>08 <span>مواد</span></b></div><div className="stat-edge">01—08</div></div><div className="stat-card"><div className="stat-icon icon-blue"><Target size={18}/></div><div><small>بنك الأسئلة</small><b>{allSubjects.reduce((n,s)=>n+s.total,0)} <span>سؤال</span></b></div><div className="stat-edge">QUESTION BANK</div></div><div className="stat-card"><div className="stat-icon icon-peach"><Zap size={18}/></div><div><small>جلساتك المكتملة</small><b>{done.toString().padStart(2,'0')} <span>جلسة</span></b></div><div className="stat-edge">KEEP GOING</div></div></section>
        <section className="subjects-section" id="subjects"><div className="section-header"><div><div className="section-overline">01 / اختار مسارك</div><h2>موادك <em>الدراسية</em></h2><p>كل مادة فيها مجموعة أسئلة متحضّرة من محاضراتك.</p></div><a href="#all" className="browse-link" onClick={e => { e.preventDefault(); setExpanded(v => !v) }}>{expanded ? 'عرض أقل' : 'كل المواد'} <ArrowLeft size={15}/></a></div>
          <div className="toolbar"><label className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="دوّر على مادة..."/><kbd>⌘ K</kbd></label><div className="filter-tabs"><button className={filter === 'الكل' ? 'filter-on' : ''} onClick={() => setFilter('الكل')}>الكل <span>08</span></button><button className={filter === 'علوم الحاسب' ? 'filter-on' : ''} onClick={() => setFilter('علوم الحاسب')}>علوم الحاسب</button><button className={filter === 'أخرى' ? 'filter-on' : ''} onClick={() => setFilter('أخرى')}>أخرى</button><button className="filter-mobile" onClick={() => setFilter(filter === 'الكل' ? 'علوم الحاسب' : filter === 'علوم الحاسب' ? 'أخرى' : 'الكل')}><ListFilter size={15}/></button></div></div>
          <div className={`subject-grid ${expanded ? 'subject-grid-expanded' : ''}`}>{filtered.length ? filtered.map((s,i) => <SubjectCard key={s.file} subject={s} index={i} onClick={() => selectSubject(s)} sessions={history[s.file] || 0}/>) : <div className="empty-search">مش لاقيين المادة دي، جرب اسم تاني. <Search size={20}/></div>}</div>
          <div className="subject-foot"><span>عارضين <b>{filtered.length.toString().padStart(2,'0')}</b> من 08 مواد</span><span>اختار مادة عشان تبدأ <ArrowDownLeft size={14}/></span></div>
        </section>
        <footer className="footer"><span>MIHAKK <b>✳</b> BUILT FOR BETTER STUDY DAYS</span><span>HELWAN INTERNATIONAL TECHNOLOGICAL UNIVERSITY · 2026</span></footer>
      </main>}

      {screen === 'setup' && <main className="workspace"><button className="back-link" onClick={() => setScreen('home')}><ArrowRight size={15}/> رجوع للمواد</button><div className="workspace-head"><div><div className="section-overline">02 / إعداد التحدي</div><h1>{active.ar}<em>.</em></h1><p>{active.name} <span>·</span> {active.code} <span>·</span> {active.total} سؤال في بنك المادة</p></div><div className="course-icon large"><Icon name={active.icon} size={30}/></div></div><div className="setup-layout"><section className="setup-main"><div className="setup-block"><div className="block-title"><span>01</span><div><b>اختار نوع الأسئلة</b><small>شكّل الجلسة على حسب اللي محتاج تراجعه</small></div></div><div className="type-grid">{types.map(t => {const Icon=t.icon;const total=active.questions.filter(q=>q.type===t.key).length;return <button key={t.key} className={`type-card ${type===t.key?'type-selected':''}`} onClick={()=>setType(t.key)}><span className="type-icon"><Icon size={18}/></span><b>{t.title}</b><small>{t.english}</small><span className="type-total">{total} سؤال</span><span className="type-check">{type===t.key?<Check size={13}/>:<Plus size={13}/>}</span></button>})}</div></div><div className="setup-block"><div className="block-title"><span>02</span><div><b>طول الجلسة</b><small>اختار عدد الأسئلة المناسب لوقتك</small></div></div><div className="count-control"><button onClick={()=>setCount(Math.max(5,count-5))} aria-label="تقليل"><Minus size={15}/></button><div><b>{Math.min(count,available)}</b><small>سؤال</small></div><button onClick={()=>setCount(Math.min(available,count+5))} aria-label="زيادة"><Plus size={15}/></button><span className="count-of">من {available} سؤال متاح</span></div><div className="preset-row">{[5,10,20,available].filter((n,i,a)=>n<=available&&a.indexOf(n)===i).map(n=><button className={count===n?'preset-active':''} key={n} onClick={()=>setCount(n)}>{n===available?'الكل':`${n} سؤال`}</button>)}</div></div></section><aside className="session-summary"><div className="summary-head"><Settings2 size={16}/> ملخص جلستك</div><div className="summary-course"><div className="course-icon"><Icon name={active.icon} size={20}/></div><div><b>{active.ar}</b><small>{active.code} · {active.name}</small></div></div><div className="summary-line"><span>نوع الأسئلة</span><b>{arType}</b></div><div className="summary-line"><span>عدد الأسئلة</span><b>{Math.min(count,available)} سؤال</b></div><div className="summary-line"><span>الوقت المقترح</span><b>حوالي {Math.max(5,Math.round(count*1.5))} دقيقة</b></div><div className="summary-total"><span>المتاح من النوع ده</span><b>{available}</b></div><button className="start-session" onClick={startExam}>ابدأ الامتحان <ArrowUpLeft size={16}/></button><p className="no-pressure"><Sparkles size={13}/> مفيش ضغط، دي مساحة تدريبك</p></aside></div></main>}

      {screen === 'exam' && current && <main className="exam-workspace"><div className="exam-toolbar"><button className="exit-exam" onClick={() => setShowAnswers(true)}><X size={16}/> خروج</button><div className="exam-title"><div className="exam-title-icon"><Icon name={active.icon} size={16}/></div><span>{active.ar}<small>{arType} · {active.code}</small></span></div><div className={`timer ${seconds<300?'timer-low':''}`}><Clock3 size={15}/>{formatTime(seconds)}</div></div><div className="exam-progress-line"><span style={{width:`${progress}%`}}/></div><div className="exam-body"><div className="exam-meta"><span>السؤال {String(index+1).padStart(2,'0')} <i/> {String(questions.length).padStart(2,'0')}</span><span className="difficulty-pill">{current.difficulty === 'easy' ? 'سهل' : current.difficulty === 'hard' ? 'متقدم' : 'متوسط'} · {current.source?.lecture || active.name}</span></div><h1 className="question-heading">{current.question_text}</h1>{current.type === 'mcq' ? <div className="answer-list">{(current.options ?? []).map((option,i)=>{const checked=reply[index]?.checked;const right=String(current.correct_answer)===option.option_id;const chosen=reply[index]?.value===option.option_id;return <button key={option.option_id} className={`answer-choice ${chosen?'answer-chosen':''} ${checked&&right?'answer-right':''} ${checked&&chosen&&!right?'answer-wrong':''}`} disabled={checked} onClick={()=>{const n=[...reply];n[index]={value:option.option_id,checked:false};setReply(n)}}><span className="choice-key">{String.fromCharCode(65+i)}</span><span>{option.text}</span>{checked&&right&&<Check className="choice-result" size={17}/>}</button>})}</div> : current.type === 'true_false' ? <div className="answer-list answer-list-two">{[['true','صح'],['false','غلط']].map(([v,label])=>{const checked=reply[index]?.checked;const right=isRight(current,v);const chosen=reply[index]?.value===v;return <button key={v} className={`answer-choice ${chosen?'answer-chosen':''} ${checked&&right?'answer-right':''} ${checked&&chosen&&!right?'answer-wrong':''}`} disabled={checked} onClick={()=>{const n=[...reply];n[index]={value:v,checked:false};setReply(n)}}><span className="choice-key">{v==='true'?'✓':'×'}</span><span>{label}</span></button>})}</div> : <textarea className="essay-input" placeholder="اكتب أفكارك هنا..." value={reply[index]?.value||''} disabled={reply[index]?.checked} onChange={e=>{const n=[...reply];n[index]={value:e.target.value,checked:false};setReply(n)}}/>}
            {reply[index]?.checked && <div className={`answer-feedback ${isRight(current,reply[index].value)?'feedback-good':'feedback-bad'}`}><b>{current.type==='essay'?'نموذج الإجابة للمراجعة':isRight(current,reply[index].value)?'إجابة صحيحة، عاش!':'مش دي الإجابة الصحيحة'}</b><p>{current.type==='essay'?current.model_answer:current.explanation || `الإجابة الصحيحة: ${current.correct_answer}`}</p></div>}
            <div className="exam-nav"><button className="previous-question" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ArrowRight size={15}/> السابق</button><span>{reply.filter(r=>r?.checked).length} من {questions.length} تمت الإجابة</span><button className="confirm-answer" onClick={reply[index]?.checked?moveNext:check}>{reply[index]?.checked?(index===questions.length-1?'إنهاء الجلسة':'السؤال التالي'):current.type==='essay'?'عرض نموذج الإجابة':'تأكيد الإجابة'} <ArrowLeft size={15}/></button></div>
          </div><div className="exam-bottom"><span><span className="live-dot"/> جلستك محفوظة على جهازك</span><span>MIHAKK <b>✳</b> FOCUS MODE</span></div></main>}

      {screen === 'result' && <main className="workspace result-workspace"><div className="result-confetti">✳</div><div className="section-overline">03 / نهاية الجلسة</div><h1>أحسنت، <em>كملت.</em></h1><p className="result-lead">كل جلسة بتفرق. ودي كانت خطوة حقيقية لقدّام.</p><div className="result-overview"><div className="result-ring" style={{'--score':`${accuracy}%`} as React.CSSProperties}><div><b>{gradedTotal?accuracy:100}<small>%</small></b><span>نسبة الصح</span></div></div><div className="result-summary"><span className="result-course">{active.ar} · {arType}</span><div className="result-score-line"><b>{score}</b><span>من {gradedTotal} إجابة متصححة</span></div><div className="result-bar"><span style={{width:`${accuracy}%`}}/></div><p>{questions.length-gradedTotal ? `${questions.length-gradedTotal} سؤال مقالي للمراجعة الذاتية` : accuracy>=80?'مستوى ممتاز! راجع الأسئلة اللي وقفتك وكمّل على المادة اللي بعدها.':'راجع التوضيح تحت كل سؤال وجرّب جولة تانية.'}</p></div></div><div className="result-review"><button className="review-toggle" onClick={()=>setExpanded(v=>!v)}><span><BookOpen size={17}/> مراجعة إجابات الجلسة <small>{questions.length} سؤال</small></span><ChevronDown size={17}/></button>{expanded&&<div className="review-list">{questions.map((q,i)=><div className="review-item" key={q.question_id}><span className={`review-mark ${q.type==='essay'?'review-essay':isRight(q,reply[i]?.value)?'review-correct':'review-incorrect'}`}>{q.type==='essay'?'م':isRight(q,reply[i]?.value)?'✓':'×'}</span><div><b>{q.question_text}</b><small>{q.type==='essay'?q.model_answer:isRight(q,reply[i]?.value)?'إجابتك صحيحة':`الإجابة الصحيحة: ${q.type==='mcq'?q.options?.find(o=>o.option_id===q.correct_answer)?.text: String(q.correct_answer)==='true'?'صح':'غلط'}`}</small></div></div>)}</div>}</div><div className="result-actions"><button className="start-session" onClick={()=>setScreen('setup')}>جولة كمان <ArrowUpLeft size={16}/></button><button className="secondary-action" onClick={()=>setScreen('home')}>اختار مادة تانية <ArrowLeft size={15}/></button></div></main>}
    </div>
    {showAnswers&&<div className="modal-backdrop" onClick={()=>setShowAnswers(false)}><div className="confirm-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowAnswers(false)}><X size={17}/></button><span className="modal-icon"><Clock3 size={20}/></span><h3>تخرج من الجلسة؟</h3><p>لو خرجت دلوقتي، مش هتتحسب الجلسة دي ضمن تقدمك.</p><div><button className="secondary-action" onClick={()=>setShowAnswers(false)}>كمّل الامتحان</button><button className="leave-action" onClick={()=>{setShowAnswers(false);setScreen('home')}}>اخرج</button></div></div></div>}
  </div>
}

function Icon({ name, size=20 }: { name: string; size?: number }) { const Component=iconMap[name] || BookOpen; return <Component size={size}/> }
function SubjectCard({ subject, index, onClick, sessions }: { subject: Subject; index: number; onClick: () => void; sessions: number }) {
  const questions: Record<string,string> = { 'Ai.json':'تفكير الآلة يبدأ من هنا', 'Ai App.json':'الذكاء لما يقابل الواقع', 'Data Science.json':'اقرأ الحكاية جوه الداتا', 'Expert Systems.json':'قرارات أذكى، خطوة بخطوة', 'Health and Safety.json':'معرفة تحميك وتحمي غيرك', 'History of Technology.json':'من أول فكرة لحد دلوقتي', 'Introduction to Technology.json':'الأساس اللي هتبني عليه', 'Java.json':'كل سطر كود بيفرق' }
  return <button className={`subject-card card-${index%4}`} onClick={onClick}><div className="card-top"><span className="course-code">{subject.code}</span><span className="card-arrow"><ArrowUpLeft size={17}/></span></div><div className="card-content"><div className="course-icon"><Icon name={subject.icon}/></div><div><h3>{subject.ar}</h3><p>{questions[subject.file]}</p></div></div><div className="card-bottom"><span><BookOpen size={13}/>{subject.total} سؤال</span><span>{sessions ? `${sessions} جلسة` : 'ابدأ من هنا'}<span className="card-status">●</span></span></div><span className="card-watermark">{String(index+1).padStart(2,'0')}</span></button>
}
export default App

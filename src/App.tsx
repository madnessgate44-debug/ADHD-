import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Calendar, RotateCw, Target, Zap, BarChart2, Settings, 
  AlertTriangle, Trash2, Plus, Check, Sparkles, Clock, 
  ArrowRight, X, Play, Pause, Square, Undo, ShieldAlert,
  ChevronRight, Download, Upload, RefreshCw, Volume2, Shield,
  Send, Copy, FileText, Share2, Flame, Award, CheckSquare
} from 'lucide-react';

// ============================================================
// TYPES & SCHEMAS
// ============================================================
export interface Profile {
  type: 'initiation_overwhelm' | 'time_blindness' | 'routine_instability';
  createdAt: string;
  updatedAt: string;
  preferences: {
    focusDuration: number;
    reminderStyle: 'gentle' | 'firm';
  };
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: 'active' | 'done' | 'archived';
  dueDate: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
  subtasks: Subtask[];
  carryOverCount: number;
}

export interface RoutineLog {
  date: string;
  completedAt: string;
}

export interface Routine {
  id: string;
  title: string;
  notes?: string;
  active: boolean;
  recurrence: {
    type: 'daily' | 'weekdays' | 'custom';
    days: number[];
  };
  reminder?: {
    enabled: boolean;
    time: string | null;
  };
  completionLog: RoutineLog[];
  createdAt: string;
  updatedAt: string;
}

export interface MedicationLog {
  date: string;
  status: 'taken' | 'skipped';
  timestamp: string;
}

export interface Medication {
  id: string;
  title: string;
  dosage: string;
  active: boolean;
  reminderTime: string | null;
  log: MedicationLog[];
  createdAt: string;
}

export interface EventLog {
  id: string;
  type: string;
  timestamp: string;
  entityType?: string;
  entityId?: string;
  metadata?: any;
}

export interface DailyReport {
  id: string;
  date: string;
  tasksCompleted: number;
  focusCompleted: number;
  focusMinutes: number;
  routinesCompleted: number;
  routinesTotal: number;
  medsStatus: string;
  rescueApplied: boolean;
  notes: string;
  sentAt: string;
  coachFeedback: string;
  bigGoal?: string;
}

export interface DayState {
  date: string;
  startedAt: string | null;
  closedAt: string | null;
  status: 'not_started' | 'active' | 'closed';
  todayTaskIds: string[];
  nowTaskId: string | null;
  completedTodayTaskIds: string[];
  deferredTaskIds: string[];
  carryOverTaskIds: string[];
  droppedTaskIds: string[];
  hasCarryOver: boolean;
  bigGoal?: string;
}

const DEFAULT_ROUTINES: Omit<Routine, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'rot_morning_meds',
    title: 'Morning Meds & Hydration',
    notes: 'Take your medication with a full glass of water',
    active: true,
    recurrence: { type: 'daily', days: [] },
    reminder: { enabled: true, time: '08:00' },
    completionLog: []
  },
  {
    id: 'rot_planner_check',
    title: 'Plan the Day',
    notes: 'Spend 2 minutes reviewing the top Now/Next task list',
    active: true,
    recurrence: { type: 'daily', days: [] },
    reminder: { enabled: true, time: '08:30' },
    completionLog: []
  },
  {
    id: 'rot_wind_down',
    title: 'Evening Wind-Down Checklist',
    notes: 'Clear workspace and plan tomorrow\'s microscopic first step',
    active: true,
    recurrence: { type: 'daily', days: [] },
    reminder: { enabled: true, time: '21:30' },
    completionLog: []
  }
];

const DEFAULT_MEDICATIONS = [
  {
    id: 'med_adhd',
    title: 'ADHD Primary Medication',
    dosage: '1 Capsule (Morning)',
    active: true,
    reminderTime: '08:00',
    log: []
  }
];

export default function App() {
  // ============================================================
  // APP STATES
  // ============================================================
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inbox, setInbox] = useState<{ id: string; text: string; createdAt: string }[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [dayState, setDayState] = useState<DayState | null>(null);
  
  const [activeTab, setActiveTab] = useState<'home' | 'planner' | 'routines' | 'focus' | 'capture' | 'insights' | 'settings'>('home');
  const [loading, setLoading] = useState(true);

  // Overlay states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showMorningReset, setShowMorningReset] = useState(false);
  const [showEveningReset, setShowEveningReset] = useState(false);
  const [showRescueOverlay, setShowRescueOverlay] = useState(false);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineRec, setNewRoutineRec] = useState<'daily' | 'weekdays'>('daily');
  const [captureInput, setCaptureInput] = useState('');
  const [coachReportNotes, setCoachReportNotes] = useState('');
  const [morningBigGoal, setMorningBigGoal] = useState('');

  // AI & Feedback loading states
  const [isProcessingAI, setIsProcessingAI] = useState<{ [key: string]: boolean }>({});
  const [coachFeedback, setCoachFeedback] = useState<string | null>(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);

  // Focus Timer States
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerTotalSeconds, setTimerTotalSeconds] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const timerPausedRef = useRef(false);
  useEffect(() => { timerPausedRef.current = timerPaused; }, [timerPaused]);
  const [rescueUndo, setRescueUndo] = useState<{ date: string; dayState: DayState; archivedIds: string[] } | null>(() => {
    try { return JSON.parse(localStorage.getItem('rescueUndo') || 'null'); } catch { return null; }
  });
  const [medFormOpen, setMedFormOpen] = useState(false);
  const [medFormTitle, setMedFormTitle] = useState('');
  const [medFormDosage, setMedFormDosage] = useState('');
  const [timerFocusTaskId, setTimerFocusTaskId] = useState<string | null>(null);
  const [parkedThoughts, setParkedThoughts] = useState('');
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Morning/Evening Step States
  const [resetStep, setResetStep] = useState(0);

  // Rescue my day buckets state
  const [rescueBuckets, setRescueBuckets] = useState<{
    keep: Task[];
    later: Task[];
    drop: Task[];
  }>({ keep: [], later: [], drop: [] });

  // Onboarding Quiz state
  const [onboardingStep, setOnboardingStep] = useState<'welcome' | 'quiz'>('welcome');
  const [onboardingAnswers, setOnboardingAnswers] = useState<{ [key: string]: any }>({
    q1: [],
    q2: '',
    q3: [],
    q4: '',
    q5: [],
  });

  const [simulatedVoiceRecording, setSimulatedVoiceRecording] = useState(false);

  // Coach Sync & Stimulating Gamification states
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [dopamineLevel, setDopamineLevel] = useState<number>(50);
  const [rewardAnimation, setRewardAnimation] = useState<{ show: boolean; text: string; emoji: string } | null>(null);
  const [isTransmittingReport, setIsTransmittingReport] = useState<boolean>(false);
  const [transmissionProgress, setTransmissionProgress] = useState<number>(0);
  const [transmissionStep, setTransmissionStep] = useState<number>(0);
  const [insightsSubTab, setInsightsSubTab] = useState<'insights' | 'coach_sync' | 'journey'>('insights');
  const [journeyDate, setJourneyDate] = useState<string>('');

  // ============================================================
  // HELPERS
  // ============================================================
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

  const logEvent = (type: string, entityType?: string, entityId?: string, metadata?: any) => {
    const newEvent: EventLog = {
      id: 'evt_' + generateId(),
      type,
      timestamp: new Date().toISOString(),
      entityType,
      entityId,
      metadata
    };
    setEvents(prev => {
      const updated = [...prev, newEvent];
      localStorage.setItem('events', JSON.stringify(updated));
      return updated;
    });
  };

  // ============================================================
  // LOAD & INITIALIZATION
  // ============================================================
  useEffect(() => {
    const loadData = () => {
      try {
        const p = localStorage.getItem('profile');
        const t = localStorage.getItem('tasks');
        const i = localStorage.getItem('inbox');
        const r = localStorage.getItem('routines');
        const m = localStorage.getItem('medications');
        const e = localStorage.getItem('events');
        const d = localStorage.getItem('dayState');
        const rep = localStorage.getItem('dailyReports');
        const dop = localStorage.getItem('dopamineLevel');

        const loadedProfile = p ? JSON.parse(p) : null;
        setProfile(loadedProfile);
        setTasks(t ? JSON.parse(t) : []);
        setInbox(i ? JSON.parse(i) : []);
        setRoutines(r ? JSON.parse(r) : []);
        setMedications(m ? JSON.parse(m) : []);
        setEvents(e ? JSON.parse(e) : []);
        setDailyReports(rep ? JSON.parse(rep) : []);
        setDopamineLevel(dop ? Number(dop) : 50);

        const parsedDayState = d ? JSON.parse(d) : null;
        const today = getTodayStr();

        if (!loadedProfile) {
          setShowOnboarding(true);
        } else {
          // Setup Day State
          if (!parsedDayState || parsedDayState.date !== today) {
            let carryOvers: string[] = [];
            let hasCarryOver = false;

            if (parsedDayState && parsedDayState.date !== today) {
              // Unfinished tasks still in the plan carry over. A closed day only keeps tasks the user explicitly chose to carry (others are moved to backlog or archived at close).
              const prevTasks = t ? JSON.parse(t) : [];
              const unfinished = prevTasks.filter((task: Task) => 
                parsedDayState.todayTaskIds.includes(task.id) && task.status === 'active'
              );
              carryOvers = unfinished.map((task: Task) => task.id);
              hasCarryOver = carryOvers.length > 0;
            }

            const initialDayState: DayState = {
              date: today,
              startedAt: null,
              closedAt: null,
              status: 'not_started',
              todayTaskIds: carryOvers,
              nowTaskId: carryOvers.length > 0 ? carryOvers[0] : null,
              completedTodayTaskIds: [],
              deferredTaskIds: [],
              carryOverTaskIds: carryOvers,
              droppedTaskIds: [],
              hasCarryOver,
              bigGoal: ''
            };
            localStorage.setItem('dayState', JSON.stringify(initialDayState));
            setDayState(initialDayState);
          } else {
            setDayState(parsedDayState);
          }
        }
      } catch (err) {
        console.error('Error loading LocalStorage', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (dailyReports.length > 0 && !journeyDate) {
      const sorted = [...dailyReports].sort((a, b) => b.date.localeCompare(a.date));
      setJourneyDate(sorted[0].date);
    }
  }, [dailyReports, journeyDate]);

  // Save triggers
  const saveTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
  };

  const saveInbox = (newInbox: typeof inbox) => {
    setInbox(newInbox);
    localStorage.setItem('inbox', JSON.stringify(newInbox));
  };

  const saveRoutines = (newRoutines: Routine[]) => {
    setRoutines(newRoutines);
    localStorage.setItem('routines', JSON.stringify(newRoutines));
  };

  const saveMedications = (newMeds: Medication[]) => {
    setMedications(newMeds);
    localStorage.setItem('medications', JSON.stringify(newMeds));
  };

  const saveDayState = (newState: DayState) => {
    setDayState(newState);
    localStorage.setItem('dayState', JSON.stringify(newState));
  };

  const saveDailyReports = (reports: DailyReport[]) => {
    setDailyReports(reports);
    localStorage.setItem('dailyReports', JSON.stringify(reports));
  };

  const triggerDopamineReward = (points: number, message: string, emoji: string) => {
    setDopamineLevel(prev => {
      const next = prev + points;
      if (next >= 100) {
        setRewardAnimation({ show: true, text: `🌟 Meter full! You filled the momentum meter (a task-completion game, not a measurement).`, emoji: '🚀🔥🎉' });
        localStorage.setItem('dopamineLevel', '0');
        setTimeout(() => setRewardAnimation(null), 4500);
        return 0;
      }
      setRewardAnimation({ show: true, text: `${message} (+${points} pts)`, emoji });
      localStorage.setItem('dopamineLevel', next.toString());
      setTimeout(() => setRewardAnimation(null), 3000);
      return next;
    });
  };

  // ============================================================
  // FOCUS TIMER SYSTEM
  // ============================================================
  const startTimer = (minutes: number, taskId: string | null = null) => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    
    setTimerFocusTaskId(taskId);
    setTimerTotalSeconds(minutes * 60);
    setTimerSeconds(minutes * 60);
    setTimerActive(true);
    setTimerPaused(false);
    timerPausedRef.current = false;
    logEvent('focus_started', 'task', taskId || undefined, { duration: minutes });

    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (timerPausedRef.current) return prev;
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setTimerActive(false);
          logEvent('focus_completed', 'task', taskId || undefined, { duration: minutes });
          triggerDopamineReward(30, 'Focus Block Completed! ⚡ Strength +30', '⏱️');
          alert('🎉 Awesome job! Your focus block is finished. Coach Hisham says: Celebrate this win!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    logEvent('focus_abandoned', 'task', timerFocusTaskId || undefined, { remaining: timerSeconds });
    setTimerActive(false);
  };

  const parkThought = () => {
    if (!parkedThoughts.trim()) return;
    const item = {
      id: 'inbox_' + generateId(),
      text: `[Focus Parked Thought] ${parkedThoughts.trim()}`,
      createdAt: new Date().toISOString()
    };
    const updated = [...inbox, item];
    saveInbox(updated);
    logEvent('capture_added', 'inbox', item.id, { text: item.text });
    setParkedThoughts('');
    alert('Thought parked safely in Capture Inbox! Now return to your task.');
  };

  // ============================================================
  // ONBOARDING SUBMIT
  // ============================================================
  const handleOnboardingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scores = { initiation_overwhelm: 0, time_blindness: 0, routine_instability: 0 };
    
    // Process Q1 (Select all that apply - Checkboxes)
    const q1Answers = onboardingAnswers.q1 || [];
    q1Answers.forEach((val: string) => {
      if (val === 'freeze_initiation') scores.initiation_overwhelm += 2;
      if (val === 'hyperfocus_lost') scores.time_blindness += 2;
      if (val === 'routine_fade') scores.routine_instability += 2;
      if (val === 'mid_switch') scores.routine_instability += 1;
      if (val === 'paralysis_list') scores.initiation_overwhelm += 2;
      if (val === 'time_underestimate') scores.time_blindness += 2;
    });

    // Process Q2 (Single Choice - Radio)
    const q2Answer = onboardingAnswers.q2;
    if (q2Answer === 'time_blur') scores.time_blindness += 3;
    if (q2Answer === 'time_anxiety') scores.initiation_overwhelm += 3;
    if (q2Answer === 'time_irrelevant') scores.routine_instability += 3;

    // Process Q3 (Select all that apply - Checkboxes)
    const q3Answers = onboardingAnswers.q3 || [];
    q3Answers.forEach((val: string) => {
      if (val === 'distress_freeze') scores.initiation_overwhelm += 2;
      if (val === 'random_priority') scores.routine_instability += 2;
      if (val === 'overestimate_capacity') scores.time_blindness += 2;
      if (val === 'forget_backlog') {
        scores.time_blindness += 1;
        scores.routine_instability += 1;
      }
    });

    // Process Q4 (Single Choice - Radio)
    const q4Answer = onboardingAnswers.q4;
    if (q4Answer === 'minimalist_one_step') scores.initiation_overwhelm += 3;
    if (q4Answer === 'buffers_warnings') scores.time_blindness += 3;
    if (q4Answer === 'routine_nudge') scores.routine_instability += 3;

    // Process Q5 (Select all that apply - Checkboxes)
    const q5Answers = onboardingAnswers.q5 || [];
    q5Answers.forEach((val: string) => {
      if (val === 'skip_basic_needs') scores.time_blindness += 2;
      if (val === 'guilt_shame') scores.initiation_overwhelm += 2;
      if (val === 'forget_meds') scores.routine_instability += 3;
      if (val === 'no_morning_reset') scores.routine_instability += 2;
    });

    let maxType: Profile['type'] = 'initiation_overwhelm';
    let maxVal = -1;
    for (const [type, count] of Object.entries(scores)) {
      if (count > maxVal) {
        maxVal = count;
        maxType = type as Profile['type'];
      }
    }

    const newProfile: Profile = {
      type: maxType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        focusDuration: maxType === 'initiation_overwhelm' ? 10 : maxType === 'time_blindness' ? 15 : 25,
        reminderStyle: 'gentle'
      }
    };

    setProfile(newProfile);
    localStorage.setItem('profile', JSON.stringify(newProfile));

    // Preset base routines and meds
    const presetsWithDates = DEFAULT_ROUTINES.map(r => ({
      ...r,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    saveRoutines(presetsWithDates);
    
    const medsWithDates = DEFAULT_MEDICATIONS.map(m => ({
      ...m,
      createdAt: new Date().toISOString()
    }));
    saveMedications(medsWithDates);

    logEvent('onboarding_completed', 'profile', undefined, { type: maxType });
    setShowOnboarding(false);
    
    // Create first dummy task
    const demoTask: Task = {
      id: 'task_demo',
      title: 'Complete my onboarding reflection with Hisham',
      notes: 'Review ADHD profile goals',
      status: 'active',
      dueDate: getTodayStr(),
      source: 'onboarding',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subtasks: [
        { id: 'sub_1', title: 'Open settings and view profile', done: false },
        { id: 'sub_2', title: 'Start a 5-minute Focus Sprint', done: false }
      ],
      carryOverCount: 0
    };
    saveTasks([demoTask]);

    // Setup first day plan
    const today = getTodayStr();
    const day: DayState = {
      date: today,
      startedAt: new Date().toISOString(),
      closedAt: null,
      status: 'active',
      todayTaskIds: [demoTask.id],
      nowTaskId: demoTask.id,
      completedTodayTaskIds: [],
      deferredTaskIds: [],
      carryOverTaskIds: [],
      droppedTaskIds: [],
      hasCarryOver: false
    };
    saveDayState(day);
    setActiveTab('home');
  };

  // ============================================================
  // TASK CREATION & UPDATES
  // ============================================================
  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: Task = {
      id: 'task_' + generateId(),
      title: newTaskTitle.trim(),
      notes: '',
      status: 'active',
      dueDate: newTaskDue || null,
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      subtasks: [],
      carryOverCount: 0
    };
    const updated = [...tasks, newTask];
    saveTasks(updated);
    logEvent('task_created', 'task', newTask.id, { title: newTask.title });
    setNewTaskTitle('');
    setNewTaskDue('');
  };

  const toggleTaskDone = (id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'done' ? 'active' : 'done';
        logEvent(nextStatus === 'done' ? 'task_completed' : 'task_reopened', 'task', id, { title: t.title });
        if (nextStatus === 'done') {
          triggerDopamineReward(15, 'Task Completed! Hisham is proud.', '🎯');
        }
        
        // Also update completed today ids
        if (dayState) {
          const completedIds = nextStatus === 'done' 
            ? [...dayState.completedTodayTaskIds, id] 
            : dayState.completedTodayTaskIds.filter(cid => cid !== id);
          saveDayState({ ...dayState, completedTodayTaskIds: completedIds });
        }
        return { ...t, status: nextStatus as Task['status'], updatedAt: new Date().toISOString() };
      }
      return t;
    });
    saveTasks(updated);
  };

  const deleteTask = (id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
    if (dayState) {
      saveDayState({
        ...dayState,
        todayTaskIds: dayState.todayTaskIds.filter(tid => tid !== id),
        nowTaskId: dayState.nowTaskId === id ? null : dayState.nowTaskId
      });
    }
    logEvent('task_deleted', 'task', id);
  };

  const makeTaskNow = (id: string) => {
    if (!dayState) return;
    const nextNow = dayState.nowTaskId === id ? null : id;
    saveDayState({ ...dayState, nowTaskId: nextNow });
    logEvent('now_task_changed', 'task', nextNow || undefined);
  };

  const toggleSubtaskDone = (taskId: string, subtaskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const updatedSubtasks = t.subtasks.map(sub => 
          sub.id === subtaskId ? { ...sub, done: !sub.done } : sub
        );
        return { ...t, subtasks: updatedSubtasks, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    saveTasks(updated);
  };

  const addSubtaskManual = (taskId: string, title: string) => {
    if (!title.trim()) return;
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const newSub = { id: 'sub_' + generateId(), title: title.trim(), done: false };
        return { ...t, subtasks: [...t.subtasks, newSub], updatedAt: new Date().toISOString() };
      }
      return t;
    });
    saveTasks(updated);
  };

  // ============================================================
  // AI-ASSISTED APIS
  // ============================================================
  const callAIBreakdown = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setIsProcessingAI(prev => ({ ...prev, [taskId]: true }));
    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskTitle: task.title })
      });
      const data = await res.json();
      if (data.steps && Array.isArray(data.steps)) {
        const generatedSubtasks = data.steps.map((stepTitle: string) => ({
          id: 'sub_' + generateId(),
          title: stepTitle,
          done: false
        }));
        const updated = tasks.map(t => 
          t.id === taskId ? { ...t, subtasks: [...t.subtasks, ...generatedSubtasks], updatedAt: new Date().toISOString() } : t
        );
        saveTasks(updated);
        logEvent('task_broken_down', 'task', taskId, { subtaskCount: data.steps.length });
      }
    } catch (err) {
      console.error(err);
      alert('AI is restabilizing. Manual breakdown triggered.');
    } finally {
      setIsProcessingAI(prev => ({ ...prev, [taskId]: false }));
    }
  };

  const processCaptureInboxItem = async (inboxItemText: string, index: number, targetType: 'task' | 'routine' | 'note') => {
    setIsProcessingAI(prev => ({ ...prev, [`inbox_${index}`]: true }));
    try {
      const res = await fetch('/api/process-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inboxItemText })
      });
      const data = await res.json();
      
      const cleanType = data.type || targetType;

      if (cleanType === 'task') {
        const generatedSubtasks = (data.subtasks || []).map((subTitle: string) => ({
          id: 'sub_' + generateId(),
          title: subTitle,
          done: false
        }));

        const newTask: Task = {
          id: 'task_' + generateId(),
          title: data.title || inboxItemText,
          notes: data.description || '',
          status: 'active',
          dueDate: getTodayStr(),
          source: 'inbox',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subtasks: generatedSubtasks,
          carryOverCount: 0
        };
        saveTasks([...tasks, newTask]);
        logEvent('inbox_converted_to_task', 'inbox', undefined, { text: inboxItemText });
      } else if (cleanType === 'routine') {
        const newRoutine: Routine = {
          id: 'rot_' + generateId(),
          title: data.title || inboxItemText,
          notes: data.description || '',
          active: true,
          recurrence: { type: 'daily', days: [] },
          completionLog: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        saveRoutines([...routines, newRoutine]);
        logEvent('inbox_converted_to_routine', 'inbox', undefined, { text: inboxItemText });
      } else {
        alert(`Parked Note Saved: ${data.title || inboxItemText}`);
      }
      triggerDopamineReward(10, 'Inboxed Thought Processed!', '🧩');

      // Remove from inbox
      const nextInbox = inbox.filter((_, idx) => idx !== index);
      saveInbox(nextInbox);
      setActiveTab('planner');
    } catch (err) {
      console.error(err);
      // Fallback
      const newTask: Task = {
        id: 'task_' + generateId(),
        title: inboxItemText,
        notes: '',
        status: 'active',
        dueDate: null,
        source: 'inbox',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        subtasks: [],
        carryOverCount: 0
      };
      saveTasks([...tasks, newTask]);
      const nextInbox = inbox.filter((_, idx) => idx !== index);
      saveInbox(nextInbox);
      setActiveTab('planner');
    } finally {
      setIsProcessingAI(prev => ({ ...prev, [`inbox_${index}`]: false }));
    }
  };

  const fetchCoachFeedback = async () => {
    setIsGeneratingFeedback(true);
    try {
      const res = await fetch('/api/generate-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, profile })
      });
      const data = await res.json();
      setCoachFeedback(data.insight || 'You are doing amazing! Hisham is proud of your consistency.');
    } catch (err) {
      console.error(err);
      setCoachFeedback('ADHD Coaching Secret: Momentum is built by starting tiny. Keep taking Micro-Steps! You completed several focus sprints recently.');
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  // ============================================================
  // MEDICATIONS LOG
  // ============================================================
  const logMedicationTaken = (id: string, status: 'taken' | 'skipped') => {
    const updated = medications.map(m => {
      if (m.id === id) {
        const cleanLog = m.log.filter(l => l.date !== getTodayStr());
        return {
          ...m,
          log: [...cleanLog, { date: getTodayStr(), status, timestamp: new Date().toISOString() }]
        };
      }
      return m;
    });
    saveMedications(updated);
    logEvent(status === 'taken' ? 'medication_taken' : 'medication_skipped', 'medication', id);
    if (status === 'taken') {
      triggerDopamineReward(25, 'Medication Logged: Taken!', '💊');
    } else {
      triggerDopamineReward(10, 'Accountability Logged: Skipped', '🛡️');
    }
  };

  // ============================================================
  // RESCUE FLOW WORKSPACE
  // ============================================================
  const triggerRescueWorkspace = () => {
    if (!dayState) return;
    const todaysTasks = tasks.filter(t => dayState.todayTaskIds.includes(t.id));
    setRescueBuckets({
      keep: todaysTasks.slice(0, 2),
      later: todaysTasks.slice(2, 4),
      drop: todaysTasks.slice(4)
    });
    setShowRescueOverlay(true);
    logEvent('rescue_started');
  };

  const undoRescue = () => {
    if (!rescueUndo || rescueUndo.date !== getTodayStr()) return;
    const restored = tasks.map(t => rescueUndo.archivedIds.includes(t.id) && t.status === 'archived' ? { ...t, status: 'active' as const, updatedAt: new Date().toISOString() } : t);
    saveTasks(restored);
    saveDayState(rescueUndo.dayState);
    localStorage.removeItem('rescueUndo');
    setRescueUndo(null);
    logEvent('rescue_undone');
  };

  const applyRescueChanges = () => {
    if (!dayState) return;
    
    const keepIds = rescueBuckets.keep.map(t => t.id);
    const laterIds = rescueBuckets.later.map(t => t.id);
    const dropIds = rescueBuckets.drop.map(t => t.id);

    const snapshot = { date: getTodayStr(), dayState, archivedIds: dropIds };
    localStorage.setItem('rescueUndo', JSON.stringify(snapshot));
    setRescueUndo(snapshot);

    // Update tasks statuses
    const updatedTasks = tasks.map(t => {
      if (dropIds.includes(t.id)) {
        return { ...t, status: 'archived' as const, updatedAt: new Date().toISOString() };
      }
      return t;
    });
    saveTasks(updatedTasks);

    // Update dayState
    const updatedDayState: DayState = {
      ...dayState,
      todayTaskIds: keepIds,
      nowTaskId: keepIds.length > 0 ? keepIds[0] : null,
      deferredTaskIds: [...dayState.deferredTaskIds, ...laterIds],
      droppedTaskIds: [...dayState.droppedTaskIds, ...dropIds]
    };
    saveDayState(updatedDayState);
    logEvent('rescue_applied', undefined, undefined, { kept: keepIds.length, later: laterIds.length, dropped: dropIds.length });
    
    setShowRescueOverlay(false);
    setActiveTab('home');
    alert('🛡️ Support Shield Active! Your day has been rescue-filtered. Focus only on the KEEP tasks.');
  };

  // ============================================================
  // RESET DAY FLOWS
  // ============================================================
  const openMorningResetPlan = () => {
    setResetStep(0);
    setMorningBigGoal(dayState?.bigGoal || '');
    setShowMorningReset(true);
  };

  const finishMorningResetPlan = () => {
    if (!dayState) return;
    saveDayState({
      ...dayState,
      status: 'active',
      startedAt: new Date().toISOString(),
      bigGoal: morningBigGoal.trim()
    });
    logEvent('morning_reset_completed');
    triggerDopamineReward(20, 'Morning Reset Locked!', '🌅');
    setShowMorningReset(false);
    setActiveTab('home');
  };

  const selectTaskForToday = (id: string) => {
    if (!dayState) return;
    if (dayState.todayTaskIds.length >= 5) {
      alert('ADHD Rule: Plan maximum 5 tasks to prevent list paralysis!');
      return;
    }
    if (dayState.todayTaskIds.includes(id)) return;

    const nextTodayIds = [...dayState.todayTaskIds, id];
    saveDayState({
      ...dayState,
      todayTaskIds: nextTodayIds,
      nowTaskId: dayState.nowTaskId || id
    });
    logEvent('task_moved_to_today', 'task', id);
  };

  const openEveningResetPlan = () => {
    setResetStep(0);
    setShowEveningReset(true);
  };

  const handleEveningTaskAction = (taskId: string, action: 'carry' | 'defer' | 'archive') => {
    if (!dayState) return;
    if (action === 'carry') {
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, carryOverCount: t.carryOverCount + 1, updatedAt: new Date().toISOString() } : t
      );
      saveTasks(updatedTasks);
      logEvent('task_carried_over', 'task', taskId);
    } else if (action === 'defer') {
      saveDayState({
        ...dayState,
        todayTaskIds: dayState.todayTaskIds.filter(id => id !== taskId),
        deferredTaskIds: [...dayState.deferredTaskIds, taskId],
        nowTaskId: dayState.nowTaskId === taskId ? null : dayState.nowTaskId
      });
      logEvent('task_moved_to_later', 'task', taskId);
    } else {
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, status: 'archived' as const, updatedAt: new Date().toISOString() } : t
      );
      saveTasks(updatedTasks);
      saveDayState({
        ...dayState,
        todayTaskIds: dayState.todayTaskIds.filter(id => id !== taskId),
        droppedTaskIds: [...dayState.droppedTaskIds, taskId],
        nowTaskId: dayState.nowTaskId === taskId ? null : dayState.nowTaskId
      });
      logEvent('task_dropped', 'task', taskId);
    }
  };

  const closeEveningResetPlan = () => {
    if (!dayState) return;
    saveDayState({
      ...dayState,
      status: 'closed',
      closedAt: new Date().toISOString()
    });
    logEvent('day_closed');
    triggerDopamineReward(25, 'Evening Reflection Logged!', '🌌');
    setShowEveningReset(false);
    setActiveTab('insights');
  };

  // ============================================================
  // ROUTINE COMPLETIONS
  // ============================================================
  const toggleRoutineComplete = (id: string) => {
    const today = getTodayStr();
    const updated = routines.map(r => {
      if (r.id === id) {
        const completedToday = r.completionLog.some(l => l.date === today);
        let nextLog = [...r.completionLog];
        if (completedToday) {
          nextLog = r.completionLog.filter(l => l.date !== today);
          logEvent('routine_uncompleted', 'routine', id, { title: r.title });
        } else {
          nextLog.push({ date: today, completedAt: new Date().toISOString() });
          logEvent('routine_completed', 'routine', id, { title: r.title });
          triggerDopamineReward(15, 'Routine Completed!', '🔄');
        }
        return { ...r, completionLog: nextLog, updatedAt: new Date().toISOString() };
      }
      return r;
    });
    saveRoutines(updated);
  };

  const addRoutine = () => {
    if (!newRoutineTitle.trim()) return;
    const newRot: Routine = {
      id: 'rot_' + generateId(),
      title: newRoutineTitle.trim(),
      active: true,
      recurrence: {
        type: newRoutineRec,
        days: []
      },
      completionLog: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveRoutines([...routines, newRot]);
    logEvent('routine_created', 'routine', newRot.id, { title: newRot.title });
    setNewRoutineTitle('');
  };

  const deleteRoutine = (id: string) => {
    const updated = routines.filter(r => r.id !== id);
    saveRoutines(updated);
    logEvent('routine_deleted', 'routine', id);
  };

  // ============================================================
  // COACH SYNC TRANSMISSION SYSTEM
  // ============================================================
  const transmitReportToCoach = () => {
    if (isTransmittingReport) return;
    setIsTransmittingReport(true);
    setTransmissionProgress(5);
    setTransmissionStep(0);

    // Calculate Today's Metrics
    const today = getTodayStr();
    
    const tasksCompletedTodayCount = tasks.filter(t => 
      t.status === 'done' && t.updatedAt?.startsWith(today)
    ).length;

    const focusCompletedEvents = events.filter(e => 
      e.type === 'focus_completed' && e.timestamp.startsWith(today)
    );
    const focusSprintCount = focusCompletedEvents.length;
    const focusMinutesCount = focusCompletedEvents.reduce((acc, curr) => 
      acc + (curr.metadata?.duration || 10), 0
    );

    const activeRoutines = routines.filter(r => r.active);
    const routinesCompletedCount = activeRoutines.filter(r => 
      r.completionLog.some(l => l.date === today)
    ).length;
    const routinesTotalCount = activeRoutines.length;

    const takenMeds = medications.filter(m => m.active).map(m => {
      const status = m.log.find(l => l.date === today)?.status || 'pending';
      return `${m.title} (${status})`;
    }).join(', ') || 'No medications logged';

    const rescueAppliedCount = events.some(e => 
      e.type === 'rescue_applied' && e.timestamp.startsWith(today)
    );

    // Simulate Stepwise Transmission for Visual Engagement
    const interval = setInterval(() => {
      setTransmissionProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Generate realistic Hisham comment
          let responseText = '';
          if (tasksCompletedTodayCount >= 3) {
            responseText = `Excellent focus density today! You bypassed the initiation threshold with high velocity. Let's sustain this tiny, non-overwhelming step format tomorrow. Hisham is proud.`;
          } else if (rescueAppliedCount) {
            responseText = `I saw you activated the Emergency Rescue Shield. Outstanding decision! ADHD coaching is about boundary hygiene, not list heroism. You successfully protected your cognitive budget today. Let's celebrate this win.`;
          } else if (focusSprintCount >= 2) {
            responseText = `Fabulous focus blocks. You established a beautiful transition rhythm. Commend yourself for sitting down for those sprints. Tomorrow, remember to take hydration buffers!`;
          } else if (tasksCompletedTodayCount === 0 && routinesCompletedCount === 0) {
            responseText = `A hard transition day. Zero shame. Executive function fluctuates, and fighting the freeze state directly only drains your battery. Let's plan exactly ONE microscopic action tomorrow morning — so tiny it feels silly to ignore. I support you.`;
          } else {
            responseText = `Report received. I logged your records. Consistency is a muscle we train together. Good accountability keeping the sync active! Let's review this in our next 1-on-1 coaching session.`;
          }

          const newReport: DailyReport = {
            id: 'rep_' + generateId(),
            date: today,
            tasksCompleted: tasksCompletedTodayCount,
            focusCompleted: focusSprintCount,
            focusMinutes: focusMinutesCount,
            routinesCompleted: routinesCompletedCount,
            routinesTotal: routinesTotalCount,
            medsStatus: takenMeds,
            rescueApplied: rescueAppliedCount,
            notes: coachReportNotes.trim() || 'No additional notes provided.',
            sentAt: new Date().toISOString(),
            coachFeedback: responseText,
            bigGoal: dayState?.bigGoal || ''
          };

          const nextReports = [newReport, ...dailyReports];
          saveDailyReports(nextReports);
          triggerDopamineReward(35, 'Daily Record Sent to Coach Hisham!', '🤝');
          setIsTransmittingReport(false);
          setCoachReportNotes('');
          alert('📨 Saved on this device only. Nothing was sent. The feedback below is an automatic template.');
          return 100;
        }

        const nextProgress = prev + 15;
        if (nextProgress >= 75) {
          setTransmissionStep(3);
        } else if (nextProgress >= 50) {
          setTransmissionStep(2);
        } else if (nextProgress >= 25) {
          setTransmissionStep(1);
        }
        return nextProgress > 100 ? 100 : nextProgress;
      });
    }, 450);
  };

  const runAssimilationEngine = () => {
    const today = new Date();
    const generatedTasks: Task[] = [...tasks];
    const generatedEvents: EventLog[] = [];
    const generatedReports: DailyReport[] = [];
    
    // Copy base routines/medications to populate logs
    let baseRoutines = routines.length > 0 ? JSON.parse(JSON.stringify(routines)) : JSON.parse(JSON.stringify(DEFAULT_ROUTINES));
    let baseMeds = medications.length > 0 ? JSON.parse(JSON.stringify(medications)) : JSON.parse(JSON.stringify(DEFAULT_MEDICATIONS));

    // Ensure they have their created/updated times and logs
    baseRoutines = baseRoutines.map((r: any) => ({
      ...r,
      createdAt: r.createdAt || new Date(today.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: r.updatedAt || new Date(today.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString(),
      completionLog: []
    }));

    baseMeds = baseMeds.map((m: any) => ({
      ...m,
      log: []
    }));

    // Realistic ADHD trainer diary notes
    const diaryNotes = [
      "Felt quite a bit of task friction in the afternoon, but breaking down my inbox into micro-steps really helped.",
      "Meds kept me anchored. Completed a solid focus sprint today.",
      "A bit scatterbrained today. Activated the support shield around 3pm to salvage some calm.",
      "Had a massive hyperfocus on minor styling details, but overall got the primary target done.",
      "Initiations were tough. Felt a major freeze state, but Coach Hisham's reminder kept me from avoiding entirely.",
      "Woke up motivated, completed both morning routine items with ease. Feeling proud!",
      "Transition between tasks was smooth today thanks to 10-minute buffers.",
      "Very low energy. Kept it to a tiny failure-proof action. ADHD consistency muscle active!",
      "Got distracted by email rabbit holes, but salvaged the late afternoon.",
      "Meds + water early. Clean daily check-in. Zero carry-overs today!",
      "Anxiety ran high. Shielded myself from the backlog. Bypassed overwhelm successfully.",
      "Solid focus momentum! Two sprints completed without skipping meals.",
      "A challenging start but a successful finish. Hydration check helped.",
      "Friction-less captures kept my head light. Cleared the inbox before dinner.",
      "Sustaining microscopic goals works. Didn't trigger list paralysis once."
    ];

    // Realistic Hisham coaching feedbacks
    const coachFeedbacks = [
      "Outstanding boundary hygiene today! You protected your energy reservoir beautifully. Sprints were compact and failure-proof.",
      "Consistency is a cognitive muscle, and you flexed it perfectly today. Meds + list locking done correctly.",
      "Fabulous job activating the Support Shield during that afternoon freeze. ADHD self-coaching is about protection, not list heroism.",
      "Excellent. You bypassed the initiation threshold with micro-steps. That is the secret to sustainable progress.",
      "I saw you completed your morning routine items. That consistency builds a safe structure for your executive functions.",
      "A tough day, but logging it honestly is an absolute win. Good work on keeping the accountability loop alive.",
      "Micro-planning works because it removes the cognitive load of selection. Keep your goals tiny and laughably easy.",
      "Beautiful momentum today! You sit down, focus, and take hydration buffers. Tomorrow, let's keep the exact same pace.",
      "Losing focus in the afternoon is extremely normal. You salvaged the day with a solid micro-target. I support you.",
      "Fabulous clarity keeping the today list limited to exactly 3 items. Restricting volume is how we defeat paralysis."
    ];

    const bigGoalIdeas = [
      "Finalize monthly client strategy proposal",
      "Declutter and organize physical workspace files",
      "Draft presentation slide deck for tech kickoff",
      "Audit annual server subscriptions and credentials",
      "Schedule dentist visit and medical health checks",
      "Reconcile tax receipts and business bank ledgers",
      "Write initial module test suites for code branch",
      "Clean physical office shelves and organize bins",
      "Follow up with all active client invoices",
      "Update home weekly chores schedule",
      "Review auto service quotes and repair timings",
      "Analyze SaaS tool costs and cancel low value accounts"
    ];

    const taskTitles = [
      "Review client feedback document",
      "Draft presentation slide deck",
      "Reconcile local tax payments",
      "Schedule dentist quarterly clinic appointment",
      "Organize garage sorting bins",
      "Send follow-up email to marketing leads",
      "Check broadband speed issues with router",
      "Organize digital screenshots folder",
      "Clean office table clutter",
      "Draft project spec outline",
      "Cancel gym subscription trial",
      "Call health insurance advisor"
    ];

    // Seed tasks that were completed over the last 60 days
    // Let's generate about 40 completed tasks across the span
    for (let i = 0; i < 40; i++) {
      const taskDayOffset = Math.floor(Math.random() * 60);
      const taskDate = new Date(today.getTime() - taskDayOffset * 24 * 60 * 60 * 1000);
      const taskId = 'sim_tsk_' + Math.random().toString(36).substr(2, 9);
      
      const title = taskTitles[Math.floor(Math.random() * taskTitles.length)] + ` (Archive #${i + 1})`;

      generatedTasks.push({
        id: taskId,
        title,
        notes: "Generated during historical assimilation simulation.",
        status: 'done',
        dueDate: `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`,
        source: 'planner',
        carryOverCount: Math.floor(Math.random() * 3),
        createdAt: new Date(taskDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: taskDate.toISOString(),
        subtasks: [
          { id: 'sub1', title: 'Open workspace and documents', done: true },
          { id: 'sub2', title: 'Spend exactly 5 minutes reviewing', done: true }
        ]
      });
    }

    // Now loop over each of the last 60 days to build DailyReports, EventLogs, Routine completions, Med logs
    for (let d = 59; d >= 0; d--) {
      const currentSimDate = new Date(today.getTime() - d * 24 * 60 * 60 * 1000);
      const year = currentSimDate.getFullYear();
      const month = String(currentSimDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentSimDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const bigGoalForDay = bigGoalIdeas[(d + 4) % bigGoalIdeas.length] + " (Priority Anchor)";

      // 1. Simulate Routine completions (about 80% completion rate)
      baseRoutines.forEach((r: any) => {
        const completed = Math.random() < 0.8;
        if (completed) {
          r.completionLog.push({
            date: dateStr,
            completedAt: new Date(currentSimDate.getTime() + (8 * 60 + Math.floor(Math.random() * 180)) * 60000).toISOString()
          });
          // Also log event
          generatedEvents.push({
            id: 'evt_sim_rot_' + Math.random().toString(36).substr(2, 9),
            type: 'routine_completed',
            timestamp: new Date(currentSimDate.getTime() + (8 * 60 + Math.floor(Math.random() * 120)) * 60000).toISOString(),
            entityType: 'routine',
            entityId: r.id,
            metadata: { title: r.title }
          });
        }
      });

      // 2. Simulate Medication adherence (about 90% completion rate)
      baseMeds.forEach((m: any) => {
        const taken = Math.random() < 0.9;
        const statusVal = taken ? 'taken' : 'skipped';
        m.log.push({
          date: dateStr,
          status: statusVal,
          loggedAt: new Date(currentSimDate.getTime() + (8 * 60 + Math.floor(Math.random() * 60)) * 60000).toISOString()
        });
        generatedEvents.push({
          id: 'evt_sim_med_' + Math.random().toString(36).substr(2, 9),
          type: taken ? 'medication_taken' : 'medication_skipped',
          timestamp: new Date(currentSimDate.getTime() + (8 * 60 + Math.floor(Math.random() * 40)) * 60000).toISOString(),
          entityType: 'medication',
          entityId: m.id,
          metadata: { title: m.title }
        });
      });

      // 3. Simulate Focus block events (1-3 sprints on 70% of days)
      const hasFocusBlocks = Math.random() < 0.7;
      let focusBlocksCount = 0;
      let focusMinutesSum = 0;
      if (hasFocusBlocks) {
        focusBlocksCount = Math.floor(Math.random() * 3) + 1;
        for (let f = 0; f < focusBlocksCount; f++) {
          const duration = Math.random() > 0.4 ? 25 : 10;
          focusMinutesSum += duration;
          generatedEvents.push({
            id: 'evt_sim_foc_' + Math.random().toString(36).substr(2, 9),
            type: 'focus_completed',
            timestamp: new Date(currentSimDate.getTime() + (10 * 60 + f * 120 + Math.floor(Math.random() * 60)) * 60000).toISOString(),
            entityType: 'task',
            metadata: { duration }
          });
        }
      }

      // 4. Simulate specific "Free-Forward Moves" (Task Transitions) for this date
      const numSimTasks = Math.floor(Math.random() * 2) + 2; // 2 to 3 tasks per day
      for (let idx = 0; idx < numSimTasks; idx++) {
        const tId = `task_sim_${dateStr}_${idx}`;
        const tTitle = taskTitles[(d * 3 + idx) % taskTitles.length];
        
        // Log task creation event in the morning
        generatedEvents.push({
          id: `evt_sim_tc_${dateStr}_${idx}`,
          type: 'task_created',
          timestamp: new Date(currentSimDate.getTime() + (9 * 60 + idx * 15) * 60000).toISOString(),
          entityType: 'task',
          entityId: tId,
          metadata: { title: tTitle }
        });

        // Determine transition (completed, carried_over, deferred/later, or dropped)
        let transitionType = 'task_completed';
        const rand = Math.random();
        if (rand < 0.45) {
          transitionType = 'task_completed';
        } else if (rand < 0.75) {
          transitionType = 'task_carried_over';
        } else if (rand < 0.90) {
          transitionType = 'task_moved_to_later';
        } else {
          transitionType = 'task_dropped';
        }

        // Log transition event in the late afternoon/evening
        generatedEvents.push({
          id: `evt_sim_tact_${dateStr}_${idx}`,
          type: transitionType,
          timestamp: new Date(currentSimDate.getTime() + (17 * 60 + idx * 20) * 60000).toISOString(),
          entityType: 'task',
          entityId: tId,
          metadata: { title: tTitle }
        });
      }

      // 5. Rescue Applied status (about 15% rate)
      const rescueApplied = Math.random() < 0.15;
      if (rescueApplied) {
        generatedEvents.push({
          id: 'evt_sim_res_' + Math.random().toString(36).substr(2, 9),
          type: 'rescue_applied',
          timestamp: new Date(currentSimDate.getTime() + 15 * 3600 * 1000).toISOString()
        });
      }

      // 6. Daily Morning Reset and Close loops
      generatedEvents.push({
        id: 'evt_sim_mr_' + Math.random().toString(36).substr(2, 9),
        type: 'morning_reset_completed',
        timestamp: new Date(currentSimDate.getTime() + 8.5 * 3600 * 1000).toISOString()
      });
      generatedEvents.push({
        id: 'evt_sim_dc_' + Math.random().toString(36).substr(2, 9),
        type: 'day_closed',
        timestamp: new Date(currentSimDate.getTime() + 21 * 3600 * 1000).toISOString()
      });

      // 7. Generate historical DailyReport
      const tasksCompletedToday = Math.floor(Math.random() * 4) + (hasFocusBlocks ? 1 : 0);
      const notes = diaryNotes[Math.floor(Math.random() * diaryNotes.length)];
      const coachFeedback = coachFeedbacks[Math.floor(Math.random() * coachFeedbacks.length)];
      
      const routinesCompletedCount = baseRoutines.filter((r: any) => 
        r.completionLog.some((l: any) => l.date === dateStr)
      ).length;

      const takenMedsText = baseMeds.map((m: any) => {
        const status = m.log.find((l: any) => l.date === dateStr)?.status || 'pending';
        return `${m.title} (${status})`;
      }).join(', ');

      generatedReports.push({
        id: 'rep_sim_' + dateStr,
        date: dateStr,
        tasksCompleted: tasksCompletedToday,
        focusCompleted: focusBlocksCount,
        focusMinutes: focusMinutesSum,
        routinesCompleted: routinesCompletedCount,
        routinesTotal: baseRoutines.length,
        medsStatus: takenMedsText,
        rescueApplied,
        notes,
        sentAt: new Date(currentSimDate.getTime() + 21 * 60 * 60 * 1000).toISOString(),
        coachFeedback,
        bigGoal: bigGoalForDay
      });
    }

    // Update state and persistence using helper hooks
    saveTasks(generatedTasks);
    setEvents(prev => [...generatedEvents, ...prev]);
    localStorage.setItem('events', JSON.stringify([...generatedEvents, ...events]));
    saveDailyReports(generatedReports);
    saveRoutines(baseRoutines);
    saveMedications(baseMeds);
    setDopamineLevel(85);
    localStorage.setItem('dopamineLevel', '85');

    alert('🧬 Assimilation successful! 2 Months (60 days) of deep historical ADHD logging, routines metrics, focus tracks, and feedback chronicles from Coach Hisham Lansari have been loaded into your local storage database.');
  };

  // ============================================================
  // SYSTEM UTILS (EXPORT / IMPORT)
  // ============================================================
  const exportBackup = () => {
    const backupData = {
      profile,
      tasks,
      inbox,
      routines,
      medications,
      events,
      dayState,
      dailyReports,
      dopamineLevel
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wired-leader-backup-${getTodayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logEvent('data_exported');
  };

  const importBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.profile) {
          setProfile(data.profile);
          localStorage.setItem('profile', JSON.stringify(data.profile));
        }
        if (data.tasks) saveTasks(data.tasks);
        if (data.inbox) saveInbox(data.inbox);
        if (data.routines) saveRoutines(data.routines);
        if (data.medications) saveMedications(data.medications);
        if (data.events) {
          setEvents(data.events);
          localStorage.setItem('events', JSON.stringify(data.events));
        }
        if (data.dayState) saveDayState(data.dayState);
        if (data.dailyReports) saveDailyReports(data.dailyReports);
        if (data.dopamineLevel !== undefined) {
          setDopamineLevel(Number(data.dopamineLevel));
          localStorage.setItem('dopamineLevel', data.dopamineLevel.toString());
        }
        
        logEvent('data_imported');
        alert('🎉 Backup restored successfully!');
      } catch (err) {
        alert('Failed to parse backup file. Please make sure it is a valid backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  const resetAllData = () => {
    if (confirm('⚠️ Warning: This will delete ALL tasks, medications, routines, and progress files. This is irreversible. Continue?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3ED] flex flex-col items-center justify-center font-public-sans text-[#22262B]">
        <RefreshCw className="animate-spin text-[#1F6F63] w-12 h-12 mb-4" />
        <h2 className="text-xl font-fraunces font-medium text-[#1F6F63]">The Wired Leader</h2>
        <p className="text-sm text-[#6B7075] mt-1">Calibrating your support shield...</p>
      </div>
    );
  }

  // Count active stats
  const activeTasksCount = tasks.filter(t => t.status === 'active').length;
  const staleTasksCount = tasks.filter(t => t.status === 'active' && t.carryOverCount >= 3).length;

  return (
    <div className="min-h-screen bg-[#F6F3ED] text-[#22262B] font-public-sans pb-28">
      {/* Dopamine Reward Notification Popup */}
      {rewardAnimation && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-[#153F38] to-[#1F6F63] border-2 border-yellow-400 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-bounce border-dashed">
          <div className="text-3xl">{rewardAnimation.emoji}</div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-yellow-300">Momentum meter boost</p>
            <p className="text-sm font-semibold mt-0.5">{rewardAnimation.text}</p>
          </div>
        </div>
      )}

      {/* ============================================================
          TOP HEADER
          ============================================================ */}
      <header className="bg-white border-b border-[#E4DFD5] py-5 px-6 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1F6F63] animate-pulse"></span>
              <p className="text-xs uppercase tracking-widest text-[#1F6F63] font-semibold">ADHD Support Shield</p>
            </div>
            <h1 className="text-2xl font-fraunces font-semibold text-[#153F38]">The Wired Leader</h1>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs bg-[#F6F3ED] border border-[#E4DFD5] px-3 py-1.5 rounded-full font-medium text-[#6B7075] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#1F6F63]" />
              {dayState?.date || getTodayStr()}
            </span>
            {dayState?.status === 'not_started' && (
              <button 
                onClick={openMorningResetPlan} 
                className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-xs font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-1 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Start My Day
              </button>
            )}
            {dayState?.status === 'active' && (
              <div className="flex gap-2">
                <button 
                  onClick={triggerRescueWorkspace} 
                  className="bg-[#E8D5B5] hover:bg-[#DCC7A6] text-[#22262B] text-xs font-semibold px-4 py-2 rounded-full border border-[#D4BFA0] transition-all flex items-center gap-1"
                >
                  <Shield className="w-3.5 h-3.5 text-[#B8892B]" /> Rescue Day
                </button>
                {rescueUndo && rescueUndo.date === getTodayStr() && (
                  <button onClick={undoRescue} className="bg-white text-[#22262B] text-xs font-semibold px-4 py-2 rounded-full border border-[#D4BFA0]">
                    Undo rescue
                  </button>
                )}
                <button 
                  onClick={openEveningResetPlan} 
                  className="bg-[#153F38] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full transition-all flex items-center gap-1"
                >
                  <Clock className="w-3.5 h-3.5 text-[#E8D5B5]" /> Close Day
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dopamine Level / Attention Shield Charge Bar */}
      <div className="bg-[#153F38] text-white py-2 px-6 border-b border-[#1F6F63]/30 shadow-inner">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-orange-300">Momentum Meter (a game score, not dopamine)</span>
            <span className="text-xs text-gray-200 font-mono">{dopamineLevel}% full</span>
          </div>
          
          <div className="flex-1 w-full max-w-sm bg-black/40 h-3 rounded-full overflow-hidden border border-white/10 relative p-[1px]">
            <div 
              style={{ width: `${dopamineLevel}%` }} 
              className="bg-gradient-to-r from-orange-500 via-yellow-400 to-[#1F6F63] h-full rounded-full transition-all duration-700 ease-out shadow-[0_0_8px_rgba(251,146,60,0.7)]"
            ></div>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-gray-300">
            <Award className="w-3.5 h-3.5 text-yellow-400" />
            <span>Complete items to boost shield strength!</span>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Coach Quote Widget */}
        <div className="bg-[#1F6F63]/5 border-l-4 border-[#1F6F63] p-4 rounded-r-2xl mb-6">
          <p className="italic text-sm text-[#2c3138]">
            "ADHD is not a planning failure. It is a transition and initiation threshold. Break everything down until the first physical action is laughably easy."
          </p>
          <p className="text-xs font-semibold text-[#1F6F63] mt-1.5">— Coach Hisham Lansari</p>
        </div>

        {/* ============================================================
            TAB 1: HOME (ADAPTIVE INTERFACE)
            ============================================================ */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Today's Primary Big Goal Card */}
            {dayState?.bigGoal && (
              <div className="bg-gradient-to-r from-[#153F38] to-[#1F6F63] text-white p-5 rounded-3xl shadow-sm border border-[#1F6F63]/30 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-yellow-400/10 blur-xl"></div>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="p-2.5 bg-white/10 rounded-2xl text-yellow-300">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-yellow-300 block">Today's Primary Anchor Goal</span>
                    <h3 className="text-base font-fraunces font-medium text-white mt-1 leading-snug">
                      {dayState.bigGoal}
                    </h3>
                  </div>
                </div>
              </div>
            )}

            {/* INITIATION OVERWHELM CUSTOM VIEW */}
            {profile?.type === 'initiation_overwhelm' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-[#1F6F63]/10 text-[#1F6F63] text-xs font-bold px-2.5 py-1 rounded-full uppercase">Initiation Shield Mode</span>
                  </div>
                  <h2 className="text-xl font-fraunces font-medium text-[#153F38]">Your Single Focus Target</h2>
                  <p className="text-xs text-[#6B7075] mb-5">Hisham's Advice: Clear all list clutter. Only this task exists right now.</p>

                  {dayState?.nowTaskId ? (
                    (() => {
                      const nowTask = tasks.find(t => t.id === dayState.nowTaskId);
                      if (!nowTask) return <p className="text-sm italic text-[#6B7075]">Task missing. Try picking another from the planner.</p>;
                      return (
                        <div className="bg-[#F6F3ED] border border-[#E4DFD5] p-5 rounded-2xl">
                          <h3 className="text-lg font-semibold text-[#22262B]">{nowTask.title}</h3>
                          {nowTask.notes && <p className="text-xs text-[#6B7075] mt-1">{nowTask.notes}</p>}
                          
                          {/* First failure-proof subtask */}
                          {nowTask.subtasks.length > 0 ? (
                            <div className="mt-4 border-t border-[#E4DFD5] pt-4">
                              <p className="text-xs uppercase tracking-wider font-bold text-[#1F6F63] mb-2">Failure-Proof Next Step</p>
                              {nowTask.subtasks.filter(s => !s.done).slice(0, 1).map(sub => (
                                <div key={sub.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#E4DFD5]">
                                  <input 
                                    type="checkbox" 
                                    checked={sub.done} 
                                    onChange={() => toggleSubtaskDone(nowTask.id, sub.id)}
                                    className="w-5 h-5 rounded border-[#E4DFD5] accent-[#1F6F63]" 
                                  />
                                  <span className="font-medium text-sm text-[#22262B]">{sub.title}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-4 flex gap-2">
                              <button 
                                onClick={() => callAIBreakdown(nowTask.id)}
                                disabled={isProcessingAI[nowTask.id]}
                                className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-xs font-semibold py-2 px-4 rounded-full transition-all"
                              >
                                {isProcessingAI[nowTask.id] ? 'AI Breaking down...' : '🧩 AI Break down into tiny steps'}
                              </button>
                            </div>
                          )}

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button 
                              onClick={() => startTimer(profile?.preferences.focusDuration || 10, nowTask.id)}
                              className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-xs font-semibold py-2 px-4 rounded-full flex items-center gap-1.5"
                            >
                              <Play className="w-3.5 h-3.5" /> Start 10-Min Micro Focus
                            </button>
                            <button 
                              onClick={() => toggleTaskDone(nowTask.id)}
                              className="bg-white hover:bg-[#F6F3ED] text-[#1F6F63] border border-[#1F6F63] text-xs font-semibold py-2 px-4 rounded-full"
                            >
                              ✅ Complete Task
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-sm text-[#6B7075] mb-4">No active Now task. Select one to shield yourself from backlog clutter.</p>
                      <button onClick={() => setActiveTab('planner')} className="bg-[#1F6F63] text-white text-xs font-semibold py-2.5 px-5 rounded-full">
                        Browse Backlog / Planner
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TIME BLINDNESS CUSTOM VIEW */}
            {profile?.type === 'time_blindness' && (
              <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="bg-[#B8892B]/10 text-[#B8892B] text-xs font-bold px-2.5 py-1 rounded-full uppercase">Time Awareness Shield</span>
                </div>
                <h2 className="text-xl font-fraunces font-medium text-[#153F38]">Transition Countdown</h2>
                <div className="bg-[#F6F3ED] border border-[#E4DFD5] p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-bold text-[#6B7075]">Next Commitment</p>
                    <h3 className="text-lg font-bold text-[#153F38] mt-1">Wrap Up Focus blocks</h3>
                    <p className="text-xs text-[#1F6F63] font-medium mt-1">Hisham's Tip: Add buffer commutes of 15 minutes manually.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-fraunces font-bold text-[#B8892B] block">20 min</span>
                    <span className="text-[10px] text-[#6B7075] uppercase font-bold tracking-wider">Remaining</span>
                  </div>
                </div>
              </div>
            )}

            {/* ROUTINE INSTABILITY CUSTOM VIEW */}
            {profile?.type === 'routine_instability' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm">
                  <h3 className="font-fraunces font-medium text-lg text-[#153F38] mb-3 flex items-center gap-1.5">
                    <RotateCw className="w-5 h-5 text-[#1F6F63]" /> Active Routines
                  </h3>
                  <div className="space-y-2">
                    {routines.slice(0, 3).map(r => {
                      const isCompleted = r.completionLog.some(l => l.date === getTodayStr());
                      return (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-[#F6F3ED] border border-[#E4DFD5] rounded-xl">
                          <span className={`text-sm ${isCompleted ? 'line-through text-[#6B7075]' : 'font-semibold'}`}>
                            {r.title}
                          </span>
                          <button 
                            onClick={() => toggleRoutineComplete(r.id)}
                            className={`text-xs px-3 py-1 rounded-full border transition-all ${isCompleted ? 'bg-[#E4DFD5] text-[#6B7075] border-[#E4DFD5]' : 'bg-white hover:bg-[#1F6F63] hover:text-white border-[#1F6F63] text-[#1F6F63]'}`}
                          >
                            {isCompleted ? 'Completed' : 'Do Now'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm">
                  <h3 className="font-fraunces font-medium text-lg text-[#153F38] mb-3 flex items-center gap-1.5">
                    <Check className="w-5 h-5 text-[#B8892B]" /> Medication Shield
                  </h3>
                  {medications.map(m => {
                    const status = m.log.find(l => l.date === getTodayStr())?.status || 'pending';
                    return (
                      <div key={m.id} className="bg-[#F6F3ED] border border-[#E4DFD5] p-4 rounded-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-sm text-[#22262B] block">{m.title}</span>
                            <span className="text-xs text-[#6B7075]">{m.dosage}</span>
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${status === 'taken' ? 'bg-[#1F6F63]/10 text-[#1F6F63]' : 'bg-[#B8892B]/10 text-[#B8892B]'}`}>
                            {status}
                          </span>
                        </div>
                        {status === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <button 
                              onClick={() => logMedicationTaken(m.id, 'taken')}
                              className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-xs font-semibold px-3 py-1.5 rounded-full"
                            >
                              💊 Took It
                            </button>
                            <button 
                              onClick={() => logMedicationTaken(m.id, 'skipped')}
                              className="text-xs border border-[#E4DFD5] hover:bg-white text-[#6B7075] px-3 py-1.5 rounded-full"
                            >
                              Skip
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions & Status alerts */}
            {staleTasksCount > 0 && (
              <div className="bg-[#E8D5B5]/50 border border-[#D4BFA0] p-4 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="text-[#B8892B] shrink-0" />
                  <p className="text-xs text-[#22262B]">
                    <strong>Stale Task Alert:</strong> You have {staleTasksCount} task(s) carried over repeatedly. Let's process them or reduce load.
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('planner')} 
                  className="bg-white border border-[#D4BFA0] text-xs font-bold py-1.5 px-3 rounded-full shrink-0"
                >
                  Triage
                </button>
              </div>
            )}

            {/* Core Daily Checklist Widgets */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm">
              <h2 className="text-xl font-fraunces font-medium text-[#153F38] mb-4">Today's Micro-Plan ({dayState?.todayTaskIds.length || 0}/5)</h2>
              
              {dayState?.todayTaskIds.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-[#6B7075] mb-3">Your list is clean. Set your plan first.</p>
                  <button onClick={openMorningResetPlan} className="bg-[#1F6F63] text-white text-xs font-bold py-2 px-4 rounded-full">
                    Configure Day Plan
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.filter(t => dayState?.todayTaskIds.includes(t.id)).map(task => {
                    const isDone = task.status === 'done';
                    const isNow = dayState?.nowTaskId === task.id;
                    return (
                      <div key={task.id} className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${isNow ? 'bg-[#1F6F63]/5 border-[#1F6F63]' : 'bg-[#F6F3ED] border-[#E4DFD5]'}`}>
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox" 
                            checked={isDone} 
                            onChange={() => toggleTaskDone(task.id)}
                            className="w-5 h-5 accent-[#1F6F63] rounded"
                          />
                          <div>
                            <span className={`text-sm font-semibold ${isDone ? 'line-through text-[#6B7075]' : 'text-[#22262B]'}`}>
                              {task.title}
                            </span>
                            {isNow && <span className="ml-2 text-[10px] bg-[#1F6F63] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Now Target</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => makeTaskNow(task.id)}
                            className={`p-1.5 rounded-full hover:bg-white text-[#1F6F63] transition-all`}
                            title="Set as Now task"
                          >
                            <Sparkles className={`w-4 h-4 ${isNow ? 'fill-[#1F6F63]' : 'opacity-40'}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: PLANNER
            ============================================================ */}
        {activeTab === 'planner' && (
          <div className="space-y-6 animate-fadeIn">
            {/* ADD TASK WIDGET */}
            <div className="bg-white border border-[#E4DFD5] p-5 rounded-3xl shadow-sm">
              <h2 className="text-lg font-fraunces font-medium text-[#153F38] mb-3">Intake New Task</h2>
              <div className="flex flex-col md:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="Task description (e.g. Call accountant)" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-full border border-[#E4DFD5] bg-[#F6F3ED] text-sm focus:outline-none focus:border-[#1F6F63] text-[#22262B]"
                />
                <input 
                  type="date" 
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                  className="px-4 py-2.5 rounded-full border border-[#E4DFD5] bg-[#F6F3ED] text-sm focus:outline-none focus:border-[#1F6F63] text-[#6B7075]"
                />
                <button 
                  onClick={addTask}
                  className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-sm font-semibold px-6 py-2.5 rounded-full flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Add Task
                </button>
              </div>
            </div>

            {/* Warn when overloaded */}
            {dayState && dayState.todayTaskIds.length >= 5 && (
              <div className="bg-[#B8892B]/10 border border-[#B8892B]/30 p-4 rounded-2xl flex items-center gap-2">
                <ShieldAlert className="text-[#B8892B]" />
                <p className="text-xs text-[#22262B]">
                  <strong>ADHD Shield Warning:</strong> Your today plan contains {dayState.todayTaskIds.length} tasks. Coach Hisham strongly recommends using <strong>Rescue My Day</strong> to keep the list under 5.
                </p>
              </div>
            )}

            {/* STALE TASKS TRIAGE BACKLOG */}
            {staleTasksCount > 0 && (
              <div className="bg-[#E8D5B5]/40 border border-[#D4BFA0] p-5 rounded-3xl space-y-3">
                <h3 className="font-fraunces font-medium text-md text-[#1F6F63] flex items-center gap-2">
                  <AlertTriangle className="text-[#B8892B]" /> Stale Backlog Triage
                </h3>
                <p className="text-xs text-[#6B7075]">These tasks have been carried over several days without progress. Let's clean them up.</p>
                <div className="space-y-2">
                  {tasks.filter(t => t.status === 'active' && t.carryOverCount >= 3).map(task => (
                    <div key={task.id} className="bg-white p-3 rounded-xl border border-[#E4DFD5] flex justify-between items-center gap-3 flex-wrap">
                      <div>
                        <span className="font-semibold text-sm text-[#22262B]">{task.title}</span>
                        <span className="text-[10px] bg-[#E8D5B5] text-[#22262B] px-2 py-0.5 rounded-full font-bold ml-2">Carried {task.carryOverCount} times</span>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => callAIBreakdown(task.id)}
                          className="bg-[#1F6F63]/10 text-[#1F6F63] text-[10px] font-bold px-3 py-1 rounded-full border border-transparent hover:border-[#1F6F63]"
                        >
                          🧩 AI Breakdown
                        </button>
                        <button 
                          onClick={() => {
                            const next = tasks.map(t => t.id === task.id ? { ...t, status: 'archived' as const } : t);
                            saveTasks(next);
                            logEvent('task_dropped', 'task', task.id);
                          }}
                          className="bg-red-50 text-red-600 text-[10px] font-bold px-3 py-1 rounded-full border border-transparent hover:border-red-600"
                        >
                          🗑️ Drop / Archive
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACTIVE PLANNER BACKLOG LIST */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm">
              <h2 className="text-xl font-fraunces font-medium text-[#153F38] mb-4">Backlog & Planner Tasks ({activeTasksCount})</h2>
              
              {activeTasksCount === 0 ? (
                <div className="text-center py-12 text-[#6B7075]">
                  <p className="text-sm italic">Planner is empty. Intaking a microscopic first task above prevents paralysis!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.filter(t => t.status === 'active').map(task => {
                    const isToday = dayState?.todayTaskIds.includes(task.id);
                    const isNow = dayState?.nowTaskId === task.id;
                    const subtaskDoneCount = task.subtasks.filter(s => s.done).length;
                    
                    return (
                      <div key={task.id} className="bg-[#F6F3ED] border border-[#E4DFD5] p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div>
                            <h3 className="font-semibold text-[#22262B] text-sm md:text-base">{task.title}</h3>
                            {task.dueDate && <span className="text-xs text-[#6B7075] block mt-0.5">Due: {task.dueDate}</span>}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button 
                              onClick={() => toggleTaskDone(task.id)}
                              className="bg-white hover:bg-[#1F6F63] hover:text-white text-[#1F6F63] border border-[#1F6F63] text-xs font-semibold py-1.5 px-3 rounded-full"
                            >
                              ✅ Complete
                            </button>
                            <button 
                              onClick={() => makeTaskNow(task.id)}
                              className={`text-xs font-semibold py-1.5 px-3 rounded-full border transition-all ${isNow ? 'bg-[#1F6F63] text-white border-[#1F6F63]' : 'bg-white text-[#1F6F63] border-[#1F6F63] hover:bg-[#1F6F63]/10'}`}
                            >
                              ⭐ Now Target
                            </button>
                            <button 
                              onClick={() => {
                                if (!dayState) return;
                                const isAdded = dayState.todayTaskIds.includes(task.id);
                                if (isAdded) {
                                  saveDayState({ ...dayState, todayTaskIds: dayState.todayTaskIds.filter(id => id !== task.id) });
                                } else {
                                  selectTaskForToday(task.id);
                                }
                              }}
                              className={`text-xs font-semibold py-1.5 px-3 rounded-full border transition-all ${isToday ? 'bg-[#E8D5B5] text-[#22262B] border-[#D4BFA0]' : 'bg-white text-[#1F6F63] border-[#1F6F63] hover:bg-[#1F6F63]/10'}`}
                            >
                              {isToday ? '📅 Today Plan' : '📅 Set for Today'}
                            </button>
                            <button 
                              onClick={() => deleteTask(task.id)}
                              className="text-red-600 hover:bg-red-50 p-2 rounded-full border border-transparent hover:border-red-200 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Interactive Subtasks list */}
                        <div className="border-t border-[#E4DFD5]/70 pt-3 space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold uppercase tracking-wider text-[#1F6F63]">
                              Micro-Steps {task.subtasks.length > 0 && `(${subtaskDoneCount}/${task.subtasks.length})`}
                            </span>
                            <button 
                              onClick={() => callAIBreakdown(task.id)}
                              disabled={isProcessingAI[task.id]}
                              className="text-xs text-[#1F6F63] hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {isProcessingAI[task.id] ? 'AI breaking down...' : '🧩 AI Break Down'}
                            </button>
                          </div>

                          {task.subtasks.map(sub => (
                            <div key={sub.id} className="flex items-center gap-2 bg-white/50 p-2 rounded-lg text-sm">
                              <input 
                                type="checkbox" 
                                checked={sub.done} 
                                onChange={() => toggleSubtaskDone(task.id, sub.id)}
                                className="w-4 h-4 accent-[#1F6F63]"
                              />
                              <span className={sub.done ? 'line-through text-[#6B7075]' : ''}>{sub.title}</span>
                            </div>
                          ))}

                          {/* Quick manual subtask input */}
                          <input 
                            type="text" 
                            placeholder="+ Add Micro-Step manually and press Enter"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addSubtaskManual(task.id, e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="w-full bg-white border border-[#E4DFD5] text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#1F6F63]"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: ROUTINES
            ============================================================ */}
        {activeTab === 'routines' && (
          <div className="space-y-6 animate-fadeIn">
            {/* ADD ROUTINE */}
            <div className="bg-white border border-[#E4DFD5] p-5 rounded-3xl shadow-sm">
              <h2 className="text-lg font-fraunces font-medium text-[#153F38] mb-3">Add Custom Routine</h2>
              <div className="flex flex-col md:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="Routine name (e.g. Stretch / Walk)" 
                  value={newRoutineTitle}
                  onChange={(e) => setNewRoutineTitle(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-full border border-[#E4DFD5] bg-[#F6F3ED] text-sm focus:outline-none focus:border-[#1F6F63] text-[#22262B]"
                />
                <select 
                  value={newRoutineRec} 
                  onChange={(e) => setNewRoutineRec(e.target.value as any)}
                  className="px-4 py-2.5 rounded-full border border-[#E4DFD5] bg-[#F6F3ED] text-sm focus:outline-none focus:border-[#1F6F63] text-[#6B7075]"
                >
                  <option value="daily">Everyday</option>
                  <option value="weekdays">Weekdays</option>
                </select>
                <button 
                  onClick={addRoutine}
                  className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-sm font-semibold px-6 py-2.5 rounded-full"
                >
                  Create Routine
                </button>
              </div>
            </div>

            {/* ROUTINES LIST */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-4">
              <h2 className="text-xl font-fraunces font-medium text-[#153F38]">ADHD Anchored Habits</h2>
              
              <div className="space-y-3">
                {routines.map(routine => {
                  const completedToday = routine.completionLog.some(l => l.date === getTodayStr());
                  return (
                    <div key={routine.id} className="p-4 bg-[#F6F3ED] border border-[#E4DFD5] rounded-2xl flex justify-between items-center flex-wrap gap-3">
                      <div>
                        <span className={`font-semibold block ${completedToday ? 'line-through text-[#6B7075]' : 'text-[#22262B]'}`}>
                          {routine.title}
                        </span>
                        {routine.notes && <span className="text-xs text-[#6B7075]">{routine.notes}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleRoutineComplete(routine.id)}
                          className={`text-xs font-bold px-4 py-2 rounded-full border transition-all ${completedToday ? 'bg-[#E4DFD5] text-[#6B7075] border-[#E4DFD5]' : 'bg-white border-[#1F6F63] text-[#1F6F63] hover:bg-[#1F6F63] hover:text-white'}`}
                        >
                          {completedToday ? '✅ Done Today' : 'Mark Complete'}
                        </button>
                        <button onClick={() => deleteRoutine(routine.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MEDICATIONS */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-fraunces font-medium text-[#153F38]">Coached Medications Log</h2>
                <button 
                  onClick={() => setMedFormOpen(o => !o)}
                  className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-xs font-semibold px-4 py-2 rounded-full"
                >
                  + Add Medication
                </button>
              </div>

              <p className="text-[11px] text-[#6B7075] mb-3">
                This is a simple log you fill in yourself. The app does not send phone reminders and is not medical advice. Follow your doctor's instructions.
              </p>
              {medFormOpen && (
                <div className="mb-3 p-3 bg-[#F6F3ED] border border-[#E4DFD5] rounded-2xl space-y-2">
                  <input value={medFormTitle} onChange={e => setMedFormTitle(e.target.value)} placeholder="Medication name" className="w-full text-sm p-2 rounded-xl border border-[#E4DFD5]" />
                  <input value={medFormDosage} onChange={e => setMedFormDosage(e.target.value)} placeholder="Dosage / note (optional)" className="w-full text-sm p-2 rounded-xl border border-[#E4DFD5]" />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const title = medFormTitle.trim();
                        if (!title) return;
                        const newMed: Medication = { id: 'med_' + generateId(), title, dosage: medFormDosage.trim(), active: true, reminderTime: null, log: [], createdAt: new Date().toISOString() };
                        saveMedications([...medications, newMed]);
                        logEvent('medication_created', 'medication', newMed.id);
                        setMedFormTitle(''); setMedFormDosage(''); setMedFormOpen(false);
                      }}
                      className="bg-[#1F6F63] text-white text-xs font-semibold px-4 py-2 rounded-full"
                    >Save medication</button>
                    <button onClick={() => setMedFormOpen(false)} className="text-xs px-4 py-2 rounded-full border border-[#E4DFD5]">Cancel</button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {medications.map(m => {
                  const todayLog = m.log.find(l => l.date === getTodayStr());
                  return (
                    <div key={m.id} className="p-4 bg-[#F6F3ED] border border-[#E4DFD5] rounded-2xl flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <span className="font-semibold text-sm text-[#22262B] block">{m.title}</span>
                        <span className="text-xs text-[#6B7075]">{m.dosage}</span>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => logMedicationTaken(m.id, 'taken')}
                          disabled={todayLog?.status === 'taken'}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full border ${todayLog?.status === 'taken' ? 'bg-[#1F6F63]/10 text-[#1F6F63] border-transparent' : 'bg-white hover:bg-[#1F6F63] hover:text-white border-[#1F6F63] text-[#1F6F63]'}`}
                        >
                          {todayLog?.status === 'taken' ? '💊 Taken Today' : '💊 Mark Taken'}
                        </button>
                        <button 
                          aria-label={`Remove ${m.title}`}
                  onClick={() => { if (confirm(`Remove ${m.title} and its log from this device?`)) saveMedications(medications.filter(med => med.id !== m.id)); }}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-full"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: FOCUS TIMER (Micro Focus & Thought Parking)
            ============================================================ */}
        {activeTab === 'focus' && (
          <div className="space-y-6 animate-fadeIn text-center">
            <div className="bg-white border border-[#E4DFD5] p-8 rounded-3xl shadow-sm space-y-6 max-w-lg mx-auto">
              <h2 className="text-2xl font-fraunces font-medium text-[#153F38]">ADHD Starting Timer</h2>
              <p className="text-xs text-[#6B7075] max-w-sm mx-auto">
                ADHD Coaching Secret: Don't promise yourself an hour. Just start for 10 minutes. If you quit after 10 minutes, that is still a win!
              </p>

              {timerActive ? (
                <div className="space-y-6">
                  <div className="text-6xl font-fraunces font-bold text-[#1F6F63]">
                    {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:
                    {(timerSeconds % 60).toString().padStart(2, '0')}
                  </div>
                  <div className="flex justify-center gap-3">
                    <button 
                      onClick={() => setTimerPaused(!timerPaused)}
                      className="bg-[#E8D5B5] border border-[#D4BFA0] text-[#22262B] text-sm font-semibold px-6 py-2.5 rounded-full flex items-center gap-1"
                    >
                      {timerPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      {timerPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button 
                      onClick={stopTimer}
                      className="bg-red-50 border border-red-200 text-red-600 text-sm font-semibold px-6 py-2.5 rounded-full flex items-center gap-1"
                    >
                      <Square className="w-4 h-4" /> Stop Block
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Select Now task trigger */}
                  {dayState?.nowTaskId && (
                    <div className="bg-[#F6F3ED] p-3 rounded-xl border border-[#E4DFD5]">
                      <span className="text-xs uppercase tracking-wider font-bold text-[#1F6F63] block">Active Target Task</span>
                      <span className="text-sm font-semibold text-[#22262B] block mt-0.5">
                        {tasks.find(t => t.id === dayState.nowTaskId)?.title}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {[2, 5, 10, 15, 25, 30].map(mins => (
                      <button 
                        key={mins}
                        onClick={() => startTimer(mins, dayState?.nowTaskId)}
                        className={`py-3.5 rounded-2xl border text-sm font-bold transition-all hover:bg-[#1F6F63]/10 hover:border-[#1F6F63] ${mins === profile?.preferences.focusDuration ? 'bg-[#1F6F63] text-white border-transparent' : 'bg-[#F6F3ED] border-[#E4DFD5] text-[#22262B]'}`}
                      >
                        {mins} Min {mins === profile?.preferences.focusDuration && '⭐'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* DISTRACTION THOUGHT PARKING (God-tier feature!) */}
              <div className="border-t border-[#E4DFD5] pt-6 text-left space-y-3">
                <h3 className="font-fraunces font-medium text-base text-[#153F38] flex items-center gap-1">
                  <Zap className="w-4 h-4 text-[#B8892B]" /> Distraction Thought Parking
                </h3>
                <p className="text-xs text-[#6B7075]">
                  If a random task, worry, or idea pops into your head during your focus timer, park it here. We will save it in your Capture Inbox so you can empty your mind and return immediately to focus.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Worry or idea (e.g. Wash laundry)"
                    value={parkedThoughts}
                    onChange={(e) => setParkedThoughts(e.target.value)}
                    className="flex-1 text-sm border border-[#E4DFD5] px-3 py-2 rounded-full bg-[#F6F3ED] focus:outline-none focus:border-[#1F6F63]"
                  />
                  <button 
                    onClick={parkThought}
                    className="bg-[#1F6F63] text-white text-xs font-semibold px-4 py-2 rounded-full shrink-0"
                  >
                    Park Thought
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 5: CAPTURE
            ============================================================ */}
        {activeTab === 'capture' && (
          <div className="space-y-6 animate-fadeIn">
            {/* ZERO FRICTION CAPTURE INPUT */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm text-center space-y-4">
              <h2 className="text-xl font-fraunces font-medium text-[#153F38]">Rapid Brain Dump</h2>
              <p className="text-xs text-[#6B7075] max-w-sm mx-auto">
                No folders, no tags, no dates. Empty your mind before the thought evaporates. Type it out or capture with voice simulation.
              </p>

              <div className="flex flex-col md:flex-row gap-2 max-w-md mx-auto">
                <input 
                  type="text" 
                  placeholder="What is on your mind?"
                  value={captureInput}
                  onChange={(e) => setCaptureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && captureInput.trim()) {
                      const item = { id: 'inbox_' + generateId(), text: captureInput.trim(), createdAt: new Date().toISOString() };
                      saveInbox([...inbox, item]);
                      logEvent('capture_added', 'inbox', item.id, { text: item.text });
                      setCaptureInput('');
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-full border border-[#E4DFD5] bg-[#F6F3ED] text-sm focus:outline-none focus:border-[#1F6F63]"
                />
                <button 
                  onClick={() => {
                    if (!captureInput.trim()) return;
                    const item = { id: 'inbox_' + generateId(), text: captureInput.trim(), createdAt: new Date().toISOString() };
                    saveInbox([...inbox, item]);
                    logEvent('capture_added', 'inbox', item.id, { text: item.text });
                    setCaptureInput('');
                  }}
                  className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-xs font-bold py-2.5 px-5 rounded-full transition-all shrink-0"
                >
                  Capture
                </button>
              </div>

              {/* Simulated voice entry */}
              <div className="flex justify-center items-center gap-3 pt-2">
                <button 
                  onClick={() => {
                    setSimulatedVoiceRecording(prev => {
                      if (!prev) {
                        setTimeout(() => {
                          setCaptureInput("Call Dr. Lansari about meds routine on monday");
                          setSimulatedVoiceRecording(false);
                        }, 2000);
                      }
                      return !prev;
                    });
                  }}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border transition-all ${simulatedVoiceRecording ? 'bg-red-500 text-white border-transparent animate-pulse' : 'bg-white text-[#1F6F63] border-[#E4DFD5] hover:bg-[#F6F3ED]'}`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  {simulatedVoiceRecording ? 'Listening (Speak)...' : '🎙️ Simulate Coach Voice Note'}
                </button>
              </div>
            </div>

            {/* UNPROCESSED CAPTURE LIST */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-4">
              <h2 className="text-xl font-fraunces font-medium text-[#153F38]">Inbox Triage Queue ({inbox.length})</h2>
              
              {inbox.length === 0 ? (
                <div className="text-center py-8 text-[#6B7075] italic text-sm">
                  📭 Brain dump inbox is clean.
                </div>
              ) : (
                <div className="space-y-3">
                  {inbox.map((item, index) => (
                    <div key={item.id} className="p-4 bg-[#F6F3ED] border border-[#E4DFD5] rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="flex-1">
                        <span className="font-semibold text-sm text-[#22262B] block">{item.text}</span>
                        <span className="text-[10px] text-[#6B7075] block mt-0.5">Captured: {new Date(item.createdAt).toLocaleTimeString()}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        <button 
                          onClick={() => processCaptureInboxItem(item.text, index, 'task')}
                          disabled={isProcessingAI[`inbox_${index}`]}
                          className="bg-[#1F6F63] text-white text-xs font-bold py-1.5 px-3 rounded-full flex items-center gap-1 hover:bg-[#153F38]"
                        >
                          <Sparkles className="w-3 h-3" />
                          {isProcessingAI[`inbox_${index}`] ? 'Structuring...' : '📋 AI to Task'}
                        </button>
                        <button 
                          onClick={() => processCaptureInboxItem(item.text, index, 'routine')}
                          className="bg-white text-[#1F6F63] border border-[#1F6F63] text-xs font-semibold py-1.5 px-3 rounded-full hover:bg-[#1F6F63]/10"
                        >
                          🔄 to Routine
                        </button>
                        <button 
                          onClick={() => saveInbox(inbox.filter((_, idx) => idx !== index))}
                          className="bg-red-50 text-red-600 text-xs font-semibold py-1.5 px-3 rounded-full"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 6: INSIGHTS & AI COACH DIALOGUE
            ============================================================ */}
        {activeTab === 'insights' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Sub-Tab Navigation for Insights */}
            <div className="bg-white border border-[#E4DFD5] p-1.5 rounded-2xl shadow-sm flex gap-1">
              <button
                onClick={() => setInsightsSubTab('insights')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  insightsSubTab === 'insights'
                    ? 'bg-[#1F6F63] text-white shadow-sm'
                    : 'text-[#6B7075] hover:text-[#22262B] hover:bg-[#F6F3ED]'
                }`}
              >
                <BarChart2 className="w-4 h-4" /> Self-Insights & AI
              </button>
              <button
                onClick={() => setInsightsSubTab('coach_sync')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  insightsSubTab === 'coach_sync'
                    ? 'bg-[#1F6F63] text-white shadow-sm'
                    : 'text-[#6B7075] hover:text-[#22262B] hover:bg-[#F6F3ED]'
                }`}
              >
                <Send className="w-4 h-4" /> Daily Log
                {dailyReports.length > 0 && (
                  <span className="bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                    {dailyReports.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setInsightsSubTab('journey')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  insightsSubTab === 'journey'
                    ? 'bg-[#1F6F63] text-white shadow-sm'
                    : 'text-[#6B7075] hover:text-[#22262B] hover:bg-[#F6F3ED]'
                }`}
              >
                <Calendar className="w-4 h-4" /> Day-by-Day Journey
              </button>
            </div>

            {insightsSubTab === 'insights' && (
              <div className="space-y-6">
                {/* AI COACHING HIGHLIGHT */}
                <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-[#1F6F63]/10 rounded-full flex items-center justify-center text-xl">🤖</div>
                  <h2 className="text-xl font-fraunces font-medium text-[#153F38]">Coach Hisham lansari Insight Portal</h2>
                  <p className="text-xs text-[#6B7075] max-w-sm mx-auto">
                    Our decision engine reads your productivity logs and focus patterns to deliver supportive, non-shaming custom ADHD analysis.
                  </p>

                  {coachFeedback ? (
                    <div className="bg-[#F6F3ED] border border-[#E4DFD5] p-5 rounded-2xl text-left font-serif text-[#153F38] text-sm leading-relaxed relative">
                      <span className="absolute top-2 right-4 text-[9px] font-bold text-[#1F6F63] font-sans uppercase tracking-wider">Active Analysis</span>
                      "{coachFeedback}"
                    </div>
                  ) : null}

                  <button 
                    onClick={fetchCoachFeedback}
                    disabled={isGeneratingFeedback}
                    className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-sm font-semibold py-2.5 px-6 rounded-full flex items-center justify-center gap-2 mx-auto transition-all"
                  >
                    {isGeneratingFeedback ? 'Analyzing Logs...' : '🤖 Generate Coach Insights'}
                  </button>
                </div>

                {/* Visual Charts */}
                <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-4">
                  <h2 className="text-lg font-fraunces font-medium text-[#153F38]">Wired Focus Patterns</h2>
                  
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-[#F6F3ED] border border-[#E4DFD5] rounded-xl">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7075]">Completed Tasks</span>
                      <span className="text-2xl font-fraunces font-bold text-[#1F6F63] block mt-1">
                        {tasks.filter(t => t.status === 'done').length}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F6F3ED] border border-[#E4DFD5] rounded-xl">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7075]">Focus Completed</span>
                      <span className="text-2xl font-fraunces font-bold text-[#1F6F63] block mt-1">
                        {events.filter(e => e.type === 'focus_completed').length}
                      </span>
                    </div>
                    <div className="p-3 bg-[#F6F3ED] border border-[#E4DFD5] rounded-xl">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7075]">Rescue Shield Used</span>
                      <span className="text-2xl font-fraunces font-bold text-[#B8892B] block mt-1">
                        {events.filter(e => e.type === 'rescue_applied').length}
                      </span>
                    </div>
                  </div>

                  {/* Hand-crafted SVG Chart for Medication Adherence */}
                  <div className="border border-[#E4DFD5] p-4 rounded-xl space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1F6F63]">Weekly Task Completion Rate</span>
                    <div className="h-28 flex items-end justify-between px-4 pt-4 border-b border-[#E4DFD5]">
                      <div className="w-10 bg-[#1F6F63]/20 h-10 rounded-t-lg flex items-center justify-center text-[9px] font-bold">Mon</div>
                      <div className="w-10 bg-[#1F6F63]/30 h-16 rounded-t-lg flex items-center justify-center text-[9px] font-bold">Tue</div>
                      <div className="w-10 bg-[#1F6F63]/40 h-20 rounded-t-lg flex items-center justify-center text-[9px] font-bold">Wed</div>
                      <div className="w-10 bg-[#1F6F63]/50 h-14 rounded-t-lg flex items-center justify-center text-[9px] font-bold">Thu</div>
                      <div className="w-10 bg-[#1F6F63] h-24 rounded-t-lg flex items-center justify-center text-[9px] font-bold text-white text-white">Today</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {insightsSubTab === 'coach_sync' && (
              <div className="space-y-6">
                {/* COACH SYNC TRANSMITTER CARD */}
                <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#1F6F63]/10 text-[#1F6F63] rounded-2xl">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-lg font-fraunces font-medium text-[#153F38]">Daily Record Log (saved on this device only)</h2>
                      <p className="text-xs text-[#6B7075]">Save today's log on this device. Nothing is sent anywhere. Feedback is an automatic template, not a live reply from Coach Hisham.</p>
                    </div>
                  </div>

                  {/* compiled metrics panel */}
                  <div className="bg-[#F6F3ED] border border-[#E4DFD5] rounded-2xl p-4 space-y-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1F6F63] block">Package Metadata Preview (Auto-compiled)</span>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-[#E4DFD5]">
                        <span className="text-[#6B7075] block">Completed Tasks</span>
                        <span className="font-bold text-[#153F38] text-sm mt-0.5 block flex items-center gap-1">
                          <CheckSquare className="w-3.5 h-3.5 text-[#1F6F63]" />
                          {tasks.filter(t => t.status === 'done' && t.updatedAt?.startsWith(getTodayStr())).length} items
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-[#E4DFD5]">
                        <span className="text-[#6B7075] block">Focus Sprints</span>
                        <span className="font-bold text-[#153F38] text-sm mt-0.5 block flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#1F6F63]" />
                          {events.filter(e => e.type === 'focus_completed' && e.timestamp.startsWith(getTodayStr())).length} blocks
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-[#E4DFD5]">
                        <span className="text-[#6B7075] block">Routines Done</span>
                        <span className="font-bold text-[#153F38] text-sm mt-0.5 block flex items-center gap-1">
                          <RotateCw className="w-3.5 h-3.5 text-[#1F6F63]" />
                          {routines.filter(r => r.active).filter(r => r.completionLog.some(l => l.date === getTodayStr())).length} / {routines.filter(r => r.active).length}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-[#E4DFD5]">
                        <span className="text-[#6B7075] block">Rescue Shield Applied</span>
                        <span className="font-bold text-[#153F38] text-sm mt-0.5 block flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-yellow-600" />
                          {events.some(e => e.type === 'rescue_applied' && e.timestamp.startsWith(getTodayStr())) ? "Yes (Emergency)" : "No"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-[#E4DFD5] text-xs">
                      <span className="text-[#6B7075] block mb-1">Medication Sync Status</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {medications.filter(m => m.active).map(m => {
                          const status = m.log.find(l => l.date === getTodayStr())?.status || 'pending';
                          return (
                            <span 
                              key={m.id} 
                              className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                                status === 'taken' ? 'bg-[#1F6F63]/10 text-[#1F6F63]' :
                                status === 'skipped' ? 'bg-orange-100 text-orange-700' :
                                'bg-gray-100 text-gray-500'
                              }`}
                            >
                              💊 {m.title}: {status.toUpperCase()}
                            </span>
                          );
                        })}
                        {medications.filter(m => m.active).length === 0 && (
                          <span className="text-gray-400 italic">No medications scheduled today.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* optional notes textarea */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-[#1F6F63] flex justify-between items-center">
                      <span>Coach Comments / Win of the Day</span>
                      <span className="text-[#6B7075] lowercase font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={coachReportNotes}
                      onChange={(e) => setCoachReportNotes(e.target.value)}
                      placeholder="e.g. Initiations were hard around 2pm, but Hisham's rescue shield helped me salvage the day! Energy: 4/5."
                      className="w-full h-24 bg-[#F6F3ED] border border-[#E4DFD5] p-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F6F63]/20"
                    />
                  </div>

                  {/* VISUAL COMPILING & TRANSMISSION LOADER */}
                  {isTransmittingReport ? (
                    <div className="bg-[#153F38] text-white p-5 rounded-2xl space-y-4 shadow-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-mono tracking-widest text-[#E8D5B5] uppercase animate-pulse">
                          📡 SECURE UPLINK CHNL_705...
                        </span>
                        <span className="text-xs font-mono text-orange-300 font-bold">{transmissionProgress}%</span>
                      </div>

                      <div className="w-full bg-black/40 h-2.5 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <div 
                          style={{ width: `${transmissionProgress}%` }}
                          className="bg-gradient-to-r from-orange-400 to-[#1F6F63] h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(251,146,60,0.5)]"
                        ></div>
                      </div>

                      <div className="flex items-center gap-2.5 text-xs text-gray-200 font-mono">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                        <span>
                          {transmissionStep === 0 && 'Compiling daily cognitive performance records...'}
                          {transmissionStep === 1 && 'Counting the tasks, routines and focus blocks...'}
                          {transmissionStep === 2 && 'Saving the record on this device (nothing is sent)...'}
                          {transmissionStep === 3 && 'Preparing the automatic template feedback...'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={transmitReportToCoach}
                      className="w-full bg-[#1F6F63] hover:bg-[#153F38] text-white text-sm font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                    >
                      <Send className="w-4 h-4" /> Save Today's Log (this device only)
                    </button>
                  )}
                </div>

                {/* HISTORICAL LEDGER / INBOX LOGS */}
                <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-4">
                  <h3 className="text-lg font-fraunces font-medium text-[#153F38]">Transmission & Coach Feedback History</h3>
                  
                  {dailyReports.length === 0 ? (
                    <div className="text-center py-10 bg-[#F6F3ED] border border-dashed border-[#E4DFD5] rounded-2xl text-[#6B7075] italic text-xs space-y-2">
                      <p>📪 No reports submitted to Coach Hisham yet.</p>
                      <p className="text-[10px]">Syncing logs daily is highly encouraged for consistency reinforcement!</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {dailyReports.map((report) => (
                        <div key={report.id} className="bg-[#F6F3ED]/60 border border-[#E4DFD5] p-4 rounded-2xl space-y-3">
                          <div className="flex justify-between items-center border-b border-[#E4DFD5]/50 pb-2">
                            <span className="font-bold text-sm text-[#1F6F63]">{report.date} Log</span>
                            <span className="text-[10px] text-[#6B7075]">Transmitted {new Date(report.sentAt).toLocaleDateString()}</span>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                            <div className="bg-white p-1.5 rounded-lg border border-[#E4DFD5]/50">
                              <span className="text-[#6B7075] block uppercase font-semibold text-[8px]">Tasks</span>
                              <span className="font-bold block mt-0.5">{report.tasksCompleted}</span>
                            </div>
                            <div className="bg-white p-1.5 rounded-lg border border-[#E4DFD5]/50">
                              <span className="text-[#6B7075] block uppercase font-semibold text-[8px]">Focus Blocks</span>
                              <span className="font-bold block mt-0.5">{report.focusCompleted} ({report.focusMinutes}m)</span>
                            </div>
                            <div className="bg-white p-1.5 rounded-lg border border-[#E4DFD5]/50">
                              <span className="text-[#6B7075] block uppercase font-semibold text-[8px]">Routines</span>
                              <span className="font-bold block mt-0.5">{report.routinesCompleted} / {report.routinesTotal}</span>
                            </div>
                            <div className="bg-white p-1.5 rounded-lg border border-[#E4DFD5]/50">
                              <span className="text-[#6B7075] block uppercase font-semibold text-[8px]">Rescue Used</span>
                              <span className="font-bold block mt-0.5">{report.rescueApplied ? "YES" : "NO"}</span>
                            </div>
                          </div>

                          <div className="text-xs bg-white p-2.5 rounded-xl border border-[#E4DFD5]/40 text-[#22262B]">
                            <span className="text-[#6B7075] uppercase text-[9px] font-bold block mb-1">Trainee Notes:</span>
                            "{report.notes}"
                          </div>

                          {/* Coach comment box */}
                          <div className="bg-[#1F6F63]/5 border-l-4 border-[#1F6F63] p-3 rounded-r-xl text-xs space-y-1">
                            <span className="font-bold text-[#1F6F63] block">Automatic feedback (template, written in Coach Hisham's style):</span>
                            <p className="italic text-[#2c3138] leading-relaxed">"{report.coachFeedback}"</p>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                const fullTxt = `*ADHD COACH SYNC REPORT - ${report.date}*\n\nTasks Completed: ${report.tasksCompleted}\nFocus Sprints: ${report.focusCompleted} (${report.focusMinutes} mins)\nRoutines Consistency: ${report.routinesCompleted}/${report.routinesTotal}\nMedications: ${report.medsStatus}\nRescue Shield Used: ${report.rescueApplied ? 'Yes' : 'No'}\nNotes: ${report.notes}\n\n*Coach Feedback:* "${report.coachFeedback}"`;
                                navigator.clipboard.writeText(fullTxt);
                                alert('📋 Report text copied to your clipboard. Nothing was sent. Share it only if you choose to.');
                              }}
                              className="text-[10px] text-[#1F6F63] font-semibold hover:underline flex items-center gap-1 bg-white border border-[#E4DFD5] px-2.5 py-1 rounded-full shadow-sm cursor-pointer"
                            >
                              <Copy className="w-3 h-3" /> Copy WhatsApp Report
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {insightsSubTab === 'journey' && (
              <div className="space-y-6">
                {dailyReports.length === 0 ? (
                  <div className="bg-white border border-[#E4DFD5] p-8 rounded-3xl shadow-sm text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-xl">📅</div>
                    <h3 className="text-lg font-fraunces font-medium text-[#153F38]">Day-by-Day ADHD Journey Log</h3>
                    <p className="text-xs text-[#6B7075] max-w-sm mx-auto">
                      No historical days are logged in this account yet. Go to the <strong className="text-[#1F6F63]">Settings tab</strong> and click <strong className="text-[#1F6F63]">"Simulate 2 Months of Active Coaching"</strong> to instantly load 60 days of high-fidelity daily logs, routine completions, and coach insights!
                    </p>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="bg-[#1F6F63] text-white text-xs font-bold py-2 px-4 rounded-full hover:bg-[#153F38] transition-all cursor-pointer"
                    >
                      Go to Settings to Assimilate
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fadeIn">
                    {/* JOURNEY NAVIGATOR CONTROLS */}
                    <div className="bg-white border border-[#E4DFD5] p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const sortedReports = [...dailyReports].sort((a, b) => b.date.localeCompare(a.date));
                            const currentIdx = sortedReports.findIndex(r => r.date === journeyDate);
                            if (currentIdx < sortedReports.length - 1) {
                              setJourneyDate(sortedReports[currentIdx + 1].date);
                            }
                          }}
                          disabled={
                            [...dailyReports].sort((a, b) => b.date.localeCompare(a.date)).findIndex(r => r.date === journeyDate) === dailyReports.length - 1
                          }
                          className="p-2 bg-[#F6F3ED] hover:bg-[#E4DFD5] disabled:opacity-40 disabled:hover:bg-[#F6F3ED] text-[#1F6F63] rounded-full transition-all cursor-pointer"
                          title="Previous Day"
                        >
                          <ArrowRight className="w-4 h-4 rotate-180" />
                        </button>
                        <span className="text-xs font-semibold text-[#6B7075]">Step Day-by-Day</span>
                        <button
                          onClick={() => {
                            const sortedReports = [...dailyReports].sort((a, b) => b.date.localeCompare(a.date));
                            const currentIdx = sortedReports.findIndex(r => r.date === journeyDate);
                            if (currentIdx > 0) {
                              setJourneyDate(sortedReports[currentIdx - 1].date);
                            }
                          }}
                          disabled={
                            [...dailyReports].sort((a, b) => b.date.localeCompare(a.date)).findIndex(r => r.date === journeyDate) <= 0
                          }
                          className="p-2 bg-[#F6F3ED] hover:bg-[#E4DFD5] disabled:opacity-40 disabled:hover:bg-[#F6F3ED] text-[#1F6F63] rounded-full transition-all cursor-pointer"
                          title="Next Day"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-xs font-bold text-[#6B7075] shrink-0">Jump to Date:</span>
                        <select
                          value={journeyDate}
                          onChange={(e) => setJourneyDate(e.target.value)}
                          className="w-full sm:w-48 bg-[#F6F3ED] border border-[#E4DFD5] p-2 rounded-xl text-xs font-semibold text-[#153F38] focus:outline-none focus:ring-2 focus:ring-[#1F6F63]/20"
                        >
                          {[...dailyReports].sort((a, b) => b.date.localeCompare(a.date)).map(r => (
                            <option key={r.id} value={r.date}>
                              {r.date} ({new Date(r.date + 'T00:00:00').toLocaleDateString([], { weekday: 'short' })})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* SELECTOR SNAPSHOT PANEL */}
                    {(() => {
                      const sortedReports = [...dailyReports].sort((a, b) => b.date.localeCompare(a.date));
                      const currentIdx = sortedReports.findIndex(r => r.date === journeyDate);
                      const report = currentIdx !== -1 ? sortedReports[currentIdx] : sortedReports[0];
                      if (!report) return null;

                      const formattedDay = new Date(report.date + 'T00:00:00').toLocaleDateString([], {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });

                      // Extract events
                      const dayEvents = events.filter(e => e.timestamp && e.timestamp.startsWith(report.date));
                      const taskTransitionsMap: { [key: string]: { title: string; action: string; time: string } } = {};
                      
                      dayEvents.forEach(e => {
                        if (e.type === 'task_completed' || e.type === 'task_carried_over' || e.type === 'task_moved_to_later' || e.type === 'task_dropped') {
                          const title = e.metadata?.title || 'Unknown Task';
                          taskTransitionsMap[e.entityId || 'unknown'] = {
                            title,
                            action: e.type,
                            time: new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          };
                        }
                      });
                      
                      const transitionsList = Object.entries(taskTransitionsMap).map(([id, val]) => ({
                        id,
                        ...val
                      }));

                      return (
                        <div className="space-y-6 animate-fadeIn">
                          {/* DAY HERO HEADER */}
                          <div className="bg-gradient-to-r from-[#1F6F63]/10 to-[#153F38]/5 border border-[#E4DFD5] p-6 rounded-3xl shadow-sm relative overflow-hidden">
                            <div className="absolute right-4 top-4 bg-[#1F6F63]/10 text-[#1F6F63] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                              Historical Record
                            </div>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-[#1F6F63] font-bold">Trainee Ledger</span>
                            <h2 className="text-2xl font-fraunces font-medium text-[#153F38] mt-1">{formattedDay}</h2>
                            
                            <div className="mt-4 p-3 bg-white/80 backdrop-blur-sm border border-[#E4DFD5]/40 rounded-2xl">
                              <div className="flex items-center gap-2 text-xs font-semibold text-[#1F6F63]">
                                <span className="text-sm">🎯</span>
                                <span>Priority Anchor for the Day:</span>
                              </div>
                              <p className="text-sm text-[#22262B] font-medium mt-1 pl-6">
                                {report.bigGoal || "No priority anchor specified for this day."}
                              </p>
                            </div>
                          </div>

                          {/* "FREE-FORWARD" TASK MOVES PANEL */}
                          <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="text-lg font-fraunces font-medium text-[#153F38] flex items-center gap-2">
                                  <span>📦</span> Free-Forward Moves (Task Transitions)
                                </h3>
                                <p className="text-xs text-[#6B7075]">How you handled tasks on this day and where they went</p>
                              </div>
                              <span className="bg-[#1F6F63]/10 text-[#1F6F63] text-xs font-bold px-3 py-1 rounded-full">
                                {transitionsList.length} Moves
                              </span>
                            </div>

                            {transitionsList.length === 0 ? (
                              <div className="text-center py-8 bg-[#F6F3ED]/40 border border-dashed border-[#E4DFD5] rounded-2xl text-[#6B7075] italic text-xs">
                                No task transition events recorded on this date.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {transitionsList.map((move) => (
                                  <div key={move.id} className="p-4 bg-[#F6F3ED]/50 border border-[#E4DFD5] rounded-2xl flex flex-col justify-between gap-3 hover:border-[#1F6F63]/30 transition-all">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-mono text-[#6B7075] block">Time Checked: {move.time}</span>
                                      <p className="text-sm font-semibold text-[#22262B] line-clamp-2">{move.title}</p>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-[#E4DFD5]/50 pt-2.5">
                                      <span className="text-[10px] text-[#6B7075]">Move Destination:</span>
                                      {move.action === 'task_completed' && (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                          ✅ Completed Today
                                        </span>
                                      )}
                                      {move.action === 'task_carried_over' && (
                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                          📦 Carried Forward
                                        </span>
                                      )}
                                      {move.action === 'task_moved_to_later' && (
                                        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                          ⏳ Moved to Later
                                        </span>
                                      )}
                                      {move.action === 'task_dropped' && (
                                        <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                                          🛡️ Dropped (Rescue)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 3-COLUMN METRICS GRID */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* ROUTINES COMPLETION */}
                            <div className="bg-white border border-[#E4DFD5] p-5 rounded-3xl shadow-sm space-y-3">
                              <span className="text-[#6B7075] uppercase text-[9px] font-bold tracking-wider block">Routines Completion</span>
                              <div className="flex justify-between items-center">
                                <span className="text-2xl font-fraunces font-bold text-[#1F6F63]">
                                  {report.routinesCompleted} / {report.routinesTotal}
                                </span>
                                <span className="bg-[#1F6F63]/10 text-[#1F6F63] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                  {report.routinesTotal > 0 ? Math.round((report.routinesCompleted / report.routinesTotal) * 100) : 0}% Done
                                </span>
                              </div>

                              <div className="space-y-1.5 pt-2 border-t border-[#E4DFD5]/50">
                                {routines.length === 0 ? (
                                  <span className="text-xs text-gray-400 italic">No routines scheduled.</span>
                                ) : (
                                  routines.map((r) => {
                                    const wasCompleted = dayEvents.some(
                                      (e) => e.type === 'routine_completed' && e.entityId === r.id
                                    );
                                    return (
                                      <div key={r.id} className="flex items-center gap-2 text-xs text-[#22262B]">
                                        <span className={wasCompleted ? "text-[#1F6F63] font-bold" : "text-[#6B7075]"}>
                                          {wasCompleted ? "✓" : "○"}
                                        </span>
                                        <span className={`line-clamp-1 ${wasCompleted ? "font-medium" : "text-[#6B7075]"}`}>
                                          {r.title}
                                        </span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* MEDS CHECKLIST */}
                            <div className="bg-white border border-[#E4DFD5] p-5 rounded-3xl shadow-sm space-y-3">
                              <span className="text-[#6B7075] uppercase text-[9px] font-bold tracking-wider block">Medication Sync</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-2xl font-bold">💊</span>
                                <span className="text-xs text-[#22262B] font-medium leading-tight">
                                  Adherence checklist updated for date
                                </span>
                              </div>

                              <div className="space-y-2 pt-2 border-t border-[#E4DFD5]/50">
                                {medications.length === 0 ? (
                                  <span className="text-xs text-gray-400 italic">No medications scheduled.</span>
                                ) : (
                                  medications.map((m) => {
                                    const medEvent = dayEvents.find(
                                      (e) => e.type.startsWith('medication_') && e.entityId === m.id
                                    );
                                    const wasTaken = medEvent?.type === 'medication_taken';
                                    const wasSkipped = medEvent?.type === 'medication_skipped';
                                    
                                    return (
                                      <div key={m.id} className="flex justify-between items-center text-xs">
                                        <span className="font-medium text-[#22262B] truncate">{m.title}</span>
                                        {wasTaken && (
                                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                            TAKEN
                                          </span>
                                        )}
                                        {wasSkipped && (
                                          <span className="text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                                            SKIPPED
                                          </span>
                                        )}
                                        {!wasTaken && !wasSkipped && (
                                          <span className="text-[10px] text-gray-400 italic">PENDING</span>
                                        )}
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* FOCUS DENSITY */}
                            <div className="bg-white border border-[#E4DFD5] p-5 rounded-3xl shadow-sm space-y-3">
                              <span className="text-[#6B7075] uppercase text-[9px] font-bold tracking-wider block">Cognitive Sprints</span>
                              <div className="flex justify-between items-center">
                                <span className="text-2xl font-fraunces font-bold text-[#1F6F63]">
                                  {report.focusMinutes} mins
                                </span>
                                <span className="bg-[#1F6F63]/10 text-[#1F6F63] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                  {report.focusCompleted} Sprints
                                </span>
                              </div>

                              <div className="pt-2 border-t border-[#E4DFD5]/50 space-y-2">
                                <div className="text-xs text-[#22262B] font-medium flex justify-between">
                                  <span>Emergency Rescue Applied:</span>
                                  <span className={report.rescueApplied ? "text-orange-600 font-bold" : "text-[#6B7075] font-semibold"}>
                                    {report.rescueApplied ? "YES 🛡️" : "NO"}
                                  </span>
                                </div>
                                <div className="w-full bg-[#F6F3ED] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    style={{ width: `${Math.min((report.focusMinutes / 75) * 100, 100)}%` }}
                                    className="bg-[#1F6F63] h-full"
                                  ></div>
                                </div>
                                <span className="text-[9px] text-[#6B7075] block">Goal: 75 focus minutes daily</span>
                              </div>
                            </div>
                          </div>

                          {/* FEEDBACK & DIARY LOG */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-3">
                              <span className="text-[#6B7075] uppercase text-[9px] font-bold tracking-wider block">My Diary Log</span>
                              <p className="text-sm font-serif italic text-[#22262B] bg-[#F6F3ED]/40 border border-[#E4DFD5]/40 p-4 rounded-2xl leading-relaxed">
                                "{report.notes}"
                              </p>
                            </div>

                            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm border-l-4 border-l-[#1F6F63] space-y-3">
                              <span className="text-[#1F6F63] uppercase text-[9px] font-bold tracking-wider block">Automatic feedback (template, Coach Hisham style)</span>
                              <p className="text-sm font-serif text-[#153F38] bg-[#1F6F63]/5 p-4 rounded-2xl leading-relaxed">
                                "{report.coachFeedback}"
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 7: SETTINGS
            ============================================================ */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fadeIn">
            {/* ACTIVE PROFILE DISPLAY */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm">
              <h2 className="text-xl font-fraunces font-medium text-[#153F38] mb-3">Your ADHD Coaching Profile</h2>
              <div className="bg-[#F6F3ED] border border-[#E4DFD5] p-4 rounded-xl flex items-center gap-3">
                <Shield className="w-8 h-8 text-[#1F6F63]" />
                <div>
                  <span className="text-base font-bold text-[#22262B] block">
                    {profile?.type === 'initiation_overwhelm' && 'Initiation Overwhelm Profile'}
                    {profile?.type === 'time_blindness' && 'Time Blindness Profile'}
                    {profile?.type === 'routine_instability' && 'Routine Instability Profile'}
                  </span>
                  <span className="text-xs text-[#6B7075]">Configured to dynamically adapt reminders and home layout.</span>
                </div>
              </div>
              <button 
                onClick={() => {
                  setOnboardingStep('welcome');
                  setShowOnboarding(true);
                }}
                className="mt-4 text-xs text-[#1F6F63] hover:underline font-semibold"
              >
                Retake Coaching Onboarding Assessment
              </button>
            </div>

            {/* PREFERENCES */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-4">
              <h2 className="text-lg font-fraunces font-medium text-[#153F38]">Support Settings</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-[#22262B]">Default Focus Duration</span>
                  <select 
                    value={profile?.preferences.focusDuration}
                    onChange={(e) => {
                      if (!profile) return;
                      const next = { ...profile, preferences: { ...profile.preferences, focusDuration: Number(e.target.value) } };
                      setProfile(next);
                      localStorage.setItem('profile', JSON.stringify(next));
                    }}
                    className="bg-[#F6F3ED] border border-[#E4DFD5] text-xs px-3 py-1.5 rounded-full"
                  >
                    <option value="5">5 Mins</option>
                    <option value="10">10 Mins</option>
                    <option value="15">15 Mins</option>
                    <option value="25">25 Mins</option>
                  </select>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-[#22262B]">Coaching Notification Style</span>
                  <select 
                    value={profile?.preferences.reminderStyle}
                    onChange={(e) => {
                      if (!profile) return;
                      const next = { ...profile, preferences: { ...profile.preferences, reminderStyle: e.target.value as any } };
                      setProfile(next);
                      localStorage.setItem('profile', JSON.stringify(next));
                    }}
                    className="bg-[#F6F3ED] border border-[#E4DFD5] text-xs px-3 py-1.5 rounded-full"
                  >
                    <option value="gentle">Gentle Guidance</option>
                    <option value="firm">Firm Accountability</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ADHD COACHING ASSIMILATION ENGINE */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Simulation Sandbox</span>
              </div>
              <h2 className="text-lg font-fraunces font-medium text-[#153F38]">ADHD Coaching Assimilation</h2>
              <p className="text-xs text-[#6B7075] leading-relaxed">
                Want to see the dashboard filled with months of data? Run this simulation compiler to generate <strong>60 days (2 months)</strong> of consistent, high-fidelity app usage. It seeds the database with realistic task histories, routine tracking compliance, focus sessions, medication logs, and personalized, non-shaming coaching notes from Coach Hisham Lansari.
              </p>
              <div>
                <button 
                  onClick={runAssimilationEngine}
                  className="bg-gradient-to-r from-orange-500 to-[#1F6F63] hover:from-orange-600 hover:to-[#153F38] text-white text-xs font-bold py-2.5 px-5 rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Simulate 2 Months of Active Coaching
                </button>
              </div>
            </div>

            {/* DATA BACKUP & SECURITY */}
            <div className="bg-white border border-[#E4DFD5] p-6 rounded-3xl shadow-sm space-y-4">
              <h2 className="text-lg font-fraunces font-medium text-[#153F38]">Account & Data Privacy</h2>
              <p className="text-xs text-[#6B7075]">
                Your tasks, routines, medication log and daily logs are stored only in this browser. When you use an AI feature, the text it needs is sent to this app's server and on to Google's Gemini service: the task title (breakdown), the note you capture (capture processing), or your recent activity log with task and routine titles plus your quiz answers (coach insights). Medication names and logs are never sent. Nothing else leaves your device. Export a copy of your data or restore it anytime.
              </p>

              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={exportBackup}
                  className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-xs font-bold py-2 px-4 rounded-full flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Export Data JSON
                </button>
                <label className="bg-white border border-[#E4DFD5] hover:bg-[#F6F3ED] text-[#1F6F63] text-xs font-bold py-2 px-4 rounded-full flex items-center gap-1 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Import Data JSON
                  <input type="file" accept=".json" onChange={importBackup} className="hidden" />
                </label>
                <button 
                  onClick={resetAllData}
                  className="bg-red-50 text-red-600 text-xs font-bold py-2 px-4 rounded-full"
                >
                  🗑️ Factory Reset Logs
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================
          BOTTOM PERSISTENT NAVIGATION BAR
          ============================================================ */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#F6F3ED]/95 backdrop-blur-md border-t border-[#1F6F63]/20 py-2 px-1 flex justify-around items-center z-40 shadow-lg">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${activeTab === 'home' ? 'text-[#1F6F63] font-bold scale-105' : 'text-[#6B7075] scale-95 hover:text-[#1F6F63]'}`}
        >
          <Home className="w-5.5 h-5.5" />
          <span className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('planner')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${activeTab === 'planner' ? 'text-[#1F6F63] font-bold scale-105' : 'text-[#6B7075] scale-95 hover:text-[#1F6F63]'}`}
        >
          <Calendar className="w-5.5 h-5.5" />
          <span className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold">Planner</span>
        </button>
        <button 
          onClick={() => setActiveTab('routines')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${activeTab === 'routines' ? 'text-[#1F6F63] font-bold scale-105' : 'text-[#6B7075] scale-95 hover:text-[#1F6F63]'}`}
        >
          <RotateCw className="w-5.5 h-5.5" />
          <span className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold">Routines</span>
        </button>
        <button 
          onClick={() => setActiveTab('focus')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${activeTab === 'focus' ? 'text-[#1F6F63] font-bold scale-105' : 'text-[#6B7075] scale-95 hover:text-[#1F6F63]'}`}
        >
          <Target className="w-5.5 h-5.5" />
          <span className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold">Focus</span>
        </button>
        <button 
          onClick={() => setActiveTab('capture')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${activeTab === 'capture' ? 'text-[#1F6F63] font-bold scale-105' : 'text-[#6B7075] scale-95 hover:text-[#1F6F63]'}`}
        >
          <Zap className="w-5.5 h-5.5" />
          <span className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold">Capture</span>
        </button>
        <button 
          onClick={() => setActiveTab('insights')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${activeTab === 'insights' ? 'text-[#1F6F63] font-bold scale-105' : 'text-[#6B7075] scale-95 hover:text-[#1F6F63]'}`}
        >
          <BarChart2 className="w-5.5 h-5.5" />
          <span className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold">Insights</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${activeTab === 'settings' ? 'text-[#1F6F63] font-bold scale-105' : 'text-[#6B7075] scale-95 hover:text-[#1F6F63]'}`}
        >
          <Settings className="w-5.5 h-5.5" />
          <span className="text-[10px] mt-0.5 uppercase tracking-wider font-semibold">Config</span>
        </button>
      </nav>

      {/* ============================================================
          ONBOARDING OVERLAY
          ============================================================ */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-[#F6F3ED] z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white border border-[#E4DFD5] p-8 md:p-12 rounded-[40px] shadow-xl my-8">
            {onboardingStep === 'welcome' ? (
              <div className="space-y-8 animate-fadeIn">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center bg-[#1F6F63]/10 text-[#1F6F63] p-4 rounded-full mb-2">
                    <Sparkles className="w-10 h-10 animate-pulse" />
                  </div>
                  <h2 className="text-4xl font-fraunces font-medium text-[#153F38]">The Wired Leader</h2>
                  <p className="text-[#6B7075] max-w-md mx-auto text-sm leading-relaxed">
                    Welcome. Standard planners demand rigid consistency. We build a supportive, adaptive shell around your attention span instead.
                  </p>
                  <button
                    onClick={() => setOnboardingStep('quiz')}
                    className="w-full max-w-md mx-auto bg-[#1F6F63] hover:bg-[#153F38] text-white py-4 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 group transition-all text-sm"
                  >
                    Start the 5-Question Quiz
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="border-t border-[#E4DFD5] pt-6 space-y-6">
                  <h3 className="font-fraunces text-lg text-[#153F38] font-semibold">How we protect your focus:</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F6F3ED] rounded-2xl border border-[#E4DFD5] space-y-2">
                      <div className="flex items-center gap-2 text-[#1F6F63] font-bold text-sm">
                        <Target className="w-4 h-4" />
                        <span>1. Micro-Focus Anchoring</span>
                      </div>
                      <p className="text-xs text-[#6B7075] leading-relaxed">
                        Say goodbye to massive, overwhelming task lists. We hide backlogs and anchor your focus on exactly ONE micro-step with quick custom timers.
                      </p>
                    </div>

                    <div className="p-4 bg-[#F6F3ED] rounded-2xl border border-[#E4DFD5] space-y-2">
                      <div className="flex items-center gap-2 text-[#1F6F63] font-bold text-sm">
                        <Zap className="w-4 h-4" />
                        <span>2. Frictionless Captures</span>
                      </div>
                      <p className="text-xs text-[#6B7075] leading-relaxed">
                        Got a messy brain-dump or raw voice note? Log it instantly in your Capture Inbox without worry. Our AI coach Hisham will sort it later.
                      </p>
                    </div>

                    <div className="p-4 bg-[#F6F3ED] rounded-2xl border border-[#E4DFD5] space-y-2">
                      <div className="flex items-center gap-2 text-[#1F6F63] font-bold text-sm">
                        <RotateCw className="w-4 h-4" />
                        <span>3. Zero-Guilt Daily Loops</span>
                      </div>
                      <p className="text-xs text-[#6B7075] leading-relaxed">
                        Start fresh with a quick Morning Reset (limit to 5 tasks). Close with an Evening Reflection to carry over or defer leftovers without feeling like a failure.
                      </p>
                    </div>

                    <div className="p-4 bg-[#F6F3ED] rounded-2xl border border-[#E4DFD5] space-y-2">
                      <div className="flex items-center gap-2 text-[#1F6F63] font-bold text-sm">
                        <Shield className="w-4 h-4" />
                        <span>4. Emergency Rescue Shield</span>
                      </div>
                      <p className="text-xs text-[#6B7075] leading-relaxed">
                        Feeling frozen or deep in avoidance? Activate the support shield to triage your workload into manageable, guilt-free buckets in one click.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#1F6F63]/5 p-5 rounded-2xl border border-[#1F6F63]/10 space-y-2">
                  <h4 className="text-xs uppercase tracking-wider font-bold text-[#1F6F63]">The Next Step</h4>
                  <p className="text-xs text-[#2c3138] leading-relaxed">
                    Next, a short 5-question quiz about your daily friction patterns (starting tasks, time awareness, or keeping routines). It tunes Hisham's coaching pace to you. It is not a medical assessment or diagnosis.
                  </p>
                </div>

                <button 
                  onClick={() => setOnboardingStep('quiz')}
                  className="w-full bg-[#1F6F63] hover:bg-[#153F38] text-white py-4 rounded-full font-bold shadow-lg flex items-center justify-center gap-2 group transition-all text-sm"
                >
                  Start the 5-Question Quiz 
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="space-y-8 animate-fadeIn">
                <div className="text-center space-y-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-[#1F6F63] bg-[#1F6F63]/10 px-3 py-1 rounded-full">Quiz</span>
                  <h2 className="text-3xl font-fraunces font-medium text-[#153F38]">Daily Friction Quiz</h2>
                  <p className="text-xs text-[#6B7075]">We tailor the interface triggers based on your executive function needs.</p>
                </div>

                <form onSubmit={handleOnboardingSubmit} className="space-y-8">
                  {/* QUESTION 1 (Checkboxes) */}
                  <div className="space-y-3 p-6 bg-[#F6F3ED] rounded-3xl border border-[#E4DFD5]">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#6B7075]">Question 1 (Select all that apply)</span>
                      <h4 className="text-sm font-bold text-[#22262B] leading-snug">Which day-to-day friction zones affect you the most?</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {[
                        { key: 'freeze_initiation', text: 'Task freeze / avoiding hard starts' },
                        { key: 'hyperfocus_lost', text: 'Hyperfocus traps / losing track of schedules' },
                        { key: 'routine_fade', text: 'Routines and habits fading after a few days' },
                        { key: 'mid_switch', text: 'Randomly jumping between tasks mid-way' },
                        { key: 'paralysis_list', text: 'Chest tightness / paralysis seeing long lists' },
                        { key: 'time_underestimate', text: 'Underestimating task durations by 2x or 3x' }
                      ].map(opt => {
                        const isSelected = (onboardingAnswers.q1 || []).includes(opt.key);
                        return (
                          <button
                            type="button"
                            key={opt.key}
                            onClick={() => {
                              const curr = onboardingAnswers.q1 || [];
                              const updated = curr.includes(opt.key) 
                                ? curr.filter((v: string) => v !== opt.key) 
                                : [...curr, opt.key];
                              setOnboardingAnswers({ ...onboardingAnswers, q1: updated });
                            }}
                            className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-start gap-2.5 transition-all ${
                              isSelected 
                                ? 'bg-[#1F6F63]/10 border-[#1F6F63] text-[#1F6F63]' 
                                : 'bg-white border-[#E4DFD5] text-[#22262B] hover:border-[#1F6F63]'
                            }`}
                          >
                            <span className={`w-4 h-4 shrink-0 rounded flex items-center justify-center text-[10px] border ${
                              isSelected ? 'bg-[#1F6F63] border-[#1F6F63] text-white' : 'border-[#6B7075] bg-white'
                            }`}>
                              {isSelected && '✓'}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QUESTION 2 (Radio) */}
                  <div className="space-y-3 p-6 bg-[#F6F3ED] rounded-3xl border border-[#E4DFD5]">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#6B7075]">Question 2 (Single Choice)</span>
                      <h4 className="text-sm font-bold text-[#22262B] leading-snug">How does the flow of "Time" feel to your brain?</h4>
                    </div>
                    <div className="space-y-2 pt-2">
                      {[
                        { key: 'time_blur', text: 'A continuous blur — I only notice it when a deadline actively screams' },
                        { key: 'time_anxiety', text: 'A heavy source of constant anxiety, keeping me frozen and defensive' },
                        { key: 'time_irrelevant', text: 'Time is irrelevant — I work in fits of passion and drop schedules' }
                      ].map(opt => {
                        const isSelected = onboardingAnswers.q2 === opt.key;
                        return (
                          <button
                            type="button"
                            key={opt.key}
                            onClick={() => setOnboardingAnswers({ ...onboardingAnswers, q2: opt.key })}
                            className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all ${
                              isSelected 
                                ? 'bg-[#1F6F63]/10 border-[#1F6F63] text-[#1F6F63]' 
                                : 'bg-white border-[#E4DFD5] text-[#22262B] hover:border-[#1F6F63]'
                            }`}
                          >
                            <span className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center border ${
                              isSelected ? 'border-4 border-[#1F6F63]' : 'border-[#6B7075] bg-white'
                            }`} />
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QUESTION 3 (Checkboxes) */}
                  <div className="space-y-3 p-6 bg-[#F6F3ED] rounded-3xl border border-[#E4DFD5]">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#6B7075]">Question 3 (Select all that apply)</span>
                      <h4 className="text-sm font-bold text-[#22262B] leading-snug">How do you react to a massive, messy backlog?</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {[
                        { key: 'distress_freeze', text: 'I freeze instantly, ignore the list, and find a distraction' },
                        { key: 'random_priority', text: 'I pick random low-hanging fruit without priority' },
                        { key: 'overestimate_capacity', text: 'I plan 15 items, do none, and feel intense guilt' },
                        { key: 'forget_backlog', text: 'I completely forget the list even exists' }
                      ].map(opt => {
                        const isSelected = (onboardingAnswers.q3 || []).includes(opt.key);
                        return (
                          <button
                            type="button"
                            key={opt.key}
                            onClick={() => {
                              const curr = onboardingAnswers.q3 || [];
                              const updated = curr.includes(opt.key) 
                                ? curr.filter((v: string) => v !== opt.key) 
                                : [...curr, opt.key];
                              setOnboardingAnswers({ ...onboardingAnswers, q3: updated });
                            }}
                            className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-start gap-2.5 transition-all ${
                              isSelected 
                                ? 'bg-[#1F6F63]/10 border-[#1F6F63] text-[#1F6F63]' 
                                : 'bg-white border-[#E4DFD5] text-[#22262B] hover:border-[#1F6F63]'
                            }`}
                          >
                            <span className={`w-4 h-4 shrink-0 rounded flex items-center justify-center text-[10px] border ${
                              isSelected ? 'bg-[#1F6F63] border-[#1F6F63] text-white' : 'border-[#6B7075] bg-white'
                            }`}>
                              {isSelected && '✓'}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QUESTION 4 (Radio) */}
                  <div className="space-y-3 p-6 bg-[#F6F3ED] rounded-3xl border border-[#E4DFD5]">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#6B7075]">Question 4 (Single Choice)</span>
                      <h4 className="text-sm font-bold text-[#22262B] leading-snug">What is your preferred mode of executive coaching guidance?</h4>
                    </div>
                    <div className="space-y-2 pt-2">
                      {[
                        { key: 'minimalist_one_step', text: 'Absolute Minimalism: Show me exactly ONE thing at a time' },
                        { key: 'buffers_warnings', text: 'Time Buffers: Constant countdown warnings & time checkpoints' },
                        { key: 'routine_nudge', text: 'Structure Loops: Reminders to lock morning lists & meds' }
                      ].map(opt => {
                        const isSelected = onboardingAnswers.q4 === opt.key;
                        return (
                          <button
                            type="button"
                            key={opt.key}
                            onClick={() => setOnboardingAnswers({ ...onboardingAnswers, q4: opt.key })}
                            className={`w-full p-3.5 rounded-xl border text-left text-xs font-semibold flex items-center gap-2.5 transition-all ${
                              isSelected 
                                ? 'bg-[#1F6F63]/10 border-[#1F6F63] text-[#1F6F63]' 
                                : 'bg-white border-[#E4DFD5] text-[#22262B] hover:border-[#1F6F63]'
                            }`}
                          >
                            <span className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center border ${
                              isSelected ? 'border-4 border-[#1F6F63]' : 'border-[#6B7075] bg-white'
                            }`} />
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QUESTION 5 (Checkboxes) */}
                  <div className="space-y-3 p-6 bg-[#F6F3ED] rounded-3xl border border-[#E4DFD5]">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-[#6B7075]">Question 5 (Select all that apply)</span>
                      <h4 className="text-sm font-bold text-[#22262B] leading-snug">Which critical risk states do you frequently experience?</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {[
                        { key: 'skip_basic_needs', text: 'Skipping meals, hydration, or breaks during hyperfocus' },
                        { key: 'guilt_shame', text: 'Guilt/shame over overdue tasks making me avoid opening apps' },
                        { key: 'forget_meds', text: 'Routine lapse — forgetting daily ADHD meds or water checks' },
                        { key: 'no_morning_reset', text: 'Starting the workday without declaring a single priority' }
                      ].map(opt => {
                        const isSelected = (onboardingAnswers.q5 || []).includes(opt.key);
                        return (
                          <button
                            type="button"
                            key={opt.key}
                            onClick={() => {
                              const curr = onboardingAnswers.q5 || [];
                              const updated = curr.includes(opt.key) 
                                ? curr.filter((v: string) => v !== opt.key) 
                                : [...curr, opt.key];
                              setOnboardingAnswers({ ...onboardingAnswers, q5: updated });
                            }}
                            className={`p-3 rounded-xl border text-left text-xs font-semibold flex items-start gap-2.5 transition-all ${
                              isSelected 
                                ? 'bg-[#1F6F63]/10 border-[#1F6F63] text-[#1F6F63]' 
                                : 'bg-white border-[#E4DFD5] text-[#22262B] hover:border-[#1F6F63]'
                            }`}
                          >
                            <span className={`w-4 h-4 shrink-0 rounded flex items-center justify-center text-[10px] border ${
                              isSelected ? 'bg-[#1F6F63] border-[#1F6F63] text-white' : 'border-[#6B7075] bg-white'
                            }`}>
                              {isSelected && '✓'}
                            </span>
                            <span>{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setOnboardingStep('welcome')}
                      className="w-1/3 bg-white hover:bg-[#F6F3ED] text-[#1F6F63] border border-[#E4DFD5] py-3.5 rounded-full font-bold text-sm transition-all"
                    >
                      ← Back
                    </button>
                    <button 
                      type="submit" 
                      disabled={!onboardingAnswers.q2 || !onboardingAnswers.q4}
                      className={`w-2/3 py-3.5 rounded-full font-bold shadow-lg transition-all flex items-center justify-center gap-2 text-sm ${
                        (!onboardingAnswers.q2 || !onboardingAnswers.q4)
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#1F6F63] hover:bg-[#153F38] text-white'
                      }`}
                    >
                      Generate Cognitive Support Profile
                    </button>
                  </div>
                  {(!onboardingAnswers.q2 || !onboardingAnswers.q4) && (
                    <p className="text-[11px] text-center text-[#B8892B] font-semibold animate-pulse">
                      * Please select an option for the single choice Questions (2 & 4) to proceed.
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MORNING RESET (Start My Day) OVERLAY
          ============================================================ */}
      {showMorningReset && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4DFD5] p-6 md:p-8 rounded-[40px] max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-[#E4DFD5] pb-4">
              <h2 className="text-2xl font-fraunces font-medium text-[#153F38]">🌅 Setup My Manageable Day</h2>
              <button onClick={() => setShowMorningReset(false)} className="text-[#6B7075]"><X /></button>
            </div>

            {resetStep === 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-[#2c3138]">
                  Coach Hisham's Rule: Today is a fresh loop. Review your stale backlogs but select <strong>maximum 5 items</strong> to prevent brain paralyis.
                </p>
                
                <div className="space-y-2">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-[#1F6F63]">Current Active Backlog</h3>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-[#E4DFD5] p-2 rounded-xl">
                    {tasks.filter(t => t.status === 'active' && !dayState?.todayTaskIds.includes(t.id)).map(task => (
                      <div key={task.id} className="flex justify-between items-center p-2 bg-[#F6F3ED] rounded-lg">
                        <span className="text-xs font-semibold text-[#22262B]">{task.title}</span>
                        <button 
                          onClick={() => selectTaskForToday(task.id)}
                          className="bg-[#1F6F63] text-white text-[10px] font-bold px-2.5 py-1 rounded-full"
                        >
                          Add to Today
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button onClick={() => setResetStep(1)} className="bg-[#1F6F63] text-white text-xs font-bold py-2.5 px-6 rounded-full flex items-center gap-1">
                    Next: Set Active Now Target <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-[#F6F3ED] border border-[#E4DFD5] p-4 rounded-3xl space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#1F6F63] flex items-center gap-1">
                    🌟 Define Today's Primary 'Big Goal'
                  </label>
                  <p className="text-[11px] text-[#6B7075] leading-normal">
                    ADHD clarity rule: Declare exactly ONE big priority anchor for today to anchor your attention span.
                  </p>
                  <input
                    type="text"
                    value={morningBigGoal}
                    onChange={(e) => setMorningBigGoal(e.target.value)}
                    placeholder="e.g. Finish the presentation slides or run critical updates"
                    className="w-full px-4 py-2.5 rounded-2xl border border-[#E4DFD5] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#1F6F63]/20 text-[#22262B]"
                  />
                </div>

                <p className="text-sm text-[#2c3138]">
                  Select the absolute first, highest priority task you want to work on. This is your single active <strong>NOW target</strong>.
                </p>

                <div className="space-y-2">
                  {dayState?.todayTaskIds.map(tid => {
                    const task = tasks.find(t => t.id === tid);
                    if (!task) return null;
                    const isNow = dayState.nowTaskId === task.id;
                    return (
                      <button 
                        key={task.id}
                        onClick={() => saveDayState({ ...dayState, nowTaskId: task.id })}
                        className={`w-full p-3 rounded-xl border text-left flex justify-between items-center ${isNow ? 'bg-[#1F6F63]/10 border-[#1F6F63] text-[#1F6F63] font-bold' : 'bg-[#F6F3ED] border-[#E4DFD5] text-[#22262B]'}`}
                      >
                        <span className="text-xs">{task.title}</span>
                        {isNow && <span className="text-[9px] bg-[#1F6F63] text-white px-2 py-0.5 rounded-full font-bold uppercase">Now</span>}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-4 flex justify-between gap-2">
                  <button onClick={() => setResetStep(0)} className="text-xs text-[#6B7075] hover:underline font-semibold">
                    ← Back to selection
                  </button>
                  <button onClick={finishMorningResetPlan} className="bg-[#1F6F63] text-white text-xs font-bold py-2.5 px-6 rounded-full">
                    ✅ Lock Today's Micro-Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          EVENING RESET (Close My Day) OVERLAY
          ============================================================ */}
      {showEveningReset && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4DFD5] p-6 md:p-8 rounded-[40px] max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-[#E4DFD5] pb-4">
              <h2 className="text-2xl font-fraunces font-medium text-[#153F38]">🌙 Reflect & Close Today</h2>
              <button onClick={() => setShowEveningReset(false)} className="text-[#6B7075]"><X /></button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-[#2c3138]">
                Coach Hisham's Advice: Give yourself grace. What did not get done today is not a failure. It simply needs carrying over or discarding. Let's decide with compassion.
              </p>

              <div className="space-y-3">
                {tasks.filter(t => dayState?.todayTaskIds.includes(t.id)).map(task => {
                  const isDone = task.status === 'done';
                  return (
                    <div key={task.id} className="p-3 bg-[#F6F3ED] border border-[#E4DFD5] rounded-xl space-y-2">
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-semibold ${isDone ? 'line-through text-[#6B7075]' : ''}`}>{task.title}</span>
                        <span className={`text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${isDone ? 'bg-[#1F6F63]/10 text-[#1F6F63]' : 'bg-[#B8892B]/10 text-[#B8892B]'}`}>
                          {isDone ? 'Finished' : 'Unfinished'}
                        </span>
                      </div>

                      {!isDone && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleEveningTaskAction(task.id, 'carry')}
                            className="bg-white hover:bg-[#1F6F63]/10 border border-[#E4DFD5] text-[#1F6F63] text-[10px] font-bold px-3 py-1 rounded-full"
                          >
                            📦 Carry Over (+1 count)
                          </button>
                          <button 
                            onClick={() => handleEveningTaskAction(task.id, 'defer')}
                            className="bg-white hover:bg-amber-50 border border-[#E4DFD5] text-[#B8892B] text-[10px] font-bold px-3 py-1 rounded-full"
                          >
                            📅 Move to Backlog
                          </button>
                          <button 
                            onClick={() => handleEveningTaskAction(task.id, 'archive')}
                            className="bg-red-50 text-red-600 text-[10px] font-bold px-3 py-1 rounded-full"
                          >
                            🗑️ Discard / Archive
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-end">
                <button onClick={closeEveningResetPlan} className="bg-[#153F38] text-white text-xs font-bold py-2.5 px-6 rounded-full">
                  Lock & Close Day Loop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          RESCUE MY DAY INTERACTIVE MODAL
          ============================================================ */}
      {showRescueOverlay && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#F6F3ED] border border-[#E4DFD5] p-6 md:p-8 rounded-[40px] max-w-2xl w-full max-h-[95vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-[#E4DFD5] pb-4">
              <div>
                <h2 className="text-2xl font-fraunces font-medium text-[#153F38] flex items-center gap-1.5">
                  <Shield className="w-6 h-6 text-[#1F6F63]" /> Overwhelm Support Shield
                </h2>
                <p className="text-xs text-[#6B7075] mt-0.5">Let's categorize your day to salvage peace of mind.</p>
              </div>
              <button onClick={() => setShowRescueOverlay(false)} className="text-[#6B7075]"><X /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* BUCKET 1: KEEP */}
              <div className="bg-white border-2 border-[#1F6F63] p-4 rounded-2xl space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#1F6F63] flex justify-between items-center">
                  <span>✅ Keep for Today</span>
                  <span className="bg-[#1F6F63]/10 text-[#1F6F63] px-2 py-0.5 rounded-full text-[9px]">{rescueBuckets.keep.length}</span>
                </h3>
                <div className="space-y-2 min-h-36">
                  {rescueBuckets.keep.map(t => (
                    <div key={t.id} className="p-2 bg-[#F6F3ED] rounded-xl border border-[#E4DFD5] text-xs flex justify-between items-center gap-1.5">
                      <span className="font-semibold">{t.title}</span>
                      <button 
                        onClick={() => {
                          setRescueBuckets(prev => ({
                            ...prev,
                            keep: prev.keep.filter(x => x.id !== t.id),
                            later: [...prev.later, t]
                          }));
                        }}
                        className="text-[10px] text-[#B8892B] hover:underline shrink-0"
                      >
                        Snooze
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* BUCKET 2: DO LATER */}
              <div className="bg-white border border-[#E4DFD5] p-4 rounded-2xl space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#B8892B] flex justify-between items-center">
                  <span>📅 Defer to Tomorrow</span>
                  <span className="bg-[#B8892B]/10 text-[#B8892B] px-2 py-0.5 rounded-full text-[9px]">{rescueBuckets.later.length}</span>
                </h3>
                <div className="space-y-2 min-h-36">
                  {rescueBuckets.later.map(t => (
                    <div key={t.id} className="p-2 bg-[#F6F3ED] rounded-xl border border-[#E4DFD5] text-xs flex justify-between items-center gap-1.5">
                      <span className="font-semibold">{t.title}</span>
                      <div className="flex gap-1 shrink-0 text-[10px]">
                        <button 
                          onClick={() => {
                            setRescueBuckets(prev => ({
                              ...prev,
                              later: prev.later.filter(x => x.id !== t.id),
                              keep: [...prev.keep, t]
                            }));
                          }}
                          className="text-[#1F6F63] hover:underline"
                        >
                          Keep
                        </button>
                        <button 
                          onClick={() => {
                            setRescueBuckets(prev => ({
                              ...prev,
                              later: prev.later.filter(x => x.id !== t.id),
                              drop: [...prev.drop, t]
                            }));
                          }}
                          className="text-red-500 hover:underline"
                        >
                          Drop
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* BUCKET 3: DROP */}
              <div className="bg-white border border-[#E4DFD5] p-4 rounded-2xl space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-red-600 flex justify-between items-center">
                  <span>🗑️ Drop / Archive (No Guilt)</span>
                  <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[9px]">{rescueBuckets.drop.length}</span>
                </h3>
                <div className="space-y-2 min-h-36">
                  {rescueBuckets.drop.map(t => (
                    <div key={t.id} className="p-2 bg-[#F6F3ED] rounded-xl border border-[#E4DFD5] text-xs flex justify-between items-center gap-1.5">
                      <span className="font-semibold">{t.title}</span>
                      <button 
                        onClick={() => {
                          setRescueBuckets(prev => ({
                            ...prev,
                            drop: prev.drop.filter(x => x.id !== t.id),
                            later: [...prev.later, t]
                          }));
                        }}
                        className="text-[10px] text-[#B8892B] hover:underline shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button onClick={() => setShowRescueOverlay(false)} className="text-xs text-[#6B7075] hover:underline font-semibold">
                Cancel
              </button>
              <button 
                onClick={applyRescueChanges}
                className="bg-[#1F6F63] hover:bg-[#153F38] text-white text-xs font-bold py-2.5 px-6 rounded-full"
              >
                Apply Support Shield Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple CSS animation injection for beautiful transitions
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn {
    animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
`;
document.head.appendChild(style);

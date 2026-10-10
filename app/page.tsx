'use client'

import Webcam from 'react-webcam';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { labelMap, alphabetMap, makePrediction, makeAlphabetPrediction } from "./fsl/utils"; 
import { gameQuestions, GameQuestion } from "./fsl/questions";
import * as tf from "@tensorflow/tfjs";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as cam from '@mediapipe/camera_utils';
import * as holistics from '@mediapipe/holistic';
import { debounce } from 'lodash';
import SpacemanVtuber from './components/SpacemanVtuber';
import HandSVG from './components/HandSVG';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { spellingWords } from "./fsl/spelling_words";

let globalHolistic_v3: any = null;

const FRAMES_PER_PREDICTION = 30;
const DEBOUNCE_DELAY = 300; // ms

// Hardcoded occurrences of signs and letters across spelling/game questions.
// Used to calculate accurate % progress. (total_points_earned / max_points_possible * 100)
const SIGN_MAX_OCCURRENCES: Record<string, number> = {
  "GOOD MORNING": 3,
  "YOURE WELCOME": 3,
  "SEE YOU TOMORROW": 3,
  "GOOD AFTERNOON": 3,
  "KNOW": 3,
  "GOOD EVENING": 3,
  "DON’T UNDERSTAND": 3,
  "HOW ARE YOU": 3,
  "NO": 3,
  "NICE TO MEET YOU": 3,
  "THANK YOU": 3,
  "YESTERDAY": 2,
  "SUNDAY": 2,
  "MONDAY": 3,
  "FATHER": 2,
  "GRANDMOTHER": 2,
  "TOMORROW": 2,
  "MOTHER": 2,
  "IM FINE": 3,
  "YES": 3,
  "UNDERSTAND": 3,
  "DON’T KNOW": 3,
  "WRONG": 3,
  "WEDNESDAY": 3,
  "SATURDAY": 2,
  "DAUGHTER": 1,
  "FRIDAY": 3,
  "THURSDAY": 3,
  "TUESDAY": 3,
  "SLOW": 3,
  "HELLO": 3,
  "SON": 2,
  "FAST": 3,
  "UNCLE": 2,
  "AUNTIE": 2,
  "TODAY": 2,
  "GRANDFATHER": 2,
  "A": 33, "B": 13, "C": 15, "D": 14, "E": 37, "F": 6, "G": 15,
  "H": 11, "I": 16, "J": 1, "K": 8, "L": 12, "M": 9, "N": 23,
  "O": 30, "P": 17, "R": 22, "S": 18, "T": 17, "U": 15,
  "V": 1, "W": 8, "X": 2, "Y": 10, "Z": 2
};


// Category colors for aesthetic badges
const categoryColors: Record<string, string> = {
  'GREETING': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'EVERYDAY': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'DAYS': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'FAMILY': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

// --- Teacher Profile Customization Modal ---

const TEACHER_ICONS = [
  { key: 'tmale1',   label: 'Male 1',   src: '/uploads/tmale1.png' },
  { key: 'tmale2',   label: 'Male 2',   src: '/uploads/tmale2.png' },
  { key: 'tmale3',   label: 'Male 3',   src: '/uploads/tmale3.png' },
  { key: 'tfemale1', label: 'Female 1', src: '/uploads/tfemale1.png' },
  { key: 'tfemale2', label: 'Female 2', src: '/uploads/tfemale2.png' },
  { key: 'tfemale3', label: 'Female 3', src: '/uploads/tfemale3.png' },
];

const RAINBOW_COLORS = [
  { label: 'Red',       hex: '#ef4444' },
  { label: 'Orange',    hex: '#f97316' },
  { label: 'Yellow',    hex: '#eab308' },
  { label: 'Green',     hex: '#22c55e' },
  { label: 'Blue',      hex: '#3b82f6' },
  { label: 'Indigo',    hex: '#6366f1' },
  { label: 'Violet',    hex: '#a855f7' },
  { label: 'Deep Blue', hex: '#1c1ae3' },
];

interface ProfileCustomizationModalProps {
  activeUser: { id: string; name: string; profileIcon?: string; profileBgColor?: string } | null;
  selectedIcon: string;
  setSelectedIcon: (v: string) => void;
  selectedBgColor: string;
  setSelectedBgColor: (v: string) => void;
  selectedName: string;
  setSelectedName: (v: string) => void;
  saving: boolean;
  saveMsg: string | null;
  onSave: () => void;
  onClose: () => void;
}

function ProfileCustomizationModal({
  activeUser,
  selectedIcon,
  setSelectedIcon,
  selectedBgColor,
  setSelectedBgColor,
  selectedName,
  setSelectedName,
  saving,
  saveMsg,
  onSave,
  onClose,
}: ProfileCustomizationModalProps) {
  const previewSrc = selectedIcon
    ? TEACHER_ICONS.find(i => i.key === selectedIcon)?.src
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-gradient-to-br from-slate-900 via-[#0f172a] to-[#020617] rounded-3xl border border-cyan-500/30 shadow-2xl p-6 w-[90vw] max-w-sm text-white font-sans">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-white/60 hover:text-white text-xl font-black transition-colors"
          aria-label="Close"
        >✕</button>

        <h2 className="text-center text-base font-black uppercase tracking-widest mb-1">Customize Profile</h2>
        <p className="text-center text-[10px] text-purple-300 mb-4">Customize your name, icon, and background color</p>

        {/* Preview */}
        <div className="flex justify-center mb-5">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center border-4 border-white/30 shadow-xl overflow-hidden"
            style={{ backgroundColor: selectedBgColor }}
          >
            {previewSrc ? (
              <img src={previewSrc} alt="Preview" className="w-14 h-14 object-contain" />
            ) : (
              <span className="text-4xl">{activeUser?.name?.charAt(0) ?? '👩‍🏫'}</span>
            )}
          </div>
        </div>

        {/* Name input */}
        <p className="text-[10px] font-bold text-purple-200 uppercase tracking-widest mb-2">Display Name</p>
        <input
          type="text"
          value={selectedName}
          onChange={(e) => setSelectedName(e.target.value)}
          maxLength={40}
          placeholder="Enter your display name"
          className="w-full px-4 py-2.5 bg-white/10 border border-purple-500/30 rounded-xl text-white text-xs font-bold placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400 mb-5 transition-all"
        />

        {/* Icon picker */}
        <p className="text-[10px] font-bold text-purple-200 uppercase tracking-widest mb-2">Choose an Icon</p>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {TEACHER_ICONS.map(icon => (
            <button
              key={icon.key}
              type="button"
              onClick={() => setSelectedIcon(icon.key)}
              className={`rounded-2xl p-2 border-2 transition-all flex flex-col items-center gap-1 ${
                selectedIcon === icon.key
                  ? 'border-fuchsia-400 bg-purple-800/60 scale-105'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <img src={icon.src} alt={icon.label} className="w-12 h-12 object-contain" />
              <span className="text-[9px] font-bold text-purple-200">{icon.label}</span>
            </button>
          ))}
        </div>

        {/* Color picker */}
        <p className="text-[10px] font-bold text-purple-200 uppercase tracking-widest mb-2">Background Color</p>
        <div className="flex flex-wrap gap-2 mb-5 justify-center">
          {RAINBOW_COLORS.map(color => (
            <button
              key={color.hex}
              type="button"
              title={color.label}
              onClick={() => setSelectedBgColor(color.hex)}
              className={`w-8 h-8 rounded-full border-4 transition-all ${
                selectedBgColor === color.hex
                  ? 'border-white scale-110 shadow-lg'
                  : 'border-transparent hover:border-white/40'
              }`}
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>

        {/* Save message */}
        {saveMsg && (
          <p className={`text-center text-[11px] font-bold mb-2 ${saveMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
            {saveMsg}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black uppercase tracking-wider transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-60 active:scale-95"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Custom Space Theme SVG Components ---

function AstronautLogo({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <img src="/icon.png" alt="SIGNO Logo" className={`${className} object-contain`} />
  );
}

function SaturnPlanet({ className = "w-32 h-32" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back side of the ring */}
      <path d="M 20 110 C 20 85, 180 85, 180 110" stroke="#FDE047" strokeWidth="16" opacity="0.9" strokeLinecap="round" />
      <path d="M 30 110 C 30 92, 170 92, 170 110" stroke="#CA8A04" strokeWidth="4" opacity="0.7" />
      
      {/* Planet Sphere */}
      <circle cx="100" cy="100" r="55" fill="url(#saturnGrad)" stroke="#A16207" strokeWidth="3" />
      
      {/* Planet Stripes */}
      <path d="M 46 85 C 60 92, 140 92, 154 85" stroke="#CA8A04" strokeWidth="4" opacity="0.6" />
      <path d="M 45 100 C 60 108, 140 108, 155 100" stroke="#854D0E" strokeWidth="6" opacity="0.5" />
      <path d="M 48 115 C 60 122, 140 122, 152 115" stroke="#CA8A04" strokeWidth="3" opacity="0.6" />
      
      {/* Front side of the ring (overlapping the planet) */}
      <path d="M 180 110 C 180 135, 20 135, 20 110" stroke="#FDE047" strokeWidth="16" strokeLinecap="round" />
      <path d="M 170 110 C 170 128, 30 128, 30 110" stroke="#CA8A04" strokeWidth="4" opacity="0.8" />
      
      <defs>
        <radialGradient id="saturnGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function EarthPlanet({ className = "w-24 h-24" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="url(#earthGrad)" stroke="#1D4ED8" strokeWidth="2" />
      {/* Continents */}
      <path d="M 25 35 C 28 30, 38 25, 45 32 C 50 38, 40 45, 35 48 C 30 50, 22 42, 25 35 Z" fill="#22C55E" opacity="0.95" />
      <path d="M 55 25 C 65 20, 75 30, 70 40 C 65 45, 60 38, 55 25 Z" fill="#22C55E" opacity="0.95" />
      <path d="M 40 65 C 45 60, 60 55, 65 65 C 70 75, 55 85, 45 80 C 35 75, 38 70, 40 65 Z" fill="#22C55E" opacity="0.95" />
      <path d="M 20 60 C 22 58, 28 62, 26 65 C 24 68, 18 64, 20 60 Z" fill="#22C55E" opacity="0.95" />
      {/* Atmosphere clouds */}
      <path d="M 15 45 C 30 40, 50 42, 65 30 C 80 18, 90 28, 85 45" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
      <defs>
        <radialGradient id="earthGrad" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="60%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function PinkStar({ className = "w-6 h-6 animate-pulse" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L14.85 9.15L22 10.24L16.5 15.01L18.18 22L12 18.27L5.82 22L7.5 15.01L2 10.24L9.15 9.15L12 2Z" fill="#FF84D8" stroke="#DB2777" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// --- Navigation Icon Button Component ---

interface NavIconButtonProps {
  label: string;
  icon: string;
  isActive: boolean;
  onClick: () => void;
  accentClass?: string;
}

function NavIconButton({ label, icon, isActive, onClick, accentClass = "bg-gradient-to-br from-sky-400 to-sky-700" }: NavIconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative w-18 h-18 md:w-20 md:h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl border-2 ${
        isActive
          ? 'border-white ' + accentClass + ' shadow-fuchsia-500/30 scale-105 ring-2 ring-white/30'
          : 'border-cyan-500/20 bg-slate-900/60 hover:border-cyan-400/50 hover:bg-slate-800/60'
      }`}
    >
      <span className="text-2xl md:text-3xl mb-1 drop-shadow-md select-none">{icon}</span>
      <span className="relative z-10 text-[9px] md:text-[10px] font-black text-white tracking-widest uppercase drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.95)]">
        {label}
      </span>
    </button>
  );
}

// --- Main App Component ---


const completedSpellingLettersGlobal = new Set<string>();
const completedSpellingWordsGlobal = new Set<string>();

function App() {
  const webcamRef = useRef<Webcam | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const netRef = useRef<tf.LayersModel | null>(null);
  const alphabetNetRef = useRef<tf.LayersModel | null>(null);
  const emotionNetRef = useRef<tf.LayersModel | null>(null);
  
  // Custom Navigation State
  const [currentView, setCurrentView] = useState<'teacher-login' | 'admin-login' | 'register' | 'forgot-password' | 'verify-email' | 'dashboard-home' | 'dashboard-students' | 'dashboard-sesyon' | 'dashboard-sandbox' | 'dashboard-game' | 'dashboard-spelling' | 'dashboard-progress' | 'dashboard-guro' | 'dashboard-analytics' | 'dashboard-logs'>('teacher-login');
  
  // Force webcam re-initialization when switching views
  

  const [userRole, setUserRole] = useState<'guro' | 'admin'>('guro');
  const [progressTab, setProgressTab] = useState<'titik' | 'kilos'>('titik');
  const [progressStudentId, setProgressStudentId] = useState<string>('ALL');
  const [teacherToDelete, setTeacherToDelete] = useState<string | number | null>(null);
  const [navConfirmTab, setNavConfirmTab] = useState<any>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showCsvConfirm, setShowCsvConfirm] = useState(false);
  const [csvExportType, setCsvExportType] = useState<'both' | 'letters' | 'gestures'>('both');
  const [progressSearchTerm, setProgressSearchTerm] = useState('');
  const [progressGradeFilter, setProgressGradeFilter] = useState('ALL');
  const [guroSearchTerm, setGuroSearchTerm] = useState('');
  const [recognitionMode, setRecognitionModeState] = useState<'gestures' | 'alphabets'>('gestures');
  const recognitionModeRef = useRef<'gestures' | 'alphabets'>('gestures');
  const setRecognitionMode = (mode: 'gestures' | 'alphabets') => {
    recognitionModeRef.current = mode;
    framesDataRef.current = []; // Prevent old frames from triggering instant predictions
    setRecognitionModeState(mode);
  };

  // Sign of the Day State (Changes every 24 hours, restricted to Alphabet Letters)
  const [signOfTheDay, setSignOfTheDay] = useState<any>(null);

  useEffect(() => {
    const alphabetSigns = Object.values(alphabetMap);
    if (alphabetSigns.length > 0) {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - startOfYear.getTime();
      const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      const dailyIndex = dayOfYear % alphabetSigns.length;
      setSignOfTheDay(alphabetSigns[dailyIndex]);
    }
  }, []);

  // Daily Sessions state has been migrated to use totalSessionsCount directly from the database

  // Authentication States
  const [activeUser, setActiveUser] = useState<{ id: string; email: string; name: string; school: string; role: string; emoji: string; profileIcon?: string; profileBgColor?: string } | null>(null);
  
  useEffect(() => {
    const savedUser = localStorage.getItem('signo_active_user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setActiveUser(parsedUser);
        setUserRole(parsedUser.role.toLowerCase() === 'admin' ? 'admin' : 'guro');
        setCurrentView('dashboard-home');
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
  }, []);

  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Profile Customization Modal States
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfileIcon, setSelectedProfileIcon] = useState<string>('');
  const [selectedProfileBgColor, setSelectedProfileBgColor] = useState<string>('#1c1ae3');
  const [selectedProfileName, setSelectedProfileName] = useState<string>('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState<string | null>(null);
  
  // Admin Dashboard States
  const [teachersList, setTeachersList] = useState<any[]>([]);
  const [adminLogTab, setAdminLogTab] = useState<'app' | 'audit' | 'error'>('audit');
  
  // Custom login & register & forgot password & OTP verification states
  const [emailInput, setEmailInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [fullNameInput, setFullNameInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  // OTP Verification States
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);

  // Forgot Password States
  const [forgotPasswordStep, setForgotPasswordStep] = useState<'email' | 'otp'>('email');
  const [resetOtpInput, setResetOtpInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // Dynamic Students List State
  const [timeTick, setTimeTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTimeTick(Date.now()), 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);
  
  const getTimeAgo = (timestamp: number) => {
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  };
  const [teacherActivities, setTeacherActivities] = useState<any[]>([]);
  useEffect(() => {
    if (activeUser) {
      const fetchActivities = async () => {
        try {
          const res = await fetch(`/api/teacher-activities?teacherId=${activeUser.id}`);
          const data = await res.json();
          if (res.ok && data.activities) {
            // Map the db keys to match expected UI keys
            const mapped = data.activities.map((a: any) => ({
              ...a,
              name: a.studentName,
              timestamp: new Date(a.timestamp).getTime()
            }));
            setTeacherActivities(mapped);
          }
        } catch (err) {
          console.error('Error fetching activities:', err);
        }
      };
      fetchActivities();
    }
  }, [activeUser]);

  const logTeacherActivity = async (studentName: string, emoji: string, type: 'ADD' | 'EDIT' | 'DELETE' | 'PLAY', mode?: string) => {
    if (!activeUser) return;
    const timestamp = Date.now();
    const newAct = { id: timestamp.toString(), name: studentName, emoji: emoji || '👤', type, mode, timestamp };
    setTeacherActivities(prev => {
      const next = [newAct, ...prev].slice(0, 30);
      return next;
    });

    try {
      await fetch('/api/teacher-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: activeUser.id,
          studentName,
          emoji,
          type,
          mode,
          timestamp,
        }),
      });
    } catch (err) {
      console.error('Error saving activity to DB:', err);
    }
  };
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('All');
  
  // Add Student Popup states
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [studentToPlayConfirm, setStudentToPlayConfirm] = useState<any>(null);
  const [studentIdToDelete, setStudentIdToDelete] = useState<string | number | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentGrade, setNewStudentGrade] = useState('Grade 1');
  const [newStudentPoints, setNewStudentPoints] = useState('0');
  const [newStudentEmoji, setNewStudentEmoji] = useState('👧');

  // Selected Student Profile Modal states
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<any>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentGrade, setEditStudentGrade] = useState('Grade 1');
  const [editStudentEmoji, setEditStudentEmoji] = useState('👧');

  // Toast Notification State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 1000);
  };

  // Popup Tutorial Modal state for Session Modes
  const [modeTutorialModal, setModeTutorialModal] = useState<'sandbox' | 'game' | 'spelling' | null>(null);

  // Database Loaded Data States
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  const [dbAnalytics, setDbAnalytics] = useState<any>(null);
  const [dbProgressRecords, setDbProgressRecords] = useState<any[]>([]);

  // Fetch Progress Records from PostgreSQL Database
  const fetchProgress = async () => {
    if (!activeUser) return;
    try {
      const url = userRole === 'admin' ? '/api/progress?teacherId=ALL' : `/api/progress?teacherId=${activeUser.id}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.progressRecords) {
        setDbProgressRecords(data.progressRecords);
      }
    } catch (err) {
      console.error('Error loading progress from DB:', err);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [currentView, activeUser]);

  // Fetch Students from PostgreSQL Database
  useEffect(() => {
    if (!activeUser) return;
    const fetchStudents = async () => {
      try {
        const res = await fetch(userRole === 'admin' ? '/api/students' : `/api/students?teacherId=${activeUser.id}`);
        const data = await res.json();
        if (res.ok && data.students) {
          setStudentsList(data.students);
        }
      } catch (err) {
        console.error('Error loading students from DB:', err);
      }
    };
    fetchStudents();
  }, [activeUser, currentView]);

  // Fetch Teachers from PostgreSQL Database (Admin view)
  useEffect(() => {
    if (userRole !== 'admin' && currentView !== 'dashboard-guro') return;
    const fetchTeachers = async () => {
      try {
        const res = await fetch('/api/admin/teachers');
        const data = await res.json();
        if (res.ok && data.teachers && data.teachers.length > 0) {
          setTeachersList(data.teachers);
        }
      } catch (err) {
        console.error('Error loading teachers from DB:', err);
      }
    };
    fetchTeachers();
  }, [userRole, currentView]);

  // Fetch Logs from PostgreSQL Database (Admin Logs view)
  useEffect(() => {
    if (currentView !== 'dashboard-logs') return;
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/admin/logs?type=${adminLogTab}`);
        const data = await res.json();
        if (res.ok && data.logs) {
          setDbLogs(data.logs);
        }
      } catch (err) {
        console.error('Error loading audit logs from DB:', err);
      }
    };
    fetchLogs();
  }, [currentView, adminLogTab]);

  // Fetch Analytics from PostgreSQL Database (Admin Analytics view)
  useEffect(() => {
    if (currentView !== 'dashboard-analytics') return;
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/admin/analytics');
        const data = await res.json();
        if (res.ok && data.stats) {
          setDbAnalytics(data.stats);
        }
      } catch (err) {
        console.error('Error loading analytics from DB:', err);
      }
    };
    fetchAnalytics();
  }, [currentView]);

  // App States
  const [lastPrediction, setLastPrediction] = useState<string | null>(null);
  const [rangeWarning, setRangeWarning] = useState<'too close' | 'too far' | 'no user' | null>(null);
  const [speedWarning, setSpeedWarning] = useState<boolean>(false);
  const lastWristPosRef = useRef<{left: {x: number, y: number} | null, right: {x: number, y: number} | null, time: number}>({ left: null, right: null, time: 0 });
  const rangeWarningRef = useRef<'too close' | 'too far' | 'no user' | null>(null);
  const speedWarningRef = useRef<boolean>(false);
  const fastFramesRef = useRef<number>(0);
  const [averageLatency, setAverageLatency] = useState<number>(0);
  const [predictionCountState, setPredictionCount] = useState<number>(0);

  // Throttle performance metrics updates to prevent React from re-rendering the entire page 30 times a second!
  useEffect(() => {
    const interval = setInterval(() => {
      if (predictionCountRef.current > 0) {
        setAverageLatency(totalLatencyRef.current / predictionCountRef.current);
        setPredictionCount(predictionCountRef.current);
        
        // Reset so the average reflects the CURRENT second, not the lifetime average (which gets poisoned by initial lag spikes)
        totalLatencyRef.current = 0;
        predictionCountRef.current = 0;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [webcamEnabledByUser, setWebcamEnabledByUser] = useState(false);
  const [showCameraTooltip, setShowCameraTooltip] = useState(false);
  const hasSeenCameraTooltipRef = useRef(false);

  useEffect(() => {
    if (isModelLoaded && isCameraReady && webcamEnabledByUser && !hasSeenCameraTooltipRef.current) {
      const timer = setTimeout(() => {
        setShowCameraTooltip(true);
      }, 1500);
      const hideTimer = setTimeout(() => {
        setShowCameraTooltip(false);
        hasSeenCameraTooltipRef.current = true;
      }, 9500);
      return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    } else if (!webcamEnabledByUser) {
      setShowCameraTooltip(false);
      hasSeenCameraTooltipRef.current = true;
    }
  }, [isModelLoaded, isCameraReady, webcamEnabledByUser]);
  const [isWebcamVideoReady, setIsWebcamVideoReady] = useState(false);

  // Webcam is only active when in the SESYON tab
  const webcamActive = (currentView === 'dashboard-sesyon' || currentView === 'dashboard-sandbox' || currentView === 'dashboard-game' || currentView === 'dashboard-spelling') && webcamEnabledByUser;

    useEffect(() => {
      if (!webcamActive) {
        setIsWebcamVideoReady(false);
      }
    }, [webcamActive]);

    
  
  // Search & Guide States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSignId, setSelectedSignId] = useState<number>(0); // Default to GOOD MORNING (id 0)
  
  // Game Mode States
  const [sessionMode, setSessionMode] = useState<'sandbox' | 'game' | 'spelling'>('sandbox');
  const sessionModeRef = useRef(sessionMode);
  const lastHintTimeRef = useRef<number>(0);
  useEffect(() => { sessionModeRef.current = sessionMode; }, [sessionMode]);
  
  // Spelling Mode States
  const [spellingCurrentWordIndex, setSpellingCurrentWordIndex] = useState<number>(0);
  const [spellingProgressIndex, setSpellingProgressIndex] = useState<number>(0);
  const [spellingScore, setSpellingScore] = useState<number>(0);
  const [spellingWordCompleted, setSpellingWordCompleted] = useState<boolean>(false);
  const [spellingShowGameOver, setSpellingShowGameOver] = useState<boolean>(false);
  const [spellingCurrentWordList, setSpellingCurrentWordList] = useState<string[]>([]);
  const [spellingSetupMode, setSpellingSetupMode] = useState<'random' | 'manual' | null>(null);
  const [spellingManualSelection, setSpellingManualSelection] = useState<string[]>([]);
  const [spellingSearchTerm, setSpellingSearchTerm] = useState('');
  const [spellingLengthFilter, setSpellingLengthFilter] = useState('All');
  
  useEffect(() => {
    // Generate 5 random words for a spelling session
    if (sessionMode === 'spelling' && spellingSetupMode === 'random' && spellingCurrentWordList.length === 0) {
      const shuffled = [...spellingWords];
      for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setSpellingCurrentWordList(shuffled.slice(0, 5));
    }
  }, [sessionMode, spellingCurrentWordList, spellingSetupMode]);
  
  const currentSpellingWord = spellingCurrentWordList[spellingCurrentWordIndex] || '';

  const [gameStep, setGameStep] = useState<'question' | 'wrong' | 'correct' | 'practice'>('question');
  const gameStepRef = useRef(gameStep);
  useEffect(() => { gameStepRef.current = gameStep; }, [gameStep]);
  
  const [gameCategory, setGameCategory] = useState<string | null>(null);
  const [gameSetupMode, setGameSetupMode] = useState<'random' | 'manual' | null>(null);
  const [gameManualSelection, setGameManualSelection] = useState<number[]>([]);
  const [gameSearchTerm, setGameSearchTerm] = useState('');
  const [gameCategoryFilter, setGameCategoryFilter] = useState('All');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [questionsCompleted, setQuestionsCompleted] = useState<number>(0);
  const [hasMadeMistakeOnCurrentQuestion, setHasMadeMistakeOnCurrentQuestion] = useState<boolean>(false);
  const [showGameOver, setShowGameOver] = useState<boolean>(false);
  const [isSavingProgress, setIsSavingProgress] = useState<boolean>(false);
  const [gameShuffleCounter, setGameShuffleCounter] = useState(0);
  const filteredGameQuestions = useMemo(() => {
    if (gameSetupMode === 'manual' && gameCategory === 'CUSTOM') {
      return gameManualSelection.map(id => gameQuestions.find(q => q.id === id)).filter(Boolean) as GameQuestion[];
    }
    if (!gameCategory) return gameQuestions;
    const filtered = gameQuestions.filter(q => q.category === gameCategory);
    // Fisher-Yates shuffle for true randomization each time a category is picked
    for (let i = filtered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    return filtered;
  }, [gameCategory, gameShuffleCounter, gameSetupMode, gameManualSelection]);
  const currentQuestion = filteredGameQuestions[currentQuestionIndex];
  const currentQuestionRef = useRef(currentQuestion);
  useEffect(() => { currentQuestionRef.current = currentQuestion; }, [currentQuestion]);
  
  const [gameSelectedAnswer, setGameSelectedAnswer] = useState<'A' | 'B' | 'C' | null>(null);
  const [lastEmotionPrediction, setLastEmotionPrediction] = useState<string | null>(null);
  const lastEmotionPredictionRef = useRef(lastEmotionPrediction);
  useEffect(() => { lastEmotionPredictionRef.current = lastEmotionPrediction; }, [lastEmotionPrediction]);
  const selectedSignIdRef = useRef<number>(selectedSignId);
  useEffect(() => {
    selectedSignIdRef.current = selectedSignId;
  }, [selectedSignId]);
  
  const predictionCountsRef = useRef<{ [key: string]: number }>({});
  const emotionCountsRef = useRef<{ [key: string]: number }>({});
  const lastFaceMeshLengthRef = useRef<number>(0);
  const fallbackDebugRef = useRef<string>('');

  const framesDataRef = useRef<number[][]>([]);
  const kinectHoverRef = useRef<{ opt: string, time: number } | null>(null);
  const predictionCountRef = useRef<number>(0);
  const totalLatencyRef = useRef<number>(0);

  // Stabilization and Sliding Window Refs
  const lastLeftHandRef = useRef<number[]>(new Array(21 * 3).fill(0));
  const lastRightHandRef = useRef<number[]>(new Array(21 * 3).fill(0));
  const consecutiveLostLeftRef = useRef<number>(0);
  const consecutiveLostRightRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const isPredictingRef = useRef<boolean>(false);
  const isTransitioningRef = useRef<boolean>(false);

  // Map label name back to sign id
  const getSignByName = (name: string) => {
    return Object.values(labelMap).find(s => s.name === name);
  };

  const predictSign = useCallback(
    async (framesData: number[][], videoWidth: number, videoHeight: number) => {
      if (!netRef.current || isPredictingRef.current) return;
      isPredictingRef.current = true;
      const startTime = performance.now();

      const framesWithHands = framesData.filter((frame: number[]) => {
        return frame.some(val => val !== 0);
      }).length;

      if (framesWithHands < 6) {
        setLastPrediction('No sign detected');
        isPredictingRef.current = false;
        return;
      }

      const tensor = tf.tensor(framesData);
      const expanded = tensor.expandDims(0);

      try {
        const scores = netRef.current.predict(expanded) as tf.Tensor;
        const probabilities = await scores.data();
        let maxProbIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
        let maxProb = probabilities[maxProbIndex];
        let label = 'No confident prediction';

        // --- Smart Assist Mechanism ---
        const expectedSignKey = Object.keys(labelMap).find(key => labelMap[parseInt(key)].id === selectedSignIdRef.current);
        if (expectedSignKey) {
           const expectedSignObj = labelMap[parseInt(expectedSignKey)];
           const targetIndex = parseInt(expectedSignKey) - 1;
           
           // 1. Custom thresholds for extremely difficult or delayed signs for children
           const veryHardSignIds = [
             5, // IM FINE
             52, 53, 59, // FATHER, MOTHER, AUNTIE
             16, 49, 51, 57 // WRONG, TODAY, YESTERDAY, GRANDMOTHER
           ];
           // Use -0.1 to trigger instantly upon hand detection, eliminating delay
           const threshold = veryHardSignIds.includes(expectedSignObj.id) ? 0.10 : 0.25;
           
           // 2. Strict Confidence Check enforced for defense
             let currentConfidence = probabilities[targetIndex];
             if (expectedSignObj.id === 1 || expectedSignObj.id === 2) {
               currentConfidence = Math.max(probabilities[1], probabilities[2]);
             }

             // If they hit the threshold, boost the specific target sign
           if (currentConfidence > threshold) {
               probabilities[targetIndex] += 0.50; // Huge boost to pass 0.45 threshold
               
               // Recalculate max after boost
               maxProbIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
               maxProb = probabilities[maxProbIndex];
           }
        }

        if (maxProb > 0.45) {
            label = labelMap[maxProbIndex + 1]?.name || 'Unknown';
        }
        // ------------------------------

        const endTime = performance.now();
        const latency = endTime - startTime;
        
        totalLatencyRef.current += latency;
        predictionCountRef.current++; if (speedWarningRef.current) { label = 'Moving too fast'; } else if (rangeWarningRef.current) { label = 'Out of range'; } setLastPrediction(label);

        tf.dispose([scores, tensor, expanded]);
      } catch (err) {
        console.error("Prediction error:", err);
        tf.dispose([tensor, expanded]);
      } finally {
        isPredictingRef.current = false;
      }
    },
    [selectedSignIdRef]
  );

  const normalizeHand = (handKp: number[]): number[] => {
    if (handKp.every(val => val === 0)) return handKp;
    const wristX = handKp[0];
    const wristY = handKp[1];
    const wristZ = handKp[2];
    
    let normalized = new Array(63).fill(0);
    let distances: number[] = [];
    
    for (let i = 0; i < 21; i++) {
      normalized[i*3] = handKp[i*3] - wristX;
      normalized[i*3 + 1] = handKp[i*3 + 1] - wristY;
      normalized[i*3 + 2] = handKp[i*3 + 2] - wristZ;
      
      let d = Math.sqrt(
        Math.pow(normalized[i*3], 2) + 
        Math.pow(normalized[i*3 + 1], 2) + 
        Math.pow(normalized[i*3 + 2], 2)
      );
      distances.push(d);
    }
    
    let maxD = Math.max(...distances);
    if (maxD > 0) {
      for (let i = 0; i < 63; i++) {
        normalized[i] = normalized[i] / maxD;
      }
    }
    return normalized;
  };

  const normalizeFrame = (frame: number[]): number[] => {
    const lh = normalizeHand(frame.slice(0, 63));
    const rh = normalizeHand(frame.slice(63));
    return [...lh, ...rh];
  };

  const predictAlphabet = useCallback(
    async (frameData: number[]) => {
      if (!alphabetNetRef.current || isPredictingRef.current) return;
      isPredictingRef.current = true;
      const startTime = performance.now();

      const hasHands = frameData.some(val => val !== 0);
      if (!hasHands) {
        setLastPrediction('No sign detected');
        isPredictingRef.current = false;
        return;
      }

      const normalizedFrameData = normalizeFrame(frameData);
      const tensor = tf.tensor(normalizedFrameData);
      const expanded = tensor.expandDims(0);

      try {
        const scores = alphabetNetRef.current.predict(expanded) as tf.Tensor;
        const probabilities = await scores.data();
        let maxProbIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
        let maxProb = probabilities[maxProbIndex];
        let label = 'No confident prediction';

        // --- Smart Assist Mechanism for Alphabets ---
        const expectedSignKey = Object.keys(alphabetMap).find(key => alphabetMap[parseInt(key)].id === selectedSignIdRef.current);
        if (expectedSignKey) {
           const expectedSignObj = alphabetMap[parseInt(expectedSignKey)];
           const targetIndex = parseInt(expectedSignKey) - 1;
           
           // 1. Custom thresholds for extremely difficult or ambiguous signs
           const veryHardSignIds = [
             102, // C
             118, // S
             120, // U
             121, // V
           ];
           
           // Very lenient threshold (-0.1 triggers instantly) for hard signs, regular lenient threshold (0.15) for others
           const threshold = veryHardSignIds.includes(expectedSignObj.id) ? 0.10 : 0.25;
           
           let currentConfidence = probabilities[targetIndex];

           // If they hit the threshold, boost the specific target sign
           if (currentConfidence > threshold) {
               probabilities[targetIndex] += 0.50; // Huge boost to pass 0.45 threshold
               
               // Recalculate max after boost
               maxProbIndex = probabilities.indexOf(Math.max(...Array.from(probabilities)));
               maxProb = probabilities[maxProbIndex];
           }
        }
        // --------------------------------------------

        if (maxProb > 0.45) {
            label = alphabetMap[maxProbIndex + 1]?.name || 'Unknown';
        }

        // --- HARDCODED HEURISTIC CORRECTIONS FOR U / K / V ---
        if (label === 'U' || label === 'K' || label === 'V') {
            let activeHandData: number[] | null = null;
            if (normalizedFrameData.slice(63).some(v => v !== 0)) activeHandData = normalizedFrameData.slice(63);
            else if (normalizedFrameData.slice(0, 63).some(v => v !== 0)) activeHandData = normalizedFrameData.slice(0, 63);

            if (activeHandData) {
                const getDist = (hand: number[], p1: number, p2: number) => {
                    const dx = hand[p1*3] - hand[p2*3];
                    const dy = hand[p1*3+1] - hand[p2*3+1];
                    const dz = hand[p1*3+2] - hand[p2*3+2];
                    return Math.sqrt(dx*dx + dy*dy + dz*dz);
                };

                const indexMiddleDist = getDist(activeHandData, 8, 12);
                const thumbMiddleDist = getDist(activeHandData, 4, 10);
                
                // Fingers close together = U
                if (indexMiddleDist < 0.12) {
                    label = 'U';
                } else {
                    // Fingers apart = K or V
                    // In K, thumb touches middle finger (distance < 0.25)
                    if (thumbMiddleDist < 0.25) {
                        label = 'K';
                    } else {
                        label = 'V';
                    }
                }
            }
        }

        const endTime = performance.now();
        const latency = endTime - startTime;
        
        totalLatencyRef.current += latency;
        predictionCountRef.current++; if (speedWarningRef.current) { label = 'Moving too fast'; } else if (rangeWarningRef.current) { label = 'Out of range'; } setLastPrediction(label);

        tf.dispose([scores, tensor, expanded]);
      } catch (err) {
        console.error("Alphabet Prediction error:", err);
        tf.dispose([tensor, expanded]);
      } finally {
        isPredictingRef.current = false;
      }
    },
    [selectedSignIdRef]
  );

  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.setBackend('webgl');
        await tf.ready();
        console.log('TensorFlow.js ready');
        
        // Load all models concurrently to massively speed up initialization!
        const [loadedModel, loadedAlphabetModel, loadedEmotionModel] = await Promise.all([
          tf.loadLayersModel('/fsl/models/model.json'),
          tf.loadLayersModel('/fsl/models/alphabet_model/model.json').catch(e => {
            console.warn("Alphabet model not found. Proceeding without it.", e);
            return null;
          }),
          tf.loadLayersModel('/fsl/emotion_model/model.json').catch(e => {
            console.error("Emotion model failed:", e);
            setModelError("Emotion Model Error: " + (e instanceof Error ? e.message : String(e)));
            return null;
          })
        ]);
        console.log('Models loaded successfully');
        
        netRef.current = loadedModel;
        if (loadedAlphabetModel) alphabetNetRef.current = loadedAlphabetModel;
        if (loadedEmotionModel) emotionNetRef.current = loadedEmotionModel;
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Error loading model:', error);
        setModelError(error instanceof Error ? error.message : String(error));
        setIsModelLoaded(false);
      }
    };

    loadModel();
  }, []);
  
  const onResults = useCallback((model: any) => {
    setIsCameraReady(true);
    const video = webcamRef.current?.video;
    if (video?.readyState === 4 && webcamActive) {
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // Dispatch tracking results to the Spaceman VTuber custom event channel
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('vtuber-update', {
            detail: {
              poseLandmarks: model.poseLandmarks,
              leftHandLandmarks: model.leftHandLandmarks,
              rightHandLandmarks: model.rightHandLandmarks,
              faceLandmarks: model.faceLandmarks,
            },
          })
        );
      }

      if (canvasRef.current) {
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.clearRect(0, 0, videoWidth, videoHeight);
                                  ctx.drawImage(model.image, 0, 0, videoWidth, videoHeight);

            if (model.poseLandmarks) {
              drawConnectors(ctx, model.poseLandmarks, holistics.POSE_CONNECTIONS, { color: '#00F0FF', lineWidth: 2 });
              drawLandmarks(ctx, model.poseLandmarks, { color: '#FF007F', lineWidth: 1, radius: 2 });
            }
            
            if (model.leftHandLandmarks) {
              drawConnectors(ctx, model.leftHandLandmarks, holistics.HAND_CONNECTIONS, { color: '#39FF14', lineWidth: 3 });
              drawLandmarks(ctx, model.leftHandLandmarks, { color: '#00F0FF', lineWidth: 1, radius: 2 });
            }
  
            if (model.rightHandLandmarks) {
              drawConnectors(ctx, model.rightHandLandmarks, holistics.HAND_CONNECTIONS, { color: '#FF007F', lineWidth: 3 });
              drawLandmarks(ctx, model.rightHandLandmarks, { color: '#39FF14', lineWidth: 1, radius: 2 });
            }
  
            if (model.faceLandmarks) {
              drawConnectors(ctx, model.faceLandmarks, holistics.FACEMESH_LIPS, { color: '#FF0000', lineWidth: 2 });
              drawConnectors(ctx, model.faceLandmarks, holistics.FACEMESH_LEFT_EYEBROW, { color: '#FFFF00', lineWidth: 2 });
              drawConnectors(ctx, model.faceLandmarks, holistics.FACEMESH_RIGHT_EYEBROW, { color: '#FFFF00', lineWidth: 2 });
            }

            let lh = new Array(21 * 3).fill(0);
            if (model.leftHandLandmarks) {
              lh = model.leftHandLandmarks.flatMap((l: any) => [l.x, l.y, l.z]);
              lastLeftHandRef.current = lh;
              consecutiveLostLeftRef.current = 0;
            } else {
              consecutiveLostLeftRef.current++;
              if (consecutiveLostLeftRef.current < 5) {
                lh = lastLeftHandRef.current;
              } else {
                lh = new Array(21 * 3).fill(0);
                lastLeftHandRef.current = lh;
              }
            }

            let rh = new Array(21 * 3).fill(0);
            if (model.rightHandLandmarks) {
              rh = model.rightHandLandmarks.flatMap((l: any) => [l.x, l.y, l.z]);
              lastRightHandRef.current = rh;
              consecutiveLostRightRef.current = 0;
            } else {
              consecutiveLostRightRef.current++;
              if (consecutiveLostRightRef.current < 5) {
                rh = lastRightHandRef.current;
              } else {
                rh = new Array(21 * 3).fill(0);
                lastRightHandRef.current = rh;
              }
            }

            const frameData = [...lh, ...rh];
          
                                  let newRangeWarning: 'too close' | 'too far' | 'no user' | null = null;
            if (model.poseLandmarks && model.poseLandmarks.length > 0 && model.poseLandmarks[0].visibility > 0.2) {
              const leftShoulder = model.poseLandmarks[11];
              const rightShoulder = model.poseLandmarks[12];
              if (leftShoulder && rightShoulder && leftShoulder.visibility > 0.5 && rightShoulder.visibility > 0.5) {
                const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
                if (shoulderWidth > 0.55) {
                  newRangeWarning = 'too close';
                } else if (shoulderWidth < 0.30) {
                  newRangeWarning = 'too far';
                }
              }
            } else {
              newRangeWarning = 'no user';
            }

            const now = Date.now();
            if (newRangeWarning) {
              (lastWristPosRef.current as any).rangeWarningUntil = now + 2500;
              (lastWristPosRef.current as any).lingeringRangeWarning = newRangeWarning;
            }
            
            if ((lastWristPosRef.current as any).rangeWarningUntil && now < (lastWristPosRef.current as any).rangeWarningUntil) {
              newRangeWarning = (lastWristPosRef.current as any).lingeringRangeWarning;
            } else {
              newRangeWarning = null;
            }

            if (newRangeWarning !== rangeWarningRef.current) {
              rangeWarningRef.current = newRangeWarning;
              setRangeWarning(newRangeWarning);
              }

            const timeDiff = now - lastWristPosRef.current.time;
          if (timeDiff > 0 && timeDiff < 1000) {
            let isTooFast = false;
            const calculateSpeed = (currentPos: any, lastPos: any) => {
              if (!currentPos || !lastPos) return 0;
              const dist = Math.sqrt(Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2));
              return dist / timeDiff;
            };

                                    const leftWrist = (model.poseLandmarks && model.poseLandmarks[15].visibility > 0.6) ? model.poseLandmarks[15] : null;
            const rightWrist = (model.poseLandmarks && model.poseLandmarks[16].visibility > 0.6) ? model.poseLandmarks[16] : null;

            if (leftWrist && lastWristPosRef.current.left) {
              if (calculateSpeed(leftWrist, lastWristPosRef.current.left) > 0.002) isTooFast = true; 
            }
            if (rightWrist && lastWristPosRef.current.right) {
              if (calculateSpeed(rightWrist, lastWristPosRef.current.right) > 0.002) isTooFast = true;
            }

            if (isTooFast) {
              fastFramesRef.current += 2;
            } else {
              fastFramesRef.current = Math.max(0, fastFramesRef.current - 1);
            }

            if (fastFramesRef.current > 4) {
              (lastWristPosRef.current as any).penaltyUntil = now + 2500;
              fastFramesRef.current = 0;
            }

            const newSpeedWarning = ((lastWristPosRef.current as any).penaltyUntil && now < (lastWristPosRef.current as any).penaltyUntil) || false;
            if (newSpeedWarning !== speedWarningRef.current) {
              speedWarningRef.current = newSpeedWarning;
              setSpeedWarning(newSpeedWarning);
            }
            
            lastWristPosRef.current = { ...lastWristPosRef.current, left: leftWrist ? { x: leftWrist.x, y: leftWrist.y } : null, right: rightWrist ? { x: rightWrist.x, y: rightWrist.y } : null, time: now };
          } else {
            lastWristPosRef.current.time = now;
          }

          // --- Emotion Prediction for Game Mode ---
          const smode = sessionModeRef.current;
          const sstep = gameStepRef.current;
          
          if (smode === 'game') {
            if (model.faceLandmarks && emotionNetRef.current) {
              // Heuristic Emotion Detection using FaceMesh Landmarks
              const lm = model.faceLandmarks;
              
              // Helper to calculate euclidean distance
              const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
              
              const faceWidth = dist(lm[234], lm[454]);
              const faceHeight = dist(lm[10], lm[152]);
              
              const mouthCenterY = (lm[13].y + lm[14].y) / 2;
              const mouthCornersY = (lm[61].y + lm[291].y) / 2;
              const normSmileCurve = (mouthCenterY - mouthCornersY) / faceHeight; 

              const leftBrowEyeDist = dist(lm[107], lm[159]);
              const rightBrowEyeDist = dist(lm[336], lm[386]);
              const normBrowEyeDist = (leftBrowEyeDist + rightBrowEyeDist) / (2 * faceHeight);
              const innerBrowDist = dist(lm[107], lm[336]) / faceWidth;

              let happy = 0, sad = 0, neutral = 100;
              
              if (normSmileCurve > 0.01) {
                  happy += (normSmileCurve - 0.01) * 20000;
              }
              if (normSmileCurve < -0.005) {
                  sad += (-0.005 - normSmileCurve) * 20000;
              }

              const total = happy + sad + neutral;
              const probsArray = [happy/total, sad/total, neutral/total];
              
              const emotions = ['happy', 'sad', 'neutral'];
              let maxProbIndex = probsArray.indexOf(Math.max(...probsArray));
              let kerasEmotion = emotions[maxProbIndex];
              
              emotionCountsRef.current[kerasEmotion] = (emotionCountsRef.current[kerasEmotion] || 0) + 1;
              const historyTotal = Object.values(emotionCountsRef.current).reduce((a, b) => a + b, 0);
              if (historyTotal >= 15) {
                const mostFrequent = Object.entries(emotionCountsRef.current).sort((a, b) => b[1] - a[1])[0][0];
                setLastEmotionPrediction(mostFrequent);
                emotionCountsRef.current = {};
              }
            }
          }

          // --- Kinect Controller Logic for Game Mode ---
          if (smode === 'game' && (sstep === 'question' || sstep === 'wrong')) {
            const cursor = document.getElementById('kinect-cursor');
            const cursorProgress = document.getElementById('kinect-cursor-progress');
            const activeHand = model.rightHandLandmarks || model.leftHandLandmarks;
            
            if (activeHand && activeHand[8] && cursor && cursorProgress) {
              cursor.style.opacity = '1';
              
              // Map 0-1 to screen. Webcam is mirrored via CSS, so invert X.
              let rawX = 1 - activeHand[8].x;
              let rawY = activeHand[8].y;
              
              // Expand active zone so user doesn't have to reach extreme edges of camera
              rawX = (rawX - 0.2) / 0.6;
              rawY = (rawY - 0.2) / 0.6;
              rawX = Math.max(0, Math.min(1, rawX));
              rawY = Math.max(0, Math.min(1, rawY));
              
              const screenX = rawX * window.innerWidth;
              const screenY = rawY * window.innerHeight;
              
              cursor.style.transform = `translate(${screenX - 24}px, ${screenY - 24}px)`; // 24 is half cursor size
              
              // Hit test with A, B, C options
              let hoveringOpt: string | null = null;
              ['A', 'B', 'C'].forEach(opt => {
                const el = document.getElementById(`game-option-${opt}`);
                if (el) {
                  const rect = el.getBoundingClientRect();
                  if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
                    hoveringOpt = opt;
                  }
                }
              });
              
              if (hoveringOpt) {
                if (!kinectHoverRef.current || kinectHoverRef.current.opt !== hoveringOpt) {
                  kinectHoverRef.current = { opt: hoveringOpt, time: performance.now() };
                } else {
                  const hoverTime = performance.now() - kinectHoverRef.current.time;
                  const progress = Math.min(100, (hoverTime / 1500) * 100);
                  cursorProgress.style.transform = `scale(${progress / 100})`;
                  
                  if (hoverTime >= 1500) {
                    // Trigger selection
                    setLastPrediction(hoveringOpt);
                    kinectHoverRef.current = null;
                    cursorProgress.style.transform = 'scale(0)';
                  }
                }
              } else {
                kinectHoverRef.current = null;
                cursorProgress.style.transform = 'scale(0)';
              }
            } else if (cursor) {
              cursor.style.opacity = '0';
              kinectHoverRef.current = null;
            }
          } else {
            // Hide cursor when not in question mode
            const cursor = document.getElementById('kinect-cursor');
            if (cursor) cursor.style.opacity = '0';

            // --- Normal FSL AI Prediction ---
            if (recognitionModeRef.current === 'gestures') {
              framesDataRef.current.push(frameData);
              if (framesDataRef.current.length > FRAMES_PER_PREDICTION) {
                framesDataRef.current.shift();
              }
  
              frameCountRef.current++;
              if (framesDataRef.current.length === FRAMES_PER_PREDICTION && frameCountRef.current % 4 === 0) {
                predictSign(framesDataRef.current, videoWidth, videoHeight);
              }
            } else {
              frameCountRef.current++;
              if (frameCountRef.current % 4 === 0) {
                predictAlphabet(frameData);
              }
            }
          }

          ctx.restore();
        }
      }
    }
  }, [predictSign, predictAlphabet, webcamActive]);

  useEffect(() => {
    if (!webcamActive || !isWebcamVideoReady) return;

    let holistic = globalHolistic_v3;
    if (!holistic) {
      holistic = new holistics.Holistic({
        locateFile: (file) => `/fsl/holistic/${file}`
      });
      globalHolistic_v3 = holistic;
    }

    // Always update options to ensure hot-reload applies them
    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      refineFaceLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    holistic.onResults(onResults);

    let camera: cam.Camera | null = null;

    if (typeof window !== 'undefined' && webcamRef.current && webcamRef.current.video) {
      camera = new cam.Camera(webcamRef.current.video, {
        onFrame: async () => {
          if (webcamRef.current && webcamRef.current.video && webcamActive) {
            try { await holistic.send({ image: webcamRef.current.video }); } catch (e) { console.error('MediaPipe error:', e); }
          }
        },
        width: 640,
        height: 480
      });
      camera.start();
    }

    return () => {
      if (camera) {
        camera.stop();
      }
      // Note: We do not call holistic.close() here because it is a global singleton
      // and will be reused on subsequent mounts/hot-reloads.
    };
  }, [onResults, webcamActive, isWebcamVideoReady]);

  // Selected sign details
  const selectedSign = [...Object.values(labelMap), ...Object.values(alphabetMap)].find(s => s.id === selectedSignId);

  // Game Mode Logic
  useEffect(() => {
    if (sessionMode === 'game' && gameStep === 'question') {
      setRecognitionMode('alphabets');
    } else if (sessionMode === 'spelling') {
      setRecognitionMode('alphabets');
    }
  }, [sessionMode, gameStep]);

  // Spelling Mode Progression Logic
  useEffect(() => {
    if (sessionMode !== 'spelling' || spellingShowGameOver || !currentSpellingWord) return;

    const currentLetterToSpell = currentSpellingWord[spellingProgressIndex];

    // Ensure Smart Assist Mechanism knows what we are looking for
    const targetSignObj = Object.values(alphabetMap).find(s => s.name.toUpperCase() === currentLetterToSpell);
    if (targetSignObj && targetSignObj.id !== selectedSignIdRef.current) {
      setSelectedSignId(targetSignObj.id);
    }

    if (lastPrediction && lastPrediction.toUpperCase() === currentLetterToSpell && !isTransitioningRef.current && !spellingWordCompleted) {
      isTransitioningRef.current = true;

      // Log individual letter progress
      if (activeUser) {
        const playingStudentId = activeStudentId || (studentsList.length > 0 ? studentsList[0].id : null);
        if (playingStudentId) {
          fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentId: playingStudentId,
              category: currentLetterToSpell,
                score: 1,
            }),
          }).catch((err) => console.error('Error logging letter progress:', err));
        }
      }

      // They got the letter right
      setTimeout(() => { setLastPrediction('No sign detected'); if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('vtuber-correct-gesture')); } if (spellingProgressIndex + 1 >= currentSpellingWord.length) {
          // Word completed
          setSpellingWordCompleted(true);
          setSpellingScore(prev => prev + 1);

          // Award 1 point immediately
          if (activeUser) {
            const playingStudentId = activeStudentId || (studentsList.length > 0 ? studentsList[0].id : null);
            if (playingStudentId) {
              const processSpellingUpdates = async () => {
                try {
                  // Instant Optimistic UI Update
                  setStudentsList(prev => prev.map(s => s.id === playingStudentId ? { ...s, points: (s.points || 0) + 1, lastMode: 'Spelling Game' } : s));
                  
                  if (currentSpellingWord) {
                     await fetch('/api/progress', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({
                         studentId: playingStudentId,
                         category: 'SPELLING_WORD_' + currentSpellingWord,
                         score: 0,
                       }),
                     }).catch(e => console.error(e));
                  }

                  await fetch('/api/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      studentId: playingStudentId,
                      category: 'SPELLING_MASTER',
                      score: 1,
                    }),
                  }).catch(e => console.error(e));
                  
                  fetchProgress().catch(e => console.error(e));
                } catch (e) {
                  console.error(e);
                }
              };
              processSpellingUpdates();
            }
          }

          // Wait 2 seconds for TAMA popup, then proceed to next word
          setTimeout(() => {
            setSpellingWordCompleted(false);
            setSpellingProgressIndex(0);
            
            if (spellingCurrentWordIndex + 1 >= 5) {
               setIsSavingProgress(true);
               setTimeout(() => {
                 setIsSavingProgress(false);
                 setSpellingShowGameOver(true);
                  setWebcamEnabledByUser(false);
                 const playedStd2 = studentsList.find(s => s.id === activeStudentId);
                 if (playedStd2) logTeacherActivity(playedStd2.name, playedStd2.emoji, 'PLAY', 'Spelling Game');
               }, 2000);
            } else {
               setSpellingCurrentWordIndex(prev => prev + 1);
            }
            isTransitioningRef.current = false; }, 2500);
        } else {
          // Next letter
          setSpellingProgressIndex(prev => prev + 1);
          isTransitioningRef.current = false;
          }
        }, 2500);
    }
  }, [lastPrediction, sessionMode, currentSpellingWord, spellingProgressIndex, spellingShowGameOver, activeUser, activeStudentId, studentsList, spellingWordCompleted]);

  useEffect(() => {
    if (sessionMode !== 'game' || !currentQuestion) return;

    if (gameStep === 'question' || gameStep === 'wrong') {
      if ((lastPrediction === 'A' || lastPrediction === 'B' || lastPrediction === 'C') && !isTransitioningRef.current) {
        isTransitioningRef.current = true;
        const choice = lastPrediction as 'A' | 'B' | 'C';
        setGameSelectedAnswer(choice);
        
        if (choice === currentQuestion.correctAnswer) {
          setGameStep('correct');
          setTimeout(() => {
            setLastPrediction('No sign detected'); setGameStep('practice');
            const targetSignId = currentQuestion.options[currentQuestion.correctAnswer].signId;
            setSelectedSignId(targetSignId);
            // Switch recognition mode based on the target sign category
            const signObj = [...Object.values(labelMap), ...Object.values(alphabetMap)].find(s => s.id === targetSignId);
            if (signObj) {
              setRecognitionMode(signObj.category === 'ALPHABET' ? 'alphabets' : 'gestures');
            }
            isTransitioningRef.current = false; }, 2500);
        } else {
          setHasMadeMistakeOnCurrentQuestion(true);
          setGameStep('wrong');
          setTimeout(() => {
            setLastPrediction('No sign detected');
            setGameStep('question');
            setGameSelectedAnswer(null);
            isTransitioningRef.current = false; }, 2500);
        }
      }
    } else if (gameStep === 'practice') {
      const rqExp = currentQuestion.requiredExpression;
      const emotionMatches = !rqExp || lastEmotionPrediction === rqExp;

      if (selectedSign && lastPrediction === selectedSign.name && !isTransitioningRef.current) {
          if (!emotionMatches) {
            const now = Date.now();
            if (now - lastHintTimeRef.current > 3000) {
              lastHintTimeRef.current = now;
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('vtuber-emotion-hint', { detail: { emotion: rqExp } }));
              }
            }
          } else {
          isTransitioningRef.current = true;
          
          if (!hasAwardedPointsRef.current) {
            hasAwardedPointsRef.current = true;
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('vtuber-correct-gesture'));
            if (activeUser) {
              const playingStudentId = activeStudentId || (studentsList.length > 0 ? studentsList[0].id : null);
              if (playingStudentId) {
                const earnedScore = hasMadeMistakeOnCurrentQuestion ? 1 : 2;
                setStudentsList(prev => prev.map(s => s.id === playingStudentId ? { ...s, points: (s.points || 0) + earnedScore, lastMode: 'Situational Game' } : s));
                const processDbUpdates = async () => {
                  try {
                    await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `Practice: ${selectedSign.name}`, teacherId: activeUser.id, studentId: playingStudentId, accuracy: 100.0, predictions: [selectedSign.name] }) });
                    if (currentQuestion && currentQuestion.id) {
                      await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: playingStudentId, category: 'QUESTION_' + currentQuestion.id, score: 0 }) }).catch(e => console.error(e));
                    }
                    await fetch('/api/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ studentId: playingStudentId, category: selectedSign.name, score: earnedScore }) }).catch(e => console.error(e));
                    fetchProgress().catch(e => console.error(e));
                  } catch (e) {
                    console.error('Error updating DB progress/sessions:', e);
                  }
                };
                processDbUpdates();
              }
            }
          }

          // Move to next question after doing it right
          setTimeout(() => {
          setLastPrediction('No sign detected');
          
          if (questionsCompleted + 1 >= 5) {
            setIsSavingProgress(true);
            setTimeout(() => {
              setIsSavingProgress(false);
              setShowGameOver(true);
                setWebcamEnabledByUser(false);
              const playedStd = studentsList.find(s => s.id === activeStudentId);
              if (playedStd) logTeacherActivity(playedStd.name, playedStd.emoji, 'PLAY', 'Situational Game');
            }, 2000);
          } else {
            setQuestionsCompleted((prev) => prev + 1);
            setCurrentQuestionIndex((prev) => (prev + 1) % filteredGameQuestions.length);
            setHasMadeMistakeOnCurrentQuestion(false);
            setGameStep('question');
            setGameSelectedAnswer(null);
            setRecognitionMode('alphabets'); // Force alphabet mode for A/B/C answering
          }
          isTransitioningRef.current = false; }, 2500);
        }
      }
    }
  }, [lastPrediction, lastEmotionPrediction, sessionMode, gameStep, currentQuestion, selectedSign, activeUser, studentsList, activeStudentId, hasMadeMistakeOnCurrentQuestion]);


  // Trigger mascot correct-gesture animation & record practice session to PostgreSQL
  const lastLoggedRef = useRef<{ signId: number, timestamp: number } | null>(null);
  const hasAwardedPointsRef = useRef<boolean>(false);
  const sessionPointsEarnedRef = useRef<number>(0);

  useEffect(() => {
    if (gameStep === 'question') {
      hasAwardedPointsRef.current = false;
    }
  }, [gameStep]);

  useEffect(() => {
    if (sessionMode === 'game') return;

    if (selectedSign && lastPrediction === selectedSign.name) {
      const now = Date.now();
      if (lastLoggedRef.current && lastLoggedRef.current.signId === selectedSign.id && (now - lastLoggedRef.current.timestamp) < 5000) {
        return; // Prevent duplicate points for the same sign within 5 seconds in Sandbox/Spelling
      }
      lastLoggedRef.current = { signId: selectedSign.id, timestamp: now };

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vtuber-correct-gesture'));
      }

      // Record completed practice session in DB
      if (activeUser) {
        const playingStudentId = activeStudentId || (studentsList.length > 0 ? studentsList[0].id : null);
        
        const processDbUpdates = async () => {
          try {
            await fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: `Practice: ${selectedSign.name}`,
                teacherId: activeUser.id,
                studentId: playingStudentId,
                accuracy: 100.0,
                predictions: [selectedSign.name],
              }),
            });
          } catch (e) {
            console.error('Error updating DB progress/sessions:', e);
          }
        };

        processDbUpdates();
      }
    }
  }, [lastPrediction, sessionMode, selectedSign, activeUser, activeStudentId, studentsList]);

  const categories = recognitionMode === 'gestures'
    ? ['ALL', 'GREETING', 'EVERYDAY', 'DAYS', 'FAMILY']
    : ['ALPHABET'];

  const allSigns = recognitionMode === 'gestures'
    ? [...Object.values(labelMap)]
    : [...Object.values(alphabetMap)];

  // Filtered signs list
  const filteredSigns = allSigns.filter(sign => {
    const matchesSearch = sign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || sign.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Reset selected category and sign when switching modes
  useEffect(() => {
    if (sessionMode !== 'sandbox') return;
    if (recognitionMode === 'alphabets') {
      setSelectedCategory('ALPHABET');
      setSelectedSignId(Object.values(alphabetMap)[0].id);
    } else if (recognitionMode === 'gestures') {
      if (selectedCategory === 'ALPHABET') {
        setSelectedCategory('ALL');
      }
      setSelectedSignId(Object.values(labelMap)[0].id);
    }
  }, [recognitionMode, sessionMode]);

  // Handle Login transitions
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthLoading(true);

    try {
      const emailOrUsername = currentView === 'admin-login' ? usernameInput : emailInput;
      const role = currentView === 'admin-login' ? 'admin' : 'guro';

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrUsername, password: passwordInput, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresVerification) {
          setPendingEmail(data.email || emailOrUsername);
          setAuthError(data.error || 'You need to verify your email first.');
          setCurrentView('verify-email');
          return;
        }
        throw new Error(data.error || 'May naganap na error sa pag-connect sa server.');
      }

      setActiveUser(data.user);
      localStorage.setItem('signo_active_user', JSON.stringify(data.user));
      setUserRole(data.user.role.toLowerCase() === 'admin' ? 'admin' : 'guro');
      setCurrentView('dashboard-home');
      
      // Clear forms
      setPasswordInput('');
      setEmailInput('');
      setUsernameInput('');
    } catch (err: any) {
      setAuthError(err.message || 'Incorrectng credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLoginSuccess = async (credentialResponse: any) => {
    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthLoading(true);

    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresVerification) {
          setPendingEmail(data.email);
          setAuthError(data.error || 'You need to verify your email first.');
          setCurrentView('verify-email');
          return;
        }
        throw new Error(data.error || 'May naganap na error sa pag-connect sa server.');
      }

      setActiveUser(data.user);
      localStorage.setItem('signo_active_user', JSON.stringify(data.user));
      setUserRole(data.user.role.toLowerCase() === 'admin' ? 'admin' : 'guro');
      setCurrentView('dashboard-home');
      
      // Clear forms
      setPasswordInput('');
      setEmailInput('');
      setUsernameInput('');
    } catch (err: any) {
      setAuthError(err.message || 'Error sa pag-login gamit ang Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (passwordInput !== confirmPasswordInput) {
      setAuthError('Hindi nagtutugma ang password at confirm password!');
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput,
          password: passwordInput,
          name: fullNameInput,
          school: 'Philippine School For the Deaf - Pasay',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Hindi makakonekta sa server.');
      }

      setPendingEmail(emailInput);
      setAuthSuccessMsg('Matagumpay na rehistrasyon! Naipadala na ang 6-digit Google verification code sa iyong email.');
      setAuthError(null);
      setOtpInput('');
      
      // Clear password fields and switch to verification view
      setFullNameInput('');
      setEmailInput('');
      setPasswordInput('');
      setConfirmPasswordInput('');
      setCurrentView('verify-email');
    } catch (err: any) {
      setAuthError(err.message || 'May error sa pagrehistro.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!otpInput || otpInput.trim().length !== 6) {
      setAuthError('Pakilagay ang 6-digit verification code.');
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail,
          code: otpInput.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Incorrectng verification code.');
      }

      setActiveUser(data.user);
      localStorage.setItem('signo_active_user', JSON.stringify(data.user));
      setUserRole(data.user.role.toLowerCase() === 'admin' ? 'admin' : 'guro');
      setCurrentView('dashboard-home');
      setOtpInput('');
      setPendingEmail('');
    } catch (err: any) {
      setAuthError(err.message || 'May error sa pag-verify ng code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendOtpSubmit = async () => {
    if (resendCooldown > 0 || !pendingEmail) return;
    setAuthError(null);
    setAuthSuccessMsg(null);
    setAuthLoading(true);

    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Hindi maipadala ang verification code.');
      }

      setAuthSuccessMsg('Bagong verification code ang naipadala sa iyong email!');
      setResendCooldown(30);
    } catch (err: any) {
      setAuthError(err.message || 'May error sa pagpapadala ng verification code.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!emailInput || !emailInput.trim()) {
      setAuthError('Pakilagay ang iyong rehistradong email address.');
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Hindi makakonekta sa server.');
      }

      setPendingEmail(emailInput.trim());
      setForgotPasswordStep('otp');
      setAuthSuccessMsg(data.message || 'Naipadala na ang password reset code sa iyong email!');
      setResetOtpInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
    } catch (err: any) {
      setAuthError(err.message || 'May error sa paghiling ng password reset.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!resetOtpInput || resetOtpInput.trim().length !== 6) {
      setAuthError('Pakilagay ang 6-digit reset code.');
      return;
    }

    if (newPasswordInput !== confirmNewPasswordInput) {
      setAuthError('Hindi nagtutugma ang bagong password at confirm password!');
      return;
    }

    if (newPasswordInput.length < 6) {
      setAuthError('Ang bagong password ay dapat hindi bababa sa 6 characters.');
      return;
    }

    setAuthLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail || emailInput,
          code: resetOtpInput.trim(),
          newPassword: newPasswordInput,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'May error sa pag-reset ng password.');
      }

      setAuthSuccessMsg(data.message || 'Matagumpay na nabago ang iyong password! Maaari ka nang mag-login.');
      setAuthError(null);

      // Reset forms & return to teacher login
      setEmailInput('');
      setPasswordInput('');
      setResetOtpInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
      setForgotPasswordStep('email');
      setCurrentView('teacher-login');
    } catch (err: any) {
      setAuthError(err.message || 'May error sa pag-reset ng password.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Edit a Student in PostgreSQL Database
  const handleEditStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentName.trim() || !selectedProfileStudent) return;
    
    try {
      const response = await fetch('/api/students', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProfileStudent.id,
          name: editStudentName.trim(),
          grade: editStudentGrade,
          emoji: editStudentEmoji,
        }),
      });

      const data = await response.json();
      if (response.ok && data.student) {
        setStudentsList(prev => prev.map(s => s.id === selectedProfileStudent.id ? data.student : s));
        setSelectedProfileStudent(data.student);
        setIsEditingProfile(false);
        showToast('Profile updated successfully!');
        logTeacherActivity(editStudentName.trim(), editStudentEmoji, 'EDIT');
      } else {
        alert('Failed to edit student: ' + data.error);
      }
    } catch (err) {
      console.error('Error editing student:', err);
    }
  };

  // Add a Student to PostgreSQL Database
  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || isAddingStudent) return;
    if (studentsList.some(s => s.name.trim().toLowerCase() === newStudentName.trim().toLowerCase())) {
      alert('A student with this name already exists in your class!');
      return;
    }
    setIsAddingStudent(true);
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudentName.trim(),
          grade: newStudentGrade,
          teacherId: activeUser?.id || '',
          points: parseInt(newStudentPoints, 10) || 0,
          emoji: newStudentEmoji,
        }),
      });

      const data = await response.json();
      if (response.ok && data.student) {
        setStudentsList(prev => [data.student, ...prev]);
      } else {
        const newStudent = {
          id: String(Date.now()),
          name: newStudentName,
          grade: newStudentGrade,
          points: parseInt(newStudentPoints, 10) || 0,
          emoji: newStudentEmoji,
        };
        setStudentsList(prev => [newStudent, ...prev]);
      }
    } catch (err) {
      console.error('Error adding student:', err);
    }
    
    setIsAddStudentOpen(false);
    setNewStudentName('');
    setNewStudentGrade('Grade 1');
    setNewStudentPoints('0');
    setNewStudentEmoji('👧');
    showToast('Successfully added student!');
      logTeacherActivity(newStudentName.trim(), newStudentEmoji, 'ADD');
  };

  // Delete a student from PostgreSQL Database
  const confirmDeleteStudent = async () => {
    if (!studentIdToDelete) return;

    try {
      await fetch(`/api/students?id=${studentIdToDelete}`, { method: 'DELETE' });
      fetchProgress(); // Immediately refresh progress so their data disappears from the Progress Tab
    } catch (err) {
      console.error('Error deleting student from DB:', err);
    }
    setStudentsList(prev => prev.filter(s => s.id !== studentIdToDelete));
    setStudentIdToDelete(null);
    showToast('Student deleted successfully.');
      const deletedStudent = studentsList.find(s => s.id === studentIdToDelete);
      if (deletedStudent) logTeacherActivity(deletedStudent.name, deletedStudent.emoji, 'DELETE');
  };

  // Dynamically calculate the header banner text
  let headerText = "Signo Dashboard";
  if (currentView === 'dashboard-home') {
    headerText = `Good Day, ${activeUser ? activeUser.name : (userRole === 'admin' ? 'Admin' : 'Guro')}!`;
  } else {
    if (userRole === 'admin') {
      if (currentView === 'dashboard-guro') {
        headerText = "Pamamahala ng Mga Guro";
      } else if (currentView === 'dashboard-analytics') {
        headerText = "Analytics ng Sistema";
      } else if (currentView === 'dashboard-logs') {
        headerText = "Logs at Monitoring";
      }
    } else {
      if (currentView === 'dashboard-students') {
        headerText = "Students";
      } else if (currentView === 'dashboard-sesyon' || currentView === 'dashboard-sandbox') {
        headerText = "Signo Practice Session";
      } else if (currentView === 'dashboard-game') {
        headerText = "Situational Game";
      } else if (currentView === 'dashboard-spelling') {
        headerText = "Spelling Game";
      } else if (currentView === 'dashboard-progress') {
        headerText = "Progreso ng Klase";
      }
    }
  }

  // --- Navigation Logic ---
  const handleNavClick = (view: any) => {
    const isPlayingSession = ['dashboard-sandbox', 'dashboard-game', 'dashboard-spelling'].includes(currentView);
    if (isPlayingSession && view !== currentView) {
      setNavConfirmTab(view);
    } else {
      setCurrentView(view);
    }
  };

  // --- Sub-Render Functions for Dashboard Tabs ---

  const renderHomeView = () => {
    const avgPointsPercentage = studentsList.length > 0
      ? `${Math.round(studentsList.reduce((acc: number, curr: any) => acc + (curr.points || 0), 0) / studentsList.length)}%`
      : '0%';

    // Daily 24h Filtered Session Calculation (Resets every 24 hours)
    const todayDateStr = new Date().toDateString();
    const todayDbRecords = dbProgressRecords.filter((r: any) => {
      if (!r.createdAt && !r.updatedAt) return false;
      
      // Filter out milestone trackers so we only count actual physical signs/letters
      if (r.category && typeof r.category === 'string') {
        if (
          r.category.startsWith('QUESTION_') || 
          r.category.startsWith('SPELLING_WORD_') || 
          r.category === 'SPELLING_MASTER'
        ) {
          return false;
        }
      }
      
      const recordDate = new Date(r.createdAt || r.updatedAt).toDateString();
      return recordDate === todayDateStr;
    });

    const totalSessionsCount = todayDbRecords.length;

    return (
      <div className="flex flex-col space-y-6">
        {/* Top Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Students — Teal/Cyan */}
          <div className="bg-gradient-to-br from-[#0e7490] to-[#164e63] backdrop-blur-sm border border-cyan-400/50 rounded-3xl p-10 flex items-center space-x-4 shadow-[0_0_30px_rgba(34,211,238,0.5)] relative overflow-hidden text-left">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(34,211,238,0.15),transparent_70%)] pointer-events-none" />
            <div className="text-4xl bg-cyan-300/20 w-16 h-16 rounded-2xl border border-cyan-300/40 flex items-center justify-center shadow-inner flex-shrink-0">
              👧
            </div>
            <div>
              <div className="text-4xl font-black text-white drop-shadow">{studentsList.length}</div>
              <div className="text-sm font-semibold text-cyan-200">Students</div>
            </div>
          </div>
          
          {/* Card 2: Avg. Points — Amber/Gold */}
          <div className="bg-gradient-to-br from-[#b45309] to-[#78350f] backdrop-blur-sm border border-amber-400/50 rounded-3xl p-10 flex items-center space-x-4 shadow-[0_0_30px_rgba(251,191,36,0.5)] relative overflow-hidden text-left">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,191,36,0.15),transparent_70%)] pointer-events-none" />
            <div className="text-4xl bg-amber-300/20 w-16 h-16 rounded-2xl border border-amber-300/40 flex items-center justify-center shadow-inner flex-shrink-0">
              ✨
            </div>
            <div>
              <div className="text-4xl font-black text-white drop-shadow">
                {avgPointsPercentage}
              </div>
              <div className="text-sm font-semibold text-amber-200 font-sans">Avg. Points</div>
            </div>
          </div>
          
          {/* Card 3: Total Sessions — Rose/Pink */}
          <div className="bg-gradient-to-br from-[#9f1239] to-[#500724] backdrop-blur-sm border border-rose-400/30 rounded-3xl p-6 flex items-center space-x-4 shadow-xl shadow-rose-900/40 relative overflow-hidden text-left">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(251,113,133,0.15),transparent_70%)] pointer-events-none" />
            <div className="text-4xl bg-rose-300/20 w-16 h-16 rounded-2xl border border-rose-300/40 flex items-center justify-center shadow-inner flex-shrink-0">
              ⏱️
            </div>
            <div>
              <div className="text-4xl font-black text-white drop-shadow">{totalSessionsCount}</div>
              <div className="text-sm font-semibold text-rose-200 font-sans flex items-center space-x-1">
                <span>Signs Practiced Today</span>
                <span className="text-[10px] text-rose-300/80 font-normal">(24h Reset)</span>
              </div>
            </div>
          </div>
        </div>

      {/* Bottom Row: Recent Activities & Dynamic Sign of the Day */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Activities */}
        <div className="lg:col-span-3 bg-slate-900/90 backdrop-blur-sm border border-cyan-500/40 rounded-3xl p-8 shadow-[0_0_25px_rgba(6,182,212,0.4)] text-left">
          <div className="flex items-center space-x-2 text-lg font-black text-white mb-4 pb-2 border-b border-cyan-500/30">
            <span className="text-2xl">💡</span>
            <h2>Recent Activities</h2>
          </div>
          
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-purple-500 hover:scrollbar-thumb-fuchsia-400">
            {teacherActivities.length > 0 ? teacherActivities.map((act, i) => (
                <div key={act.id + i} className="bg-slate-800/60 border border-cyan-500/30 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-3.5">
                    <div className="text-3xl bg-amber-400/10 w-12 h-12 rounded-xl border border-amber-400/20 flex items-center justify-center">
                      {act.emoji}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base">{act.name}</h4>
                      <p className="text-xs text-cyan-300 font-sans">
                        {act.type === 'ADD' ? 'Added new student' : act.type === 'EDIT' ? 'Updated profile' : act.type === 'DELETE' ? 'Deleted student' : `Played ${act.mode || 'session'}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-cyan-300 font-sans font-medium">{getTimeAgo(act.timestamp || Date.now())}</span>
                </div>
              )) : (
                <p className="text-cyan-400 text-sm font-sans font-medium text-center py-4">No recent activities. Add students to see tracking!</p>
              )}
          </div>
        </div>

        {/* Dynamic Sign of the Day */}
        <div className="lg:col-span-2 bg-slate-900/90 backdrop-blur-sm border border-fuchsia-500/40 rounded-3xl p-8 shadow-[0_0_25px_rgba(217,70,239,0.4)] flex flex-col items-center justify-between text-center min-h-[320px] h-fit">
          <div className="flex items-center justify-between w-full border-b border-fuchsia-500/30 pb-3 mb-2">
            <h2 className="text-lg font-black text-white tracking-wide">Sign of the Day</h2>
            {signOfTheDay && (
              <span className={`text-xs font-black px-3 py-1 rounded-full border uppercase tracking-wider ${
                categoryColors[signOfTheDay.category] || 'bg-purple-900/60 text-purple-200 border-purple-700/50'
              }`}>
                {signOfTheDay.category}
              </span>
            )}
          </div>
          
          <div className="my-3 flex flex-col items-center justify-center w-full">
            {signOfTheDay ? (
              <>
                <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 flex items-center justify-center rounded-3xl bg-purple-950/70 border-2 border-fuchsia-500/40 p-2 shadow-2xl shadow-fuchsia-900/30 my-2 transition-all">
                  {signOfTheDay.category === 'ALPHABET' ? (
                    <HandSVG letter={signOfTheDay.name} />
                  ) : (
                    <span className="text-7xl select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                      {signOfTheDay.category === 'GREETING' ? '👋' : signOfTheDay.category === 'DAYS' ? '📅' : signOfTheDay.category === 'FAMILY' ? '👨‍👩‍👧' : '🤟'}
                    </span>
                  )}
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-yellow-300 tracking-wider mt-2 uppercase drop-shadow-md">
                  "{signOfTheDay.name}"
                </h3>
              </>
            ) : (
              <p className="text-sm text-purple-300 font-sans font-medium">Loading sign...</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

  const renderStudentsView = () => {
    // Filter & Search logic
    const filteredStudents = studentsList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesGrade = studentFilter === 'All' || s.grade === studentFilter;
      return matchesSearch && matchesGrade;
    });

    return (
      <div className="flex flex-col space-y-6">
        {/* Search, Filter & Add Student Controls */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] rounded-3xl p-8 text-left flex flex-col space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Widescreen Search Student Bar */}
            <div className="relative flex-1 font-sans">
              <span className="absolute inset-y-0 left-0 flex items-center pl-5 pointer-events-none text-cyan-400 text-xl md:text-2xl">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search student name"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-14 pr-5 py-4 bg-slate-800/60 border border-cyan-500/40 rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-400 text-base md:text-lg font-bold text-slate-100 placeholder-slate-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
              />
            </div>
            
            {/* Add Student trigger button */}
            <button
              onClick={() => setIsAddStudentOpen(true)}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl tracking-widest transition-all border border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.6)] active:scale-95 uppercase flex items-center justify-center space-x-2"
            >
              <span>Add Student</span>
            </button>
          </div>

          {/* Filter pills aligned right/middle */}
          <div className="flex flex-wrap items-center gap-1.5 font-sans justify-start md:justify-end">
            {['All', 'Grade 1', 'Grade 2', 'Grade 3'].map((grade) => (
              <button
                key={grade}
                onClick={() => setStudentFilter(grade)}
                className={`px-6 py-3 rounded-xl text-sm font-black tracking-widest whitespace-nowrap transition duration-200 border ${studentFilter === grade ? (grade === 'Grade 2' ? 'bg-yellow-600 border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.6)] text-white scale-105' : grade === 'Grade 3' ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.6)] text-white scale-105' : 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)] text-white scale-105') : (grade === 'Grade 2' ? 'bg-slate-800/80 text-slate-300 border-cyan-500/30 hover:bg-slate-700 hover:text-yellow-300 hover:border-yellow-400' : grade === 'Grade 3' ? 'bg-slate-800/80 text-slate-300 border-cyan-500/30 hover:bg-slate-700 hover:text-emerald-300 hover:border-emerald-400' : 'bg-slate-800/80 text-slate-300 border-cyan-500/30 hover:bg-slate-700 hover:text-blue-300 hover:border-blue-400')}`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((std) => (
              <div 
                key={std.id} 
                className={`backdrop-blur-sm border-2 rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden transition-all ${std.grade === "Grade 1" ? "bg-blue-900/70 border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-400 hover:bg-blue-800/80" : std.grade === "Grade 2" ? "bg-yellow-900/70 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:border-yellow-400 hover:bg-yellow-800/80" : std.grade === "Grade 3" ? "bg-emerald-900/70 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:border-emerald-400 hover:bg-emerald-800/80" : "bg-slate-900/95 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:border-cyan-400 hover:bg-slate-800"}`}
              >
                {/* Delete button (X) top right */}
                <button
                  onClick={(e) => { e.stopPropagation(); setStudentIdToDelete(std.id); }}
                  className="absolute top-4 right-5 text-cyan-400 hover:text-rose-400 font-black text-xl select-none transition-colors"
                  title="Remove student"
                >
                  ✕
                </button>

                <div className="flex items-center space-x-5 mb-5 mt-2">
                  {/* Circular profile emoji background */}
                  <div className="text-6xl bg-yellow-500/10 min-w-[96px] w-24 h-24 rounded-full border-2 border-yellow-500/40 flex flex-col items-center justify-center select-none shadow-inner flex-shrink-0">
                    {std.emoji}
                  </div>
                  
                  {/* Right side: Name, Grade, Points */}
                  <div className="flex flex-col items-start pr-6 flex-1">
                    <h3 className="text-xl md:text-2xl font-black text-white leading-tight uppercase mb-1">{std.name}</h3>
                    <p className="text-sm text-purple-200 font-sans font-semibold mb-3">{std.grade}</p>
                    {/* Points badge with Star */}
                    <div className="flex items-center space-x-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-1 w-fit">
                      <span className="text-yellow-400 text-sm">⭐</span>
                      <span className="text-xs font-black text-yellow-300 font-sans tracking-wide">Total Points: {std.points}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedProfileStudent(std)}
                  className="w-full py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-black rounded-xl tracking-wider transition-all border border-[#60a5fa]/30 shadow-md active:scale-95 uppercase"
                >
                  View Profile
                </button>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-[#0f172a]/30 backdrop-blur-sm border border-white/10 rounded-3xl p-12 text-center text-purple-300 font-sans flex flex-col items-center">
              <span className="text-4xl mb-2">🪐</span>
              <p className="text-sm font-bold">No students found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStudentSelectorSidebar = () => (
      <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-6 shadow-xl flex flex-col h-[480px] lg:h-auto space-y-4 text-left w-full max-h-[85vh]">
        <div>
          <h2 className="text-2xl font-black text-white mb-1">Select Student</h2>
          <p className="text-xs font-bold text-purple-300 font-sans">Choose who is currently playing</p>
        </div>
        
        <div className="relative w-full font-sans">
          <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-purple-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Search students..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-purple-950/65 border border-purple-800/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 text-sm text-slate-100 placeholder-purple-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-purple-800">
          {studentsList.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 ? (
             <p className="text-sm text-purple-400 text-center py-4">No students found.</p>
          ) : (
            studentsList.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase())).map(student => {
              const isActive = activeStudentId === student.id || (!activeStudentId && studentsList[0]?.id === student.id);
              
              // Determine grade color
              let bgActive = 'bg-cyan-900/60 border-cyan-400 ring-2 ring-cyan-400/50';
              let bgInactive = 'bg-cyan-900/30 border-cyan-800/40 hover:bg-cyan-800/50 hover:border-cyan-500/50';
              let circleBg = 'bg-cyan-800/50 text-cyan-200';
              let pointsText = 'text-cyan-200';
              
              if (student.grade === 'Grade 1') {
                bgActive = 'bg-blue-900/60 border-blue-400 ring-2 ring-blue-400/50';
                bgInactive = 'bg-blue-900/30 border-blue-800/40 hover:bg-blue-800/50 hover:border-blue-500/50';
                circleBg = 'bg-blue-800/50 text-blue-200';
                pointsText = 'text-blue-200';
              } else if (student.grade === 'Grade 2') {
                bgActive = 'bg-yellow-900/60 border-yellow-400 ring-2 ring-yellow-400/50';
                bgInactive = 'bg-yellow-900/30 border-yellow-800/40 hover:bg-yellow-800/50 hover:border-yellow-500/50';
                circleBg = 'bg-yellow-800/50 text-yellow-200';
                pointsText = 'text-yellow-200';
              } else if (student.grade === 'Grade 3') {
                bgActive = 'bg-emerald-900/60 border-emerald-400 ring-2 ring-emerald-400/50';
                bgInactive = 'bg-emerald-900/30 border-emerald-800/40 hover:bg-emerald-800/50 hover:border-emerald-500/50';
                circleBg = 'bg-emerald-800/50 text-emerald-200';
                pointsText = 'text-emerald-200';
              }

              return (
                <button
                  key={student.id}
                  onClick={() => {
                      // If a student is already actively playing in a game/session, ignore clicks on other students
                      if (activeStudentId && activeStudentId !== student.id) return;
                      
                      // If we are in a session dashboard and about to start, show confirmation popup
                      if (!activeStudentId && currentView.startsWith('dashboard-') && ['sandbox', 'game', 'spelling'].includes(sessionMode)) {
                        setStudentToPlayConfirm(student);
                      } else {
                        setActiveStudentId(student.id);
                      }
                    }}
                    disabled={!!activeStudentId && activeStudentId !== student.id}
                  className={`w-full flex items-center p-3 rounded-2xl transition duration-200 text-left border ${
                    (!!activeStudentId && activeStudentId !== student.id) ? 'opacity-40 cursor-not-allowed grayscale ' : ''} ${isActive ? bgActive : bgInactive
                  }`}
                >
                  <div className={`flex-shrink-0 w-12 h-12 aspect-square rounded-2xl ${circleBg} flex items-center justify-center text-xl mr-3 shadow-inner border border-white/10`}>
                    {student.emoji}
                  </div>
                  <div>
                    <h4 className={`text-base leading-tight font-black tracking-wide ${isActive ? 'text-white' : 'text-slate-200'}`}>{student.name}</h4>
                    <p className={`text-sm font-bold font-sans ${pointsText}`}>{student.points} Points</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>
    );

  const isCorrectSign = Boolean(
      (currentView !== 'dashboard-spelling' && selectedSign && (
        (lastPrediction && (lastPrediction.toUpperCase() === selectedSign.name.toUpperCase() || (lastPrediction === 'GOOD MORNING' && selectedSign.name.toUpperCase().includes('GOOD MORNING'))) &&
        (sessionMode !== 'game' || (gameStep === 'practice' && (!currentQuestion?.requiredExpression || currentQuestion.requiredExpression === lastEmotionPrediction)))) ||
        (sessionMode === 'game' && gameStep === 'practice' && isTransitioningRef.current)
      )) ||
      (currentView === 'dashboard-spelling' && spellingWordCompleted)
    );

  // Play correct.mp3 sound when the student signs correctly (only once per correct streak)
  const wasCorrectRef = useRef(false);
  useEffect(() => {
    if (isCorrectSign && !wasCorrectRef.current) {
      wasCorrectRef.current = true;
      const audio = new Audio('/sound/correct.mp3');
      audio.play().catch(() => {});
    } else if (!isCorrectSign) {
      wasCorrectRef.current = false;
    }
  }, [isCorrectSign]);

  const renderLiveCameraFeed = () => (
    <div className={`bg-[#0f172a]/85 backdrop-blur-sm border rounded-3xl overflow-hidden shadow-xl flex flex-col transition-all duration-300 ${
      isCorrectSign 
        ? 'border-4 border-emerald-400 ring-8 ring-emerald-500/50 shadow-[0_0_60px_rgba(52,211,153,0.9)]' 
        : 'border-white/10'
    }`}>
      <div className={`px-5 py-3 border-b transition-all duration-300 flex items-center justify-between ${
        isCorrectSign ? 'border-emerald-400/50 bg-emerald-950/40' : 'border-purple-800/40 bg-purple-950/20'
      }`}>
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCorrectSign ? 'bg-emerald-400' : 'bg-cyan-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isCorrectSign ? 'bg-emerald-500' : 'bg-cyan-500'}`}></span>
          </span>
          <span className={`text-xs font-black uppercase tracking-wider ${isCorrectSign ? 'text-emerald-300' : 'text-cyan-300'}`}>
            {isCorrectSign ? '✨ CORRECT SIGN DETECTED!' : 'Live Space Feed'}
          </span>
        </div>
        <div className="text-[10px] font-bold text-purple-300 font-sans">
          Avg Latency: {predictionCountState > 0 ? `${averageLatency.toFixed(1)} ms` : '--'}
        </div>
      </div>

      <div className="relative h-48 md:h-72 lg:h-80 2xl:h-[22rem] w-full bg-slate-950 flex items-center justify-center overflow-hidden rounded-b-xl flex-shrink-0">
        {!(isModelLoaded && isCameraReady) && !modelError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 text-slate-300 p-4">
            <svg className="animate-spin h-9 w-9 text-cyan-400 mb-2.5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs font-semibold text-cyan-300 animate-pulse font-sans">Loading AI Models & Camera...</p>
          </div>
        )}
        
        {modelError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/95 text-slate-300 p-4 text-center">
            <svg className="h-10 w-10 text-rose-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-black text-sm text-rose-400">Failed to Load Model</p>
            <p className="text-[10px] text-slate-500 max-w-xs mt-1 font-sans">{modelError}</p>
          </div>
        )}
        
        {webcamActive ? (
          <>
            <Webcam
              ref={webcamRef}
              audio={false}
              id="img"
              className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${isCorrectSign ? 'brightness-110' : ''}`}
              onUserMedia={() => setIsWebcamVideoReady(true)}
              onUserMediaError={() => setIsWebcamVideoReady(false)}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover z-10"
              id="myCanvas"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 font-sans">
            <svg className="w-14 h-14 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <p className="text-xs font-semibold">Camera is sleeping</p>
          </div>
        )}

        {/* Speed Warning Message */}
        {speedWarning && !isCorrectSign && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-none animate-fadeIn">
            <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 border-4 border-yellow-300 rounded-3xl px-12 py-8 shadow-[0_0_70px_rgba(245,158,11,1)] text-center flex flex-col items-center animate-bounce">
              <div className="text-6xl mb-2 select-none drop-shadow-md">⚠️</div>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-widest drop-shadow-lg leading-tight">
                YOU'RE TOO FAST!<br/><span className="text-xl md:text-2xl text-yellow-100">KEEP CALM AND SLOW DOWN</span>
              </h2>
            </div>
          </div>
        )}

        {/* Range Warning Message */}
        {rangeWarning && !speedWarning && !isCorrectSign && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-none animate-fadeIn">
            <div className="bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 border-4 border-yellow-300 rounded-3xl px-12 py-8 shadow-[0_0_70px_rgba(245,158,11,1)] text-center flex flex-col items-center animate-bounce">
              <div className="text-6xl mb-2 select-none drop-shadow-md">🔍</div>
              <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-widest drop-shadow-lg leading-none">
                {rangeWarning === 'too close' ? 'TOO CLOSE!' : rangeWarning === 'too far' ? 'TOO FAR!' : 'NO USER DETECTED!'}
              </h2>
            </div>
          </div>
        )}

        {/* Center Pop-up Celebration Message when Correct */}
        {isCorrectSign && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm pointer-events-none animate-fadeIn">
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 border-4 border-emerald-300 rounded-3xl px-12 py-8 shadow-[0_0_70px_rgba(52,211,153,1)] text-center flex flex-col items-center animate-bounce">
              <div className="text-6xl mb-2 select-none drop-shadow-md">✨</div>
              <h2 className="text-4xl md:text-5xl font-black text-yellow-300 uppercase tracking-widest drop-shadow-lg leading-none">
                TAMA!
              </h2>
            </div>
          </div>
        )}
        
        <div className="absolute bottom-[-20px] right-[-40px] w-48 h-48 md:w-64 md:h-64 z-40 pointer-events-none">
          <SpacemanVtuber />
        </div>
      </div>

      <div className="px-5 py-3 border-t border-purple-800/40 bg-purple-950/10 flex items-center justify-between">
        {currentView !== 'dashboard-game' && currentView !== 'dashboard-spelling' ? (
          <div className="flex bg-purple-900/40 rounded-xl p-1 border border-purple-800/50">
            <button
              onClick={() => setRecognitionMode('gestures')}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                recognitionMode === 'gestures' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-purple-300 hover:text-white'
              }`}
            >
              Gestures
            </button>
            <button
              onClick={() => setRecognitionMode('alphabets')}
              className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
                recognitionMode === 'alphabets' ? 'bg-fuchsia-600 text-white shadow-md' : 'text-purple-300 hover:text-white'
              }`}
            >
              Alphabets
            </button>
          </div>
        ) : <div />}
        <div className="relative">
          <button
            onClick={() => {
              setWebcamEnabledByUser(prev => !prev);
              setShowCameraTooltip(false);
              hasSeenCameraTooltipRef.current = true;
            }}
            className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition duration-300 ${
            webcamEnabledByUser 
              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25' 
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25'
          }`}
          >
            {webcamEnabledByUser ? 'Turn Off Camera' : 'Turn On Camera'}
          </button>
          
          {showCameraTooltip && (
            <div className="absolute bottom-[calc(100%+12px)] right-0 bg-white px-4 py-3 rounded-2xl shadow-2xl border-2 border-rose-400 w-56 animate-bounce z-50 pointer-events-none">
              <div className="flex items-start space-x-3">
                <div className="text-2xl mt-0.5">💡</div>
                <div>
                  <h4 className="text-rose-600 font-black text-xs uppercase tracking-wider mb-0.5">Camera On</h4>
                  <p className="text-[10px] text-slate-600 font-sans font-bold leading-tight">Click here to turn off the camera anytime!</p>
                </div>
              </div>
              <div className="absolute bottom-[-8px] right-[40px] transform w-0 h-0 border-t-[8px] border-t-white border-x-[6px] border-x-transparent drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]" />
            </div>
          )}
        </div>
      </div>

      {currentView === 'dashboard-spelling' && (
        <div className="px-5 py-4 border-t border-purple-800/40 bg-purple-950/20 flex flex-col space-y-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-purple-300 mb-2 font-sans">Game Status</div>
            <div className="flex items-center space-x-3.5 p-3 bg-purple-950/40 rounded-2xl border border-purple-850/50 text-slate-300 font-sans">
              <div className="flex-shrink-0 w-8 h-8 rounded-full border border-dashed border-purple-500/60 flex items-center justify-center">
                <span className="text-sm animate-pulse">🤔</span>
              </div>
              <div>
                <p className="text-xs font-black text-slate-200">Show the sign for the current letter to the camera</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-black text-sm">Spelling Progress</h3>
              <span className="text-cyan-300 font-bold text-[10px] uppercase tracking-wider">Word {spellingCurrentWordIndex + 1}/5</span>
            </div>
            <div className="w-full bg-purple-950/60 rounded-full h-4 border border-purple-800/50 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 h-4 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
                style={{ width: `${(spellingCurrentWordIndex / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {currentView === 'dashboard-game' && (
        <div className="px-5 py-4 border-t border-purple-800/40 bg-purple-950/20 flex flex-col space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-black text-sm">{gameCategory ? `${gameCategory} Adventure` : 'Adventure Progress'}</h3>
              <span className="text-cyan-300 font-bold text-[10px] uppercase tracking-wider">Level {Math.floor(currentQuestionIndex / 5) + 1}</span>
            </div>
            <div className="w-full bg-purple-950/60 rounded-full h-4 border border-purple-800/50 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 h-4 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
                style={{ width: `${((currentQuestionIndex % 5) / 5) * 100}%` }}
              ></div>
            </div>
            <p className="text-purple-300 text-[10px] font-sans mt-3 text-center">Answer questions and master signs to level up!</p>
          </div>
        </div>
      )}
    </div>
  );

      const renderSandboxView = () => (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      {/* Main Sandbox Area */}
      <div className="flex-1 flex flex-col space-y-6 h-full overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch h-full min-h-0">
          
          {/* LEFT COLUMN */}
          <div className="flex flex-col space-y-4 h-full min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 pr-2">
            <div className="bg-slate-800/80 backdrop-blur-md border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-2xl px-6 py-2.5 w-fit shadow-lg flex-shrink-0 text-left">
              <h1 className="text-lg md:text-xl font-black text-white tracking-wide uppercase">
                {headerText}
              </h1>
            </div>
            {renderLiveCameraFeed()}
            {/* Explorer Section */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-6 shadow-xl flex flex-col space-y-4 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3.5 sm:space-y-0">
            <div>
              <h2 className="text-lg font-black text-white">FSL Sign Explorer</h2>
              <p className="text-[10px] font-bold text-purple-300 font-sans">Select a sign below to see its demonstration and practice it</p>
            </div>
            
            <div className="relative w-full sm:max-w-xs font-sans">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-purple-400">🔍</span>
              <input
                type="text"
                placeholder="Search signs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-purple-950/65 border border-purple-800/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 text-xs text-slate-100 placeholder-purple-400"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex overflow-x-auto pb-1 space-x-1.5 scrollbar-thin scrollbar-thumb-purple-800">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black whitespace-nowrap transition duration-200 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white shadow-md border border-fuchsia-400/30'
                    : 'bg-purple-950/60 text-purple-300 hover:text-white border border-purple-900/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sign Selector Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[140px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-purple-800">
            {filteredSigns.length > 0 ? (
              filteredSigns.map((sign) => {
                const isSelected = selectedSignId === sign.id;
                return (
                  <button
                    key={sign.id}
                    onClick={() => setSelectedSignId(sign.id)}
                    className={`flex flex-col justify-between p-3 rounded-xl transition duration-200 text-left border ${
                      isSelected
                        ? 'bg-purple-900/60 border-fuchsia-500 shadow-md ring-2 ring-fuchsia-600/30'
                        : 'bg-purple-950/30 hover:bg-purple-950/50 border-purple-900/40'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1.5">
                      <span className={`text-[11px] font-extrabold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>{sign.name}</span>
                    </div>
                    <span className={`self-start text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                      categoryColors[sign.category] || 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {sign.category}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center h-24 text-purple-400 font-sans">
                <span className="text-xl mb-1">👽</span>
                <p className="text-xs">No space gestures found</p>
              </div>
            )}
          </div>
        </div>
          </div>
          
                    {/* RIGHT COLUMN */}
          <div className="flex flex-col space-y-4 h-full min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 pr-2">
            {/* Sign Demonstration & Accuracy Feed */}
          {selectedSign && (
            <div className={`bg-[#0f172a]/85 backdrop-blur-sm border rounded-3xl p-6 shadow-xl flex flex-col justify-start space-y-4 text-left h-full overflow-y-auto transition-all duration-300 lg:mt-0 ${
              isCorrectSign 
                ? 'border-4 border-emerald-400 ring-8 ring-emerald-500/50 shadow-[0_0_60px_rgba(52,211,153,0.9)]' 
                : 'border-white/10'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black text-yellow-300 uppercase tracking-widest font-sans">Sign Demonstration</span>
                  <h2 className="text-2xl font-black text-white mt-0.5">{selectedSign.name}</h2>
                </div>
                <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                  categoryColors[selectedSign.category] || 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {selectedSign.category}
                </span>
              </div>
              
              <div className="relative w-full flex-1 min-h-[20rem] md:min-h-[24rem] lg:min-h-[28rem] flex items-center justify-center rounded-2xl overflow-hidden bg-slate-950 border border-purple-800/30">
                {selectedSign.category === 'ALPHABET' ? (
                  <HandSVG letter={selectedSign.name} />
                ) : (
                  <video
                    key={selectedSign.id}
                    src={`/fsl/demos/${selectedSign.id}.mov`}
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              {/* Accuracy Validation Panel */}
              <div className="border-t border-purple-800/40 pt-4 mt-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-300 mb-2 font-sans">Practice Mode Feedback</div>
                
                {(!lastPrediction || lastPrediction === 'No sign detected') ? (
                  <div className="flex items-center space-x-3.5 p-3 bg-purple-950/40 rounded-2xl border border-purple-850/50 text-slate-300 font-sans">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border border-dashed border-purple-500/60 flex items-center justify-center">
                      <span className="text-sm animate-pulse">🌌</span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-200">Waiting for your space gesture...</p>
                      <p className="text-[10px] text-slate-400">Perform the sign shown above in the camera frame.</p>
                    </div>
                  </div>
                ) : lastPrediction === selectedSign.name ? (
                  <div className="flex items-center space-x-3.5 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 animate-bounce">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                      ✨
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-300">OUT OF THIS WORLD! (CORRECT)</p>
                      <p className="text-[10px] text-emerald-500/80 font-sans">Awesome job! You made the gesture perfectly.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3.5 p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                      ☄️
                    </div>
                    <div>
                      <p className="text-sm font-black text-rose-300">TRY AGAIN</p>
                      <p className="text-[10px] text-rose-400/80 font-sans">
                        Detected: <strong className="underline uppercase">{lastPrediction}</strong> (wanted: {selectedSign.name}).
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
          
        </div>
      </div>
    </div>
  );

const renderSpellingView = () => {
    const playingStudent = studentsList.find(s => s.id === activeStudentId);
    return (
      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        <div className="flex-1 flex flex-col space-y-6 h-full overflow-hidden">
          {!activeStudentId ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-10 shadow-xl h-full text-center">
              <h2 className="text-4xl font-black text-white mb-2">Spelling Game</h2>
              <p className="font-bold text-yellow-400 text-lg animate-pulse">
                ⚠️ Please select a student from the sidebar before playing!
              </p>
            </div>
                  ) : spellingSetupMode === null ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-10 shadow-xl h-full text-center">
            <h2 className="text-4xl font-black text-white mb-2">Spelling Setup</h2>
            <p className="text-lg text-purple-200 mb-8">How would you like to pick the 5 words?</p>
            <div className="flex space-x-6">
               <button onClick={() => setSpellingSetupMode('random')} className="px-8 py-10 bg-gradient-to-br from-purple-700 to-indigo-800 border-2 border-indigo-400/50 rounded-3xl hover:scale-105 transition-all text-white font-black text-2xl shadow-xl flex flex-col items-center space-y-4">
                  <span className="text-5xl">🔀</span>
                  <span>Randomize 5</span>
               </button>
               <button onClick={() => setSpellingSetupMode('manual')} className="px-8 py-10 bg-gradient-to-br from-fuchsia-700 to-pink-800 border-2 border-pink-400/50 rounded-3xl hover:scale-105 transition-all text-white font-black text-2xl shadow-xl flex flex-col items-center space-y-4">
                  <span className="text-5xl">👆</span>
                  <span>Choose Manually</span></button></div><button onClick={() => setNavConfirmTab('dashboard-sesyon')} className="mt-8 text-purple-300 hover:text-white underline font-bold uppercase tracking-widest text-sm transition-colors">Go back to Main Menu</button></div>) : spellingSetupMode === 'manual' && spellingCurrentWordList.length !== 5 ? (
          <div className="flex-1 flex flex-col bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-6 shadow-xl h-full max-h-[calc(100vh-160px)] relative overflow-hidden">
             <div className="text-center mb-4 shrink-0 relative">
               <button onClick={() => setSpellingSetupMode(null)} className="absolute top-2 left-2 text-purple-300 hover:text-fuchsia-400 font-bold flex items-center transition-transform hover:-translate-x-1"><span className="text-2xl mr-2">⬅️</span> Back</button>
               <h2 className="text-3xl font-black text-white mb-2">Select 5 Words</h2>
               <p className="text-purple-200 text-sm">Handpick spelling words. Words with a ✅ have already been completed by this student.</p>
               
               <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4 mt-4 px-12">
                 <input type="text" placeholder="Search words..." value={spellingSearchTerm} onChange={e => setSpellingSearchTerm(e.target.value)} className="bg-purple-950/60 border border-purple-500/30 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 w-full md:w-64" />
                 <select value={spellingLengthFilter} onChange={e => setSpellingLengthFilter(e.target.value)} className="bg-purple-950/60 border border-purple-500/30 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 w-full md:w-48">
                   <option value="All">All Lengths</option>
                   <option value="3">3 Letters</option>
                   <option value="4">4 Letters</option>
                   <option value="5">5 Letters</option>
                   <option value="COMPLETED">Completed Only</option>
                 </select>
               </div>
             </div>
             
             <div className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-thin scrollbar-thumb-fuchsia-500">
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 content-start">
               {spellingWords.filter(word => {
                 const isCompletedFilter = dbProgressRecords.some((r: any) => r.studentId === activeStudentId && r.category === 'SPELLING_WORD_' + word );
                 if (spellingLengthFilter === 'COMPLETED' && !isCompletedFilter) return false;
                 if (spellingLengthFilter !== 'All' && spellingLengthFilter !== 'COMPLETED' && word.length.toString() !== spellingLengthFilter) return false;
                 if (spellingSearchTerm && !word.toLowerCase().includes(spellingSearchTerm.toLowerCase())) return false;
                 return true;
               }).map(word => {
                 const isCompleted = dbProgressRecords.some((r: any) => r.studentId === activeStudentId && r.category === 'SPELLING_WORD_' + word );
                 const isSelected = spellingManualSelection.includes(word);
                 return (
                   <div key={word} onClick={() => {
                     setSpellingManualSelection(prev => {
                       if (prev.includes(word)) return prev.filter(w => w !== word);
                       if (prev.length >= 5) return prev;
                       return [...prev, word];
                     });
                   }} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center ${isSelected ? 'bg-fuchsia-600/40 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)]' : 'bg-purple-900/40 border-purple-500/30 hover:border-fuchsia-400/50 hover:bg-purple-800/60'}`}>
                      <div className="flex justify-center items-center space-x-2 mb-1">
                         <span className="text-lg font-black text-white tracking-widest">{word}</span>
                         {isCompleted && <span className="text-emerald-400 text-sm" title="Completed">✅</span>}
                      </div>
                   </div>
                 );
               })}
               </div>
             </div>
             <div className="absolute bottom-0 left-0 w-full bg-purple-950/90 backdrop-blur-md border-t border-purple-500/30 p-4 rounded-b-3xl flex justify-between items-center px-8">
                <div className="text-xl font-black text-white">Selected: <span className={spellingManualSelection.length === 5 ? 'text-emerald-400' : 'text-fuchsia-400'}>{spellingManualSelection.length} / 5</span></div>
                <button onClick={() => { setSpellingCurrentWordList(spellingManualSelection); setSpellingCurrentWordIndex(0); setSpellingProgressIndex(0); setSpellingScore(0); setSpellingShowGameOver(false); }} disabled={spellingManualSelection.length !== 5} className={`px-8 py-3 rounded-xl font-black text-lg transition-all ${spellingManualSelection.length === 5 ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:scale-105' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>Start Game</button>
             </div>
          </div>
          ) : isSavingProgress ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 bg-[#0f172a]/90 backdrop-blur-md border border-white/10 rounded-3xl p-10 shadow-xl h-full text-center">
                <div className="w-20 h-20 border-8 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-4xl font-black text-white animate-pulse mt-4">Saving Progress...</h2>
                <p className="text-xl text-purple-200">Please wait while we record your awesome score!</p>
            </div>
          ) : spellingShowGameOver ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-10 shadow-xl h-full text-center">
              <h2 className="text-5xl font-black text-yellow-400 mb-2 drop-shadow-lg">🎉 Fantastic Spelling! 🎉</h2>
              <p className="text-xl text-white font-bold">You completed the spelling challenge!</p>
              <div className="flex space-x-6 mt-8">
                <button 
                  onClick={() => {
                    setSpellingScore(0);
                    setSpellingShowGameOver(false);
                    setSpellingCurrentWordIndex(0);
                    setSpellingProgressIndex(0);
                    setSpellingCurrentWordList([]);
                      setSpellingSetupMode(null);
                      setSpellingManualSelection([]);
                      setRecognitionMode('alphabets');
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-pink-500 rounded-2xl text-white font-black text-xl hover:scale-105 transition-transform shadow-xl"
                >
                  Play Again
                </button>
                <button 
                  onClick={() => { sessionPointsEarnedRef.current = 0; setSpellingShowGameOver(false); setSpellingSetupMode(null); setSpellingCurrentWordList([]); setSpellingManualSelection([]); setRecognitionMode('alphabets'); setSpellingScore(0); setActiveStudentId(null); setCurrentView('dashboard-sesyon'); }} className="px-8 py-4 bg-purple-900/80 border-2 border-purple-500/50 rounded-2xl text-white font-black text-xl hover:scale-105 transition-transform shadow-xl"> Go back to Main Menu
                </button>
              </div>
            </div>
          ) : (
            <>
              {playingStudent && (
                <div className="bg-fuchsia-600/20 border border-fuchsia-500/50 rounded-2xl p-4 flex items-center justify-between shadow-lg flex-shrink-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/50 flex items-center justify-center text-xl">
                      {playingStudent.emoji}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-fuchsia-300 uppercase tracking-widest font-sans">Currently Playing</p>
                      <h3 className="text-xl font-black text-white">{playingStudent.name}</h3>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-fuchsia-300 uppercase tracking-widest font-sans">Total Score</p>
                    <h3 className="text-xl font-black text-yellow-400">{playingStudent.points} Points</h3>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch h-full min-h-0">
                <div className="flex flex-col space-y-4 h-full min-h-0 overflow-y-auto pr-2">
                  <div className="bg-slate-800/80 backdrop-blur-md border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-2xl px-6 py-2.5 w-fit shadow-lg flex-shrink-0 text-left">
                    <h1 className="text-lg md:text-xl font-black text-white tracking-wide uppercase">
                      {headerText}
                    </h1>
                  </div>
                  {renderLiveCameraFeed()}
                </div>
                
                {/* Spelling Logic Panel */}
                <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-6 shadow-xl flex flex-col justify-start text-left h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-black text-yellow-300 uppercase tracking-widest font-sans">Spelling Game - Word {spellingCurrentWordIndex + 1} of 5</span>
                      <h2 className="text-xl font-black text-white mt-1 leading-snug">Spell the word:</h2>
                    </div>
                  </div>

                  {currentSpellingWord && (
                    <div className="w-full flex justify-center mb-4 mt-2">
                      <img 
                        src={`/SpellingImg/${currentSpellingWord}.${['MAN', 'MUG'].includes(currentSpellingWord) ? 'png' : 'jpg'}`} 
                        alt={currentSpellingWord} 
                        className="w-80 h-48 md:w-[32rem] md:h-64 object-cover rounded-2xl border-4 border-purple-500/50 shadow-lg" 
                      />
                    </div>
                  )}
                  
                  <div className="w-full flex justify-center mb-8 mt-2">
                    <div className="flex space-x-3">
                      {currentSpellingWord.split('').map((letter, idx) => (
                        <div key={idx} className={`w-16 h-20 md:w-20 md:h-24 rounded-2xl border-4 flex items-center justify-center text-4xl md:text-5xl font-black transition-all ${
                          idx < spellingProgressIndex || spellingWordCompleted ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                          idx === spellingProgressIndex ? 'bg-fuchsia-500/20 border-fuchsia-400 text-white animate-pulse' :
                          'bg-purple-950/60 border-purple-800/50 text-slate-600'
                        }`}>
                          {idx < spellingProgressIndex || spellingWordCompleted ? letter : (idx === spellingProgressIndex ? '_' : '_')}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center mb-6">
                     <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 mb-2 font-sans">Instructional Overlay</span>
                     <div className="w-32 h-32 md:w-40 md:h-40 bg-purple-950/70 border-2 border-fuchsia-500/50 rounded-3xl flex items-center justify-center p-2 shadow-2xl">
                       {spellingWordCompleted ? (
                         <div className="text-4xl">✨</div>
                       ) : (
                         <HandSVG letter={currentSpellingWord[spellingProgressIndex]} />
                       )}
                     </div>
                     <p className="mt-4 text-fuchsia-300 font-bold text-center">
                       {spellingWordCompleted ? 'Word Completed!' : `Do this sign for the letter '${currentSpellingWord[spellingProgressIndex]}'`}
                     </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        {/* Students Sidebar */}
        <div className="w-full lg:w-72 flex-shrink-0">
          {renderStudentSelectorSidebar()}
        </div>
      </div>
    );
  };

  const renderGameView = () => {
    const playingStudent = studentsList.find(s => s.id === activeStudentId);
    return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      {/* Kinect Cursor */}
      <div 
        id="kinect-cursor"
        className="fixed top-0 left-0 w-12 h-12 rounded-full border-4 border-cyan-400 bg-cyan-500/30 z-[9999] pointer-events-none flex items-center justify-center transition-opacity duration-200"
        style={{ opacity: 0, transform: 'translate(-100px, -100px)' }}
      >
        <div id="kinect-cursor-progress" className="w-full h-full bg-cyan-400 rounded-full transition-transform duration-75" style={{ transform: 'scale(0)' }}></div>
      </div>

      <div className="flex-1 flex flex-col space-y-6 h-full overflow-hidden">
        {!activeStudentId ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-10 shadow-xl h-full text-center">
            <h2 className="text-4xl font-black text-white mb-2">Situational Game</h2>
            <p className="font-bold text-yellow-400 text-lg animate-pulse">
              ⚠️ Please select a student from the sidebar before playing!
            </p>
          </div>
        ) : gameSetupMode === null ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-10 shadow-xl h-full text-center">
            <h2 className="text-4xl font-black text-white mb-2">Game Setup</h2>
            <p className="text-lg text-purple-200 mb-8">How would you like to pick the 5 questions?</p>
            <div className="flex space-x-6">
               <button onClick={() => setGameSetupMode('random')} className="px-8 py-10 bg-gradient-to-br from-purple-700 to-indigo-800 border-2 border-indigo-400/50 rounded-3xl hover:scale-105 transition-all text-white font-black text-2xl shadow-xl flex flex-col items-center space-y-4">
                  <span className="text-5xl">🔀</span>
                  <span>Randomize 5</span>
               </button>
               <button onClick={() => setGameSetupMode('manual')} className="px-8 py-10 bg-gradient-to-br from-fuchsia-700 to-pink-800 border-2 border-pink-400/50 rounded-3xl hover:scale-105 transition-all text-white font-black text-2xl shadow-xl flex flex-col items-center space-y-4">
                  <span className="text-5xl">👆</span>
                  <span>Choose Manually</span></button></div><button onClick={() => setNavConfirmTab('dashboard-sesyon')} className="mt-8 text-purple-300 hover:text-white underline font-bold uppercase tracking-widest text-sm transition-colors">Go back to Main Menu</button></div>) : gameSetupMode === 'manual' && gameCategory !== 'CUSTOM' ? (
          <div className="flex-1 flex flex-col bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-6 shadow-xl h-full max-h-[calc(100vh-160px)] relative overflow-hidden">
             <div className="text-center mb-4 shrink-0 relative">
               <button onClick={() => setGameSetupMode(null)} className="absolute top-2 left-2 text-purple-300 hover:text-fuchsia-400 font-bold flex items-center transition-transform hover:-translate-x-1"><span className="text-2xl mr-2">⬅️</span> Back</button>
               <h2 className="text-3xl font-black text-white mb-2">Select 5 Questions</h2>
               <p className="text-purple-200 text-sm">Handpick questions. Questions with a ✅ have already been completed by this student.</p>
               
               <div className="flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4 mt-4 px-12">
                 <input type="text" placeholder="Search questions..." value={gameSearchTerm} onChange={e => setGameSearchTerm(e.target.value)} className="bg-purple-950/60 border border-purple-500/30 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 w-full md:w-64" />
                 <select value={gameCategoryFilter} onChange={e => setGameCategoryFilter(e.target.value)} className="bg-purple-950/60 border border-purple-500/30 text-white text-sm rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 w-full md:w-48">
                   <option value="All">All Categories</option>
                   {Array.from(new Set(gameQuestions.map(q => q.category))).map(cat => (
                     <option key={cat} value={cat}>{cat}</option>
                   ))}
                   <option value="COMPLETED">Completed Only</option>
                 </select>
               </div>
             </div>
             
             <div className="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-thin scrollbar-thumb-fuchsia-500">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
               {gameQuestions.filter(q => {
                 const isCompletedFilter = dbProgressRecords.some((r: any) => r.studentId === activeStudentId && r.category === 'QUESTION_' + q.id );
                 if (gameCategoryFilter === 'COMPLETED' && !isCompletedFilter) return false;
                 if (gameCategoryFilter !== 'All' && gameCategoryFilter !== 'COMPLETED' && q.category !== gameCategoryFilter) return false;
                 if (gameSearchTerm && !q.situation.toLowerCase().includes(gameSearchTerm.toLowerCase())) return false;
                 return true;
               }).map(q => {
                 const isCompleted = dbProgressRecords.some((r: any) => r.studentId === activeStudentId && r.category === 'QUESTION_' + q.id );
                 const isSelected = gameManualSelection.includes(q.id);
                 return (
                   <div key={q.id} onClick={() => {
                     setGameManualSelection(prev => {
                       if (prev.includes(q.id)) return prev.filter(id => id !== q.id);
                       if (prev.length >= 5) return prev;
                       return [...prev, q.id];
                     });
                   }} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col ${isSelected ? 'bg-fuchsia-600/40 border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.5)]' : 'bg-purple-900/40 border-purple-500/30 hover:border-fuchsia-400/50 hover:bg-purple-800/60'}`}>
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-black text-cyan-300 uppercase tracking-wider bg-cyan-900/50 px-2 py-1 rounded-md">{q.category}</span>
                         {isCompleted && <span className="text-emerald-400 text-xl" title="Completed">✅</span>}
                      </div>
                      <p className="text-sm text-white font-semibold">{q.situation}</p>
                   </div>
                 );
               })}
               </div>
             </div>
             <div className="absolute bottom-0 left-0 w-full bg-purple-950/90 backdrop-blur-md border-t border-purple-500/30 p-4 rounded-b-3xl flex justify-between items-center px-8">
                <div className="text-xl font-black text-white">Selected: <span className={gameManualSelection.length === 5 ? 'text-emerald-400' : 'text-fuchsia-400'}>{gameManualSelection.length} / 5</span></div>
                <button onClick={() => { setGameCategory('CUSTOM'); setCurrentQuestionIndex(0); setQuestionsCompleted(0); setShowGameOver(false); setHasMadeMistakeOnCurrentQuestion(false); setGameSelectedAnswer(null); setGameStep('question'); }} disabled={gameManualSelection.length !== 5} className={`px-8 py-3 rounded-xl font-black text-lg transition-all ${gameManualSelection.length === 5 ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] hover:scale-105' : 'bg-slate-700 text-slate-400 cursor-not-allowed'}`}>Start Game</button>
             </div>
          </div>
        ) : !gameCategory ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-10 shadow-xl h-full">
             <div className="text-center">
               <h2 className="text-4xl font-black text-white mb-2">Adventure Map</h2>
               <p className={`font-bold ${!activeStudentId ? 'text-yellow-400 text-lg animate-pulse' : 'text-purple-300'}`}>
                 {!activeStudentId ? '⚠️ Please select a student from the sidebar before playing!' : 'Choose a category to start playing!'}
               </p>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                {['GREETING', 'EVERYDAY', 'DAYS', 'FAMILY'].map(cat => (
                  <button 
                    key={cat} 
                    disabled={!activeStudentId}
                    onClick={() => { setGameCategory(cat); setCurrentQuestionIndex(0); setQuestionsCompleted(0); setShowGameOver(false); setHasMadeMistakeOnCurrentQuestion(false); setGameSelectedAnswer(null); setGameStep('question'); }} 
                    className={`bg-gradient-to-br from-purple-900/80 to-purple-800/80 border-2 p-8 rounded-3xl text-white font-black text-2xl transition-all shadow-lg flex items-center justify-center group ${!activeStudentId ? 'border-purple-800/50 opacity-50 cursor-not-allowed grayscale' : 'border-purple-500/50 hover:border-fuchsia-400 hover:from-fuchsia-600/40 hover:to-purple-700/60 hover:shadow-[0_0_20px_rgba(217,70,239,0.4)]'}`}
                  >
                    <span className={!activeStudentId ? '' : 'group-hover:scale-110 transition-transform'}>{cat}</span>
                  </button>
                ))}
             </div>
             <button 
                onClick={() => setGameSetupMode(null)} 
                className="mt-8 text-purple-300 hover:text-white underline font-bold uppercase tracking-widest text-sm"
             >
                Go back to Menu
             </button>
          </div>
          ) : isSavingProgress ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 bg-[#0f172a]/90 backdrop-blur-md border border-white/10 rounded-3xl p-10 shadow-xl h-full text-center">
                <div className="w-20 h-20 border-8 border-fuchsia-500 border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-4xl font-black text-white animate-pulse mt-4">Saving Progress...</h2>
                <p className="text-xl text-purple-200">Please wait while we record your awesome score!</p>
            </div>
          ) : showGameOver ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-10 shadow-xl h-full text-center">
            <h2 className="text-5xl font-black text-yellow-400 mb-2 drop-shadow-lg">🎉 Great Job! 🎉</h2>
            <p className="text-xl text-white font-bold">You completed 5 questions in the {gameCategory} category!</p>
            <div className="flex space-x-6 mt-8">
              <button 
                onClick={() => {
                  setQuestionsCompleted(0);
                  setShowGameOver(false);
                  setHasMadeMistakeOnCurrentQuestion(false);
                  setCurrentQuestionIndex(0);
                  setGameStep('question');
                  setGameSelectedAnswer(null);
                  setRecognitionMode('alphabets');
                  setSelectedSignId(0);
                  setLastPrediction('No sign detected');
                  
                  setGameSetupMode(null);
                    setGameCategory(null);
                    setGameManualSelection([]);
                    }}
                    className="px-8 py-4 bg-gradient-to-r from-fuchsia-600 to-pink-500 rounded-2xl text-white font-black text-xl hover:scale-105 transition-transform shadow-xl"
                >
                Play Again
              </button>
              <button 
                  onClick={() => { setShowGameOver(false); setGameSetupMode(null); setGameCategory(null); setGameManualSelection([]); setActiveStudentId(null); setCurrentView('dashboard-sesyon'); }} className="px-8 py-4 bg-purple-900/80 border-2 border-purple-500/50 rounded-2xl text-white font-black text-xl hover:scale-105 transition-transform shadow-xl"> Go back to Main Menu
              </button>

            </div>
          </div>
        ) : !activeStudentId ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-10 shadow-xl h-full text-center">
            <h2 className="text-4xl font-black text-white mb-2">{gameCategory} Adventure</h2>
            <p className="font-bold text-yellow-400 text-lg animate-pulse">
              ⚠️ Please select a student from the sidebar before playing!
            </p>
          </div>
        ) : (
          <>
            {playingStudent && (
          <div className="bg-fuchsia-600/20 border border-fuchsia-500/50 rounded-2xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-fuchsia-500/20 border border-fuchsia-400/50 flex items-center justify-center text-xl">
                {playingStudent.emoji}
              </div>
              <div>
                <p className="text-[10px] font-black text-fuchsia-300 uppercase tracking-widest font-sans">Currently Playing</p>
                <h3 className="text-xl font-black text-white">{playingStudent.name}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-fuchsia-300 uppercase tracking-widest font-sans">Total Score</p>
              <h3 className="text-xl font-black text-yellow-400">{playingStudent.points} Points</h3>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch h-full min-h-0">
          <div className="flex flex-col space-y-4 h-full min-h-0 overflow-y-auto pr-2">
            <div className="bg-slate-800/80 backdrop-blur-md border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-2xl px-6 py-2.5 w-fit shadow-lg flex-shrink-0 text-left">
              <h1 className="text-lg md:text-xl font-black text-white tracking-wide uppercase">
                {headerText}
              </h1>
            </div>
            {renderLiveCameraFeed()}
          </div>
          
          {/* Game Mode Panel */}
          {gameStep !== 'practice' && currentQuestion && (
            <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-6 shadow-xl flex flex-col justify-between text-left h-full overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black text-yellow-300 uppercase tracking-widest font-sans">Situational Game - Level {Math.floor(currentQuestionIndex / 5) + 1}</span>
                  <h2 className="text-xl font-black text-white mt-1 leading-snug">{currentQuestion.situation}</h2>
                  {currentQuestion.requiredExpression && (
                    <div className="mt-2 inline-flex items-center bg-cyan-500/20 px-4 py-1.5 rounded-full border border-cyan-500/50">
                      <span className="text-cyan-300 text-sm font-black uppercase tracking-wider">
                        🎭 Make a {currentQuestion.requiredExpression} face!
                      </span>
                    </div>
                  )}
                </div>
                <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider bg-fuchsia-600/30 text-fuchsia-300 border-fuchsia-500/50`}>
                  {currentQuestion.category}
                </span>
              </div>
              
              <div className="w-full flex justify-center mb-4">
                <img 
                  src={currentQuestion.image || `/fsl/situations/category_${currentQuestion.category.toLowerCase()}.jpg`} 
                  alt={currentQuestion.situation} 
                  className="rounded-2xl border-2 border-fuchsia-500/30 shadow-lg object-cover w-full h-40 md:h-48 max-w-md"
                />
              </div>
              
              <div className="flex flex-col space-y-3 my-4">
                {['A', 'B', 'C'].map((opt) => (
                  <div key={opt} id={`game-option-${opt}`} className={`p-4 rounded-2xl border-2 transition-all ${
                    gameSelectedAnswer === opt 
                      ? (opt === currentQuestion.correctAnswer ? 'bg-emerald-500/20 border-emerald-500' : 'bg-rose-500/20 border-rose-500')
                      : 'bg-purple-950/40 border-purple-800/50'
                  }`}>
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl font-black text-fuchsia-400">{opt}</span>
                      <span className="text-lg font-bold text-white">{currentQuestion.options[opt as 'A' | 'B' | 'C'].signName}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-purple-800/40 pt-4 mt-auto">
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-300 mb-2 font-sans">Game Status</div>
                {gameStep === 'question' ? (
                  <div className="flex flex-col space-y-2">
                    <div className="relative flex items-center space-x-3.5 p-3 bg-purple-950/40 rounded-2xl border border-purple-850/50 text-slate-300 font-sans">
                      {/* Animated tooltip arrow for children */}
                      <div className="absolute -top-12 left-4 animate-bounce flex flex-col items-center">
                        <span className="bg-yellow-400 text-purple-950 text-sm font-black px-3 py-1.5 rounded-lg shadow-lg border border-yellow-300 mb-1">Point your hand to choose!</span>
                        <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-yellow-400"></div>
                      </div>
                      
                      <div className="flex-shrink-0 w-8 h-8 rounded-full border border-dashed border-purple-500/60 flex items-center justify-center">
                        <span className="text-sm animate-pulse">🤔</span>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-200">Hover the blue circle over an answer!</p>
                      </div>
                    </div>
                  </div>
                ) : gameStep === 'correct' ? (
                  <div className="flex items-center space-x-3.5 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 animate-bounce">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">✨</div>
                    <div>
                      <p className="text-sm font-black text-emerald-300">CORRECT!</p>
                      <p className="text-[10px] text-emerald-500/80 font-sans">Get ready to practice the sign...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3.5 p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">☄️</div>
                    <div>
                      <p className="text-sm font-black text-rose-300">TRY AGAIN</p>
                      <p className="text-[10px] text-rose-400/80 font-sans">You selected {gameSelectedAnswer}. Try another option!</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Practice target for game mode */}
          {gameStep === 'practice' && selectedSign && (
            <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-6 shadow-xl flex flex-col justify-between text-left h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-black text-yellow-300 uppercase tracking-widest font-sans">Sign Demonstration</span>
                  <h2 className="text-2xl font-black text-white mt-0.5">{selectedSign.name}</h2>
                </div>
                <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                  categoryColors[selectedSign.category] || 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  {selectedSign.category}
                </span>
              </div>
              
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-purple-800/30">
                {selectedSign.category === 'ALPHABET' ? (
                  <HandSVG letter={selectedSign.name} />
                ) : (
                  <video
                    key={selectedSign.id}
                    src={`/fsl/demos/${selectedSign.id}.mov`}
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              <div className="border-t border-purple-800/40 pt-4 mt-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-purple-300 mb-2 font-sans">Practice Mode Feedback</div>
                
                {(!lastPrediction || lastPrediction === 'No sign detected') ? (
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-3.5 p-3 bg-purple-950/40 rounded-2xl border border-purple-850/50 text-slate-300 font-sans">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full border border-dashed border-purple-500/60 flex items-center justify-center">
                        <span className="text-sm animate-pulse">🌌</span>
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-200">Waiting for your space gesture...</p>
                        <p className="text-[10px] text-slate-400">Perform the sign shown above in the camera frame.</p>
                      </div>
                    </div>
                    {currentQuestion.requiredExpression && (
                      <div className="relative flex items-center space-x-3.5 p-3 bg-cyan-950/40 rounded-2xl border border-cyan-500/50 text-cyan-300 font-sans shadow-[0_0_15px_rgba(6,182,212,0.4)] animate-pulse">
                        <div className="absolute -top-10 right-4 animate-bounce flex flex-col items-center">
                          <span className="bg-yellow-400 text-purple-950 text-[10px] font-black px-2 py-1 rounded-md shadow-lg border border-yellow-300 mb-1">Make this face!</span>
                          <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-yellow-400"></div>
                        </div>
                        <div className="flex-shrink-0 w-8 h-8 rounded-full border border-cyan-500/50 flex items-center justify-center bg-cyan-500/20 text-xl">
                          {currentQuestion.requiredExpression === 'happy' ? '😁' : currentQuestion.requiredExpression === 'sad' ? '😢' : currentQuestion.requiredExpression === 'angry' ? '😠' : '😐'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-cyan-300 uppercase tracking-widest">🎭 Requires Expression</p>
                          <p className="text-[10px] text-cyan-400/80">Make a <strong className="uppercase">{currentQuestion.requiredExpression}</strong> face while doing the sign!</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : lastPrediction === selectedSign.name ? (
                  currentQuestion.requiredExpression && lastEmotionPrediction !== currentQuestion.requiredExpression ? (
                    <div className="flex items-center space-x-3.5 p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 text-yellow-400">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">⚠️</div>
                      <div>
                        <p className="text-sm font-black text-yellow-300">ALMOST THERE!</p>
                        <p className="text-[10px] text-yellow-500/80 font-sans">Sign is correct, but we need a <strong className="uppercase">{currentQuestion.requiredExpression}</strong> face! (Detected: {lastEmotionPrediction || 'none'} | Mesh: {lastFaceMeshLengthRef.current || 0} | Err: {modelError || 'none'} | {fallbackDebugRef.current})</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3.5 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-400 animate-bounce">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">✨</div>
                      <div>
                        <p className="text-sm font-black text-emerald-300">OUT OF THIS WORLD! (CORRECT)</p>
                        <p className="text-[10px] text-emerald-500/80 font-sans">Awesome job! You made the gesture perfectly.</p>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="flex items-center space-x-3.5 p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center border border-rose-500/30">☄️</div>
                    <div>
                      <p className="text-sm font-black text-rose-300">TRY AGAIN</p>
                      <p className="text-[10px] text-rose-400/80 font-sans">Detected: <strong className="underline uppercase">{lastPrediction}</strong> (wanted: {selectedSign.name}).</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        

          </>
        )}
      </div>

      {/* Students Sidebar */}
      <div className="w-full lg:w-72 flex-shrink-0">
        {renderStudentSelectorSidebar()}
      </div>
    </div>
  );
  };

  const renderSesyonMenu = () => (
    <div className="flex flex-col items-center justify-center space-y-8 min-h-[60vh]">
      <div className="flex justify-center w-full mb-8">
        <div className="bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 rounded-full px-12 py-6 shadow-[0_0_20px_rgba(6,182,212,0.6)] flex-shrink-0 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(6,182,212,0.8)] mb-2">Choose Session Mode</h1>
          <p className="text-lg md:text-xl font-bold text-cyan-200 font-sans">Select how you want to practice today</p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full max-w-5xl">
        <button
          onClick={() => setModeTutorialModal('sandbox')}
          className="bg-slate-900/85 hover:bg-slate-800 backdrop-blur-sm border-2 border-fuchsia-500/50 hover:border-fuchsia-400 rounded-[32px] p-12 min-h-[360px] shadow-[0_0_30px_rgba(217,70,239,0.5)] flex flex-col items-center text-center transition-all transform hover:scale-105 group"
        >
          <div className="w-24 h-24 rounded-full bg-purple-900/50 flex items-center justify-center mb-6 border border-purple-700/50 group-hover:border-fuchsia-400 group-hover:scale-110 transition-all">
            <span className="text-5xl">👐</span>
          </div>
          <h2 className="text-3xl font-black text-fuchsia-400 mb-3">Practice</h2>
          <p className="text-sm font-sans text-slate-300 mb-6">Explore and practice FSL signs at your own pace with real-time AI feedback.</p>
          <span className="mt-auto inline-flex items-center space-x-1.5 text-sm font-black text-fuchsia-300 bg-fuchsia-950/60 border border-fuchsia-500/40 px-6 py-2 rounded-full uppercase tracking-wider group-hover:bg-fuchsia-600 group-hover:text-white transition-all">
            <span>❓ Tutorial & Start</span>
          </span>
        </button>

        <button
          onClick={() => setModeTutorialModal('game')}
          className="bg-slate-900/85 hover:bg-slate-800 backdrop-blur-sm border-2 border-cyan-500/50 hover:border-cyan-400 rounded-[32px] p-12 min-h-[360px] shadow-[0_0_30px_rgba(6,182,212,0.5)] flex flex-col items-center text-center transition-all transform hover:scale-105 group"
        >
          <div className="w-24 h-24 rounded-full bg-cyan-900/30 flex items-center justify-center mb-6 border border-cyan-500/50 group-hover:border-cyan-400 group-hover:scale-110 transition-all">
            <span className="text-5xl">🎮</span>
          </div>
          <h2 className="text-3xl font-black text-cyan-300 mb-3">Situational Game</h2>
          <p className="text-sm font-sans text-cyan-100/80 mb-6">Play an interactive game where you respond to scenarios using FSL.</p>
          <span className="mt-auto inline-flex items-center space-x-1.5 text-sm font-black text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-6 py-2 rounded-full uppercase tracking-wider group-hover:bg-cyan-600 group-hover:text-white transition-all">
            <span>❓ Tutorial & Start</span>
          </span>
        </button>

        <button
          onClick={() => setModeTutorialModal('spelling')}
          className="bg-slate-900/85 hover:bg-slate-800 backdrop-blur-sm border-2 border-emerald-500/50 hover:border-emerald-400 rounded-[32px] p-12 min-h-[360px] shadow-[0_0_30px_rgba(16,185,129,0.5)] flex flex-col items-center text-center transition-all transform hover:scale-105 group"
        >
          <div className="w-24 h-24 rounded-full bg-emerald-900/30 flex items-center justify-center mb-6 border border-emerald-500/50 group-hover:border-emerald-400 group-hover:scale-110 transition-all">
            <span className="text-5xl">🔤</span>
          </div>
          <h2 className="text-3xl font-black text-emerald-300 mb-3">Spelling Game</h2>
          <p className="text-sm font-sans text-emerald-100/80 mb-6">Practice your FSL alphabet by spelling out words!</p>
          <span className="mt-auto inline-flex items-center space-x-1.5 text-sm font-black text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-6 py-2 rounded-full uppercase tracking-wider group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <span>❓ Tutorial & Start</span>
          </span>
        </button>
      </div>
    </div>
  );


  const renderProgressView = () => {
    const alphabetLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

    const letterFrequencies = spellingWords.reduce((acc: any, word: string) => {
      for (const char of word.toUpperCase()) {
        if (!acc[char]) acc[char] = 0;
        acc[char]++;
      }
      return acc;
    }, {});

      const lettersProgress = alphabetLetters.map((letter) => {
        const records = dbProgressRecords.filter((r: any) => {
          if (progressStudentId !== 'ALL' && r.studentId !== progressStudentId) return false;
          return r.category && r.category.toUpperCase() === letter.toUpperCase();
        });
        
        let maxOccurrences = letterFrequencies[letter] || 1;
        // Cap each student's score contribution to maxOccurrences so one overachieving student doesn't skew the class average
        const totalScore = records.reduce((acc: number, curr: any) => acc + Math.min(Math.max(curr.score || 0, curr.completed ? 1 : 0), maxOccurrences), 0);
        
        if (progressStudentId === 'ALL') {
           maxOccurrences = maxOccurrences * Math.max(1, studentsList.length);
        }
        
        const val = Math.min(100, Math.round((totalScore / maxOccurrences) * 100));
      const color = val > 0 ? "bg-emerald-500" : "bg-slate-800/60";
      const warn = val > 0 && val < 50;
      return { name: letter, val, color, warn };
    });

    const defaultKilosList = [
      { key: "GOOD MORNING", name: "Good Morning", emoji: "🌅" },
      { key: "GOOD AFTERNOON", name: "Good Afternoon", emoji: "☀️" },
      { key: "GOOD EVENING", name: "Good Evening", emoji: "🌙" },
      { key: "HELLO", name: "Hello", emoji: "👋" },
      { key: "HOW ARE YOU", name: "How Are You", emoji: "❓" },
      { key: "IM FINE", name: "I'm Fine", emoji: "😊" },
      { key: "NICE TO MEET YOU", name: "Nice to Meet You", emoji: "🤝" },
      { key: "THANK YOU", name: "Thank You", emoji: "🙏" },
      { key: "YOURE WELCOME", name: "You're Welcome", emoji: "😇" },
      { key: "SEE YOU TOMORROW", name: "See You Tomorrow", emoji: "👋" },
      { key: "YES", name: "Yes", emoji: "👍" },
      { key: "NO", name: "No", emoji: "👎" },
      { key: "CORRECT", name: "Correct", emoji: "✅" },
      { key: "WRONG", name: "Wrong", emoji: "❌" },
      { key: "UNDERSTAND", name: "Understand", emoji: "💡" },
      { key: "DON’T UNDERSTAND", name: "Don't Understand", emoji: "🤔" },
      { key: "KNOW", name: "Know", emoji: "🧠" },
      { key: "DON’T KNOW", name: "Don't Know", emoji: "🤷" },
      { key: "FAST", name: "Fast", emoji: "⚡" },
      { key: "SLOW", name: "Slow", emoji: "🐢" }
    ];

const kilosProgress = defaultKilosList.map((item) => {
      const records = dbProgressRecords.filter((r: any) => {
        if (progressStudentId !== 'ALL' && r.studentId !== progressStudentId) return false;
        return r.category && (
          r.category.toUpperCase() === item.key.toUpperCase() ||
          r.category.toUpperCase().includes(item.key.toUpperCase())
        );
      });
      
      let maxScore = SIGN_MAX_OCCURRENCES[item.key.toUpperCase()] || 1;
      // Cap each student's score contribution to maxScore so one overachieving student doesn't skew the class average
      const totalScore = records.reduce((acc: number, curr: any) => acc + Math.min(Math.max(curr.score || 0, curr.completed ? 1 : 0), maxScore), 0);
      
      if (progressStudentId === 'ALL') {
         maxScore = maxScore * Math.max(1, studentsList.length);
      }
      const progressPercent = Math.min(100, Math.round((totalScore / maxScore) * 100));
      
      const val = progressPercent;
      const color = val > 0 ? "bg-emerald-500" : "bg-slate-800/60";
      const warn = val > 0 && val < 50;
      return { name: item.name, emoji: item.emoji, val, color, warn };
    });

    // Sorted leaderboard based on dynamic studentList state points
const filteredLeaderboard = studentsList.filter((s: any) => {
      const matchesSearch = s.name.toLowerCase().includes(progressSearchTerm.toLowerCase());
      const matchesGrade = progressGradeFilter === 'ALL' || s.grade === progressGradeFilter;
      return matchesSearch && matchesGrade;
    });
    const sortedLeaderboard = [...filteredLeaderboard].sort((a, b) => (b.points || 0) - (a.points || 0));

        const handleExportClick = () => {
      let targetStudents: any[] = [];
      if (progressStudentId !== 'ALL') {
        const std = studentsList.find((s: any) => s.id === progressStudentId);
        if (std) targetStudents = [std];
      } else {
        targetStudents = studentsList.filter((s: any) => progressGradeFilter === 'ALL' || s.grade === progressGradeFilter);
      }

      if (targetStudents.length === 0) {
        alert("No students to export.");
        return;
      }
      setShowCsvConfirm(true);
    };

    const executeExportCSV = () => {
      setShowCsvConfirm(false);
      let targetStudents: any[] = [];
      if (progressStudentId !== 'ALL') {
        const std = studentsList.find((s: any) => s.id === progressStudentId);
        if (std) targetStudents = [std];
      } else {
        targetStudents = studentsList.filter((s: any) => progressGradeFilter === 'ALL' || s.grade === progressGradeFilter);
      }

      const header = ["Student Name", "Teacher Name", "Grade", "Total Points"];
      if (csvExportType === 'both' || csvExportType === 'letters') {
        alphabetLetters.forEach(l => header.push(`Letter ${l} (%)`));
      }
      if (csvExportType === 'both' || csvExportType === 'gestures') {
        defaultKilosList.forEach(k => header.push(`Sign ${k.name} (%)`));
      }
      
      const rows = [header.join(",")];

      targetStudents.forEach((student: any) => {
        const row = [
          `"${student.name}"`, 
          `"${activeUser ? activeUser.name : 'Admin'}"`,
          `"${student.grade || 'N/A'}"`, 
          student.points || 0
        ];
        
        if (csvExportType === 'both' || csvExportType === 'letters') {
          alphabetLetters.forEach(letter => {
            const records = dbProgressRecords.filter((r: any) => r.studentId === student.id && r.category && r.category.toUpperCase() === letter.toUpperCase());
            let maxOccurrences = letterFrequencies[letter] || 1;
            const totalScore = records.reduce((acc: number, curr: any) => acc + Math.min(Math.max(curr.score || 0, curr.completed ? 1 : 0), maxOccurrences), 0);
            const val = Math.min(100, Math.round((totalScore / maxOccurrences) * 100));
            row.push(`${val}%`);
          });
        }

        if (csvExportType === 'both' || csvExportType === 'gestures') {
          defaultKilosList.forEach(kilo => {
            const records = dbProgressRecords.filter((r: any) => r.studentId === student.id && r.category === kilo.key);
            const totalScore = records.reduce((acc: number, curr: any) => acc + Math.min(Math.max(curr.score || 0, curr.completed ? 1 : 0), 1), 0);
            const val = Math.min(100, Math.round((totalScore / 1) * 100));
            row.push(`${val}%`);
          });
        }

        rows.push(row.join(","));
      });

      const csvContent = rows.join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const teacherStr = activeUser ? activeUser.name.replace(/\s+/g, '_') : 'Admin';
      const targetStr = progressStudentId !== 'ALL' && targetStudents.length > 0 
        ? targetStudents[0].name.replace(/\s+/g, '_') 
        : progressGradeFilter.replace(' ', '_');
      link.setAttribute('download', `Signo_Progress_${teacherStr}_${targetStr}_${csvExportType.toUpperCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    let selectionText = "";
    if (progressStudentId !== 'ALL') {
      const std = studentsList.find((s: any) => s.id === progressStudentId);
      selectionText = std ? `Student: ${std.name}` : "This Student";
    } else {
      selectionText = progressGradeFilter === 'ALL' ? "All Students" : progressGradeFilter;
    }

    const activeList = (progressTab === 'titik' ? lettersProgress : kilosProgress) as any[];

    return (
      <div className="flex flex-col space-y-5 text-left">
        {showCsvConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#020617] border-2 border-emerald-500/30 p-8 rounded-[32px] shadow-[0_0_50px_rgba(16,185,129,0.2)] max-w-sm w-full mx-4 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 text-emerald-400 shadow-inner border border-emerald-400/30">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Export CSV?</h3>
              <div className="text-purple-200 text-sm font-medium mb-5 text-center leading-relaxed flex flex-col items-center">
                Are you sure you want to export the progress for:
                <span className="inline-block mt-2 px-4 py-1.5 bg-emerald-500/10 border-2 border-emerald-400/50 text-emerald-300 font-black rounded-xl uppercase tracking-widest shadow-inner text-xs">
                  {selectionText}
                </span>
              </div>
              
              <div className="w-full flex flex-col space-y-2 mb-6">
                <span className="text-[10px] font-black text-emerald-200/80 uppercase tracking-widest text-left ml-1">Select Data to Export:</span>
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/10 shadow-inner">
                  <button
                    onClick={() => setCsvExportType('both')}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${csvExportType === 'both' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-emerald-400 hover:text-white hover:bg-white/5'}`}
                  >
                    BOTH
                  </button>
                  <button
                    onClick={() => setCsvExportType('letters')}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${csvExportType === 'letters' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-emerald-400 hover:text-white hover:bg-white/5'}`}
                  >
                    LETTERS
                  </button>
                  <button
                    onClick={() => setCsvExportType('gestures')}
                    className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${csvExportType === 'gestures' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-emerald-400 hover:text-white hover:bg-white/5'}`}
                  >
                    GESTURES
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-3 w-full">
                <button 
                  onClick={() => setShowCsvConfirm(false)}
                  className="flex-1 py-3 bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-sm font-black rounded-xl tracking-wider transition-all shadow-md"
                >
                  CANCEL
                </button>
                <button 
                  onClick={executeExportCSV}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black rounded-xl tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                  EXPORT
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="relative flex flex-col md:flex-row items-end justify-between gap-6 mb-4 w-full h-[140px]">
          <div className="absolute inset-0 flex justify-center pointer-events-none z-0">
              <div className="bg-[#0f172a] backdrop-blur-md border border-cyan-400/80 rounded-[40px] px-24 py-8 h-fit shadow-[0_0_30px_rgba(6,182,212,0.4)] text-center hidden lg:block -mt-4">
                <h1 className="text-5xl font-black text-white tracking-widest uppercase" style={{ textShadow: '0 0 20px rgba(6,182,212,1), 0 0 30px rgba(6,182,212,0.8)' }}>PROGRESS</h1>
              </div>
            </div>
          <div className="flex-1 flex justify-start z-10 w-full md:w-auto">
          {/* Sub tabs switcher */}
          <div className="flex items-center space-x-1.5 bg-slate-800/40 border border-cyan-500/30 rounded-2xl p-1.5 w-fit font-sans">
            <button
              type="button"
              onClick={() => setProgressTab('titik')}
              className={`px-5 py-2.5 rounded-xl text-sm md:text-base font-black tracking-wide transition duration-200 border flex items-center space-x-1.5 ${
                progressTab === 'titik'
                  ? 'bg-[#3b82f6] text-white border-[#60a5fa]/30 shadow-md'
                  : 'bg-purple-950/60 text-purple-300 hover:text-white border-transparent'
              }`}
            >
              <span>abc</span>
              <span>Letters</span>
            </button>
            
            <button
              type="button"
              onClick={() => setProgressTab('kilos')}
              className={`px-5 py-2.5 rounded-xl text-sm md:text-base font-black tracking-wide transition duration-200 border flex items-center space-x-1.5 ${
                progressTab === 'kilos'
                  ? 'bg-[#3b82f6] text-white border-[#60a5fa]/30 shadow-md'
                  : 'bg-purple-950/60 text-purple-300 hover:text-white border-transparent'
              }`}
            >
              <span>✌️</span>
              <span>Gestures</span>
            </button>
          </div>

          </div>
          <div className="flex-1 flex justify-end z-10 w-full md:w-auto space-x-2">
            {progressStudentId !== 'ALL' && (
              <button
                onClick={() => setProgressStudentId('ALL')}
                className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm md:text-base font-black px-6 py-3 rounded-xl border border-fuchsia-400 shadow-lg transition-all active:scale-95 uppercase tracking-wide"
              >
                ← View Class Progress
              </button>
            )}
          
            <button
              onClick={handleExportClick}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm md:text-base font-black px-5 py-2.5 rounded-xl border border-emerald-400 shadow-lg transition-all active:scale-95 uppercase tracking-wide flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path></svg>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* 2 Cols Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Progress Columns */}
          <div className="lg:col-span-3 bg-slate-950/95 backdrop-blur-md border border-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] rounded-3xl p-6 shadow-xl flex flex-col max-h-[70vh] overflow-y-auto relative">
            <div className="absolute top-[20%] left-[10%] opacity-5 text-5xl pointer-events-none select-none">🖐️</div>
            <div className="absolute bottom-[30%] right-[15%] opacity-5 text-5xl pointer-events-none select-none">✌️</div>
            <div className="absolute top-[60%] right-[30%] opacity-5 text-5xl pointer-events-none select-none">👍</div>
            <div className="absolute bottom-[10%] left-[25%] opacity-5 text-5xl pointer-events-none select-none">👌</div>
            
            <div className="space-y-4 relative z-10 font-sans">
              {activeList.map((item) => (
                <div key={item.name} className="flex items-center space-x-4">
                  {progressTab === 'titik' ? (
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-cyan-500/40 flex items-center justify-center font-black text-lg text-cyan-300 select-none flex-shrink-0 shadow-inner">
                      {item.name}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-cyan-500/40 flex items-center justify-center text-xl select-none flex-shrink-0">
                      {item.emoji}
                    </div>
                  )}

                  {progressTab === 'kilos' && (
                    <div className="w-48 text-sm font-bold text-slate-200 truncate flex-shrink-0 text-left">
                      {item.name}
                    </div>
                  )}

                  <div className="flex-1 bg-slate-900/80 rounded-full h-6 border border-cyan-500/30 overflow-hidden shadow-inner relative">
                    <div className={`${item.color} h-6 rounded-full transition-all duration-500`} style={{ width: `${item.val}%` }}></div>
                  </div>

                  <div className="w-16 flex items-center justify-end space-x-1.5 flex-shrink-0 text-right">
                    <span className="text-sm md:text-base font-black text-slate-100">{item.val}%</span>
                    {item.warn && (
                      <span className="text-xs text-yellow-400 select-none animate-pulse" title="Needs practice!">⚠️</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

{/* Leaderboard Column */}
          <div className="lg:col-span-2 flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-start gap-4">
                <div className="bg-slate-800/80 backdrop-blur-md border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-2xl px-4 py-2 w-fit shadow-lg text-left select-none flex items-center h-12">
                <h3 className="text-sm font-black text-white tracking-widest uppercase flex items-center space-x-1.5">
                  <span>🏆</span>
                  <span>Top Students</span>
                </h3>
              </div>
            <div className="flex flex-wrap items-center gap-2">
                <select
                value={progressGradeFilter}
                onChange={(e) => {
                   setProgressGradeFilter(e.target.value);
                   setProgressStudentId('ALL');
                }}
                className="bg-slate-800/80 border border-cyan-500/40 text-slate-100 text-sm md:text-base font-bold rounded-xl px-4 h-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 font-sans shadow-inner cursor-pointer"
              >
                <option value="ALL" className="bg-slate-800 text-white font-bold">All Grades</option>
                <option value="Grade 1" className="bg-slate-800 text-blue-400 font-bold">Grade 1</option>
                <option value="Grade 2" className="bg-slate-800 text-yellow-400 font-bold">Grade 2</option>
                <option value="Grade 3" className="bg-slate-800 text-emerald-400 font-bold">Grade 3</option>
                
              </select>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input
                  type="text"
                  placeholder="Search..."
                  value={progressSearchTerm}
                  onChange={(e) => setProgressSearchTerm(e.target.value)}
                  className="bg-slate-800/80 border border-cyan-500/40 text-slate-100 text-sm md:text-base font-bold rounded-xl pl-11 pr-4 h-12 focus:outline-none focus:ring-2 focus:ring-cyan-400 w-40 md:w-56 font-sans shadow-inner placeholder-slate-400"
                />
              </div>
            </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-3xl p-6 shadow-xl flex flex-col space-y-3.5 flex-1 justify-start overflow-y-auto max-h-[65vh] scrollbar-thin scrollbar-thumb-fuchsia-500 pr-2">
              <p className="text-sm md:text-base text-fuchsia-300 font-bold uppercase tracking-widest mb-3 text-center bg-fuchsia-900/30 py-4 rounded-xl border border-fuchsia-400/30">
                👆 Click a student to view their progress
              </p>
              {sortedLeaderboard.map((std, index) => (
                <div 
                  key={std.id}
                  onClick={() => setProgressStudentId(std.id)}
                  className={`border rounded-2xl p-4 flex items-center justify-between shadow-md relative overflow-hidden cursor-pointer transition-all active:scale-[0.98] ${
                    progressStudentId === std.id 
                      ? (std.grade === "Grade 1" ? 'bg-blue-900/60 border-blue-400 ring-2 ring-blue-400/50' : std.grade === "Grade 2" ? 'bg-yellow-900/60 border-yellow-400 ring-2 ring-yellow-400/50' : std.grade === "Grade 3" ? 'bg-emerald-900/60 border-emerald-400 ring-2 ring-emerald-400/50' : 'bg-cyan-900/60 border-cyan-400 ring-2 ring-cyan-400/50')
                      : (std.grade === "Grade 1" ? 'bg-blue-900/70 border-blue-800/50 hover:bg-blue-800/80 hover:border-blue-500/50' : std.grade === "Grade 2" ? 'bg-yellow-900/70 border-yellow-800/50 hover:bg-yellow-800/80 hover:border-yellow-500/50' : std.grade === "Grade 3" ? 'bg-emerald-900/70 border-emerald-800/50 hover:bg-emerald-800/80 hover:border-emerald-500/50' : 'bg-slate-800/95 border-slate-600 hover:bg-slate-700/90 hover:border-cyan-500/50')
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-2 h-full ${std.grade === "Grade 1" ? "bg-blue-500" : std.grade === "Grade 2" ? "bg-yellow-500" : std.grade === "Grade 3" ? "bg-emerald-500" : "bg-cyan-500"}`} />

                  <div className="flex items-center space-x-3 text-left">
                    <div className="text-3xl bg-yellow-500/10 w-11 h-11 rounded-full border border-yellow-500/20 flex items-center justify-center select-none">
                      {std.emoji}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-white text-base leading-tight">{std.name}</h4>
                      <p className="text-[10px] text-purple-300 font-bold uppercase mt-0.5">{std.grade}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-1 select-none">
                      <span className="text-yellow-400 text-sm">⭐</span>
                      <span className="text-sm font-black text-yellow-300 font-sans">{std.points} Points</span>
                    </div>
                    <span className="text-sm md:text-base text-slate-300 font-black tracking-widest mt-1.5 font-sans">
                      #{index + 1}
                    </span>
                  </div>
                </div>
              ))}

              {sortedLeaderboard.length === 0 && (
                <p className="text-purple-300 text-sm font-sans font-medium text-center py-6">No students registered yet.</p>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };


    const renderAdminOverview = () => {
      const totalTeachers = teachersList.length;
      const totalStudents = studentsList.length;
      const totalPoints = studentsList.reduce((acc, curr) => acc + (curr.points || 0), 0);
      const totalSessions = teachersList.reduce((acc, curr) => acc + (curr.sessionsCount || 0), 0);
  
      // Get real top 4 students globally
      const globalTopStudents = [...studentsList].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5);
  
      return (
        <div className="flex flex-col space-y-6 text-left w-full">
          {/* Stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
            <div className="bg-[#10b981]/95 border border-[#34d399]/30 rounded-3xl p-6 shadow-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{totalTeachers}</span>
                <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mt-1">Registered Teachers</span>
              </div>
              <div className="text-3xl bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center select-none shadow-inner">👨‍🏫</div>
            </div>
  
            <div className="bg-[#f59e0b]/95 border border-[#fbbf24]/30 rounded-3xl p-6 shadow-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{totalStudents}</span>
                <span className="text-[10px] font-black text-amber-100 uppercase tracking-widest mt-1">Registered Students</span>
              </div>
              <div className="text-3xl bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center select-none shadow-inner">🧑‍🎓</div>
            </div>
  
            <div className="bg-[#3b82f6]/95 border border-[#60a5fa]/30 rounded-3xl p-6 shadow-xl flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-3xl font-black text-white">{totalPoints}</span>
                <span className="text-[10px] font-black text-blue-100 uppercase tracking-widest mt-1">Total Points</span>
              </div>
              <div className="text-3xl bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center select-none shadow-inner">⭐</div>
            </div>
          </div>
  
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
            <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-[32px] p-6 shadow-xl flex flex-col space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Platform Usage</h3>
              <div className="flex-1 flex flex-col justify-center items-center space-y-4 opacity-90 py-4">
                <div className="w-20 h-20 bg-blue-500/20 rounded-full border-4 border-blue-400 flex items-center justify-center">
                  <span className="text-2xl font-black text-blue-300">{totalSessions}</span>
                </div>
                <div className="text-center">
                  <p className="text-blue-300 font-bold text-lg">Total Signs Practiced</p>
                  <p className="text-xs text-purple-300 mt-1">All games and practices in Signo</p>
                </div>
                
                <div className="w-full border-t border-white/10 pt-4 mt-2">
                  <div className="flex items-center justify-between px-4">
                     <span className="text-xs font-bold text-slate-300">Database Connection</span>
                     <span className="text-xs font-black text-emerald-400 flex items-center"><span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse mr-2"></span> Connected</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-[32px] p-6 shadow-xl flex flex-col space-y-4">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Top 5 Students</h3>
              <div className="flex-1 flex flex-col space-y-3 pr-2">
                {globalTopStudents.length > 0 ? globalTopStudents.map((student, i) => (
                  <div key={i} className="flex items-center justify-between bg-purple-950/40 p-3 rounded-xl border border-purple-800/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-lg">{student.emoji || '👤'}</div>
                      <div className="flex flex-col">
                        <span className="text-white text-xs font-bold uppercase">{student.name}</span>
                        <span className="text-purple-300 text-[10px]">{student.grade}</span>
                      </div>
                    </div>
                    <div className="bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-[10px] font-black tracking-widest">
                      {student.points || 0} PTS
                    </div>
                  </div>
                )) : (
                  <div className="flex-1 flex items-center justify-center text-purple-300 text-xs font-bold">
                    No students found.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    };

  const renderAdminGuroView = () => {
const aktiboCount = teachersList.filter(t => t.status === 'Aktibo' || t.status === 'AKTIBO').length;
    const hindiAktiboCount = teachersList.filter(t => t.status === 'Hindi Aktibo' || t.status === 'HINDI_AKTIBO').length;
    const sessionsCount = teachersList.reduce((acc, t) => acc + (t.sessionsCount || 0), 0);
    const filteredTeachers = teachersList.filter(t => t.name.toLowerCase().includes(guroSearchTerm.toLowerCase()) || t.email.toLowerCase().includes(guroSearchTerm.toLowerCase()) || (t.school && t.school.toLowerCase().includes(guroSearchTerm.toLowerCase())));

    const handleDeleteTeacher = async (id: string | number) => {
      try {
        await fetch(`/api/admin/teachers?id=${id}`, { method: 'DELETE' });
      } catch (err) {
        console.error('Error deleting teacher from DB:', err);
      }
      setTeachersList(prev => prev.filter(t => t.id !== id));
    };

    const handleToggleTeacherStatus = async (id: string | number, currentStatus: string) => {
      const newStatus = currentStatus === 'Aktibo' ? 'Hindi Aktibo' : 'Aktibo';
      try {
        await fetch('/api/admin/teachers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus }),
        });
      } catch (err) {
        console.error('Error updating teacher status in DB:', err);
      }
      setTeachersList(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    };

    return (
      <div className="flex flex-col space-y-6 text-left">
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          <div className="bg-[#10b981]/95 border border-[#34d399]/30 rounded-3xl p-6 shadow-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white">{aktiboCount}</span>
              <span className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mt-1">Active Teachers</span>
            </div>
            <div className="text-3xl bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center select-none shadow-inner">✔️</div>
          </div>

          <div className="bg-[#ef4444]/95 border border-[#f87171]/30 rounded-3xl p-6 shadow-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white">{hindiAktiboCount}</span>
              <span className="text-[10px] font-black text-rose-100 uppercase tracking-widest mt-1">Inactive</span>
            </div>
            <div className="text-3xl bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center select-none shadow-inner">⏸️</div>
          </div>

          <div className="bg-[#06b6d4]/95 border border-[#22d3ee]/30 rounded-3xl p-6 shadow-xl flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-3xl font-black text-white">{sessionsCount}</span>
              <span className="text-[10px] font-black text-cyan-100 uppercase tracking-widest mt-1">Signs Practiced</span>
            </div>
            <div className="text-3xl bg-white/20 w-14 h-14 rounded-2xl flex items-center justify-center select-none shadow-inner">📹</div>
          </div>
        </div>

        {/* Table container */}
        <div className="flex-1 bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-[32px] p-6 shadow-xl flex flex-col space-y-4 w-full">
          <div className="flex items-center justify-between w-full">
            <h3 className="text-sm font-black text-white tracking-widest uppercase">Teacher Masterlist</h3>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={guroSearchTerm}
                onChange={(e) => setGuroSearchTerm(e.target.value)}
                className="bg-purple-950/60 border border-purple-500/30 text-white text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-500 w-64 font-sans"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 w-full scrollbar-thin scrollbar-thumb-fuchsia-500">
            <div className="w-full min-w-[800px] flex flex-col font-sans text-xs">
              {/* Grid Header */}
              <div className="grid grid-cols-12 gap-4 border-b border-purple-800/40 text-purple-200 font-black uppercase tracking-wider text-[10px] pb-4 pt-2 px-4 sticky top-0 bg-[#0f172a] z-10 shadow-sm w-full">
                <div className="col-span-3 flex items-center">Teacher</div>
                <div className="col-span-3 flex items-center">Email</div>
                <div className="col-span-3 flex items-center">School</div>
                <div className="col-span-1 flex items-center justify-center">Students</div>
                <div className="col-span-1 flex items-center justify-center">Signs</div>
                <div className="col-span-1 flex items-center justify-end pr-2">Action</div>
              </div>
              
              {/* Grid Body */}
              <div className="divide-y divide-purple-800/20 text-slate-100 font-semibold w-full">
                {filteredTeachers.map((teacher) => (
                  <div key={teacher.id} className="grid grid-cols-12 gap-4 items-center hover:bg-purple-950/20 transition py-4 px-4 w-full">
                    {/* Guro Col */}
                    <div className="col-span-3 flex items-center space-x-3 overflow-hidden">
                      <div className="text-2xl w-9 h-9 rounded-full bg-purple-950/60 border border-purple-850/40 flex items-center justify-center select-none flex-shrink-0">
                        {teacher.emoji}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-white font-bold uppercase tracking-wider text-xs truncate">{teacher.name}</span>
                        <span className={`text-[9px] px-2 py-0.5 mt-1 rounded-full w-fit uppercase font-black tracking-widest ${teacher.status === 'Aktibo' || teacher.status === 'AKTIBO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                          {teacher.status === 'AKTIBO' || teacher.status === 'Aktibo' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Email Col */}
                    <div className="col-span-3 truncate text-purple-300 font-bold pr-2">{teacher.email}</div>
                    
                    {/* Paaralan Col */}
                    <div className="col-span-3 truncate text-slate-300 pr-2">{teacher.school}</div>
                    
                    {/* Mag-aaral Col */}
                    <div className="col-span-1 text-center font-black text-slate-200">{teacher.studentsCount}</div>
                    
                    {/* Mga Senyas Col */}
                    <div className="col-span-1 text-center font-black text-slate-200">{teacher.sessionsCount}</div>
                    
                    {/* Aksyon Col */}
                    <div className="col-span-1 flex items-center justify-end space-x-3 pr-2">
                      {(teacher.status === 'Hindi Aktibo' || teacher.status === 'HINDI_AKTIBO') && (
                        <button 
                          type="button"
                          onClick={() => handleToggleTeacherStatus(teacher.id, 'Hindi Aktibo')}
                          className="text-emerald-500 hover:text-emerald-400 transition bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20" 
                          title="Restore"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      <button 
                        type="button"
                        onClick={() => {
                          if (teacher.status === 'Aktibo' || teacher.status === 'AKTIBO') {
                            handleToggleTeacherStatus(teacher.id, 'Aktibo'); 
                          } else {
                            setTeacherToDelete(teacher.id);
                          }
                        }}
                        className={`${(teacher.status === 'Aktibo' || teacher.status === 'AKTIBO') ? 'text-amber-500 hover:text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-red-500 hover:text-red-400 bg-red-500/10 border-red-500/20'} transition p-1.5 rounded-lg border`} 
                        title={(teacher.status === 'Aktibo' || teacher.status === 'AKTIBO') ? "Deactivate" : "Permanently Delete"}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          {(teacher.status === 'Aktibo' || teacher.status === 'AKTIBO') ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          )}
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
                {filteredTeachers.length === 0 && (
                  <div className="w-full text-center py-8 text-purple-300 font-bold">No teachers found.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Custom Delete Modal Overlay */}
        {teacherToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] p-8 rounded-3xl shadow-2xl max-w-sm w-full mx-4 flex flex-col items-center text-center space-y-5">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <h3 className="text-xl font-black text-white">Permanently Delete?</h3>
              <p className="text-purple-200 text-sm">Are you sure you want to permanently delete this teacher? This cannot be undone.</p>
              <div className="flex items-center space-x-4 w-full mt-4">
                <button 
                  onClick={() => setTeacherToDelete(null)}
                  className="flex-1 py-3 bg-purple-900/50 hover:bg-purple-800 text-white rounded-xl font-bold transition"
                >
                  Kanselahin
                </button>
                <button 
                  onClick={() => {
                    handleDeleteTeacher(teacherToDelete);
                    setTeacherToDelete(null);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-900/50 transition"
                >
                  Burahin
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAdminAnalyticsView = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left font-sans">
        <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-[32px] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center space-x-2 mb-6">
            <span className="inline-block w-3.5 h-3.5 bg-blue-500 rounded" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Sessions Per Day</h3>
          </div>
          
          <div className="flex items-end justify-between h-64 border-b border-purple-800/40 pb-2 px-4 relative">
            <div className="absolute inset-x-0 top-0 border-t border-purple-900/10 pointer-events-none" />
            <div className="absolute inset-x-0 top-[25%] border-t border-purple-900/10 pointer-events-none" />
            <div className="absolute inset-x-0 top-[50%] border-t border-purple-900/10 pointer-events-none" />
            <div className="absolute inset-x-0 top-[75%] border-t border-purple-900/10 pointer-events-none" />

            <div className="flex flex-col items-center flex-1 space-y-2 z-10">
              <span className="text-[10px] font-black text-red-400">8</span>
              <div className="w-10 bg-gradient-to-t from-red-800 to-red-500 rounded-t-lg transition-all duration-500 hover:opacity-90" style={{ height: '80px' }} />
              <span className="text-[10px] font-bold text-purple-300 mt-1">Lun</span>
            </div>
            <div className="flex flex-col items-center flex-1 space-y-2 z-10">
              <span className="text-[10px] font-black text-red-400">12</span>
              <div className="w-10 bg-gradient-to-t from-red-800 to-red-500 rounded-t-lg transition-all duration-500 hover:opacity-90" style={{ height: '120px' }} />
              <span className="text-[10px] font-bold text-purple-300 mt-1">Mar</span>
            </div>
            <div className="flex flex-col items-center flex-1 space-y-2 z-10">
              <span className="text-[10px] font-black text-red-400">10</span>
              <div className="w-10 bg-gradient-to-t from-red-800 to-red-500 rounded-t-lg transition-all duration-500 hover:opacity-90" style={{ height: '100px' }} />
              <span className="text-[10px] font-bold text-purple-300 mt-1">Miy</span>
            </div>
            <div className="flex flex-col items-center flex-1 space-y-2 z-10">
              <span className="text-[10px] font-black text-red-400">14</span>
              <div className="w-10 bg-gradient-to-t from-red-800 to-red-500 rounded-t-lg transition-all duration-500 hover:opacity-90" style={{ height: '140px' }} />
              <span className="text-[10px] font-bold text-purple-300 mt-1">Huw</span>
            </div>
            <div className="flex flex-col items-center flex-1 space-y-2 z-10">
              <span className="text-[10px] font-black text-red-400">16</span>
              <div className="w-10 bg-gradient-to-t from-red-800 to-red-500 rounded-t-lg transition-all duration-500 hover:opacity-90" style={{ height: '160px' }} />
              <span className="text-[10px] font-bold text-purple-300 mt-1">Biy</span>
            </div>
            <div className="flex flex-col items-center flex-1 space-y-2 z-10">
              <span className="text-[10px] font-black text-red-400">6</span>
              <div className="w-10 bg-gradient-to-t from-red-800 to-red-500 rounded-t-lg transition-all duration-500 hover:opacity-90" style={{ height: '60px' }} />
              <span className="text-[10px] font-bold text-purple-300 mt-1">Sab</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-sm border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] rounded-[32px] p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center space-x-2 mb-6">
            <span className="inline-block w-3.5 h-3.5 bg-emerald-500 rounded" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">Paggamit ng Bawat Modyul</h3>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-around h-64">
            <div className="relative w-40 h-40 rounded-full flex items-center justify-center flex-shrink-0" style={{
              background: 'conic-gradient(#06b6d4 0% 44%, #10b981 44% 73%, #ec4899 73% 89%, #8b5cf6 89% 100%)'
            }}>
              <div className="w-26 h-26 rounded-full bg-[#1e083c] flex flex-col items-center justify-center text-center shadow-lg border border-purple-900/40">
                <span className="text-xl font-black text-white leading-none">338</span>
                <span className="text-[8px] text-purple-300 font-bold uppercase mt-1">kabuuang gamit</span>
              </div>
            </div>

            <div className="space-y-3 w-full md:w-auto text-xs font-semibold mt-4 md:mt-0">
              <div className="flex items-center justify-between md:space-x-12">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#06b6d4]" />
                  <span className="text-slate-200">Letra</span>
                </div>
                <span className="text-cyan-400 font-black">44%</span>
              </div>
              
              <div className="flex items-center justify-between md:space-x-12">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#10b981]" />
                  <span className="text-slate-200">Pagbati</span>
                </div>
                <span className="text-emerald-400 font-black">29%</span>
              </div>

              <div className="flex items-center justify-between md:space-x-12">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#ec4899]" />
                  <span className="text-slate-200">I-Spell!</span>
                </div>
                <span className="text-pink-400 font-black">16%</span>
              </div>

              <div className="flex items-center justify-between md:space-x-12">
                <div className="flex items-center space-x-2.5">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#8b5cf6]" />
                  <span className="text-slate-200">Practice</span>
                </div>
                <span className="text-purple-400 font-black">12%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminLogsView = () => {
    const appLogs = [
      { time: "09:40:12", level: "INFO", desc: "MediaPipe initialized successfully in 1.4s" },
      { time: "09:39:55", level: "INFO", desc: "Webcam stream loaded (640x480 @ 30fps)" },
      { time: "09:35:02", level: "INFO", desc: "TensorFlow model loaded from cache: size 4.2MB" },
      { time: "09:20:18", level: "INFO", desc: "Connection established to Signo Core Websocket" },
      { time: "08:55:40", level: "INFO", desc: "Cache warmed for module: Pagbati (Greetings)" },
      { time: "08:12:30", level: "INFO", desc: "Static asset pre-fetching completed" },
      { time: "07:30:00", level: "INFO", desc: "Daily audit maintenance scheduler triggered" }
    ];

    const auditLogs = [
      { time: "09:38:55", level: "LOGIN", desc: "G. Santos -- Matagumpay na nag-login mula sa PSD Pasay" },
      { time: "09:15:37", level: "LOGIN", desc: "Gng. Reyes -- Matagumpay na nag-login mula sa PSD Pasay" },
      { time: "08:58:14", level: "LOGIN", desc: "Gng. Reyes -- Matagumpay na nag-login - unang sesyon ngayong araw" },
      { time: "08:45:11", level: "EDIT", desc: "Admin -- In-update ang profile ng G. Garcia (status -> inactive)" },
      { time: "08:30:22", level: "FAIL", desc: "G. Garcia -- 3 bagsak na login - account naka-lock ng 15 minuto" },
      { time: "08:12:05", level: "LOGIN", desc: "Admin -- Admin nag-login sa Admin Portal" },
      { time: "07:58:40", level: "ADD", desc: "Admin -- Bagong guro na-register: G. Santos (PSD Pasay)" },
      { time: "07:45:00", level: "LOGOUT", desc: "G. Santos -- Nag-logout pagkatapos ng 3 sesyon" },
      { time: "07:30:18", level: "DELETE", desc: "Admin -- Na-delete ang account ng G. Garcia (inactibo 90d)" },
      { time: "07:10:02", level: "LOGOUT", desc: "G. Santos -- Nag-logout - session expired pagkatapos ng 2 oras" }
    ];

    const errorLogs = [
      { time: "09:10:09", level: "ERROR", code: "CAM-001", desc: "Webcam feed timeout - Klase 2B, hindi na-reconnect after 30s" },
      { time: "09:22:01", level: "WARN", code: "SRV-012", desc: "Mataas na CPU load sa MediaPipe server (87% - threshold: 88%)" },
      { time: "07:55:14", level: "WARN", code: "DET-003", desc: "Mabagal ang gesture detection - latency 340ms (normal: <100ms)" },
      { time: "08:30:22", level: "WARN", code: "SEC-007", desc: "Maraming bagsak na login para sa G. Garcia - account naka-lock" },
      { time: "06:45:30", level: "ERROR", code: "DB-021", desc: "Database connection blip - 2.3s downtime, auto-recovered" },
      { time: "06:10:05", level: "WARN", code: "NET-004", desc: "Mabagal ang network sa PSD Pasay - packet loss 12%" },
      { time: "05:30:44", level: "ERROR", code: "MP-009", desc: "MediaPipe model crash - auto-restarted pagkatapos ng 8 segundo" },
      { time: "04:15:18", level: "WARN", code: "STR-002", desc: "Mababang storage sa logs partition - 78% puno (threshold: 75%)" }
    ];

    return (
      <div className="flex flex-col space-y-5 text-left font-sans">
        <div className="flex items-center space-x-3 bg-slate-800/40 border border-cyan-500/30 rounded-2xl p-2 w-fit">
          <button
            type="button"
            onClick={() => setAdminLogTab('app')}
            className={`px-6 py-3 rounded-xl text-sm md:text-base font-black tracking-wide transition duration-200 border ${
              adminLogTab === 'app'
                ? 'bg-[#3b82f6] text-white border-[#60a5fa]/30 shadow-md'
                : 'bg-purple-950/60 text-purple-300 hover:text-white border-transparent'
            }`}
          >
            Application Log
          </button>
          
          <button
            type="button"
            onClick={() => setAdminLogTab('audit')}
            className={`px-6 py-3 rounded-xl text-sm md:text-base font-black tracking-wide transition duration-200 border ${
              adminLogTab === 'audit'
                ? 'bg-[#3b82f6] text-white border-[#60a5fa]/30 shadow-md'
                : 'bg-purple-950/60 text-purple-300 hover:text-white border-transparent'
            }`}
          >
            Audit Log
          </button>

          <button
            type="button"
            onClick={() => setAdminLogTab('error')}
            className={`px-6 py-3 rounded-xl text-sm md:text-base font-black tracking-wide transition duration-200 border ${
              adminLogTab === 'error'
                ? 'bg-[#3b82f6] text-white border-[#60a5fa]/30 shadow-md'
                : 'bg-purple-950/60 text-purple-300 hover:text-white border-transparent'
            }`}
          >
            Error Log
          </button>
        </div>

        <div className="bg-[#0b0416]/95 border-2 border-purple-950 rounded-2xl p-6 shadow-2xl font-mono text-[11px] leading-relaxed max-h-[60vh] overflow-y-auto">
          <div className="text-purple-400/60 border-b border-purple-950/50 pb-2 mb-4 select-none">
            --- signo-platform v1.0.0 · {adminLogTab === 'app' ? 'signo-app.log' : adminLogTab === 'audit' ? 'signo-audit.log' : 'signo-error.log'} ---
          </div>

          <div className="space-y-2">
            {dbLogs.length > 0 ? (
              dbLogs.map((log: any, idx: number) => {
                let lvlColor = "text-emerald-400";
                if (log.level === 'EDIT' || log.level === 'WARN') lvlColor = "text-yellow-400";
                if (log.level === 'FAIL' || log.level === 'DELETE' || log.level === 'ERROR') lvlColor = "text-red-400";
                if (log.level === 'ADD' || log.level === 'INFO') lvlColor = "text-cyan-400";
                if (log.level === 'LOGOUT') lvlColor = "text-slate-400";

                return (
                  <div key={log.id || idx} className="flex items-start space-x-2">
                    <span className="text-slate-500">[{log.time}]</span>
                    <span className={`${lvlColor} font-bold`}>[{log.level}]</span>
                    <span className="text-slate-300">· {log.desc}</span>
                  </div>
                );
              })
            ) : (
              <>
                {adminLogTab === 'app' && appLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="text-slate-500">[{log.time}]</span>
                    <span className="text-cyan-400 font-bold">[{log.level}]</span>
                    <span className="text-slate-300">· {log.desc}</span>
                  </div>
                ))}

                {adminLogTab === 'audit' && auditLogs.map((log, idx) => {
                  let lvlColor = "text-emerald-400";
                  if (log.level === 'EDIT') lvlColor = "text-yellow-400";
                  if (log.level === 'FAIL' || log.level === 'DELETE') lvlColor = "text-red-400";
                  if (log.level === 'ADD') lvlColor = "text-cyan-400";
                  if (log.level === 'LOGOUT') lvlColor = "text-slate-400";

                  return (
                    <div key={idx} className="flex items-start space-x-2">
                      <span className="text-slate-500">[{log.time}]</span>
                      <span className={`${lvlColor} font-bold`}>[{log.level}]</span>
                      <span className="text-slate-300">· {log.desc}</span>
                    </div>
                  );
                })}

                {adminLogTab === 'error' && errorLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2">
                    <span className="text-slate-500">[{log.time}]</span>
                    <span className={log.level === 'ERROR' ? 'text-red-400 font-bold' : 'text-yellow-400 font-bold'}>
                      [{log.level}]
                    </span>
                    <span className="text-indigo-400 font-semibold">· [{log.code || 'SYS'}]</span>
                    <span className="text-slate-300">· {log.desc}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render Flow ---

  if (currentView.startsWith('dashboard-')) {
    return (
      <div className="h-screen w-full bg-[url('/bg.jpg')] bg-cover bg-center flex p-4 text-white overflow-hidden font-sans">
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(2deg); }
          }
          @keyframes spin-slow {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes wiggle {
            0%, 100% { transform: rotate(-8deg); }
            50% { transform: rotate(8deg); }
          }
          .animate-float {
            animation: float 6s ease-in-out infinite;
          }
          .animate-spin-slow {
            animation: spin-slow 30s linear infinite;
          }
          .animate-wiggle {
            animation: wiggle 3s ease-in-out infinite;
          }
        `}</style>

        {/* Sidebar */}
        <div className="w-24 md:w-28 bg-slate-900/85 backdrop-blur-md rounded-3xl flex flex-col items-center py-6 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.5)] flex-shrink-0">
          {/* Profile avatar at top */}
          <div className="flex flex-col items-center select-none text-center px-2 mb-4">
            {userRole !== 'admin' && activeUser ? (
              <button
                type="button"
                title="Edit Profile"
                onClick={() => {
                  setSelectedProfileIcon(activeUser.profileIcon || '');
                  setSelectedProfileBgColor(activeUser.profileBgColor || '#1c1ae3');
                  setSelectedProfileName(activeUser.name || '');
                  setProfileSaveMsg(null);
                  setShowProfileModal(true);
                }}
                className="w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 border-white/30 shadow-xl mb-2 overflow-hidden hover:border-fuchsia-400 hover:scale-105 transition-all active:scale-95 cursor-pointer"
                style={{ backgroundColor: activeUser.profileBgColor || '#1c1ae3' }}
              >
                <img src={TEACHER_ICONS.find(i => i.key === (activeUser.profileIcon || "tmale1"))?.src} alt="Profile" className="w-12 h-12 object-contain" />
              </button>
            ) : (
              <div className="text-4xl md:text-5xl bg-white/15 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center border-2 border-white/30 shadow-xl mb-2 select-none">
                {activeUser ? activeUser.emoji : (userRole === 'admin' ? '👑' : '👩‍🏫')}
              </div>
            )}
            <span className="text-xs md:text-sm font-black text-white uppercase tracking-widest leading-tight truncate max-w-[90px]">
              {activeUser ? activeUser.name.split(' ')[0] : (userRole === 'admin' ? 'Admin' : 'Guro')}
            </span>
          </div>

          {/* Nav buttons — centered */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 w-full px-1 font-sans">
            {userRole === 'admin' ? (
              <>
                <NavIconButton
                  label="Overview"
                  icon="📊"
                  isActive={currentView === 'dashboard-home'}
                  onClick={() => handleNavClick('dashboard-home')}
                  accentClass="bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600"
                />
                <NavIconButton
                  label="Guro"
                  icon="👨‍🏫"
                  isActive={currentView === 'dashboard-guro'}
                  onClick={() => handleNavClick('dashboard-guro')}
                  accentClass="bg-gradient-to-br from-amber-500 via-orange-500 to-red-600"
                />
                <NavIconButton
                  label="Students"
                  icon="🎓"
                  isActive={currentView === 'dashboard-students'}
                  onClick={() => handleNavClick('dashboard-students')}
                  accentClass="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600"
                />
                <NavIconButton
                  label="Progress"
                  icon="⭐"
                  isActive={currentView === 'dashboard-progress'}
                  onClick={() => handleNavClick('dashboard-progress')}
                  accentClass="bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500"
                />
              </>
            ) : (
              <>
                <NavIconButton
                  label="HOME"
                  icon="🏠"
                  isActive={currentView === 'dashboard-home'}
                  onClick={() => handleNavClick('dashboard-home')}
                  accentClass="bg-gradient-to-br from-cyan-600 via-blue-700 to-blue-900"
                />
                <NavIconButton
                  label="STUDENTS"
                  icon="👥"
                  isActive={currentView === 'dashboard-students'}
                  onClick={() => handleNavClick('dashboard-students')}
                  accentClass="bg-gradient-to-br from-emerald-500 via-teal-600 to-teal-900"
                />
                <NavIconButton
                  label="SESSION"
                  icon="🎥"
                  isActive={currentView === 'dashboard-sesyon' || currentView === 'dashboard-sandbox' || currentView === 'dashboard-game' || currentView === 'dashboard-spelling'}
                  onClick={() => handleNavClick('dashboard-sesyon')}
                  accentClass="bg-gradient-to-br from-indigo-500 via-indigo-700 to-indigo-900"
                />
                <NavIconButton
                  label="PROGRESS"
                  icon="📊"
                  isActive={currentView === 'dashboard-progress'}
                  onClick={() => handleNavClick('dashboard-progress')}
                  accentClass="bg-gradient-to-br from-[#4ade80] via-[#059669] to-[#064e3b]"
                />
              </>
            )}
          </div>

          {/* Log Out button — bigger */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-[calc(100%-16px)] py-3 bg-[#8b2ca3]/90 hover:bg-[#8b2ca3] text-white text-xs font-black rounded-xl tracking-wider transition-all border border-[#bf5cd7]/30 shadow-md active:scale-95 uppercase font-sans mt-4"
          >
            Log Out
          </button>
        </div>
        
        {/* Main Area */}
        <div className="flex-1 flex flex-col pl-4 md:pl-6 overflow-y-auto">
          {/* Greeting Box */}
          {currentView === 'dashboard-home' && (
            <div className="flex justify-center w-full mb-8 mt-4">
              <div className="bg-slate-900/85 backdrop-blur-md border border-cyan-500/40 rounded-full px-10 py-4 shadow-[0_0_20px_rgba(6,182,212,0.6)] flex-shrink-0 text-center">
                <h1 className="text-2xl md:text-4xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_4px_rgba(6,182,212,0.8)]">
                  {headerText}
                </h1>
              </div>
            </div>
          )}
          {/* Main Dashboard Pages */}
          <div className="flex-1">
            {userRole === 'admin' ? (
              <>
                {currentView === 'dashboard-home' && renderAdminOverview()}
                {currentView === 'dashboard-guro' && renderAdminGuroView()}
                {currentView === 'dashboard-students' && renderStudentsView()}
                {currentView === 'dashboard-progress' && renderProgressView()}
                {currentView === 'dashboard-analytics' && renderAdminAnalyticsView()}
                {currentView === 'dashboard-logs' && renderAdminLogsView()}
              </>
            ) : (
              <>
                {currentView === 'dashboard-home' && renderHomeView()}
                {currentView === 'dashboard-students' && renderStudentsView()}
                {currentView === 'dashboard-sesyon' && renderSesyonMenu()}
                {currentView === 'dashboard-sandbox' && renderSandboxView()}
                {currentView === 'dashboard-game' && renderGameView()}
                {currentView === 'dashboard-spelling' && renderSpellingView()}
                {currentView === 'dashboard-progress' && renderProgressView()}
              </>
            )}
          </div>
        </div>

        
        {/* Navigation Confirm Modal */}
        {navConfirmTab && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#020617] border-2 border-fuchsia-500/30 p-8 rounded-[32px] shadow-[0_0_50px_rgba(192,38,211,0.2)] max-w-sm w-full mx-4 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner border border-rose-400/30 animate-pulse">
                ⚠️
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Quit Session?</h3>
              <p className="text-purple-200 text-sm font-medium mb-6">
                Are you sure you want to quit the current session? Your progress will not be saved.
              </p>
              <div className="flex items-center space-x-3 w-full">
                <button 
                  onClick={() => setNavConfirmTab(null)}
                  className="flex-1 py-3 bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-sm font-black rounded-xl tracking-wider transition-all shadow-md"
                >
                  STAY
                </button>
                <button 
                  onClick={() => {
                    setCurrentView(navConfirmTab);
                    setNavConfirmTab(null);
                    setWebcamEnabledByUser(false);
                    setGameCategory(null);
                    setShowGameOver(false);
                    setHasMadeMistakeOnCurrentQuestion(false);
                    setQuestionsCompleted(0);
                    setCurrentQuestionIndex(0);
                    setGameStep('question');
                    setGameSelectedAnswer(null);
                    setSelectedSignId(0);
                    setLastPrediction('No sign detected');
                    setActiveStudentId(null);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white text-sm font-black rounded-xl tracking-wider transition-all shadow-md shadow-rose-900/50"
                >
                  QUIT SESSION
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Confirm Modal */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#020617] border-2 border-fuchsia-500/30 p-8 rounded-[32px] shadow-[0_0_50px_rgba(192,38,211,0.2)] max-w-sm w-full mx-4 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-fuchsia-500/20 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner border border-fuchsia-400/30">
                🚪
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Logout?</h3>
              <p className="text-purple-200 text-sm font-medium mb-6">
                Are you sure you want to log out of your account?
              </p>
              <div className="flex items-center space-x-3 w-full">
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-sm font-black rounded-xl tracking-wider transition-all shadow-md"
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => {
                    setActiveUser(null);
                    localStorage.removeItem('signo_active_user');
                    setCurrentView(userRole === 'admin' ? 'admin-login' : 'teacher-login');
                    setUserRole('guro');
                    setShowLogoutConfirm(false);
                    setWebcamEnabledByUser(false);
                  }}
                  className="flex-1 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-500 hover:from-fuchsia-500 hover:to-purple-400 text-white text-sm font-black rounded-xl tracking-wider transition-all shadow-md shadow-fuchsia-900/50"
                >
                  LOGOUT
                </button>
              </div>
            </div>
          </div>
        )}

          {/* Modal / Popup for Adding a Student */}
        
        {/* Play Session Confirmation Modal */}
        {studentToPlayConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#020617] border-2 border-fuchsia-500/30 p-8 rounded-[32px] shadow-[0_0_50px_rgba(192,38,211,0.2)] max-w-sm w-full mx-4 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-fuchsia-500/20 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner border border-fuchsia-400/30">
                {studentToPlayConfirm.emoji}
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">Start Session?</h3>
              <p className="text-purple-200 text-sm font-medium mb-6">
                Are you sure you want to start a <strong>{sessionMode.toUpperCase()}</strong> session with <span className="font-bold text-fuchsia-300">{studentToPlayConfirm.name}</span>?
              </p>
              <div className="flex items-center space-x-3 w-full">
                <button 
                  onClick={() => setStudentToPlayConfirm(null)}
                  className="flex-1 py-3 bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-sm font-black rounded-xl tracking-wider transition-all shadow-md"
                >
                  CANCEL
                </button>
                <button 
                  onClick={() => {
                      setActiveStudentId(studentToPlayConfirm.id);
                      setStudentToPlayConfirm(null);
                      setGameSetupMode(null);
                      setGameCategory(null);
                      setGameManualSelection([]);
                      setSpellingSetupMode(null);
                      setSpellingManualSelection([]);
                      setSpellingCurrentWordList([]);
                    }}
                  className="flex-1 py-3 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-sm font-black rounded-xl tracking-wider transition-all shadow-md"
                >
                  START
                </button>
              </div>
            </div>
          </div>
        )}
  
        {/* Custom Delete Confirmation Modal */}
        {studentIdToDelete && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 font-sans text-left">
            <div className="bg-[#3a1c6a] border-2 border-rose-500/30 rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative flex flex-col items-center">
              <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 border-4 border-rose-500/30">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-xl font-black text-white mb-2 text-center uppercase tracking-wide">Delete Student</h3>
              <p className="text-sm text-purple-200 text-center mb-8 font-medium">
                Are you sure you want to permanently delete this student? Their progress and data cannot be recovered.
              </p>
              <div className="w-full flex space-x-3">
                <button
                  onClick={() => setStudentIdToDelete(null)}
                  className="flex-1 py-3 bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-sm font-black rounded-xl tracking-wider transition-all shadow-md"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDeleteStudent}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white text-sm font-black rounded-xl tracking-wider transition-all shadow-md shadow-rose-600/30"
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        )}

        {isAddStudentOpen && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans text-left">
            <div className="bg-[#3a1c6a] border-2 border-purple-500/20 rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative">
              <button 
                onClick={() => setIsAddStudentOpen(false)}
                className="absolute top-4 right-4 text-purple-300 hover:text-white font-bold"
              >
                ✕
              </button>
              <h3 className="text-xl font-black text-white mb-5 uppercase tracking-wide">Add Space Student</h3>
              <form onSubmit={handleAddStudentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">Student Name:</label>
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="e.g. Ana B."
                    className="w-full px-4 py-2.5 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 text-xs font-bold shadow-inner"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">Grade Level:</label>
                  <select
                    value={newStudentGrade}
                    onChange={(e) => setNewStudentGrade(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#3b125e] text-white border border-purple-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 text-xs font-bold shadow-inner"
                  >
                    
                    
                    <option value="Grade 1" className="bg-[#3b125e] text-white">Grade 1</option>`n<option value="Grade 2" className="bg-[#3b125e] text-white">Grade 2</option>
                    <option value="Grade 3" className="bg-[#3b125e] text-white">Grade 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-purple-200 mb-1">Avatar / Character Emoji:</label>
                  <div className="flex space-x-4 mt-2">
                    {['👧', '👦'].map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setNewStudentEmoji(em)}
                        className={`text-3xl p-2 rounded-xl border-2 transition-all ${
                          newStudentEmoji === em ? 'border-fuchsia-400 bg-purple-900/40' : 'border-transparent bg-slate-900/30'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={isAddingStudent} className={isAddingStudent ? 'w-full py-2.5 text-white text-xs font-black rounded-xl tracking-wider transition-all shadow-md uppercase mt-6 bg-gray-500 cursor-not-allowed' : 'w-full py-2.5 text-white text-xs font-black rounded-xl tracking-wider transition-all shadow-md uppercase mt-6 bg-[#b01bb8] hover:bg-[#c924d2] active:scale-95'}> {isAddingStudent ? 'Launching...' : 'Launch Explorer'}</button>
              </form>
            </div>
          </div>
        )}

        {/* Modal / Popup for Viewing Student Profile */}
        {selectedProfileStudent && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans text-left">
            <div className="bg-[#3a1c6a] border-2 border-purple-500/20 rounded-[32px] p-8 w-full max-w-sm shadow-2xl relative">
              <button 
                onClick={() => { setSelectedProfileStudent(null); setIsEditingProfile(false); }}
                className="absolute top-4 right-4 text-purple-300 hover:text-white font-bold"
              >
                ✕
              </button>
              
              {!isEditingProfile ? (
                <>
                  <button 
                    onClick={() => { 
                        setIsEditingProfile(true); 
                        setEditStudentName(selectedProfileStudent.name); 
                        setEditStudentGrade(selectedProfileStudent.grade); 
                        setEditStudentEmoji(selectedProfileStudent.emoji); 
                    }}
                    className="absolute top-4 left-4 text-purple-300 hover:text-fuchsia-400 font-bold text-xs uppercase tracking-wide flex items-center space-x-1"
                    title="Edit Profile"
                  >
                    <span>✏️</span> <span>Edit</span>
                  </button>
                  <div className="flex flex-col items-center text-center space-y-3 mt-2">
                    <div className="text-6xl bg-yellow-500/10 w-24 h-24 rounded-full border-2 border-yellow-500/30 flex items-center justify-center select-none shadow-inner">
                      {selectedProfileStudent.emoji}
                    </div>
                    <h3 className="text-2xl font-black text-white">{selectedProfileStudent.name}</h3>
                    <p className="text-xs text-purple-300 font-bold uppercase">{selectedProfileStudent.grade}</p>
                    <div className="w-full bg-purple-950/60 rounded-2xl p-4 text-xs space-y-3 text-left mt-4 border border-purple-800/30">
                      <div className="flex justify-between border-b border-purple-900/40 pb-2">
                        <span className="text-purple-300 font-semibold">🏆 Total Points Awarded:</span> 
                        <span className="font-bold text-yellow-300">⭐ {selectedProfileStudent.points} Points</span>
                      </div>
                      <div className="flex justify-between border-b border-purple-900/40 pb-2">
                        <span className="text-purple-300 font-semibold">🎮 Last Played Mode:</span> 
                        <span className="font-bold text-emerald-400">{selectedProfileStudent.lastMode || 'Not played yet'}</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-purple-300 font-semibold">📅 Date Joined:</span> 
                        <span className="font-bold text-purple-200">
                          {selectedProfileStudent.createdAt ? new Date(selectedProfileStudent.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedProfileStudent(null); setIsEditingProfile(false); }}
                    className="w-full py-2.5 bg-[#b01bb8] hover:bg-[#c924d2] text-white text-xs font-black rounded-xl tracking-wider transition-all shadow-md active:scale-95 uppercase mt-6"
                  >
                    Close Profile
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-black text-white mb-5 uppercase tracking-wide">Edit Profile</h3>
                  <form onSubmit={handleEditStudentSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">Student Name:</label>
                      <input
                        type="text"
                        required
                        value={editStudentName}
                        onChange={(e) => setEditStudentName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 text-xs font-bold shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">Grade Level:</label>
                      <select
                        value={editStudentGrade}
                        onChange={(e) => setEditStudentGrade(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#3b125e] text-white border border-purple-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 text-xs font-bold shadow-inner"
                      >
                        
                        
                        <option value="Grade 1" className="bg-[#3b125e] text-white">Grade 1</option>`n<option value="Grade 2" className="bg-[#3b125e] text-white">Grade 2</option>
                        <option value="Grade 3" className="bg-[#3b125e] text-white">Grade 3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-purple-200 mb-1">Avatar / Character Emoji:</label>
                      <div className="flex space-x-4 mt-2">
                        {['👧', '👦'].map(em => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => setEditStudentEmoji(em)}
                            className={`text-3xl p-2 rounded-xl border-2 transition-all ${
                              editStudentEmoji === em ? 'border-fuchsia-400 bg-purple-900/40' : 'border-transparent bg-slate-900/30'
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="pt-2 flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="w-1/2 py-3 bg-purple-900/60 hover:bg-purple-800 text-purple-200 text-xs font-black rounded-xl tracking-wider transition-all shadow-md uppercase"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-3 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black rounded-xl tracking-wider transition-all shadow-md active:scale-95 shadow-emerald-500/20 uppercase"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

        {/* Teacher Profile Customization Modal */}
        {showProfileModal && activeUser && (
          <ProfileCustomizationModal
            activeUser={activeUser}
            selectedIcon={selectedProfileIcon}
            setSelectedIcon={setSelectedProfileIcon}
            selectedBgColor={selectedProfileBgColor}
            setSelectedBgColor={setSelectedProfileBgColor}
            selectedName={selectedProfileName}
            setSelectedName={setSelectedProfileName}
            saving={profileSaving}
            saveMsg={profileSaveMsg}
            onClose={() => setShowProfileModal(false)}
            onSave={async () => {
              if (!selectedProfileIcon && !selectedProfileBgColor && !selectedProfileName.trim()) return;
              setProfileSaving(true);
              setProfileSaveMsg(null);
              try {
                const res = await fetch('/api/profile', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: activeUser.id,
                    name: selectedProfileName.trim() || activeUser.name,
                    profileIcon: selectedProfileIcon,
                    profileBgColor: selectedProfileBgColor,
                  }),
                });
                const data = await res.json();
                if (data.success) {
                  const updated = { ...activeUser, name: selectedProfileName.trim() || activeUser.name, profileIcon: selectedProfileIcon, profileBgColor: selectedProfileBgColor };
                  setActiveUser(updated);
                  localStorage.setItem('signo_active_user', JSON.stringify(updated));
                  setProfileSaveMsg('✓ Profile saved successfully!');
                  setTimeout(() => setShowProfileModal(false), 1200);
                } else {
                  setProfileSaveMsg(data.error || 'Could not save. Please try again.');
                }
              } catch {
                setProfileSaveMsg('Could not save. Please try again.');
              } finally {
                setProfileSaving(false);
              }
            }}
          />
        )}

        {/* Mode Tutorial Popup Modal */}
        {modeTutorialModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans text-left animate-fadeIn">
            <div className={`${modeTutorialModal === 'sandbox' ? 'bg-[#1c0838]/95 border-fuchsia-500/50 shadow-[0_0_50px_rgba(192,38,211,0.35)]' : modeTutorialModal === 'game' ? 'bg-[#020617]/95 border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.35)]' : 'bg-[#020617]/95 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.35)]'} border-2 rounded-[32px] p-6 md:p-8 w-full max-w-xl relative overflow-hidden`}>
              <button 
                onClick={() => setModeTutorialModal(null)}
                className="absolute top-4 right-4 text-purple-300 hover:text-white font-bold text-lg w-8 h-8 rounded-full bg-purple-900/40 flex items-center justify-center border border-purple-700/50 transition-all"
              >
                ✕
              </button>

              {modeTutorialModal === 'sandbox' ? (
                <div className="flex flex-col space-y-5">
                  <div className="flex items-center space-x-3 border-b border-purple-800/40 pb-4">
                    <div className="w-14 h-14 rounded-2xl bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
                      👐
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">Mode Tutorial</span>
                      <h3 className="text-2xl font-black text-fuchsia-400 leading-tight">Practice Guide</h3>
                      <p className="text-xs text-purple-300 font-medium">Practice Filipino Sign Language freely with real-time AI recognition.</p>
                    </div>
                  </div>

                  <div className="space-y-3 font-sans">
                    <div className="flex items-start space-x-3.5 bg-purple-950/60 border border-purple-800/40 rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-black text-lg flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black text-cyan-200">Turn On Your Camera</h4>
                        <p className="text-sm text-purple-200 leading-relaxed mt-1">Make sure your camera is on and you can see yourself clearly on the screen.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3.5 bg-purple-950/60 border border-purple-800/40 rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/30 flex items-center justify-center text-fuchsia-300 font-black text-lg flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black text-fuchsia-200">Pick a Sign to Learn</h4>
                        <p className="text-sm text-purple-200 leading-relaxed mt-1">Choose a letter or greeting you want to practice from the list.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3.5 bg-purple-950/60 border border-purple-800/40 rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black text-lg flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black text-emerald-200">Copy the Sign</h4>
                        <p className="text-sm text-purple-200 leading-relaxed mt-1">Copy the sign in front of the camera. The computer will tell you if you got it right!</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSessionMode('sandbox');
                      setRecognitionMode('gestures');
                      setCurrentView('dashboard-sandbox');
                      setModeTutorialModal(null);
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white text-sm font-black rounded-2xl py-4 tracking-wider transition-all shadow-xl active:scale-95 uppercase mt-2 flex items-center justify-center space-x-2 border border-fuchsia-400/40"
                  >
                    <span>🚀 Start Practice Session</span>
                  </button>
                </div>
              ) : modeTutorialModal === 'game' ? (
                <div className="flex flex-col space-y-5">
                  <div className="flex items-center space-x-3 border-b border-cyan-500/40 pb-4">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-900/50 border border-cyan-500/40 flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
                      🎮
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Mode Tutorial</span>
                      <h3 className="text-2xl font-black text-cyan-400 leading-tight">Situational Game Guide</h3>
                      <p className="text-xs text-slate-400 font-medium">Solve interactive social scenarios using Filipino Sign Language.</p>
                    </div>
                  </div>

                  <div className="space-y-3 font-sans">
                    <div className="flex items-start space-x-3.5 bg-slate-800/80 border border-cyan-500/30 shadow-inner rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-black text-lg flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black text-amber-200">Choose Who is Playing</h4>
                        <p className="text-sm text-slate-300 leading-relaxed mt-1">Click on your name from the list so you can earn points!</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3.5 bg-slate-800/80 border border-cyan-500/30 shadow-inner rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-black text-lg flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black text-cyan-200">Pick a Game Topic</h4>
                        <p className="text-sm text-slate-300 leading-relaxed mt-1">Choose what you want to learn today, like Greetings or Family.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3.5 bg-slate-800/80 border border-cyan-500/30 shadow-inner rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black text-lg flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black text-emerald-200">Play and Win!</h4>
                        <p className="text-sm text-slate-300 leading-relaxed mt-1">Read the story and show the right sign to the camera to get points.</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSessionMode('game');
                      setGameStep('question');
                        setGameSelectedAnswer(null);
                        setRecognitionMode('alphabets');
                        setSelectedSignId(0);
                        setLastPrediction('No sign detected');
                        setCurrentView('dashboard-game');
                      setModeTutorialModal(null);
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-black rounded-2xl py-4 tracking-wider transition-all shadow-xl active:scale-95 uppercase mt-2 flex items-center justify-center space-x-2 border border-cyan-400/40"
                  >
                    <span>🎮 Start Game Adventure</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col space-y-5">
                  <div className="flex items-center space-x-3 border-b border-emerald-500/40 pb-4">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-900/50 border border-emerald-500/40 flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
                      🔤
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Mode Tutorial</span>
                      <h3 className="text-2xl font-black text-emerald-400 leading-tight">Spelling Game Guide</h3>
                      <p className="text-xs text-slate-400 font-medium">Practice spelling child-friendly words using Filipino Sign Language.</p>
                    </div>
                  </div>

                  <div className="space-y-3 font-sans">
                    <div className="flex items-start space-x-3.5 bg-slate-800/80 border border-emerald-500/30 shadow-inner rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 font-black text-lg flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black text-amber-200">Choose Who is Playing</h4>
                        <p className="text-sm text-slate-300 leading-relaxed mt-1">Click on your name from the list so you can earn points!</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3.5 bg-slate-800/80 border border-emerald-500/30 shadow-inner rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 font-black text-lg flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black text-cyan-200">Spell the Word</h4>
                        <p className="text-sm text-slate-300 leading-relaxed mt-1">Look at the word on the screen and sign each letter.</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3.5 bg-slate-800/80 border border-emerald-500/30 shadow-inner rounded-2xl p-5">
                      <div className="w-10 h-10 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/30 flex items-center justify-center text-fuchsia-300 font-black text-lg flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="text-base md:text-lg font-black text-fuchsia-200">Need Help?</h4>
                        <p className="text-sm text-slate-300 leading-relaxed mt-1">Look at the small picture on the screen if you forget how to sign a letter.</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSessionMode('spelling');
                      setSpellingScore(0);
                      setSpellingShowGameOver(false);
                      setSpellingCurrentWordIndex(0);
                      setSpellingProgressIndex(0);
                      setRecognitionMode('alphabets');
                      setCurrentView('dashboard-spelling');
                      setModeTutorialModal(null);
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-black rounded-2xl py-4 tracking-wider transition-all shadow-xl active:scale-95 uppercase mt-2 flex items-center justify-center space-x-2 border border-emerald-400/40"
                  >
                    <span>🔤 Start Spelling Game</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-fuchsia-600 text-white px-6 py-3 rounded-full shadow-2xl border-2 border-fuchsia-400/50 flex items-center space-x-3 font-bold text-sm tracking-wide">
            <span className="text-xl">✨</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      </div>
    );
  }

  // Render Login views, Register, and Forgot Password
  const isTeacherLogin = currentView === 'teacher-login';
  const isAdminLogin = currentView === 'admin-login';
  const isRegister = currentView === 'register';
  const isForgotPassword = currentView === 'forgot-password';
  const isVerifyEmail = currentView === 'verify-email';

  return (
    <div className="min-h-screen w-full bg-[url('/bg.jpg')] bg-cover bg-center flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes shooting-star-left {
          0% {
            transform: translate(0, 0) rotate(135deg);
            opacity: 0;
            width: 0px;
          }
          3% {
            opacity: 1;
            width: 150px;
          }
          34.9% {
            transform: translate(-460px, 460px) rotate(135deg);
            opacity: 1;
            width: 150px;
          }
          35% {
            transform: translate(-460px, 460px) rotate(135deg);
            opacity: 0;
            width: 0px;
          }
          100% {
            transform: translate(-460px, 460px) rotate(135deg);
            opacity: 0;
            width: 0px;
          }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 35s linear infinite;
        }
        .animate-wiggle {
          animation: wiggle 3s ease-in-out infinite;
        }
        .animate-shooting-star-left {
          animation: shooting-star-left 10s linear infinite;
        }
      `}</style>

      {/* Floating Space Elements */}
      <div className="absolute top-[8%] left-[6%] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 scale-75 md:scale-100 z-0">
        <SaturnPlanet className="w-36 h-36 md:w-48 md:h-48 animate-float" />
      </div>

      <div className="absolute top-[10%] right-[10%] pointer-events-none scale-75 md:scale-100 z-0">
        <EarthPlanet className="w-24 h-24 md:w-32 md:h-32 animate-spin-slow" />
      </div>

      <div className="absolute top-[40%] left-[8%] pointer-events-none z-0">
        <PinkStar className="w-8 h-8 opacity-80" />
      </div>
      <div className="absolute top-[28%] right-[8%] pointer-events-none z-0">
        <PinkStar className="w-6 h-6 opacity-75" />
      </div>

      <div className="absolute top-[20%] left-[45%] w-10 h-10 bg-white/10 rounded-full blur-sm pointer-events-none" />
      <div className="absolute bottom-[40%] left-[12%] w-12 h-12 bg-white/10 rounded-full blur-sm pointer-events-none" />
      <div className="absolute bottom-[15%] left-[30%] w-8 h-8 bg-white/10 rounded-full blur-sm pointer-events-none" />
      <div className="absolute bottom-[25%] right-[22%] w-14 h-14 bg-white/10 rounded-full blur-sm pointer-events-none" />

      {/* Animated Longer Shooting Stars (Falling Left per 10s) */}
      <div className="absolute top-[6%] right-[15%] h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-white shadow-[0_0_10px_#38bdf8] pointer-events-none z-0 animate-shooting-star-left">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff,0_0_10px_#38bdf8]" />
      </div>

      <div className="absolute top-[12%] left-[55%] h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-white shadow-[0_0_10px_#38bdf8] pointer-events-none z-0 animate-shooting-star-left" style={{ animationDelay: '2s' }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff,0_0_10px_#38bdf8]" />
      </div>

      <div className="absolute top-[32%] right-[8%] h-[2px] rounded-full bg-gradient-to-r from-transparent via-fuchsia-300 to-white shadow-[0_0_10px_#e087ff] pointer-events-none z-0 animate-shooting-star-left" style={{ animationDelay: '4s' }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff,0_0_10px_#e087ff]" />
      </div>

      <div className="absolute top-[8%] left-[28%] h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-300 to-white shadow-[0_0_10px_#38bdf8] pointer-events-none z-0 animate-shooting-star-left" style={{ animationDelay: '6s' }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff,0_0_10px_#38bdf8]" />
      </div>

      <div className="absolute top-[48%] right-[18%] h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-200 to-white shadow-[0_0_10px_#38bdf8] pointer-events-none z-0 animate-shooting-star-left" style={{ animationDelay: '8s' }}>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_6px_#fff,0_0_10px_#38bdf8]" />
      </div>

      {/* Card Body */}
      <div className="w-full max-w-md bg-[#3a1c6a]/90 backdrop-blur-md rounded-[36px] border-2 border-purple-400/30 p-10 shadow-[0_0_60px_rgba(168,85,247,0.25)] relative z-10 text-center flex flex-col items-center">
        {/* Logo Icon top overlap */}
        <div className="absolute -top-24">
          <AstronautLogo className="w-44 h-44 drop-shadow-xl" />
        </div>
        
        {/* Spacer */}
        <div className="h-20 w-full"></div>

        {/* Switcher Tab header (Only show on Login forms, not on Register or Forgot password) */}
        {(isTeacherLogin || isAdminLogin) && (
          <div className="flex border-b border-purple-500/40 w-full mb-7 mt-2">
            <button
              type="button"
              onClick={() => {
                setCurrentView('teacher-login');
                setUserRole('guro');
              }}
              className={`flex-1 pb-3 text-sm font-black tracking-wide uppercase transition-all ${
                isTeacherLogin ? 'text-white border-b-2 border-fuchsia-400' : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Guro Portal
            </button>
            <button
              type="button"
              onClick={() => {
                setCurrentView('admin-login');
                setUserRole('admin');
              }}
              className={`flex-1 pb-3 text-sm font-black tracking-wide uppercase transition-all ${
                isAdminLogin ? 'text-white border-b-2 border-fuchsia-400' : 'text-purple-400 hover:text-purple-200'
              }`}
            >
              Admin Portal
            </button>
          </div>
        )}

        {/* Forms Routing */}
        
        {/* 1. Teacher/Guro Login Form */}
        {isTeacherLogin && (
          <form onSubmit={handleSignIn} className="w-full flex flex-col mt-2">
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs font-sans font-black text-center mb-5 shadow-sm">
                ⚠️ {authError}
              </div>
            )}
            <div className="flex items-center space-x-3 bg-[#4d286d]/85 p-4 rounded-2xl border border-purple-400/25 mb-6">
              <div className="flex-shrink-0 bg-yellow-500 p-2.5 rounded-xl text-2xl shadow-inner select-none">
                👩‍🏫
              </div>
              <div className="text-left font-sans">
                <h3 className="text-base font-black text-white leading-tight">Kamusta, Guro!</h3>
                <p className="text-xs text-purple-200 font-bold">Welcome back, Teacher!</p>
              </div>
            </div>

            <div className="mb-5 text-left font-sans">
              <label className="block text-sm font-bold text-purple-200 mb-1.5">Email Address:</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-4 py-3 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-sm font-bold shadow-inner"
                placeholder="Enter your email address"
              />
            </div>

            <div className="mb-7 text-left font-sans">
              <label className="block text-sm font-bold text-purple-200 mb-1.5">Password:</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-sm font-bold shadow-inner"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex space-x-3 w-full mb-5">
              <button
                type="submit"
                className="flex-1 py-3 bg-[#b01bb8] hover:bg-[#c924d2] text-white font-black rounded-xl text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('register')}
                className="flex-1 py-3 bg-[#8b2ca3]/85 hover:bg-[#8b2ca3] text-white font-black rounded-xl text-sm uppercase tracking-wider transition-all border border-[#bf5cd7]/20 shadow-lg active:scale-95"
              >
                Register
              </button>
            </div>

            <div className="w-full flex justify-center mb-4 mt-2">
              <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
                <GoogleLogin
                  onSuccess={handleGoogleLoginSuccess}
                  onError={() => {
                    setAuthError('Nabigo ang Google Login. Subukan muli.');
                  }}
                  theme="outline"
                  shape="rectangular"
                />
              </GoogleOAuthProvider>
            </div>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setAuthError(null);
                setAuthSuccessMsg(null);
                setForgotPasswordStep('email');
                setCurrentView('forgot-password');
              }}
              className="text-xs text-purple-300 font-bold hover:text-white transition-colors underline font-sans"
            >
              Forgot password?
            </a>
          </form>
        )}

        {/* 2. Admin Login Form */}
        {isAdminLogin && (
          <form onSubmit={handleSignIn} className="w-full flex flex-col mt-2">
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs font-sans font-black text-center mb-5 shadow-sm">
                ⚠️ {authError}
              </div>
            )}
            <h2 className="text-base font-black text-purple-200 uppercase tracking-widest text-center mb-6 font-sans">
              Welcome back, Admin!</h2>

            <div className="mb-5 text-left font-sans">
              <label className="block text-sm font-bold text-purple-200 mb-1.5">Username:</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-4 py-3 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-sm font-bold shadow-inner"
                placeholder="Enter your username"
              />
            </div>

            <div className="mb-7 text-left font-sans">
              <label className="block text-sm font-bold text-purple-200 mb-1.5">Password:</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-sm font-bold shadow-inner"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="w-40 py-3 bg-[#b01bb8] hover:bg-[#c924d2] text-white font-black rounded-xl text-sm uppercase tracking-wider transition-all shadow-lg active:scale-95 mx-auto mb-5"
            >
              Sign In
            </button>
          </form>
        )}

        {/* 3. Register Form */}
        {isRegister && (
          <form onSubmit={handleRegisterSubmit} className="w-full flex flex-col mt-6">
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-2.5 rounded-xl text-[11px] font-sans font-black text-center mb-4 shadow-sm">
                ⚠️ {authError}
              </div>
            )}
            <div className="flex items-center space-x-3 bg-[#4d286d]/85 p-3 rounded-2xl border border-purple-500/20 mb-5">
              <div className="flex-shrink-0 bg-yellow-500 p-2 rounded-xl text-xl shadow-inner select-none">
                👩‍🏫
              </div>
              <div className="text-left font-sans">
                <h3 className="text-sm font-black text-white leading-tight">Register</h3>
                <p className="text-[10px] text-purple-200 font-bold">Mag register muna para gamitin ang Signo!</p>
              </div>
            </div>

            <div className="mb-4 text-left font-sans">
              <label className="block text-xs font-bold text-purple-200 mb-1">Full Name:</label>
              <input
                type="text"
                required
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-xs font-bold shadow-inner"
                placeholder="Juan dela Cruz"
              />
            </div>

            <div className="mb-4 text-left font-sans">
              <label className="block text-xs font-bold text-purple-200 mb-1">Email Address:</label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-xs font-bold shadow-inner"
                placeholder="Enter your email address"
              />
            </div>

            <div className="mb-4 text-left font-sans">
              <label className="block text-xs font-bold text-purple-200 mb-1">Password:</label>
              <input
                type="password"
                required
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-xs font-bold shadow-inner"
                placeholder="Enter your password"
              />
            </div>

            <div className="mb-6 text-left font-sans">
              <label className="block text-xs font-bold text-purple-200 mb-1">Confirmed Password:</label>
              <input
                type="password"
                required
                value={confirmPasswordInput}
                onChange={(e) => setConfirmPasswordInput(e.target.value)}
                className="w-full px-4 py-2.5 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-xs font-bold shadow-inner"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#b01bb8] hover:bg-[#c924d2] text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 mb-4"
            >
              Register
            </button>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentView('teacher-login');
              }}
              className="text-[10px] text-purple-300 font-bold hover:text-white transition-colors underline font-sans"
            >
              Already registered? Login
            </a>
          </form>
        )}

        {/* 4. Forgot Password Form */}
        {isForgotPassword && (
          <div className="w-full flex flex-col mt-4">
            {authSuccessMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-[11px] font-sans font-bold text-center mb-4 shadow-sm">
                ✅ {authSuccessMsg}
              </div>
            )}
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-2.5 rounded-xl text-[11px] font-sans font-black text-center mb-4 shadow-sm">
                ⚠️ {authError}
              </div>
            )}

            <div className="flex items-center space-x-3 bg-[#4d286d]/85 p-3 rounded-2xl border border-purple-500/20 mb-4">
              <div className="flex-shrink-0 bg-yellow-500 p-2 rounded-xl text-xl shadow-inner select-none">
                🔑
              </div>
              <div className="text-left font-sans">
                <h3 className="text-sm font-black text-white leading-tight">Forgot Password</h3>
                <p className="text-[10px] text-purple-200 font-bold">
                  {forgotPasswordStep === 'email' ? 'I-reset ang iyong password gamit ang rehistradong email' : 'I-enter ang 6-digit code at iyong bagong password'}
                </p>
              </div>
            </div>

            {forgotPasswordStep === 'email' ? (
              <form onSubmit={handleForgotPasswordRequest} className="w-full flex flex-col">
                <div className="mb-6 text-left font-sans">
                  <label className="block text-xs font-bold text-purple-200 mb-1">Email Address:</label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-xs font-bold shadow-inner"
                    placeholder="Enter your email address"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-[#b01bb8] hover:bg-[#c924d2] text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 mb-4 disabled:opacity-50"
                >
                  {authLoading ? 'Sending Code...' : 'Send Reset Code'}
                </button>

                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setAuthError(null);
                    setAuthSuccessMsg(null);
                    setCurrentView('teacher-login');
                  }}
                  className="text-[10px] text-purple-300 font-bold hover:text-white transition-colors underline font-sans"
                >
                  ← Back to Sign In
                </a>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="w-full flex flex-col">
                <p className="text-xs text-purple-200 mb-3 text-center font-sans">
                  Naipadala ang reset code sa:<br />
                  <span className="font-bold text-yellow-300 break-all">{pendingEmail || emailInput}</span>
                </p>

                <div className="mb-3 text-center font-sans">
                  <label className="block text-xs font-bold text-purple-200 mb-1">6-Digit Reset Code:</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={resetOtpInput}
                    onChange={(e) => setResetOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full px-4 py-2 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-mono text-center text-lg font-bold tracking-[0.4em] shadow-inner"
                    placeholder="123456"
                  />
                </div>

                <div className="mb-3 text-left font-sans">
                  <label className="block text-xs font-bold text-purple-200 mb-1">New Password:</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-xs font-bold shadow-inner"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="mb-5 text-left font-sans">
                  <label className="block text-xs font-bold text-purple-200 mb-1">Confirm New Password:</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmNewPasswordInput}
                    onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-sans text-xs font-bold shadow-inner"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 bg-[#b01bb8] hover:bg-[#c924d2] text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 mb-3 disabled:opacity-50"
                >
                  {authLoading ? 'Resetting Password...' : 'Reset Password'}
                </button>

                <div className="flex justify-between items-center text-[10px] font-sans">
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setForgotPasswordStep('email');
                      setAuthError(null);
                      setAuthSuccessMsg(null);
                    }}
                    className="text-purple-300 font-bold hover:text-white transition-colors underline"
                  >
                    ← Change Email
                  </a>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setAuthError(null);
                      setAuthSuccessMsg(null);
                      setForgotPasswordStep('email');
                      setCurrentView('teacher-login');
                    }}
                    className="text-purple-300 font-bold hover:text-white transition-colors underline"
                  >
                    Back to Sign In
                  </a>
                </div>
              </form>
            )}
          </div>
        )}

        {/* 5. Google Email Verification (OTP) Form */}
        {isVerifyEmail && (
          <form onSubmit={handleVerifyOtpSubmit} className="w-full flex flex-col mt-4">
            {authSuccessMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-2.5 rounded-xl text-[11px] font-sans font-bold text-center mb-4 shadow-sm">
                ✅ {authSuccessMsg}
              </div>
            )}
            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-2.5 rounded-xl text-[11px] font-sans font-black text-center mb-4 shadow-sm">
                ⚠️ {authError}
              </div>
            )}
            
            <div className="flex items-center space-x-3 bg-[#4d286d]/85 p-3 rounded-2xl border border-purple-500/20 mb-4">
              <div className="flex-shrink-0 bg-yellow-500 p-2 rounded-xl text-xl shadow-inner select-none">
                📧
              </div>
              <div className="text-left font-sans">
                <h3 className="text-sm font-black text-white leading-tight">Google Verification</h3>
                <p className="text-[10px] text-purple-200 font-bold">Veripikahin ang iyong account</p>
              </div>
            </div>

            <p className="text-xs text-purple-200 mb-3 text-center font-sans">
              Naipadala ang 6-digit verification code sa:<br />
              <span className="font-bold text-yellow-300 break-all">{pendingEmail || emailInput || 'iyong email'}</span>
            </p>

            <div className="mb-4 text-center font-sans">
              <label className="block text-xs font-bold text-purple-200 mb-1">6-Digit Code:</label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-4 py-3 bg-white text-purple-950 rounded-xl focus:outline-none focus:ring-2 focus:ring-fuchsia-400 font-mono text-center text-xl font-bold tracking-[0.4em] shadow-inner"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-[#b01bb8] hover:bg-[#c924d2] text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 mb-3 disabled:opacity-50"
            >
              {authLoading ? 'Verifying...' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={handleResendOtpSubmit}
              disabled={resendCooldown > 0 || authLoading}
              className="w-full py-2 bg-[#8b2ca3]/85 hover:bg-[#8b2ca3] text-white font-bold rounded-xl text-xs tracking-wider transition-all border border-[#bf5cd7]/20 shadow-md mb-4 disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend Code (${resendCooldown}s)` : 'Resend Code'}
            </button>

            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setAuthError(null);
                setAuthSuccessMsg(null);
                setCurrentView('teacher-login');
              }}
              className="text-[10px] text-purple-300 font-bold hover:text-white transition-colors underline font-sans"
            >
              ← Back to Sign In
            </a>
          </form>
        )}

      </div>
      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] animate-bounce">
          <div className="bg-fuchsia-600 text-white px-6 py-3 rounded-full shadow-2xl border-2 border-fuchsia-400/50 flex items-center space-x-3 font-bold text-sm tracking-wide">
            <span className="text-xl">✨</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


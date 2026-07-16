import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Bell,
  Check,
  X,
  Plus,
  Trash2,
  Activity,
  Calendar,
  PieChart as PieIcon,
  Settings as SettingsIcon,
  Home,
  AlarmClock,
  Volume2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

// ---------- palette (matches the original Habit Board screenshot) ----------
const BG = "#0a0a0a";
const CARD = "#141414";
const CARD_BORDER = "#262626";
const ACCENT = "#c6ff4a";
const ACCENT_DIM = "#8fbf2e";
const MUTED = "#7a7a7a";
const TEXT = "#f2f2f2";
const RED = "#ff5d5d";
const RED_DIM = "#3a1f1f";

const INTENSITY_COLORS = ["#232323", "#33461c", "#4f6b1f", "#7fa62b", ACCENT];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC",
];

function todayKey(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function beep(durationMs = 900) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.value = 0.05;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, durationMs);
  } catch (e) {
    // audio not available
  }
}

// ---------- logo ----------
function Logo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="1" y="1" width="46" height="46" rx="13" fill="#111111" stroke={CARD_BORDER} />
      <path
        d="M9 26.5L15.5 26.5L18.5 18L22.5 34L26 22L29 30L32.5 21.5L39 21.5"
        stroke={ACCENT}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="39" cy="21.5" r="2.4" fill={ACCENT} />
    </svg>
  );
}

const seedHabits = () => {
  const names = ["MORNING_RUN", "READ_30MIN", "NO_DOOMSCROLL", "CODE_1HR", "COLD_DMS"];
  return names.map((name, i) => {
    const days = {};
    for (let k = 35; k >= 0; k--) {
      const key = todayKey(-k);
      days[key] = Math.random() > 0.35 ? Math.ceil(Math.random() * 4) : 0;
    }
    return {
      id: `h${i}`,
      name,
      days,
      reminder: { enabled: false, time: "07:00", mode: "notification" },
    };
  });
};

const seedTimetable = () => [
  { id: "t1", name: "DATA_STRUCTURES", day: "Mon", time: "09:00" },
  { id: "t2", name: "DATA_STRUCTURES", day: "Wed", time: "09:00" },
  { id: "t3", name: "OPERATING_SYS", day: "Tue", time: "11:00" },
  { id: "t4", name: "OPERATING_SYS", day: "Thu", time: "11:00" },
  { id: "t5", name: "LINEAR_ALGEBRA", day: "Mon", time: "14:00" },
  { id: "t6", name: "LINEAR_ALGEBRA", day: "Fri", time: "14:00" },
];

export default function HabitBoard() {
  const [tab, setTab] = useState("today");
  const [habits, setHabits] = useState(seedHabits);
  const [timetable, setTimetable] = useState(seedTimetable);
  const [attendance, setAttendance] = useState({});
  const [reminderModal, setReminderModal] = useState(null);
  const [ringing, setRinging] = useState(null);
  const timers = useRef({});

  const today = todayKey(0);
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // schedule / clear reminder timers
  useEffect(() => {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    habits.forEach((h) => {
      if (!h.reminder.enabled) return;
      const [hh, mm] = h.reminder.time.split(":").map(Number);
      const target = new Date();
      target.setHours(hh, mm, 0, 0);
      if (target.getTime() < Date.now()) target.setDate(target.getDate() + 1);
      const delay = target.getTime() - Date.now();
      timers.current[h.id] = setTimeout(() => {
        const doneToday = h.days[today] > 0;
        if (doneToday) return;
        if (h.reminder.mode === "notification" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("Habit Board", {
              body: `${h.name.replaceAll("_", " ")} isn't done yet`,
            });
          }
        } else {
          setRinging(h.id);
          beep(1200);
        }
      }, Math.min(delay, 2147483000));
    });
    return () => Object.values(timers.current).forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits]);

  function toggleToday(id) {
    setHabits((hs) =>
      hs.map((h) =>
        h.id === id
          ? { ...h, days: { ...h.days, [today]: h.days[today] > 0 ? 0 : 4 } }
          : h
      )
    );
  }

  function saveReminder(id, reminder) {
    if (reminder.mode === "notification" && "Notification" in window) {
      Notification.requestPermission();
    }
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, reminder } : h)));
    setReminderModal(null);
  }

  function streakOf(h) {
    let s = 0;
    for (let k = 0; k < 60; k++) {
      const key = todayKey(-k);
      if (h.days[key] > 0) s++;
      else break;
    }
    return s;
  }

  const totalDone = habits.reduce(
    (sum, h) => sum + Object.values(h.days).filter((v) => v > 0).length,
    0
  );
  const bestStreak = Math.max(...habits.map(streakOf), 0);
  const rate = Math.round(
    (habits.reduce((s, h) => s + Object.values(h.days).filter((v) => v > 0).length, 0) /
      (habits.length * 36)) *
      100
  );

  function cycleAttendance(subjId, day) {
    const key = `${subjId}-${day}`;
    setAttendance((a) => {
      const cur = a[key] || "none";
      const next = cur === "none" ? "present" : cur === "present" ? "absent" : "none";
      return { ...a, [key]: next };
    });
  }

  const attendanceStats = useMemo(() => {
    let present = 0,
      absent = 0;
    Object.values(attendance).forEach((v) => {
      if (v === "present") present++;
      if (v === "absent") absent++;
    });
    return { present, absent, total: present + absent };
  }, [attendance]);

  const pieData = [
    { name: "Present", value: attendanceStats.present || 0 },
    { name: "Absent", value: attendanceStats.absent || 0 },
  ];

  const weeklyBar = useMemo(() => {
    const out = [];
    for (let k = 6; k >= 0; k--) {
      const key = todayKey(-k);
      const d = new Date(key);
      const count = habits.filter((h) => h.days[key] > 0).length;
      out.push({ day: DAY_LABELS[(d.getDay() + 6) % 7], count });
    }
    return out;
  }, [habits]);

  const now = new Date();
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div
      style={{
        background: BG,
        color: TEXT,
        fontFamily: "'JetBrains Mono', 'SFMono-Regular', Menlo, monospace",
        width: "100%",
        maxWidth: 400,
        margin: "0 auto",
        borderRadius: 28,
        overflow: "hidden",
        border: `1px solid ${CARD_BORDER}`,
        minHeight: 700,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 20px 8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={30} />
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 0.3 }}>
            Habit Board
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            color: MUTED,
            background: CARD,
            border: `1px solid ${CARD_BORDER}`,
            padding: "4px 10px",
            borderRadius: 20,
          }}
        >
          {now.getFullYear()}
        </span>
      </div>

      <div style={{ padding: "10px 20px 24px", flex: 1, overflowY: "auto" }}>
        {tab === "today" && (
          <TodayTab
            habits={habits}
            today={today}
            toggleToday={toggleToday}
            openReminder={(h) => setReminderModal(h)}
          />
        )}

        {tab === "progress" && (
          <ProgressTab
            habits={habits}
            totalDone={totalDone}
            bestStreak={bestStreak}
            rate={rate}
            monthLabel={monthLabel}
          />
        )}

        {tab === "timetable" && (
          <TimetableTab
            timetable={timetable}
            setTimetable={setTimetable}
            attendance={attendance}
            cycleAttendance={cycleAttendance}
            weekDays={weekDays}
          />
        )}

        {tab === "report" && (
          <ReportTab
            rate={rate}
            attendanceStats={attendanceStats}
            pieData={pieData}
            weeklyBar={weeklyBar}
            bestStreak={bestStreak}
          />
        )}

        {tab === "settings" && <SettingsTab habits={habits} />}
      </div>

      {/* bottom nav */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-around",
          padding: "10px 6px",
          borderTop: `1px solid ${CARD_BORDER}`,
          background: "#0d0d0d",
        }}
      >
        <NavBtn icon={<Home size={18} />} label="Today" active={tab === "today"} onClick={() => setTab("today")} />
        <NavBtn icon={<Activity size={18} />} label="Progress" active={tab === "progress"} onClick={() => setTab("progress")} />
        <NavBtn icon={<Calendar size={18} />} label="Classes" active={tab === "timetable"} onClick={() => setTab("timetable")} />
        <NavBtn icon={<PieIcon size={18} />} label="Report" active={tab === "report"} onClick={() => setTab("report")} />
        <NavBtn icon={<SettingsIcon size={18} />} label="Settings" active={tab === "settings"} onClick={() => setTab("settings")} />
      </div>

      {reminderModal && (
        <ReminderModal
          habit={reminderModal}
          onClose={() => setReminderModal(null)}
          onSave={(r) => saveReminder(reminderModal.id, r)}
        />
      )}

      {ringing && (
        <AlarmOverlay
          habit={habits.find((h) => h.id === ringing)}
          onDismiss={() => setRinging(null)}
        />
      )}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        color: active ? ACCENT : MUTED,
        cursor: "pointer",
        padding: "4px 8px",
      }}
    >
      {icon}
      <span style={{ fontSize: 9.5, letterSpacing: 0.3 }}>{label.toUpperCase()}</span>
    </button>
  );
}

function SectionLabel({ children, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "22px 0 10px",
      }}
    >
      <span style={{ fontSize: 11, color: MUTED, letterSpacing: 1 }}>// {children}</span>
      {right && <span style={{ fontSize: 11, color: MUTED }}>{right}</span>}
    </div>
  );
}

// ---------------- TODAY ----------------
function TodayTab({ habits, today, toggleToday, openReminder }) {
  return (
    <div>
      <SectionLabel>TODAY</SectionLabel>
      {habits.map((h) => {
        const done = h.days[today] > 0;
        return (
          <div
            key={h.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: CARD,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 14,
              padding: "12px 14px",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={() => toggleToday(h.id)}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  border: `1.5px solid ${done ? ACCENT : CARD_BORDER}`,
                  background: done ? ACCENT : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {done && <Check size={16} color="#0a0a0a" />}
              </button>
              <span style={{ fontSize: 13, letterSpacing: 0.3 }}>{h.name}</span>
            </div>
            <button
              onClick={() => openReminder(h)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: h.reminder.enabled ? ACCENT : MUTED,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10.5,
              }}
            >
              <Bell size={15} />
              {h.reminder.enabled ? h.reminder.time : "SET"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- PROGRESS ----------------
function ProgressTab({ habits, totalDone, bestStreak, rate, monthLabel }) {
  const cells = [];
  for (let k = 34; k >= 0; k--) {
    const key = todayKey(-k);
    const max = Math.max(...habits.map((h) => h.days[key] || 0), 0);
    cells.push(max);
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard label="TOTAL" value={totalDone} highlight />
        <StatCard label="STREAK" value={`${bestStreak}d`} />
        <StatCard label="RATE" value={`${Math.max(0, Math.min(rate, 100))}%`} />
      </div>

      <SectionLabel right={monthLabel}>COMMIT_BOARD</SectionLabel>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 5,
          background: CARD,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 14,
          padding: 14,
        }}
      >
        {cells.map((v, i) => (
          <div
            key={i}
            style={{
              aspectRatio: "1",
              borderRadius: 4,
              background: INTENSITY_COLORS[v] || INTENSITY_COLORS[0],
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
        <span style={{ fontSize: 10, color: MUTED }}>INTENSITY:</span>
        {INTENSITY_COLORS.map((c, i) => (
          <div key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c }} />
        ))}
        <span style={{ fontSize: 10, color: MUTED, marginLeft: 4 }}>NONE</span>
        <span style={{ fontSize: 10, color: ACCENT, marginLeft: "auto" }}>FULL</span>
      </div>

      <SectionLabel>PER_HABIT</SectionLabel>
      {habits.map((h) => (
        <div
          key={h.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: CARD,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 8,
          }}
        >
          <span style={{ fontSize: 12 }}>{h.name}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {Array.from({ length: 7 }).map((_, i) => {
              const key = todayKey(-(6 - i));
              const v = h.days[key] || 0;
              return (
                <div
                  key={i}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: INTENSITY_COLORS[v] || INTENSITY_COLORS[0],
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, highlight }) {
  return (
    <div
      style={{
        flex: 1,
        background: CARD,
        border: `1px solid ${highlight ? ACCENT : CARD_BORDER}`,
        borderRadius: 14,
        padding: "12px 10px",
      }}
    >
      <div style={{ fontSize: 9.5, color: MUTED, marginBottom: 6, letterSpacing: 0.5 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: highlight ? ACCENT : TEXT,
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ---------------- TIMETABLE ----------------
function TimetableTab({ timetable, setTimetable, attendance, cycleAttendance, weekDays }) {
  const [name, setName] = useState("");
  const [day, setDay] = useState("Mon");
  const [time, setTime] = useState("09:00");

  function addClass() {
    if (!name.trim()) return;
    setTimetable((t) => [
      ...t,
      { id: `t${Date.now()}`, name: name.trim().toUpperCase().replaceAll(" ", "_"), day, time },
    ]);
    setName("");
  }

  function removeClass(id) {
    setTimetable((t) => t.filter((c) => c.id !== id));
  }

  // Group classes by day, then sort each day's classes chronologically by time —
  // i.e. render it like an actual timetable instead of one card per subject.
  const byDay = useMemo(() => {
    return weekDays
      .map((d) => ({
        day: d,
        slots: timetable
          .filter((c) => c.day === d)
          .slice()
          .sort((a, b) => a.time.localeCompare(b.time)),
      }))
      .filter((g) => g.slots.length > 0);
  }, [timetable, weekDays]);

  // Overall attendance percentage per subject, across every day it's scheduled.
  const subjectStats = useMemo(() => {
    const subjects = [...new Set(timetable.map((c) => c.name))];
    return subjects.map((subj) => {
      const days = [...new Set(timetable.filter((c) => c.name === subj).map((c) => c.day))];
      let present = 0;
      let marked = 0;
      days.forEach((d) => {
        const st = attendance[`${subj}-${d}`];
        if (st === "present") {
          present++;
          marked++;
        } else if (st === "absent") {
          marked++;
        }
      });
      return {
        name: subj,
        pct: marked > 0 ? Math.round((present / marked) * 100) : null,
      };
    });
  }, [timetable, attendance]);

  const todayDayLabel = weekDays[(new Date().getDay() + 6) % 7];

  return (
    <div>
      <SectionLabel>ADD_CLASS</SectionLabel>
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Subject name"
          style={{
            flex: 1,
            background: CARD,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 10,
            padding: "8px 10px",
            color: TEXT,
            fontSize: 12,
            fontFamily: "inherit",
          }}
        />
        <select
          value={day}
          onChange={(e) => setDay(e.target.value)}
          style={{
            background: CARD,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 10,
            color: TEXT,
            fontSize: 12,
            padding: "8px 6px",
          }}
        >
          {weekDays.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          style={{
            background: CARD,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 10,
            color: TEXT,
            fontSize: 12,
            padding: "8px 6px",
          }}
        />
        <button
          onClick={addClass}
          style={{
            background: ACCENT,
            border: "none",
            borderRadius: 10,
            padding: "0 12px",
            cursor: "pointer",
          }}
        >
          <Plus size={16} color="#0a0a0a" />
        </button>
      </div>

      {subjectStats.length > 0 && (
        <>
          <SectionLabel>SUBJECT_ATTENDANCE</SectionLabel>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            {subjectStats.map((s) => (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: CARD,
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 8,
                  padding: "5px 8px",
                  fontSize: 9,
                }}
              >
                <span style={{ color: TEXT }}>{s.name}</span>
                <span
                  style={{
                    color: s.pct === null ? MUTED : s.pct >= 75 ? ACCENT : RED,
                    fontWeight: 700,
                  }}
                >
                  {s.pct === null ? "--" : `${s.pct}%`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionLabel>TIMETABLE</SectionLabel>
      {byDay.length === 0 && (
        <div style={{ fontSize: 12, color: MUTED, padding: "10px 0" }}>
          No classes added yet. Add your subjects above.
        </div>
      )}
      {byDay.map(({ day: d, slots }) => (
        <div key={d} style={{ marginBottom: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: 0.7,
                color: d === todayDayLabel ? ACCENT : MUTED,
              }}
            >
              {d.toUpperCase()}
            </span>
            {d === todayDayLabel && (
              <span
                style={{
                  fontSize: 6.3,
                  color: "#0a0a0a",
                  background: ACCENT,
                  borderRadius: 4,
                  padding: "1px 4px",
                  fontWeight: 700,
                }}
              >
                TODAY
              </span>
            )}
            <div style={{ flex: 1, height: 1, background: CARD_BORDER }} />
          </div>

          {slots.map((c) => {
            const key = `${c.name}-${c.day}`;
            const st = attendance[key] || "none";
            const bg = st === "present" ? ACCENT : st === "absent" ? RED : "#232323";
            const fg = st === "present" ? "#0a0a0a" : st === "absent" ? "#2a0f0f" : MUTED;
            const statusLabel = st === "present" ? "PRESENT" : st === "absent" ? "ABSENT" : "MARK";
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  background: CARD,
                  border: `1px solid ${CARD_BORDER}`,
                  borderRadius: 9,
                  padding: "7px 8px",
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: ACCENT_DIM,
                    minWidth: 32,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {c.time}
                </span>
                <span style={{ fontSize: 9, flex: 1 }}>{c.name}</span>
                <button
                  onClick={() => cycleAttendance(c.name, c.day)}
                  style={{
                    background: bg,
                    color: fg,
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 7px",
                    fontSize: 6.7,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                    cursor: "pointer",
                  }}
                >
                  {statusLabel}
                </button>
                <button
                  onClick={() => removeClass(c.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: MUTED,
                    cursor: "pointer",
                    display: "flex",
                  }}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            );
          })}
        </div>
      ))}
      <div style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>
        Tap the status button to cycle: mark → present → absent.
      </div>
    </div>
  );
}

// ---------------- REPORT ----------------
function ReportTab({ rate, attendanceStats, pieData, weeklyBar, bestStreak }) {
  const attendPct = attendanceStats.total
    ? Math.round((attendanceStats.present / attendanceStats.total) * 100)
    : 0;
  const hasAttendance = attendanceStats.total > 0;

  return (
    <div>
      <SectionLabel>OVERVIEW</SectionLabel>
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard label="HABIT RATE" value={`${Math.max(0, rate)}%`} highlight />
        <StatCard label="ATTENDANCE" value={hasAttendance ? `${attendPct}%` : "--"} />
        <StatCard label="STREAK" value={`${bestStreak}d`} />
      </div>

      <SectionLabel>WEEKLY_COMPLETIONS</SectionLabel>
      <div
        style={{
          background: CARD,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 14,
          padding: "12px 8px",
          height: 180,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyBar}>
            <CartesianGrid stroke={CARD_BORDER} vertical={false} />
            <XAxis dataKey="day" stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke={MUTED} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#1a1a1a", border: `1px solid ${CARD_BORDER}`, borderRadius: 8 }}
              labelStyle={{ color: TEXT }}
            />
            <Bar dataKey="count" fill={ACCENT} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SectionLabel>CLASS_ATTENDANCE</SectionLabel>
      <div
        style={{
          background: CARD,
          border: `1px solid ${CARD_BORDER}`,
          borderRadius: 14,
          padding: "12px 8px",
          height: 200,
        }}
      >
        {hasAttendance ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
              >
                <Cell fill={ACCENT} />
                <Cell fill={RED} />
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1a1a1a", border: `1px solid ${CARD_BORDER}`, borderRadius: 8 }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 12, color: MUTED }}>
            Mark attendance in Classes to see this chart.
          </div>
        )}
      </div>
      {hasAttendance && (
        <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, color: MUTED }}>
          <span><span style={{ color: ACCENT }}>■</span> Present {attendanceStats.present}</span>
          <span><span style={{ color: RED }}>■</span> Absent {attendanceStats.absent}</span>
        </div>
      )}
    </div>
  );
}

// ---------------- SETTINGS ----------------
function SettingsTab({ habits }) {
  return (
    <div>
      <SectionLabel>REMINDERS</SectionLabel>
      {habits.map((h) => (
        <div
          key={h.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            background: CARD,
            border: `1px solid ${CARD_BORDER}`,
            borderRadius: 12,
            padding: "10px 14px",
            marginBottom: 8,
            fontSize: 12,
          }}
        >
          <span>{h.name}</span>
          <span style={{ color: h.reminder.enabled ? ACCENT : MUTED }}>
            {h.reminder.enabled ? `${h.reminder.time} · ${h.reminder.mode}` : "off"}
          </span>
        </div>
      ))}
      <div style={{ fontSize: 10.5, color: MUTED, marginTop: 12, lineHeight: 1.5 }}>
        Manage reminder times from the bell icon on each habit in the Today tab.
        Notifications need this tab open in your browser and permission granted;
        alarms play a sound in-app when the time arrives.
      </div>
    </div>
  );
}

// ---------------- REMINDER MODAL ----------------
function ReminderModal({ habit, onClose, onSave }) {
  const [enabled, setEnabled] = useState(habit.reminder.enabled);
  const [time, setTime] = useState(habit.reminder.time);
  const [mode, setMode] = useState(habit.reminder.mode);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 10,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "#121212",
          borderTop: `1px solid ${CARD_BORDER}`,
          borderRadius: "20px 20px 0 0",
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{habit.name} REMINDER</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: MUTED, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: MUTED }}>Enable reminder</span>
          <button
            onClick={() => setEnabled((v) => !v)}
            style={{
              width: 44,
              height: 24,
              borderRadius: 20,
              border: "none",
              background: enabled ? ACCENT : "#2a2a2a",
              position: "relative",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: enabled ? "#0a0a0a" : "#888",
                position: "absolute",
                top: 3,
                left: enabled ? 23 : 3,
                transition: "left 0.15s",
              }}
            />
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Time</div>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{
              width: "100%",
              background: CARD,
              border: `1px solid ${CARD_BORDER}`,
              borderRadius: 10,
              padding: "10px 12px",
              color: TEXT,
              fontSize: 14,
              fontFamily: "inherit",
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Alert type</div>
          <div style={{ display: "flex", gap: 8 }}>
            <ModeBtn
              active={mode === "notification"}
              icon={<Bell size={14} />}
              label="Notification"
              onClick={() => setMode("notification")}
            />
            <ModeBtn
              active={mode === "alarm"}
              icon={<AlarmClock size={14} />}
              label="Alarm"
              onClick={() => setMode("alarm")}
            />
          </div>
        </div>

        <button
          onClick={() => onSave({ enabled, time, mode })}
          style={{
            width: "100%",
            background: ACCENT,
            border: "none",
            borderRadius: 12,
            padding: "12px 0",
            fontSize: 13,
            fontWeight: 700,
            color: "#0a0a0a",
            cursor: "pointer",
          }}
        >
          Save reminder
        </button>
      </div>
    </div>
  );
}

function ModeBtn({ active, icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "10px 0",
        borderRadius: 10,
        border: `1px solid ${active ? ACCENT : CARD_BORDER}`,
        background: active ? "rgba(198,255,74,0.1)" : CARD,
        color: active ? ACCENT : MUTED,
        fontSize: 12,
        cursor: "pointer",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------- ALARM OVERLAY ----------------
function AlarmOverlay({ habit, onDismiss }) {
  if (!habit) return null;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        zIndex: 20,
        textAlign: "center",
        padding: 24,
      }}
    >
      <Volume2 size={40} color={ACCENT} />
      <div style={{ fontSize: 15, fontWeight: 700 }}>{habit.name}</div>
      <div style={{ fontSize: 12, color: MUTED }}>Still not marked done today</div>
      <button
        onClick={onDismiss}
        style={{
          background: ACCENT,
          border: "none",
          borderRadius: 12,
          padding: "10px 24px",
          fontSize: 13,
          fontWeight: 700,
          color: "#0a0a0a",
          cursor: "pointer",
        }}
      >
        Dismiss
      </button>
    </div>
  );
}


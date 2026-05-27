import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface Props {
  value: string;           // "YYYY-MM-DD"
  onChange: (v: string) => void;
  max?: string;            // "YYYY-MM-DD" — disable dates after this
  label?: string;
}

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function formatDisplay(iso: string): string {
  const today = toISO(new Date());
  const yesterday = toISO(new Date(Date.now() - 86400000));
  if (iso === today) return 'Hoje';
  if (iso === yesterday) return 'Ontem';
  const d = parseLocal(iso);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export function DatePickerInput({ value, onChange, max, label }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear]   = useState(() => parseLocal(value).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseLocal(value).getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Sync view with value when value changes externally
  useEffect(() => {
    const d = parseLocal(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  const maxDate = max ? parseLocal(max) : new Date();

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    // Don't navigate past the month that contains maxDate
    const maxY = maxDate.getFullYear();
    const maxM = maxDate.getMonth();
    if (viewYear > maxY || (viewYear === maxY && viewMonth >= maxM)) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Build day grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedISO = value;
  const todayISO = toISO(new Date());

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (iso > toISO(maxDate)) return;
    onChange(iso);
    setOpen(false);
  }

  const canGoNext = !(viewYear === maxDate.getFullYear() && viewMonth >= maxDate.getMonth());

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          background: '#0d1526', border: `1px solid ${open ? '#7c3aed' : '#1e2d4a'}`,
          borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
          color: '#e2e8f0', fontSize: 14, textAlign: 'left',
          boxShadow: open ? '0 0 0 3px rgba(124,58,237,0.15)' : 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        <Calendar size={15} color="#7c3aed" style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{formatDisplay(value)}</span>
        <span style={{ fontSize: 11, color: '#475569' }}>{value}</span>
      </button>

      {/* Calendar popup */}
      {open && (
        <div style={{
          position: 'absolute', zIndex: 200, top: 'calc(100% + 6px)', left: 0,
          background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          padding: '14px 12px', minWidth: 260,
          animation: 'fadeInUp 0.15s ease-out',
        }}>

          {/* Month/year header */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <button type="button" onClick={prevMonth} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
              padding: '4px 6px', borderRadius: 6, lineHeight: 0,
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e2d4a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" onClick={nextMonth} style={{
              background: 'none', border: 'none', cursor: canGoNext ? 'pointer' : 'not-allowed',
              color: canGoNext ? '#94a3b8' : '#1e2d4a',
              padding: '4px 6px', borderRadius: 6, lineHeight: 0,
            }}
              onMouseEnter={e => canGoNext && (e.currentTarget.style.background = '#1e2d4a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
            {WEEKDAYS.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#475569', padding: '2px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((day, idx) => {
              if (day === null) return <div key={idx} />;
              const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = iso === selectedISO;
              const isToday = iso === todayISO;
              const isFuture = iso > toISO(maxDate);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isFuture}
                  onClick={() => selectDay(day)}
                  style={{
                    padding: '6px 2px', borderRadius: 6, border: 'none', cursor: isFuture ? 'not-allowed' : 'pointer',
                    fontSize: 13, fontWeight: isSelected || isToday ? 700 : 400, textAlign: 'center',
                    background: isSelected ? '#7c3aed' : 'transparent',
                    color: isFuture ? '#1e2d4a' : isSelected ? '#fff' : isToday ? '#a855f7' : '#cbd5e1',
                    outline: isToday && !isSelected ? '1px solid #7c3aed40' : 'none',
                    transition: 'background 0.1s, color 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (!isFuture && !isSelected) e.currentTarget.style.background = '#1e2d4a';
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick buttons */}
          <div style={{ display: 'flex', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid #1e2d4a' }}>
            {([
              { label: 'Hoje',  days: 0 },
              { label: 'Ontem', days: 1 },
            ] as { label: string; days: number }[]).map(({ label, days }) => {
              const d = new Date(); d.setDate(d.getDate() - days);
              const val = toISO(d);
              return (
                <button key={label} type="button" onClick={() => { onChange(val); setOpen(false); }} style={{
                  flex: 1, padding: '5px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                  border: `1px solid ${value === val ? '#7c3aed' : '#1e2d4a'}`,
                  background: value === val ? '#7c3aed20' : '#0d1526',
                  color: value === val ? '#a855f7' : '#64748b',
                  fontWeight: value === val ? 700 : 400,
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

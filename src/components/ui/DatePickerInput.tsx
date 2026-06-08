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

/** YYYY-MM-DD → dd-mm-aaaa */
function isoToDMY(iso: string): string {
  if (!iso || iso.length < 10) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

/** dd-mm-aaaa → YYYY-MM-DD, returns null if date doesn't exist */
function parseDMY(dmy: string): string | null {
  const match = dmy.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const d = Number(dd), mo = Number(mm), y = Number(yyyy);
  if (mo < 1 || mo > 12) return null;
  if (d < 1) return null;
  if (y < 1900 || y > 2100) return null;
  // Check the date actually exists (handles 31-02, 29-02 on non-leap years, etc.)
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Auto-apply dd-mm-aaaa mask to a string of digits */
function applyMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export function DatePickerInput({ value, onChange, max, label }: Props) {
  const [open, setOpen]         = useState(false);
  const [viewYear, setViewYear]   = useState(() => parseLocal(value).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseLocal(value).getMonth());
  const [rawInput, setRawInput]   = useState(() => isoToDMY(value));
  const [inputError, setInputError] = useState('');
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

  // Sync text input and calendar view when external value changes (calendar click, quick buttons)
  useEffect(() => {
    setRawInput(isoToDMY(value));
    setInputError('');
    const d = parseLocal(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  const maxDate = max ? parseLocal(max) : new Date();
  const maxISO  = toISO(maxDate);

  // ── Text input handlers ───────────────────────────────────────────────────

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const prev = rawInput;
    const next = e.target.value;
    const isDeleting = next.length < prev.length;

    if (isDeleting) {
      // Allow free deletion without re-inserting separators
      setRawInput(next);
      setInputError('');
      return;
    }

    const masked = applyMask(next);
    setRawInput(masked);
    setInputError('');

    // Validate when all 8 digits are present
    const digits = masked.replace(/\D/g, '');
    if (digits.length === 8) {
      const iso = parseDMY(masked);
      if (!iso) {
        setInputError('Data inválida');
      } else if (iso > maxISO) {
        setInputError('Data não permitida');
      } else {
        onChange(iso);
        setInputError('');
        setOpen(false);
      }
    }
  }

  function handleBlur() {
    // If partial input, revert to last valid value
    const digits = rawInput.replace(/\D/g, '');
    if (digits.length > 0 && digits.length < 8) {
      setRawInput(isoToDMY(value));
      setInputError('');
    }
  }

  // ── Calendar ──────────────────────────────────────────────────────────────

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    const maxY = maxDate.getFullYear(), maxM = maxDate.getMonth();
    if (viewYear > maxY || (viewYear === maxY && viewMonth >= maxM)) return;
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDay   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedISO = value;
  const todayISO    = toISO(new Date());

  function selectDay(day: number) {
    const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (iso > maxISO) return;
    onChange(iso);
    setOpen(false);
  }

  const canGoNext = !(viewYear === maxDate.getFullYear() && viewMonth >= maxDate.getMonth());

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {label && (
        <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>
          {label}
        </label>
      )}

      {/* Input row: text field + calendar button */}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#0d1526',
        border: `1px solid ${inputError ? '#ef4444' : open ? '#7c3aed' : '#1e2d4a'}`,
        borderRadius: 8, overflow: 'hidden',
        boxShadow: open
          ? '0 0 0 3px rgba(124,58,237,0.15)'
          : inputError
            ? '0 0 0 2px rgba(239,68,68,0.15)'
            : 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}>
        <input
          type="text"
          inputMode="numeric"
          value={rawInput}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder="dd-mm-aaaa"
          maxLength={10}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: '10px 14px',
            fontSize: 14,
            color: '#e2e8f0',
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
          }}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          title="Abrir calendário"
          style={{
            background: 'none',
            border: 'none',
            borderLeft: '1px solid #1e2d4a',
            padding: '10px 12px',
            cursor: 'pointer',
            lineHeight: 0,
            color: open ? '#a855f7' : '#7c3aed',
            transition: 'color 0.15s',
          }}
        >
          <Calendar size={16} />
        </button>
      </div>

      {/* Validation error */}
      {inputError && (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
          ⚠ {inputError}
        </div>
      )}

      {/* Calendar popup */}
      {open && (
        <div style={{
          position: 'absolute', zIndex: 200, top: 'calc(100% + 6px)', left: 0,
          background: '#111827', border: '1px solid #1e2d4a', borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          padding: '14px 12px', minWidth: 260,
          animation: 'fadeInUp 0.15s ease-out',
        }}>

          {/* Month / year navigation */}
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
              background: 'none', border: 'none',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
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
              <div key={i} style={{
                textAlign: 'center', fontSize: 11, fontWeight: 700,
                color: '#475569', padding: '2px 0',
              }}>
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
              const isToday    = iso === todayISO;
              const isFuture   = iso > maxISO;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isFuture}
                  onClick={() => selectDay(day)}
                  style={{
                    padding: '6px 2px', borderRadius: 6, border: 'none',
                    cursor: isFuture ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: isSelected || isToday ? 700 : 400,
                    textAlign: 'center',
                    background: isSelected ? '#7c3aed' : 'transparent',
                    color: isFuture ? '#1e2d4a' : isSelected ? '#fff' : isToday ? '#a855f7' : '#cbd5e1',
                    outline: isToday && !isSelected ? '1px solid #7c3aed40' : 'none',
                    transition: 'background 0.1s, color 0.1s',
                  }}
                  onMouseEnter={e => { if (!isFuture && !isSelected) e.currentTarget.style.background = '#1e2d4a'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick: Hoje / Ontem */}
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

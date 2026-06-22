import { useState, useEffect, useRef } from 'react';
import {
  Apple, Droplets, Scale, Calculator, ChevronDown, ChevronUp,
  Plus, Trash2, X, Check, TrendingDown, TrendingUp, Minus,
  Flame, Loader2, Trophy, Search, Salad,
} from 'lucide-react';
import { TACO, searchTaco, scaleTaco, type TacoFood } from '../data/taco';
import { useNutritionStore } from '../store/nutritionStore';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import type { TrainerDietPlan } from '../types/nutrition';
import {
  calculateMacros,
  WATER_PRESETS,
  NUTRITION_ACHIEVEMENT_IDS,
} from '../utils/nutritionCalc';
import {
  MEAL_LABELS, MEAL_EMOJIS, OBJECTIVE_LABELS, OBJECTIVE_COLORS,
  ACTIVITY_LABELS,
  type MealType, type NutritionObjective, type ActivityLevel,
} from '../types/nutrition';

// ── Shared style helpers ──────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

function fmtNum(n: number, decimals = 0) {
  return n.toFixed(decimals).replace('.', ',');
}

// ── Reusable sub-components ───────────────────────────────────────────────────

function ProgressBar({
  value, max, color, height = 8,
}: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const over = max > 0 && value > max;
  return (
    <div style={{ height, borderRadius: height / 2, background: '#1e2d4a', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        borderRadius: height / 2,
        background: over ? '#ef4444' : color,
        width: `${pct}%`,
        transition: 'width 0.4s ease',
      }} />
    </div>
  );
}

function MacroRow({
  label, value, goal, color, unit = 'g',
}: { label: string; value: number; goal: number; color: string; unit?: string }) {
  const pct = goal > 0 ? Math.min(Math.round((value / goal) * 100), 999) : 0;
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700 }}>
          {fmtNum(value)}{unit}
          <span style={{ color: '#475569', fontWeight: 400 }}> / {fmtNum(goal)}{unit}</span>
          <span style={{ marginLeft: 6, fontSize: 11, color: pct >= 100 ? '#10b981' : color }}>{pct}%</span>
        </span>
      </div>
      <ProgressBar value={value} max={goal} color={color} />
    </div>
  );
}

function SectionHeader({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: `${color}20`, display: 'grid', placeItems: 'center', color, flexShrink: 0,
      }}>
        {icon}
      </div>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>{title}</h2>
    </div>
  );
}

// ── Achievement toast ─────────────────────────────────────────────────────────

const ACHIEVEMENT_LABELS: Record<string, { title: string; desc: string }> = {
  [NUTRITION_ACHIEVEMENT_IDS.FIRST_MEAL]:   { title: 'Primeira refeição!', desc: 'Você registrou sua primeira refeição.' },
  [NUTRITION_ACHIEVEMENT_IDS.FIRST_WATER]:  { title: 'Hidratação iniciada!', desc: 'Você registrou o primeiro copo d\'água.' },
  [NUTRITION_ACHIEVEMENT_IDS.FIRST_WEIGHT]: { title: 'Peso registrado!', desc: 'Você registrou seu primeiro peso.' },
  [NUTRITION_ACHIEVEMENT_IDS.GOALS_SET]:    { title: 'Metas definidas!', desc: 'Suas metas nutricionais foram salvas.' },
};

function AchievementToast({ id, onDismiss }: { id: string; onDismiss: () => void }) {
  const info = ACHIEVEMENT_LABELS[id];
  if (!info) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 500, maxWidth: 340, width: 'calc(100% - 32px)',
      background: '#eab30815', border: '1px solid #eab30840',
      borderRadius: 12, padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
      backdropFilter: 'blur(8px)',
    }}>
      <Trophy size={20} color="#eab308" />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fde047' }}>{info.title}</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>{info.desc}</div>
      </div>
      <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

type Tab = 'summary' | 'meals' | 'calculator' | 'weight';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'summary',    label: 'Resumo',       icon: <Flame size={14} />       },
  { id: 'meals',      label: 'Refeições',    icon: <Apple size={14} />       },
  { id: 'calculator', label: 'Calculadora',  icon: <Calculator size={14} />  },
  { id: 'weight',     label: 'Peso',         icon: <Scale size={14} />       },
];

// ══════════════════════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════════════════════

export function NutritionPage() {
  const { user: authUser } = useAuthStore();
  const { user: gameUser } = useGameStore();
  const {
    goals, initialized, loading,
    initNutritionData, clearNewAchievements, newAchievements,
    getMealEntriesForDate, getDailySummary,
  } = useNutritionStore();

  const [tab, setTab] = useState<Tab>('summary');
  const [selectedDate, setSelectedDate] = useState(today());
  const [prescribedPlan, setPrescribedPlan] = useState<TrainerDietPlan | null>(null);

  useEffect(() => {
    if (authUser?.id && !initialized) {
      initNutritionData(authUser.id);
    }
  }, [authUser?.id, initialized]);

  useEffect(() => {
    if (!authUser?.id) return;
    supabase
      .from('trainer_diet_plans')
      .select('*, trainer_diet_plan_items(*)')
      .eq('student_id', authUser.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const r = data as Record<string, unknown>;
        setPrescribedPlan({
          id:        r.id as string,
          trainerId: r.trainer_id as string,
          studentId: r.student_id as string,
          planName:  (r.plan_name as string) ?? '',
          objective: (r.objective as any) ?? 'maintenance',
          notes:     (r.notes as string) ?? '',
          items:     ((r.trainer_diet_plan_items as any[]) ?? [])
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((i: any) => ({
              id:         i.id,
              planId:     i.plan_id,
              mealType:   i.meal_type,
              foodName:   i.food_name,
              quantityG:  i.quantity_g != null ? parseFloat(i.quantity_g) : undefined,
              calories:   parseFloat(i.calories) || 0,
              protein:    parseFloat(i.protein)  || 0,
              carbs:      parseFloat(i.carbs)    || 0,
              fats:       parseFloat(i.fats)     || 0,
              notes:      i.notes ?? '',
              orderIndex: i.order_index ?? 0,
            })),
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        });
      });
  }, [authUser?.id]);

  // Dismiss achievements after 4 s
  useEffect(() => {
    if (newAchievements.length > 0) {
      const t = setTimeout(() => clearNewAchievements(), 4000);
      return () => clearTimeout(t);
    }
  }, [newAchievements]);

  const summary = getDailySummary(selectedDate);
  const defaultGoals = {
    dailyCalories: 2000, proteinG: 150, carbsG: 200, fatsG: 65, waterMl: 2500,
  };
  const g = goals ?? defaultGoals;

  if (loading) {
    return (
      <div className="page-wrap" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Loader2 size={28} color="#a855f7" style={{ animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="page-wrap fade-in-up">
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Apple size={24} color="#10b981" /> Nutrição
        </h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
          Acompanhe sua alimentação, hidratação e peso
        </p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 6, marginBottom: 20,
        overflowX: 'auto', paddingBottom: 2,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: tab === t.id ? '#7c3aed' : '#111827',
              color: tab === t.id ? '#fff' : '#64748b',
              fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Date selector (shown on summary and meals tabs) */}
      {(tab === 'summary' || tab === 'meals') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Data:</span>
          <input
            type="date"
            className="game-input"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            max={today()}
            style={{ fontSize: 13, padding: '6px 10px', width: 'auto' }}
          />
          {selectedDate !== today() && (
            <button
              onClick={() => setSelectedDate(today())}
              style={{
                fontSize: 12, padding: '5px 10px', borderRadius: 6,
                border: '1px solid #1e2d4a', background: 'transparent',
                color: '#64748b', cursor: 'pointer',
              }}
            >
              Hoje
            </button>
          )}
        </div>
      )}

      {/* ── Summary tab ────────────────────────────────────────────────────── */}
      {tab === 'summary' && (
        <SummaryTab
          summary={summary}
          goals={g}
          selectedDate={selectedDate}
          goalObjective={goals?.objective ?? 'maintenance'}
          prescribedPlan={prescribedPlan}
        />
      )}

      {/* ── Meals tab ──────────────────────────────────────────────────────── */}
      {tab === 'meals' && (
        <MealsTab selectedDate={selectedDate} getMealEntries={getMealEntriesForDate} />
      )}

      {/* ── Calculator tab ─────────────────────────────────────────────────── */}
      {tab === 'calculator' && (
        <CalculatorTab
          initialSex={gameUser.sex}
          initialHeightCm={goals?.heightCm}
          initialActivityLevel={goals?.activityLevel ?? 'moderate'}
          initialObjective={goals?.objective ?? 'maintenance'}
        />
      )}

      {/* ── Weight tab ─────────────────────────────────────────────────────── */}
      {tab === 'weight' && <WeightTab />}

      {/* Achievement toasts */}
      {newAchievements.slice(-1).map(id => (
        <AchievementToast key={id} id={id} onDismiss={clearNewAchievements} />
      ))}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Summary Tab
// ══════════════════════════════════════════════════════════════════════════════

// ── Prescribed diet card (trainer → student) ─────────────────────────────────

const MEAL_ORDER_DISPLAY: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'supper'];

function PrescribedDietCard({ plan }: { plan: TrainerDietPlan }) {
  const [expanded, setExpanded] = useState(false);

  const totalCal  = plan.items.reduce((a, i) => a + i.calories, 0);
  const totalProt = plan.items.reduce((a, i) => a + i.protein,  0);
  const totalCarbs = plan.items.reduce((a, i) => a + i.carbs,  0);
  const totalFats = plan.items.reduce((a, i) => a + i.fats,    0);

  const itemsByMeal = MEAL_ORDER_DISPLAY.reduce<Record<MealType, typeof plan.items>>((acc, mt) => {
    acc[mt] = plan.items.filter(i => i.mealType === mt);
    return acc;
  }, {} as Record<MealType, typeof plan.items>);

  return (
    <div className="game-card" style={{
      padding: '14px 16px',
      borderLeft: `3px solid ${OBJECTIVE_COLORS[plan.objective]}`,
      background: 'linear-gradient(135deg, #111827 0%, #0d1a0f 100%)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${OBJECTIVE_COLORS[plan.objective]}20`,
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Salad size={16} color={OBJECTIVE_COLORS[plan.objective]} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dieta prescrita pelo personal
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {plan.planName}
            </div>
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', flexShrink: 0 }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Macro summary row */}
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>{Math.round(totalCal)} kcal</span>
        <span style={{ fontSize: 12, color: '#a855f7' }}>{totalProt.toFixed(0)}g prot</span>
        <span style={{ fontSize: 12, color: '#0ea5e9' }}>{totalCarbs.toFixed(0)}g carbs</span>
        <span style={{ fontSize: 12, color: '#eab308' }}>{totalFats.toFixed(0)}g gord</span>
        <span style={{ fontSize: 12, color: '#475569' }}>{plan.items.length} alimentos</span>
      </div>

      {/* Notes */}
      {plan.notes && (
        <div style={{ fontSize: 12, color: '#475569', marginTop: 8, fontStyle: 'italic', borderTop: '1px solid #1e2d4a', paddingTop: 8 }}>
          {plan.notes}
        </div>
      )}

      {/* Expanded: meals */}
      {expanded && (
        <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
          {MEAL_ORDER_DISPLAY.map(mt => {
            const mealItems = itemsByMeal[mt];
            if (mealItems.length === 0) return null;
            const mealCal = mealItems.reduce((a, i) => a + i.calories, 0);
            return (
              <div key={mt}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 15 }}>{MEAL_EMOJIS[mt]}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>{MEAL_LABELS[mt]}</span>
                  <span style={{ fontSize: 11, color: '#475569', marginLeft: 4 }}>{Math.round(mealCal)} kcal</span>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {mealItems.map(item => (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 10px', borderRadius: 8,
                      background: '#0d1526', border: '1px solid #1e2d4a', gap: 8,
                    }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.foodName}
                          {item.quantityG && <span style={{ color: '#475569', fontWeight: 400 }}> · {item.quantityG}g</span>}
                        </div>
                        {item.notes && <div style={{ fontSize: 11, color: '#334155', marginTop: 1 }}>{item.notes}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 11, color: '#f97316', fontWeight: 700 }}>{item.calories} kcal</span>
                        <span style={{ fontSize: 11, color: '#a855f7' }}>{item.protein}g P</span>
                        <span style={{ fontSize: 11, color: '#0ea5e9' }}>{item.carbs}g C</span>
                        <span style={{ fontSize: 11, color: '#eab308' }}>{item.fats}g G</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Summary Tab
// ══════════════════════════════════════════════════════════════════════════════

function SummaryTab({
  summary, goals, selectedDate, goalObjective, prescribedPlan,
}: {
  summary: { calories: number; protein: number; carbs: number; fats: number; waterMl: number };
  goals: { dailyCalories: number; proteinG: number; carbsG: number; fatsG: number; waterMl: number };
  selectedDate: string;
  goalObjective: NutritionObjective;
  prescribedPlan?: TrainerDietPlan | null;
}) {
  const waterPct = goals.waterMl > 0 ? Math.min(Math.round((summary.waterMl / goals.waterMl) * 100), 100) : 0;
  const calPct   = goals.dailyCalories > 0 ? Math.round((summary.calories / goals.dailyCalories) * 100) : 0;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Prescribed diet (trainer → student) */}
      {prescribedPlan && <PrescribedDietCard plan={prescribedPlan} />}

      {/* Nutritional objective banner */}
      <div className="game-card" style={{
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderLeft: `3px solid ${OBJECTIVE_COLORS[goalObjective]}`,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objetivo atual</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: OBJECTIVE_COLORS[goalObjective], marginTop: 2 }}>
            {OBJECTIVE_LABELS[goalObjective]}
          </div>
        </div>
      </div>

      {/* Calories card */}
      <div className="game-card" style={{ padding: 20 }}>
        <SectionHeader icon={<Flame size={16} />} title="Calorias" color="#f97316" />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: calPct > 110 ? '#ef4444' : '#f97316' }}>
            {fmtNum(summary.calories)}
          </span>
          <span style={{ fontSize: 14, color: '#64748b' }}>/ {fmtNum(goals.dailyCalories)} kcal</span>
          <span style={{
            marginLeft: 'auto', fontSize: 13, fontWeight: 700,
            color: calPct > 110 ? '#ef4444' : calPct >= 90 ? '#10b981' : '#f97316',
          }}>
            {calPct}%
          </span>
        </div>
        <ProgressBar value={summary.calories} max={goals.dailyCalories} color="#f97316" height={10} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: '#475569' }}>
            Restam: {Math.max(goals.dailyCalories - summary.calories, 0).toFixed(0)} kcal
          </span>
          {calPct >= 90 && calPct <= 110 && (
            <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Check size={10} /> Meta atingida
            </span>
          )}
        </div>
      </div>

      {/* Macros card */}
      <div className="game-card" style={{ padding: 20 }}>
        <SectionHeader icon={<Apple size={16} />} title="Macronutrientes" color="#a855f7" />
        <div style={{ display: 'grid', gap: 14 }}>
          <MacroRow label="Proteína"      value={summary.protein} goal={goals.proteinG} color="#a855f7" />
          <MacroRow label="Carboidratos"  value={summary.carbs}   goal={goals.carbsG}   color="#0ea5e9" />
          <MacroRow label="Gorduras"      value={summary.fats}    goal={goals.fatsG}    color="#eab308" />
        </div>
      </div>

      {/* Water card */}
      <WaterSummaryCard
        waterMl={summary.waterMl}
        goalMl={goals.waterMl}
        waterPct={waterPct}
        selectedDate={selectedDate}
      />

      {!summary.calories && !summary.waterMl && (
        <div className="game-card" style={{ padding: 28, textAlign: 'center' }}>
          <Apple size={32} color="#1e2d4a" style={{ margin: '0 auto 10px' }} />
          <div style={{ color: '#475569', fontSize: 14 }}>Nenhum registro para esse dia.</div>
          <div style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>
            Vá para a aba <strong style={{ color: '#64748b' }}>Refeições</strong> para adicionar alimentos.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Water summary card ────────────────────────────────────────────────────────

function WaterSummaryCard({
  waterMl, goalMl, waterPct, selectedDate,
}: { waterMl: number; goalMl: number; waterPct: number; selectedDate: string }) {
  const { addWaterLog, removeWaterLog, waterLogs } = useNutritionStore();
  const [adding, setAdding] = useState(false);
  const [customMl, setCustomMl] = useState('');

  const todayLogs = waterLogs.filter(l => l.date === selectedDate);

  async function handleAdd(ml: number) {
    setAdding(true);
    await addWaterLog(selectedDate, ml);
    setAdding(false);
    setCustomMl('');
  }

  return (
    <div className="game-card" style={{ padding: 20 }}>
      <SectionHeader icon={<Droplets size={16} />} title="Hidratação" color="#0ea5e9" />

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color: '#0ea5e9' }}>
          {(waterMl / 1000).toFixed(1).replace('.', ',')}L
        </span>
        <span style={{ fontSize: 13, color: '#64748b' }}>/ {(goalMl / 1000).toFixed(1).replace('.', ',')}L</span>
        <span style={{
          marginLeft: 'auto', fontSize: 13, fontWeight: 700,
          color: waterPct >= 100 ? '#10b981' : '#0ea5e9',
        }}>
          {waterPct}%
        </span>
      </div>
      <ProgressBar value={waterMl} max={goalMl} color="#0ea5e9" height={10} />
      <div style={{ fontSize: 11, color: '#475569', marginTop: 6 }}>
        Faltam: {Math.max(goalMl - waterMl, 0)}ml
      </div>

      {/* Quick-add buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
        {WATER_PRESETS.map(ml => (
          <button
            key={ml}
            onClick={() => handleAdd(ml)}
            disabled={adding}
            style={{
              padding: '6px 12px', borderRadius: 8, border: '1px solid #1e2d4a',
              background: 'transparent', color: '#0ea5e9', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', opacity: adding ? 0.6 : 1,
            }}
          >
            +{ml}ml
          </button>
        ))}
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            className="game-input"
            type="number"
            value={customMl}
            onChange={e => setCustomMl(e.target.value)}
            placeholder="ml"
            min={1}
            style={{ width: 64, padding: '6px 8px', fontSize: 12 }}
          />
          <button
            onClick={() => customMl && handleAdd(Number(customMl))}
            disabled={!customMl || adding}
            style={{
              padding: '6px 10px', borderRadius: 8, border: 'none',
              background: '#0ea5e920', color: '#0ea5e9', cursor: 'pointer',
              opacity: !customMl ? 0.5 : 1,
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Recent entries */}
      {todayLogs.length > 0 && (
        <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {todayLogs.map(log => (
            <span key={log.id} style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 6,
              background: '#0ea5e910', color: '#38bdf8', border: '1px solid #0ea5e920',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              {log.amountMl}ml
              <button
                onClick={() => removeWaterLog(log.id)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 0, lineHeight: 1 }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Meals Tab
// ══════════════════════════════════════════════════════════════════════════════

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'supper'];

function MealsTab({
  selectedDate,
  getMealEntries,
}: { selectedDate: string; getMealEntries: (d: string) => ReturnType<typeof useNutritionStore.getState>['mealEntries'] }) {
  const [openMeal, setOpenMeal] = useState<MealType | null>(null);
  const [addTarget, setAddTarget] = useState<MealType | null>(null);
  const entries = getMealEntries(selectedDate);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {MEAL_ORDER.map(mealType => {
        const mealEntries = entries.filter(e => e.mealType === mealType);
        const totalCal    = mealEntries.reduce((a, e) => a + e.calories, 0);
        const isOpen      = openMeal === mealType;

        return (
          <div key={mealType} className="game-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Meal header */}
            <button
              onClick={() => setOpenMeal(isOpen ? null : mealType)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 20 }}>{MEAL_EMOJIS[mealType]}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{MEAL_LABELS[mealType]}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                  {mealEntries.length} {mealEntries.length === 1 ? 'item' : 'itens'}
                  {totalCal > 0 && <span style={{ marginLeft: 8, color: '#f97316' }}>{fmtNum(totalCal)} kcal</span>}
                </div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setAddTarget(mealType); }}
                style={{
                  padding: '5px 10px', borderRadius: 7, border: '1px solid #1e2d4a',
                  background: 'transparent', color: '#a855f7', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Plus size={12} /> Add
              </button>
              {isOpen ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
            </button>

            {/* Expanded food list */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #1e2d4a', padding: '10px 16px 14px' }}>
                {mealEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: 13 }}>
                    Nenhum alimento registrado. Clique em <strong>Add</strong> para incluir.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {mealEntries.map(entry => (
                      <FoodEntryRow key={entry.id} entry={entry} />
                    ))}
                    {/* Meal total */}
                    <div style={{
                      borderTop: '1px solid #1e2d4a', paddingTop: 8, marginTop: 4,
                      display: 'flex', gap: 16, fontSize: 11, color: '#64748b', flexWrap: 'wrap',
                    }}>
                      <span style={{ fontWeight: 700, color: '#f97316' }}>{fmtNum(totalCal)} kcal</span>
                      <span>P: {fmtNum(mealEntries.reduce((a,e)=>a+e.protein,0))}g</span>
                      <span>C: {fmtNum(mealEntries.reduce((a,e)=>a+e.carbs,0))}g</span>
                      <span>G: {fmtNum(mealEntries.reduce((a,e)=>a+e.fats,0))}g</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add food modal */}
      {addTarget && (
        <AddFoodModal
          mealType={addTarget}
          date={selectedDate}
          onClose={() => setAddTarget(null)}
        />
      )}
    </div>
  );
}

function FoodEntryRow({ entry }: { entry: ReturnType<typeof useNutritionStore.getState>['mealEntries'][0] }) {
  const { deleteMealEntry } = useNutritionStore();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
      borderRadius: 8, background: '#0d1526',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.foodName}
          {entry.quantityG && <span style={{ color: '#475569', fontWeight: 400, marginLeft: 4 }}>({entry.quantityG}g)</span>}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', gap: 10 }}>
          {entry.calories > 0 && <span style={{ color: '#f97316' }}>{fmtNum(entry.calories)} kcal</span>}
          {entry.protein > 0  && <span>P {fmtNum(entry.protein)}g</span>}
          {entry.carbs > 0    && <span>C {fmtNum(entry.carbs)}g</span>}
          {entry.fats > 0     && <span>G {fmtNum(entry.fats)}g</span>}
        </div>
      </div>
      <button
        onClick={() => deleteMealEntry(entry.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Add food modal ────────────────────────────────────────────────────────────

function AddFoodModal({
  mealType, date, onClose,
}: { mealType: MealType; date: string; onClose: () => void }) {
  const { addMealEntry } = useNutritionStore();
  const [saving, setSaving] = useState(false);

  // Search state
  const [query,       setQuery]       = useState('');
  const [suggestions, setSuggestions] = useState<TacoFood[]>([]);
  const [tacoFood,    setTacoFood]    = useState<TacoFood | null>(null); // selected from TACO
  const searchRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [foodName,  setFoodName]  = useState('');
  const [quantityG, setQuantityG] = useState('100');
  const [calories,  setCalories]  = useState('');
  const [protein,   setProtein]   = useState('');
  const [carbs,     setCarbs]     = useState('');
  const [fats,      setFats]      = useState('');

  // Update suggestions as the user types
  useEffect(() => {
    if (tacoFood) { setSuggestions([]); return; } // already selected
    setSuggestions(searchTaco(query));
  }, [query, tacoFood]);

  // Recalculate macros when quantity changes (only when a TACO food is selected)
  useEffect(() => {
    if (!tacoFood) return;
    const g = Number(quantityG) || 100;
    const scaled = scaleTaco(tacoFood, g);
    setCalories(String(scaled.calories));
    setProtein(String(scaled.protein));
    setCarbs(String(scaled.carbs));
    setFats(String(scaled.fats));
  }, [tacoFood, quantityG]);

  function selectTacoFood(food: TacoFood) {
    setTacoFood(food);
    setQuery(food.name);
    setFoodName(food.name);
    setSuggestions([]);
    // macros will be set by the useEffect above
  }

  function clearTacoSelection() {
    setTacoFood(null);
    setQuery('');
    setFoodName('');
    setCalories(''); setProtein(''); setCarbs(''); setFats('');
    setQuantityG('100');
  }

  async function handleSave() {
    const name = foodName.trim() || query.trim();
    if (!name) return;
    setSaving(true);
    await addMealEntry({
      date,
      mealType,
      foodName:  name,
      quantityG: quantityG ? Number(quantityG) : undefined,
      calories:  Number(calories)  || 0,
      protein:   Number(protein)   || 0,
      carbs:     Number(carbs)     || 0,
      fats:      Number(fats)      || 0,
    });
    setSaving(false);
    onClose();
  }

  const canSave = !!(foodName.trim() || query.trim());

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#111827', border: '1px solid #1e2d4a',
        borderRadius: 16, padding: 24, maxWidth: 420, width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0' }}>
              {MEAL_EMOJIS[mealType]} Adicionar alimento
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{MEAL_LABELS[mealType]}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>

          {/* ── TACO search ─────────────────────────────────────────────── */}
          <div ref={searchRef} style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
              Buscar na tabela TACO
              <span style={{ marginLeft: 6, fontSize: 10, color: '#334155', fontWeight: 400 }}>
                {TACO.length} alimentos brasileiros
              </span>
            </label>
            <div style={{ position: 'relative' }}>
              <Search size={14} color="#475569" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                className="game-input"
                value={query}
                onChange={e => { setQuery(e.target.value); if (tacoFood) setTacoFood(null); setFoodName(e.target.value); }}
                placeholder="Frango, arroz, banana…"
                autoFocus
                style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 34 }}
              />
              {query && (
                <button
                  onClick={clearTacoSelection}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 10,
                marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px #00000060',
              }}>
                {suggestions.map(food => (
                  <button
                    key={food.id}
                    onClick={() => selectTacoFood(food)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid #1e2d4a20', textAlign: 'left',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1e2d4a')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{food.name}</div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{food.category}</div>
                    </div>
                    <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                      {food.kcal} kcal
                      <span style={{ color: '#334155', fontWeight: 400 }}>/100g</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected TACO food badge */}
          {tacoFood && (
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: '#10b98115', border: '1px solid #10b98130',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Check size={14} color="#10b981" />
              <span style={{ fontSize: 12, color: '#86efac', flex: 1 }}>
                Macros calculados da TACO para {quantityG || 100}g
              </span>
              <span style={{ fontSize: 11, color: '#475569' }}>
                {tacoFood.kcal} kcal/100g
              </span>
            </div>
          )}

          {/* Quantity — always shown; controls TACO scaling when food is selected */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
              Quantidade (g)
              {tacoFood && <span style={{ marginLeft: 6, fontSize: 10, color: '#10b981' }}>↳ recalcula macros automaticamente</span>}
            </label>
            <input
              className="game-input"
              type="number"
              value={quantityG}
              onChange={e => setQuantityG(e.target.value)}
              placeholder="100"
              min={1}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          {/* Macro fields — pre-filled when TACO selected, editable */}
          <div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              Macros
              {!tacoFood && <span style={{ marginLeft: 6, fontSize: 10 }}>— preencha manualmente ou selecione da TACO acima</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Calorias (kcal)', color: '#f97316', value: calories, set: setCalories },
                { label: 'Proteína (g)',    color: '#a855f7', value: protein,  set: setProtein  },
                { label: 'Carboidratos (g)',color: '#0ea5e9', value: carbs,    set: setCarbs    },
                { label: 'Gorduras (g)',    color: '#eab308', value: fats,     set: setFats     },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ display: 'block', fontSize: 12, color: f.color, marginBottom: 4 }}>{f.label}</label>
                  <input
                    className="game-input"
                    type="number"
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder="0"
                    min={0}
                    step={0.1}
                    style={{ width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px', borderRadius: 8,
              border: '1px solid #1e2d4a', background: 'transparent',
              color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="btn-primary"
            style={{ flex: 2, justifyContent: 'center', opacity: !canSave ? 0.5 : 1 }}
          >
            {saving
              ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
              : <><Plus size={14} /> Adicionar</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Calculator Tab
// ══════════════════════════════════════════════════════════════════════════════

function CalculatorTab({
  initialSex,
  initialHeightCm,
  initialActivityLevel,
  initialObjective,
}: {
  initialSex?: 'male' | 'female' | 'other';
  initialHeightCm?: number;
  initialActivityLevel: ActivityLevel;
  initialObjective: NutritionObjective;
}) {
  const { saveNutritionGoals } = useNutritionStore();

  const [sex,           setSex]           = useState<'male' | 'female' | 'other'>(initialSex ?? 'male');
  const [age,           setAge]           = useState('');
  const [weight,        setWeight]        = useState('');
  const [height,        setHeight]        = useState(initialHeightCm?.toString() ?? '');
  const [activity,      setActivity]      = useState<ActivityLevel>(initialActivityLevel);
  const [objective,     setObjective]     = useState<NutritionObjective>(initialObjective);
  const [waterGoal,     setWaterGoal]     = useState('2500');
  const [result,        setResult]        = useState<ReturnType<typeof calculateMacros> | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  function handleCalculate() {
    if (!age || !weight || !height) return;
    const r = calculateMacros({
      sex,
      age:           Number(age),
      weightKg:      Number(weight),
      heightCm:      Number(height),
      activityLevel: activity,
      objective,
    });
    setResult(r);
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    await saveNutritionGoals({
      objective,
      dailyCalories: result.calories,
      proteinG:      result.protein,
      carbsG:        result.carbs,
      fatsG:         result.fats,
      waterMl:       Number(waterGoal) || 2500,
      heightCm:      Number(height) || undefined,
      activityLevel: activity,
    });
    setSaving(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  }

  const canCalculate = !!age && !!weight && !!height;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="game-card" style={{ padding: 20 }}>
        <SectionHeader icon={<Calculator size={16} />} title="Calculadora de macros" color="#a855f7" />
        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
          Usa a fórmula Mifflin-St Jeor para estimar seu gasto calórico e distribuição de macros.
        </p>

        <div style={{ display: 'grid', gap: 14 }}>
          {/* Sex */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Sexo</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['male', 'female', 'other'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: '1px solid',
                    borderColor: sex === s ? '#7c3aed' : '#1e2d4a',
                    background: sex === s ? '#7c3aed20' : 'transparent',
                    color: sex === s ? '#a855f7' : '#64748b',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  {s === 'male' ? 'Masculino' : s === 'female' ? 'Feminino' : 'Outro'}
                </button>
              ))}
            </div>
          </div>

          {/* Basic stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Idade (anos)', value: age, set: setAge, placeholder: '30' },
              { label: 'Peso (kg)',    value: weight, set: setWeight, placeholder: '75' },
              { label: 'Altura (cm)',  value: height, set: setHeight, placeholder: '175' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>{f.label}</label>
                <input
                  className="game-input"
                  type="number"
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  min={1}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>

          {/* Activity */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Nível de atividade</label>
            <select
              className="game-input"
              value={activity}
              onChange={e => setActivity(e.target.value as ActivityLevel)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(k => (
                <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
              ))}
            </select>
          </div>

          {/* Objective */}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Objetivo</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(Object.keys(OBJECTIVE_LABELS) as NutritionObjective[]).map(obj => (
                <button
                  key={obj}
                  onClick={() => setObjective(obj)}
                  style={{
                    padding: '8px 10px', borderRadius: 8, border: '1px solid',
                    borderColor: objective === obj ? OBJECTIVE_COLORS[obj] : '#1e2d4a',
                    background: objective === obj ? `${OBJECTIVE_COLORS[obj]}15` : 'transparent',
                    color: objective === obj ? OBJECTIVE_COLORS[obj] : '#64748b',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  {OBJECTIVE_LABELS[obj]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleCalculate}
            disabled={!canCalculate}
            className="btn-primary"
            style={{ justifyContent: 'center', opacity: !canCalculate ? 0.5 : 1 }}
          >
            <Calculator size={14} /> Calcular
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="game-card" style={{ padding: 20 }}>
          <SectionHeader icon={<Flame size={16} />} title="Resultado" color="#f97316" />

          <div className="grid-stat" style={{ marginBottom: 18 }}>
            {[
              { label: 'TMB',                    value: `${result.bmr} kcal`,     color: '#64748b' },
              { label: 'Gasto diário (TDEE)',     value: `${result.tdee} kcal`,    color: '#0ea5e9' },
              { label: 'Meta calórica',           value: `${result.calories} kcal`, color: '#f97316' },
            ].map(s => (
              <div key={s.label} className="game-card" style={{ padding: '12px 14px', background: '#0d1526' }}>
                <div style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: s.color, marginTop: 4 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 10 }}>Macros diários</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Proteína', value: `${result.protein}g`, color: '#a855f7' },
                { label: 'Carboidratos', value: `${result.carbs}g`, color: '#0ea5e9' },
                { label: 'Gorduras', value: `${result.fats}g`, color: '#eab308' },
              ].map(m => (
                <div key={m.label} style={{
                  padding: '10px 12px', borderRadius: 8, background: `${m.color}10`,
                  border: `1px solid ${m.color}30`, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: m.color }}>{m.value}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Water goal */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#0ea5e9', marginBottom: 4 }}>
              Meta de água diária (ml)
            </label>
            <input
              className="game-input"
              type="number"
              value={waterGoal}
              onChange={e => setWaterGoal(e.target.value)}
              min={500}
              max={5000}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', background: savedFeedback ? 'linear-gradient(135deg, #059669, #047857)' : undefined }}
          >
            {saving
              ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
              : savedFeedback
              ? <><Check size={14} /> Metas salvas!</>
              : 'Salvar como minhas metas'
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Weight Tab
// ══════════════════════════════════════════════════════════════════════════════

function WeightTab() {
  const { weightLogs, addWeightLog, deleteWeightLog } = useNutritionStore();
  const [weight, setWeight] = useState('');
  const [notes,  setNotes]  = useState('');
  const [date,   setDate]   = useState(today());
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!weight) return;
    setSaving(true);
    await addWeightLog(Number(weight), date, notes.trim());
    setSaving(false);
    setWeight('');
    setNotes('');
    setDate(today());
  }

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* Add weight form */}
      <div className="game-card" style={{ padding: 20 }}>
        <SectionHeader icon={<Scale size={16} />} title="Registrar peso" color="#eab308" />
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Peso (kg) *</label>
              <input
                className="game-input"
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="75,5"
                min={20} max={500}
                step={0.1}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Data</label>
              <input
                className="game-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                max={today()}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Observações (opcional)</label>
            <input
              className="game-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Após jejum"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!weight || saving}
            className="btn-primary"
            style={{ justifyContent: 'center', opacity: !weight ? 0.5 : 1 }}
          >
            {saving
              ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
              : <><Plus size={14} /> Registrar peso</>
            }
          </button>
        </div>
      </div>

      {/* History */}
      <div className="game-card" style={{ padding: 20 }}>
        <SectionHeader icon={<TrendingUp size={16} />} title="Histórico de peso" color="#10b981" />

        {weightLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: 13 }}>
            Nenhum registro ainda. Comece medindo seu peso acima!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {weightLogs.map((log, i) => {
              const prev = weightLogs[i + 1];
              const delta = prev ? log.weightKg - prev.weightKg : null;
              return (
                <div key={log.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  borderRadius: 8, background: '#0d1526',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: '#eab308' }}>
                        {log.weightKg.toFixed(1).replace('.', ',')} kg
                      </span>
                      {delta !== null && (
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: delta < 0 ? '#10b981' : delta > 0 ? '#ef4444' : '#64748b',
                          display: 'flex', alignItems: 'center', gap: 2,
                        }}>
                          {delta < 0 ? <TrendingDown size={11} /> : delta > 0 ? <TrendingUp size={11} /> : <Minus size={11} />}
                          {delta > 0 ? '+' : ''}{delta.toFixed(1).replace('.', ',')} kg
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                      {new Date(log.measuredAt + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {log.notes && <span style={{ marginLeft: 8, color: '#334155' }}>{log.notes}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteWeightLog(log.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 4 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {weightLogs.length >= 2 && (
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 8,
            background: '#10b98110', border: '1px solid #10b98130',
            fontSize: 13, color: '#86efac',
          }}>
            Total: {(weightLogs[0].weightKg - weightLogs[weightLogs.length - 1].weightKg > 0 ? '+' : '')}
            {(weightLogs[0].weightKg - weightLogs[weightLogs.length - 1].weightKg).toFixed(1).replace('.', ',')} kg
            <span style={{ color: '#475569', marginLeft: 6 }}>desde o primeiro registro</span>
          </div>
        )}
      </div>
    </div>
  );
}

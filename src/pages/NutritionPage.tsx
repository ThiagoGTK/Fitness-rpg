import { useState, useEffect } from 'react';
import {
  Apple, Droplets, Scale, Calculator, ChevronDown, ChevronUp,
  Plus, Trash2, X, Check, TrendingDown, TrendingUp, Minus,
  Flame, Loader2, Trophy, Search, Salad, Bookmark, BookmarkCheck,
  PencilLine, UtensilsCrossed,
} from 'lucide-react';
import { searchTaco, scaleTaco, type TacoFood } from '../data/taco';
import { useNutritionStore } from '../store/nutritionStore';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { supabase } from '../lib/supabase';
import type { TrainerDietPlan, CustomFood, MealTemplate, MealTemplateItem } from '../types/nutrition';
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
  const [openMeal,    setOpenMeal]    = useState<MealType | null>(null);
  const [addTarget,   setAddTarget]   = useState<MealType | null>(null);
  const [showPicker,  setShowPicker]  = useState(false);
  const entries = getMealEntries(selectedDate);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {/* Apply template shortcut */}
      <button
        onClick={() => setShowPicker(true)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', borderRadius: 10, border: '1px dashed #a855f740', background: '#a855f708', color: '#a855f7', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
      >
        <Bookmark size={14} /> Aplicar modelo de refeição
      </button>

      {MEAL_ORDER.map(mealType => {
        const mealEntries = entries.filter(e => e.mealType === mealType);
        const totalCal    = mealEntries.reduce((a, e) => a + e.calories, 0);
        const isOpen      = openMeal === mealType;

        return (
          <div key={mealType} className="game-card" style={{ padding: 0, overflow: 'hidden' }}>
            <button
              onClick={() => setOpenMeal(isOpen ? null : mealType)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
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
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #1e2d4a', background: 'transparent', color: '#a855f7', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <Plus size={12} /> Add
              </button>
              {isOpen ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
            </button>

            {isOpen && (
              <div style={{ borderTop: '1px solid #1e2d4a', padding: '10px 16px 14px' }}>
                {mealEntries.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: '#475569', fontSize: 13 }}>
                    Nenhum alimento registrado. Clique em <strong>Add</strong> para incluir.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {mealEntries.map(entry => <FoodEntryRow key={entry.id} entry={entry} />)}
                    <div style={{ borderTop: '1px solid #1e2d4a', paddingTop: 8, marginTop: 4, display: 'flex', gap: 16, fontSize: 11, color: '#64748b', flexWrap: 'wrap' }}>
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

      {/* Templates manager */}
      <TemplatesSection />

      {/* My custom foods list */}
      <CustomFoodsSection />

      {addTarget && <AddFoodModal mealType={addTarget} date={selectedDate} onClose={() => setAddTarget(null)} />}
      {showPicker && <TemplatePickerModal date={selectedDate} onClose={() => setShowPicker(false)} />}
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

// ── Shared food search hook (TACO + custom foods) ────────────────────────────

type FoodSuggestion =
  | { kind: 'taco'; food: TacoFood }
  | { kind: 'custom'; food: CustomFood };

function useFoodSearch(query: string, customFoods: CustomFood[]): FoodSuggestion[] {
  if (!query.trim()) return [];
  const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const q = norm(query);
  const taco = searchTaco(query, 6).map(f => ({ kind: 'taco' as const, food: f }));
  const custom = customFoods
    .filter(f => norm(f.name).includes(q))
    .slice(0, 4)
    .map(f => ({ kind: 'custom' as const, food: f }));
  return [...custom, ...taco].slice(0, 8);
}

// ── FoodSearchInput (reused in AddFoodModal, TemplateFormModal) ───────────────

interface FoodSearchInputProps {
  query: string;
  setQuery: (q: string) => void;
  tacoFood: TacoFood | null;
  customFood: CustomFood | null;
  suggestions: FoodSuggestion[];
  onSelectTaco: (f: TacoFood) => void;
  onSelectCustom: (f: CustomFood) => void;
  onClear: () => void;
  onCreateCustom: () => void;
  quantityG: string;
}

function FoodSearchInput({
  query, setQuery, tacoFood, customFood, suggestions,
  onSelectTaco, onSelectCustom, onClear, onCreateCustom, quantityG,
}: FoodSearchInputProps) {
  const selected = tacoFood || customFood;
  return (
    <div style={{ position: 'relative' }}>
      <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
        Buscar alimento
        <span style={{ marginLeft: 6, fontSize: 10, color: '#334155', fontWeight: 400 }}>
          TACO + seus alimentos
        </span>
      </label>
      <div style={{ position: 'relative' }}>
        <Search size={14} color="#475569" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input
          className="game-input"
          value={query}
          onChange={e => { setQuery(e.target.value); if (selected) onClear(); }}
          placeholder="Frango, arroz, tortilha…"
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 34 }}
        />
        {query && (
          <button onClick={onClear} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
            <X size={13} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {!selected && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
          background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 10,
          marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px #00000060',
        }}>
          {suggestions.map(s => s.kind === 'taco' ? (
            <button key={s.food.id} onClick={() => onSelectTaco(s.food)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #1e2d4a20', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e2d4a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{s.food.name}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{s.food.category}</div>
              </div>
              <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                {s.food.kcal} kcal<span style={{ color: '#334155', fontWeight: 400 }}>/100g</span>
              </div>
            </button>
          ) : (
            <button key={s.food.id} onClick={() => onSelectCustom(s.food)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #1e2d4a20', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1e2d4a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Bookmark size={11} color="#a855f7" /> {s.food.name}
                </div>
                <div style={{ fontSize: 11, color: '#475569' }}>Meu alimento</div>
              </div>
              <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                {s.food.kcalPer100g} kcal<span style={{ color: '#334155', fontWeight: 400 }}>/100g</span>
              </div>
            </button>
          ))}
          {/* Always offer to create */}
          <button onClick={onCreateCustom}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#a855f7', fontSize: 12, fontWeight: 700 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e2d4a')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Plus size={13} /> Criar alimento "{query}"
          </button>
        </div>
      )}

      {/* Selected badge */}
      {tacoFood && (
        <div style={{ marginTop: 8, padding: '7px 12px', borderRadius: 8, background: '#10b98115', border: '1px solid #10b98130', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={13} color="#10b981" />
          <span style={{ fontSize: 12, color: '#86efac', flex: 1 }}>TACO · macros calculados para {quantityG || 100}g</span>
          <span style={{ fontSize: 11, color: '#475569' }}>{tacoFood.kcal} kcal/100g</span>
        </div>
      )}
      {customFood && (
        <div style={{ marginTop: 8, padding: '7px 12px', borderRadius: 8, background: '#a855f715', border: '1px solid #a855f730', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bookmark size={13} color="#a855f7" />
          <span style={{ fontSize: 12, color: '#c084fc', flex: 1 }}>Meu alimento · macros calculados para {quantityG || 100}g</span>
          <span style={{ fontSize: 11, color: '#475569' }}>{customFood.kcalPer100g} kcal/100g</span>
        </div>
      )}
    </div>
  );
}

// ── CreateCustomFoodForm (inline, shown inside AddFoodModal) ──────────────────

function CreateCustomFoodForm({
  initialName,
  onCreated,
  onCancel,
}: { initialName: string; onCreated: (food: CustomFood) => void; onCancel: () => void }) {
  const { createCustomFood } = useNutritionStore();
  const [name,    setName]    = useState(initialName);
  const [kcal,    setKcal]    = useState('');
  const [protein, setProtein] = useState('');
  const [carbs,   setCarbs]   = useState('');
  const [fats,    setFats]    = useState('');
  const [saving,  setSaving]  = useState(false);

  async function handleSave() {
    if (!name.trim() || !kcal) return;
    setSaving(true);
    const food = await createCustomFood({
      name: name.trim(),
      kcalPer100g:    Number(kcal)    || 0,
      proteinPer100g: Number(protein) || 0,
      carbsPer100g:   Number(carbs)   || 0,
      fatsPer100g:    Number(fats)    || 0,
    });
    setSaving(false);
    if (food) onCreated(food);
  }

  return (
    <div style={{ padding: '14px', borderRadius: 10, background: '#0d1526', border: '1px solid #a855f730', display: 'grid', gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Bookmark size={13} /> Novo alimento personalizado
        <span style={{ fontSize: 10, color: '#475569', fontWeight: 400, marginLeft: 4 }}>valores por 100g</span>
      </div>
      <input className="game-input" value={name} onChange={e => setName(e.target.value)} placeholder="Nome do alimento" style={{ width: '100%', boxSizing: 'border-box' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[
          { label: 'Kcal / 100g', color: '#f97316', value: kcal,    set: setKcal    },
          { label: 'Prot. (g)',   color: '#a855f7', value: protein, set: setProtein },
          { label: 'Carbs (g)',   color: '#0ea5e9', value: carbs,   set: setCarbs   },
          { label: 'Gord. (g)',   color: '#eab308', value: fats,    set: setFats    },
        ].map(f => (
          <div key={f.label}>
            <label style={{ display: 'block', fontSize: 11, color: f.color, marginBottom: 3 }}>{f.label}</label>
            <input className="game-input" type="number" value={f.value} onChange={e => f.set(e.target.value)} placeholder="0" min={0} step={0.1} style={{ width: '100%', boxSizing: 'border-box', padding: '7px 10px', fontSize: 13 }} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #1e2d4a', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
        <button onClick={handleSave} disabled={!name.trim() || !kcal || saving} className="btn-primary" style={{ flex: 2, justifyContent: 'center', fontSize: 13 }}>
          {saving ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <><Check size={13} /> Salvar alimento</>}
        </button>
      </div>
    </div>
  );
}

// ── Add food modal ────────────────────────────────────────────────────────────

function AddFoodModal({
  mealType, date, onClose,
}: { mealType: MealType; date: string; onClose: () => void }) {
  const { addMealEntry, customFoods } = useNutritionStore();
  const [saving, setSaving] = useState(false);

  const [query,      setQuery]      = useState('');
  const [tacoFood,   setTacoFood]   = useState<TacoFood | null>(null);
  const [customFood, setCustomFood] = useState<CustomFood | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [foodName,  setFoodName]  = useState('');
  const [quantityG, setQuantityG] = useState('100');
  const [calories,  setCalories]  = useState('');
  const [protein,   setProtein]   = useState('');
  const [carbs,     setCarbs]     = useState('');
  const [fats,      setFats]      = useState('');

  const suggestions = useFoodSearch(query, customFoods);

  // Recalculate macros when TACO food selected and quantity changes
  useEffect(() => {
    if (!tacoFood) return;
    const g = Number(quantityG) || 100;
    const s = scaleTaco(tacoFood, g);
    setCalories(String(s.calories)); setProtein(String(s.protein));
    setCarbs(String(s.carbs)); setFats(String(s.fats));
  }, [tacoFood, quantityG]);

  // Recalculate macros when custom food selected and quantity changes
  useEffect(() => {
    if (!customFood) return;
    const g = Number(quantityG) || 100;
    const ratio = g / 100;
    setCalories(String(Math.round(customFood.kcalPer100g * ratio * 10) / 10));
    setProtein(String(Math.round(customFood.proteinPer100g * ratio * 10) / 10));
    setCarbs(String(Math.round(customFood.carbsPer100g * ratio * 10) / 10));
    setFats(String(Math.round(customFood.fatsPer100g * ratio * 10) / 10));
  }, [customFood, quantityG]);

  function selectTacoFood(food: TacoFood) {
    setTacoFood(food); setCustomFood(null);
    setQuery(food.name); setFoodName(food.name); setShowCreate(false);
  }
  function selectCustomFood(food: CustomFood) {
    setCustomFood(food); setTacoFood(null);
    setQuery(food.name); setFoodName(food.name); setShowCreate(false);
  }
  function clearSelection() {
    setTacoFood(null); setCustomFood(null);
    setQuery(''); setFoodName('');
    setCalories(''); setProtein(''); setCarbs(''); setFats(''); setQuantityG('100');
  }

  async function handleSave() {
    const name = foodName.trim() || query.trim();
    if (!name) return;
    setSaving(true);
    await addMealEntry({ date, mealType, foodName: name, quantityG: quantityG ? Number(quantityG) : undefined, calories: Number(calories) || 0, protein: Number(protein) || 0, carbs: Number(carbs) || 0, fats: Number(fats) || 0 });
    setSaving(false);
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0' }}>{MEAL_EMOJIS[mealType]} Adicionar alimento</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{MEAL_LABELS[mealType]}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          {showCreate ? (
            <CreateCustomFoodForm
              initialName={query}
              onCreated={food => { selectCustomFood(food); setShowCreate(false); }}
              onCancel={() => setShowCreate(false)}
            />
          ) : (
            <FoodSearchInput
              query={query} setQuery={setQuery}
              tacoFood={tacoFood} customFood={customFood}
              suggestions={suggestions}
              onSelectTaco={selectTacoFood} onSelectCustom={selectCustomFood}
              onClear={clearSelection}
              onCreateCustom={() => setShowCreate(true)}
              quantityG={quantityG}
            />
          )}

          {/* Quantity */}
          {!showCreate && (
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>
                Quantidade (g)
                {(tacoFood || customFood) && <span style={{ marginLeft: 6, fontSize: 10, color: '#10b981' }}>↳ recalcula macros</span>}
              </label>
              <input className="game-input" type="number" value={quantityG} onChange={e => setQuantityG(e.target.value)} placeholder="100" min={1} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
          )}

          {/* Macro fields */}
          {!showCreate && (
            <div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
                Macros {!tacoFood && !customFood && <span style={{ fontSize: 10 }}>— preencha manualmente ou selecione acima</span>}
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
                    <input className="game-input" type="number" value={f.value} onChange={e => f.set(e.target.value)} placeholder="0" min={0} step={0.1} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!showCreate && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #1e2d4a', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleSave} disabled={!(foodName.trim() || query.trim()) || saving} className="btn-primary" style={{ flex: 2, justifyContent: 'center', opacity: !(foodName.trim() || query.trim()) ? 0.5 : 1 }}>
              {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Salvando...</> : <><Plus size={14} /> Adicionar</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Meal Templates
// ══════════════════════════════════════════════════════════════════════════════

type TemplateItem = {
  localId: string;
  mealType: MealType;
  foodName: string;
  quantityG: string;
  calories: string;
  protein: string;
  carbs: string;
  fats: string;
  tacoFood: TacoFood | null;
  customFood: CustomFood | null;
};

function emptyTemplateItem(mealType: MealType): TemplateItem {
  return { localId: Math.random().toString(36).slice(2), mealType, foodName: '', quantityG: '100', calories: '', protein: '', carbs: '', fats: '', tacoFood: null, customFood: null };
}

// ── Template Form Modal ───────────────────────────────────────────────────────

function TemplateFormModal({
  template,
  onClose,
}: { template?: MealTemplate; onClose: () => void }) {
  const { createTemplate, updateTemplate, customFoods } = useNutritionStore();
  const [name, setName] = useState(template?.name ?? '');
  const [notes, setNotes] = useState(template?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const [items, setItems] = useState<TemplateItem[]>(() => {
    if (template?.items.length) {
      return template.items.map(i => ({
        localId:    i.id || Math.random().toString(36).slice(2),
        mealType:   i.mealType,
        foodName:   i.foodName,
        quantityG:  i.quantityG?.toString() ?? '100',
        calories:   i.calories.toString(),
        protein:    i.protein.toString(),
        carbs:      i.carbs.toString(),
        fats:       i.fats.toString(),
        tacoFood:   null,
        customFood: null,
      }));
    }
    return [emptyTemplateItem('breakfast')];
  });

  const [openSearch, setOpenSearch]   = useState<string | null>(null); // localId with open search
  const [showCreate, setShowCreate]   = useState<string | null>(null); // localId creating food

  function updateItem(localId: string, patch: Partial<TemplateItem>) {
    setItems(prev => prev.map(it => it.localId === localId ? { ...it, ...patch } : it));
  }

  function recalcItem(localId: string, tacoFood: TacoFood | null, customFood: CustomFood | null, quantityStr: string) {
    const g = Number(quantityStr) || 100;
    if (tacoFood) {
      const s = scaleTaco(tacoFood, g);
      updateItem(localId, { calories: String(s.calories), protein: String(s.protein), carbs: String(s.carbs), fats: String(s.fats) });
    } else if (customFood) {
      const ratio = g / 100;
      updateItem(localId, {
        calories: String(Math.round(customFood.kcalPer100g * ratio * 10) / 10),
        protein:  String(Math.round(customFood.proteinPer100g * ratio * 10) / 10),
        carbs:    String(Math.round(customFood.carbsPer100g * ratio * 10) / 10),
        fats:     String(Math.round(customFood.fatsPer100g * ratio * 10) / 10),
      });
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    const mapped: Omit<MealTemplateItem, 'id' | 'templateId'>[] = items
      .filter(it => it.foodName.trim())
      .map((it, i) => ({
        mealType:   it.mealType,
        foodName:   it.foodName,
        quantityG:  it.quantityG ? Number(it.quantityG) : undefined,
        calories:   Number(it.calories) || 0,
        protein:    Number(it.protein)  || 0,
        carbs:      Number(it.carbs)    || 0,
        fats:       Number(it.fats)     || 0,
        orderIndex: i,
      }));
    if (template) await updateTemplate(template.id, name.trim(), notes.trim(), mapped);
    else           await createTemplate(name.trim(), notes.trim(), mapped);
    setSaving(false);
    onClose();
  }

  const totalCal = items.reduce((a, it) => a + (Number(it.calories) || 0), 0);
  const totalProt = items.reduce((a, it) => a + (Number(it.protein) || 0), 0);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 16, padding: 24, maxWidth: 520, width: '100%', marginTop: 16, marginBottom: 32 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#a855f720', display: 'grid', placeItems: 'center', color: '#a855f7' }}>
              <BookmarkCheck size={16} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0' }}>{template ? 'Editar modelo' : 'Novo modelo de refeição'}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Monte a refeição e salve para reusar depois</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        {/* Name + notes */}
        <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Nome do modelo *</label>
            <input className="game-input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Café da manhã habitual" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Observações (opcional)</label>
            <input className="game-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Pré-treino" style={{ width: '100%', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Items by meal */}
        {(Object.keys(MEAL_LABELS) as MealType[]).map(mealType => {
          const mealItems = items.filter(it => it.mealType === mealType);
          if (mealItems.length === 0) return null;
          return (
            <div key={mealType} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>{MEAL_EMOJIS[mealType]}</span> {MEAL_LABELS[mealType]}
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {mealItems.map(it => (
                  <div key={it.localId} style={{ background: '#0d1526', borderRadius: 10, padding: 12, border: '1px solid #1e2d4a', display: 'grid', gap: 10 }}>
                    {showCreate === it.localId ? (
                      <CreateCustomFoodForm
                        initialName={it.foodName}
                        onCreated={food => {
                          updateItem(it.localId, { customFood: food, tacoFood: null, foodName: food.name });
                          recalcItem(it.localId, null, food, it.quantityG);
                          setShowCreate(null);
                        }}
                        onCancel={() => setShowCreate(null)}
                      />
                    ) : (
                      <FoodSearchInput
                        query={it.foodName}
                        setQuery={q => { updateItem(it.localId, { foodName: q, tacoFood: null, customFood: null }); setOpenSearch(it.localId); }}
                        tacoFood={it.tacoFood}
                        customFood={it.customFood}
                        suggestions={openSearch === it.localId ? useFoodSearch(it.foodName, customFoods) : []}
                        onSelectTaco={food => { updateItem(it.localId, { tacoFood: food, customFood: null, foodName: food.name }); recalcItem(it.localId, food, null, it.quantityG); setOpenSearch(null); }}
                        onSelectCustom={food => { updateItem(it.localId, { customFood: food, tacoFood: null, foodName: food.name }); recalcItem(it.localId, null, food, it.quantityG); setOpenSearch(null); }}
                        onClear={() => updateItem(it.localId, { tacoFood: null, customFood: null, foodName: '', calories: '', protein: '', carbs: '', fats: '' })}
                        onCreateCustom={() => setShowCreate(it.localId)}
                        quantityG={it.quantityG}
                      />
                    )}
                    {showCreate !== it.localId && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 6, alignItems: 'end' }}>
                        {[
                          { label: 'Qtd (g)',      value: it.quantityG, key: 'quantityG', color: '#94a3b8' },
                          { label: 'Kcal',         value: it.calories,  key: 'calories',  color: '#f97316' },
                          { label: 'Prot.',        value: it.protein,   key: 'protein',   color: '#a855f7' },
                          { label: 'Carbs',        value: it.carbs,     key: 'carbs',     color: '#0ea5e9' },
                          { label: 'Gord.',        value: it.fats,      key: 'fats',      color: '#eab308' },
                        ].map(f => (
                          <div key={f.key}>
                            <label style={{ display: 'block', fontSize: 10, color: f.color, marginBottom: 2 }}>{f.label}</label>
                            <input
                              className="game-input"
                              type="number" min={0} step={0.1}
                              value={f.value}
                              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', fontSize: 12 }}
                              onChange={e => {
                                const patch: Partial<TemplateItem> = { [f.key]: e.target.value };
                                if (f.key === 'quantityG') recalcItem(it.localId, it.tacoFood, it.customFood, e.target.value);
                                else updateItem(it.localId, patch);
                              }}
                              placeholder="0"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={() => setItems(prev => prev.filter(x => x.localId !== it.localId))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', fontSize: 11, textAlign: 'right', padding: 0 }}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Add item row */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {(Object.keys(MEAL_LABELS) as MealType[]).map(mt => (
            <button key={mt} onClick={() => setItems(prev => [...prev, emptyTemplateItem(mt)])}
              style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #1e2d4a', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={11} /> {MEAL_EMOJIS[mt]} {MEAL_LABELS[mt]}
            </button>
          ))}
        </div>

        {/* Totals */}
        {items.some(it => it.foodName.trim()) && (
          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#0d1526', border: '1px solid #1e2d4a', marginBottom: 16, display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12 }}>
            <span style={{ color: '#f97316', fontWeight: 700 }}>{Math.round(totalCal)} kcal</span>
            <span style={{ color: '#a855f7' }}>{totalProt.toFixed(0)}g prot.</span>
            <span style={{ color: '#64748b' }}>{items.filter(it => it.foodName.trim()).length} itens</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 8, border: '1px solid #1e2d4a', background: 'transparent', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={!name.trim() || saving} className="btn-primary" style={{ flex: 2, justifyContent: 'center', opacity: !name.trim() ? 0.5 : 1 }}>
            {saving ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Salvando...</> : <><BookmarkCheck size={14} /> {template ? 'Salvar alterações' : 'Salvar modelo'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template Picker Modal (apply a template to a day) ────────────────────────

function TemplatePickerModal({
  date,
  onClose,
}: { date: string; onClose: () => void }) {
  const { templates, addMealEntry } = useNutritionStore();
  const [applying, setApplying] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function applyTemplate(t: MealTemplate) {
    setApplying(t.id);
    for (const item of t.items) {
      await addMealEntry({
        date, mealType: item.mealType, foodName: item.foodName,
        quantityG: item.quantityG, calories: item.calories,
        protein: item.protein, carbs: item.carbs, fats: item.fats,
      });
    }
    setApplying(null);
    setDone(t.id);
    setTimeout(() => { setDone(null); onClose(); }, 800);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 350, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 16, padding: 24, maxWidth: 420, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bookmark size={16} color="#a855f7" /> Aplicar modelo
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={18} /></button>
        </div>

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#475569', fontSize: 13 }}>
            Nenhum modelo salvo ainda. Crie um na aba Refeições.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {templates.map(t => {
              const totalCal = t.items.reduce((a, i) => a + i.calories, 0);
              const totalProt = t.items.reduce((a, i) => a + i.protein, 0);
              const meals = [...new Set(t.items.map(i => i.mealType))];
              return (
                <div key={t.id} style={{ background: '#0d1526', borderRadius: 12, padding: '14px 16px', border: '1px solid #1e2d4a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 3 }}>{t.name}</div>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11 }}>
                        <span style={{ color: '#f97316', fontWeight: 700 }}>{Math.round(totalCal)} kcal</span>
                        <span style={{ color: '#a855f7' }}>{totalProt.toFixed(0)}g prot.</span>
                        <span style={{ color: '#475569' }}>{t.items.length} itens</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                        {meals.map(m => <span key={m} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, background: '#1e2d4a', color: '#64748b' }}>{MEAL_EMOJIS[m]} {MEAL_LABELS[m]}</span>)}
                      </div>
                    </div>
                    <button
                      onClick={() => applyTemplate(t)}
                      disabled={!!applying || done === t.id}
                      className="btn-primary"
                      style={{ flexShrink: 0, padding: '8px 14px', fontSize: 13 }}
                    >
                      {applying === t.id ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                        : done === t.id ? <><Check size={13} /> Aplicado!</>
                        : 'Aplicar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Templates manager section (inside MealsTab) ───────────────────────────────

function TemplatesSection() {
  const { templates, deleteTemplate } = useNutritionStore();
  const [showForm, setShowForm]           = useState(false);
  const [editTemplate, setEditTemplate]   = useState<MealTemplate | undefined>();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <>
      <div className="game-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookmarkCheck size={16} color="#a855f7" />
            <span style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>Modelos de refeição</span>
            <span style={{ fontSize: 11, color: '#475569' }}>{templates.length}</span>
          </div>
          <button
            onClick={() => { setEditTemplate(undefined); setShowForm(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
          >
            <Plus size={12} /> Novo modelo
          </button>
        </div>

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#475569', fontSize: 13 }}>
            Salve suas refeições habituais para aplicar com um clique.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 8 }}>
            {templates.map(t => {
              const totalCal  = t.items.reduce((a, i) => a + i.calories, 0);
              const totalProt = t.items.reduce((a, i) => a + i.protein, 0);
              const meals = [...new Set(t.items.map(i => i.mealType))];
              return (
                <div key={t.id} style={{ background: '#0d1526', borderRadius: 10, padding: '12px 14px', border: '1px solid #1e2d4a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{t.name}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, marginTop: 3 }}>
                        <span style={{ color: '#f97316', fontWeight: 700 }}>{Math.round(totalCal)} kcal</span>
                        <span style={{ color: '#a855f7' }}>{totalProt.toFixed(0)}g prot.</span>
                        {meals.map(m => <span key={m} style={{ color: '#475569' }}>{MEAL_EMOJIS[m]}</span>)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setEditTemplate(t); setShowForm(true); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
                        <PencilLine size={14} />
                      </button>
                      {confirmDelete === t.id ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <button onClick={() => deleteTemplate(t.id)} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>Excluir</button>
                          <button onClick={() => setConfirmDelete(null)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #1e2d4a', background: 'transparent', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Não</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <TemplateFormModal
          template={editTemplate}
          onClose={() => { setShowForm(false); setEditTemplate(undefined); }}
        />
      )}
    </>
  );
}

// ── My Custom Foods section ───────────────────────────────────────────────────

function CustomFoodsSection() {
  const { customFoods, deleteCustomFood } = useNutritionStore();
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (customFoods.length === 0) return null;

  return (
    <div className="game-card" style={{ padding: '14px 16px' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UtensilsCrossed size={16} color="#a855f7" />
          <span style={{ fontSize: 14, fontWeight: 800, color: '#e2e8f0' }}>Meus alimentos</span>
          <span style={{ fontSize: 11, color: '#475569' }}>{customFoods.length} cadastrados</span>
        </div>
        {expanded ? <ChevronUp size={15} color="#475569" /> : <ChevronDown size={15} color="#475569" />}
      </button>

      {expanded && (
        <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
          {customFoods.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 8, background: '#0d1526', border: '1px solid #1e2d4a', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{f.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ color: '#f97316' }}>{f.kcalPer100g} kcal</span>
                  <span style={{ color: '#a855f7' }}>P {f.proteinPer100g}g</span>
                  <span style={{ color: '#0ea5e9' }}>C {f.carbsPer100g}g</span>
                  <span style={{ color: '#eab308' }}>G {f.fatsPer100g}g</span>
                  <span style={{ color: '#334155' }}>por 100g</span>
                </div>
              </div>
              {confirmDelete === f.id ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => deleteCustomFood(f.id)} style={{ padding: '3px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>Excluir</button>
                  <button onClick={() => setConfirmDelete(null)} style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid #1e2d4a', background: 'transparent', color: '#64748b', fontSize: 11, cursor: 'pointer' }}>Não</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#334155', padding: 4 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
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

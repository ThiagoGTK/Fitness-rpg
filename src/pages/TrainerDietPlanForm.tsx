import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, Loader2, Plus, Search, Trash2, X,
} from 'lucide-react';
import { useTrainerStore } from '../store/trainerStore';
import { searchTaco, scaleTaco, type TacoFood } from '../data/taco';
import {
  MEAL_LABELS, MEAL_EMOJIS, OBJECTIVE_LABELS,
  type MealType, type NutritionObjective, type TrainerDietPlanItem,
} from '../types/nutrition';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner', 'supper'];

const OBJECTIVES: NutritionObjective[] = [
  'maintenance', 'muscle_gain', 'weight_loss', 'definition',
];

type DietItem = {
  localId:   string;
  mealType:  MealType;
  foodName:  string;
  quantityG: string;
  calories:  string;
  protein:   string;
  carbs:     string;
  fats:      string;
  notes:     string;
};

const emptyInline = () => ({
  query:       '',
  suggestions: [] as TacoFood[],
  tacoFood:    null as TacoFood | null,
  foodName:    '',
  quantityG:   '100',
  calories:    '',
  protein:     '',
  carbs:       '',
  fats:        '',
  notes:       '',
});
type InlineForm = ReturnType<typeof emptyInline>;

export function TrainerDietPlanForm() {
  const { studentId, dietPlanId } = useParams();
  const navigate = useNavigate();
  const { studentDetails, loadStudentDetail, createDietPlan, updateDietPlan } = useTrainerStore();

  const [planName,  setPlanName]  = useState('');
  const [objective, setObjective] = useState<NutritionObjective>('maintenance');
  const [notes,     setNotes]     = useState('');
  const [items,     setItems]     = useState<DietItem[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const [activeAddMeal, setActiveAddMeal] = useState<MealType | null>(null);
  const [inline,        setInline]        = useState<InlineForm>(emptyInline());
  const searchRef = useRef<HTMLDivElement>(null);

  const isEdit      = !!dietPlanId;
  const existingPlan = isEdit ? studentDetails?.dietPlans?.find(p => p.id === dietPlanId) : undefined;

  useEffect(() => {
    if (studentId) loadStudentDetail(studentId);
  }, [studentId]);

  useEffect(() => {
    if (!existingPlan) return;
    setPlanName(existingPlan.planName);
    setObjective(existingPlan.objective);
    setNotes(existingPlan.notes);
    setItems(existingPlan.items.map(item => ({
      localId:   item.id,
      mealType:  item.mealType,
      foodName:  item.foodName,
      quantityG: item.quantityG != null ? String(item.quantityG) : '',
      calories:  String(item.calories),
      protein:   String(item.protein),
      carbs:     String(item.carbs),
      fats:      String(item.fats),
      notes:     item.notes,
    })));
  }, [existingPlan?.id]);

  // Live TACO search
  useEffect(() => {
    if (inline.tacoFood) { setInline(s => ({ ...s, suggestions: [] })); return; }
    setInline(s => ({ ...s, suggestions: searchTaco(s.query) }));
  }, [inline.query, inline.tacoFood]);

  // Recalculate macros when quantity changes (TACO selection active)
  useEffect(() => {
    if (!inline.tacoFood) return;
    const g = Number(inline.quantityG) || 100;
    const scaled = scaleTaco(inline.tacoFood, g);
    setInline(s => ({
      ...s,
      calories: String(scaled.calories),
      protein:  String(scaled.protein),
      carbs:    String(scaled.carbs),
      fats:     String(scaled.fats),
    }));
  }, [inline.tacoFood, inline.quantityG]);

  function openAdd(mealType: MealType) {
    setActiveAddMeal(mealType);
    setInline(emptyInline());
  }

  function closeAdd() {
    setActiveAddMeal(null);
    setInline(emptyInline());
  }

  function selectTacoFood(food: TacoFood) {
    setInline(s => ({ ...s, tacoFood: food, query: food.name, foodName: food.name, suggestions: [] }));
  }

  function confirmAdd() {
    if (!activeAddMeal || !inline.foodName.trim()) return;
    setItems(prev => [...prev, {
      localId:   crypto.randomUUID(),
      mealType:  activeAddMeal,
      foodName:  inline.foodName.trim(),
      quantityG: inline.quantityG,
      calories:  inline.calories,
      protein:   inline.protein,
      carbs:     inline.carbs,
      fats:      inline.fats,
      notes:     inline.notes,
    }]);
    closeAdd();
  }

  function removeItem(localId: string) {
    setItems(prev => prev.filter(i => i.localId !== localId));
  }

  async function handleSubmit() {
    if (!studentId) return;
    if (!planName.trim()) { setError('Informe o nome do plano.'); return; }
    setSaving(true);
    setError('');

    const mapped: Omit<TrainerDietPlanItem, 'id' | 'planId'>[] = items.map((item, idx) => ({
      mealType:   item.mealType,
      foodName:   item.foodName,
      quantityG:  item.quantityG ? Number(item.quantityG) : undefined,
      calories:   Number(item.calories) || 0,
      protein:    Number(item.protein)  || 0,
      carbs:      Number(item.carbs)    || 0,
      fats:       Number(item.fats)     || 0,
      notes:      item.notes,
      orderIndex: idx,
    }));

    if (isEdit && dietPlanId) {
      await updateDietPlan(dietPlanId, planName.trim(), objective, notes, mapped);
    } else {
      await createDietPlan(studentId, planName.trim(), objective, notes, mapped);
    }

    setSaving(false);
    navigate(`/trainer/students/${studentId}`);
  }

  const itemsByMeal = MEAL_ORDER.reduce<Record<MealType, DietItem[]>>((acc, mt) => {
    acc[mt] = items.filter(i => i.mealType === mt);
    return acc;
  }, {} as Record<MealType, DietItem[]>);

  const totalCalories = items.reduce((a, i) => a + (Number(i.calories) || 0), 0);
  const totalProtein  = items.reduce((a, i) => a + (Number(i.protein)  || 0), 0);

  return (
    <div className="page-wrap fade-in-up">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button className="btn-ghost" onClick={() => navigate(`/trainer/students/${studentId}`)} style={{ marginBottom: 12 }}>
          <ArrowLeft size={14} /> Voltar
        </button>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>
          {isEdit ? 'Editar plano alimentar' : 'Novo plano alimentar'}
        </h1>
        {studentDetails?.profile && (
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            Aluno: {studentDetails.profile.name}
          </p>
        )}
      </div>

      {/* Plan info card */}
      <div className="game-card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
              Nome do plano <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="game-input"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              placeholder="Ex: Dieta de ganho de massa"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Objetivo</label>
            <select
              className="game-input"
              value={objective}
              onChange={e => setObjective(e.target.value as NutritionObjective)}
              style={{ width: '100%', boxSizing: 'border-box' }}
            >
              {OBJECTIVES.map(o => (
                <option key={o} value={o}>{OBJECTIVE_LABELS[o]}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>Observações</label>
            <textarea
              className="game-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Orientações gerais, restrições alimentares, etc."
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
        </div>
      </div>

      {/* Totals summary */}
      {items.length > 0 && (
        <div style={{
          display: 'flex', gap: 14, marginBottom: 14, padding: '10px 16px',
          borderRadius: 10, background: '#111827', border: '1px solid #1e2d4a',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Total do plano:</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>{Math.round(totalCalories)} kcal</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#a855f7' }}>{totalProtein.toFixed(1)}g prot</span>
          <span style={{ fontSize: 12, color: '#475569' }}>{items.length} alimento{items.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Meal sections */}
      {MEAL_ORDER.map(mealType => {
        const mealItems = itemsByMeal[mealType];
        const isAddingHere = activeAddMeal === mealType;
        const mealCalories = mealItems.reduce((a, i) => a + (Number(i.calories) || 0), 0);

        return (
          <div key={mealType} className="game-card" style={{ padding: 18, marginBottom: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: (mealItems.length > 0 || isAddingHere) ? 12 : 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{MEAL_EMOJIS[mealType]}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{MEAL_LABELS[mealType]}</div>
                  {mealItems.length > 0 && (
                    <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                      {mealItems.length} alimento{mealItems.length > 1 ? 's' : ''} · {Math.round(mealCalories)} kcal
                    </div>
                  )}
                </div>
              </div>
              {!isAddingHere && (
                <button
                  onClick={() => openAdd(mealType)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8,
                    border: '1px solid #1e2d4a', background: '#111827',
                    color: '#94a3b8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Plus size={12} /> Adicionar
                </button>
              )}
            </div>

            {/* Food items */}
            {mealItems.length > 0 && (
              <div style={{ display: 'grid', gap: 8, marginBottom: isAddingHere ? 12 : 0 }}>
                {mealItems.map(item => (
                  <div key={item.localId} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 8,
                    background: '#0d1526', border: '1px solid #1e2d4a',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: '#e2e8f0',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {item.foodName}
                        {item.quantityG && (
                          <span style={{ color: '#475569', fontWeight: 400 }}> · {item.quantityG}g</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: '#f97316' }}>{item.calories || '0'} kcal</span>
                        <span style={{ fontSize: 11, color: '#a855f7' }}>{item.protein || '0'}g prot</span>
                        <span style={{ fontSize: 11, color: '#0ea5e9' }}>{item.carbs || '0'}g carbs</span>
                        <span style={{ fontSize: 11, color: '#eab308' }}>{item.fats || '0'}g gord</span>
                        {item.notes && <span style={{ fontSize: 11, color: '#334155' }}>· {item.notes}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.localId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569', padding: 4, flexShrink: 0 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Inline add form */}
            {isAddingHere && (
              <div style={{
                padding: 14, borderRadius: 10,
                background: '#0d1526', border: '1px solid #1e2d4a50',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8' }}>
                    {MEAL_EMOJIS[mealType]} Adicionar em {MEAL_LABELS[mealType]}
                  </span>
                  <button onClick={closeAdd} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}>
                    <X size={14} />
                  </button>
                </div>

                {/* TACO search */}
                <div ref={searchRef} style={{ position: 'relative', marginBottom: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={13} color="#475569" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                      className="game-input"
                      value={inline.query}
                      onChange={e => setInline(s => ({ ...s, query: e.target.value, tacoFood: null, foodName: e.target.value }))}
                      placeholder="Buscar na tabela TACO…"
                      autoFocus
                      style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 30, fontSize: 13 }}
                    />
                    {inline.query && (
                      <button
                        onClick={() => setInline(s => ({ ...s, query: '', tacoFood: null, foodName: '', calories: '', protein: '', carbs: '', fats: '' }))}
                        style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#475569' }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {inline.suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
                      background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8,
                      marginTop: 2, overflow: 'hidden', boxShadow: '0 8px 20px #00000070',
                    }}>
                      {inline.suggestions.map(food => (
                        <button
                          key={food.id}
                          onClick={() => selectTacoFood(food)}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center',
                            justifyContent: 'space-between', padding: '8px 12px',
                            background: 'none', border: 'none', cursor: 'pointer',
                            borderBottom: '1px solid #1e2d4a20', textAlign: 'left',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1e2d4a')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{food.name}</div>
                            <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{food.category}</div>
                          </div>
                          <div style={{ fontSize: 11, color: '#f97316', fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>
                            {food.kcal} <span style={{ color: '#334155', fontWeight: 400 }}>kcal/100g</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {inline.tacoFood && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                    padding: '5px 10px', borderRadius: 6,
                    background: '#10b98112', border: '1px solid #10b98130',
                  }}>
                    <Check size={11} color="#10b981" />
                    <span style={{ fontSize: 11, color: '#86efac' }}>
                      Macros calculados para {inline.quantityG || 100}g
                    </span>
                  </div>
                )}

                {/* Quantity + macro fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 8 }}>
                  {[
                    { label: 'Qtd. (g)',   color: '#94a3b8', field: 'quantityG' as const },
                    { label: 'Kcal',       color: '#f97316', field: 'calories'  as const },
                    { label: 'Prot. (g)',  color: '#a855f7', field: 'protein'   as const },
                    { label: 'Carbs (g)',  color: '#0ea5e9', field: 'carbs'     as const },
                    { label: 'Gord. (g)',  color: '#eab308', field: 'fats'      as const },
                  ].map(f => (
                    <div key={f.field}>
                      <label style={{ display: 'block', fontSize: 10, color: f.color, marginBottom: 3 }}>{f.label}</label>
                      <input
                        className="game-input"
                        type="number"
                        value={inline[f.field]}
                        onChange={e => setInline(s => ({ ...s, [f.field]: e.target.value }))}
                        placeholder="0"
                        min={0}
                        step={0.1}
                        style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, padding: '6px 8px' }}
                      />
                    </div>
                  ))}
                </div>

                <input
                  className="game-input"
                  value={inline.notes}
                  onChange={e => setInline(s => ({ ...s, notes: e.target.value }))}
                  placeholder="Observação (ex: sem sal, cozido no vapor…)"
                  style={{ width: '100%', boxSizing: 'border-box', fontSize: 12, marginBottom: 10 }}
                />

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={closeAdd}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #1e2d4a', background: 'transparent', color: '#64748b', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmAdd}
                    disabled={!inline.foodName.trim()}
                    style={{
                      flex: 2, padding: '8px', borderRadius: 8, border: 'none',
                      background: inline.foodName.trim() ? '#7c3aed' : '#1e2d4a',
                      color: inline.foodName.trim() ? '#fff' : '#475569',
                      fontSize: 12, fontWeight: 700,
                      cursor: inline.foodName.trim() ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    <Check size={13} /> Confirmar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: '#ef444415', border: '1px solid #ef444430',
          color: '#fca5a5', fontSize: 13, marginBottom: 14,
        }}>
          {error}
        </div>
      )}

      {/* Submit row */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <button
          onClick={() => navigate(`/trainer/students/${studentId}`)}
          style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid #1e2d4a', background: 'transparent', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={saving || !planName.trim()}
          className="btn-primary"
          style={{ flex: 2, justifyContent: 'center', opacity: !planName.trim() ? 0.5 : 1 }}
        >
          {saving
            ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
            : <><Check size={15} /> {isEdit ? 'Salvar alterações' : 'Criar plano'}</>
          }
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

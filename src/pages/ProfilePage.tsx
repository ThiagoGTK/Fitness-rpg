import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User, Mail, Lock, Eye, EyeOff, Shield,
  Flame, Trophy, Dumbbell, Calendar, Star, Target,
  CheckCircle, XCircle, Save, ChevronDown, ChevronUp, TrendingUp, Trash2, AlertTriangle, ChevronRight,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';
import { DatePickerInput } from '../components/ui/DatePickerInput';
import type { Sex } from '../types';

// ── Password helpers ────────────────────────────────────────────────────────
function validatePassword(pwd: string): string[] {
  const errors: string[] = [];
  if (pwd.length < 8)                errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(pwd))            errors.push('Uma letra maiúscula');
  if (!/[a-z]/.test(pwd))            errors.push('Uma letra minúscula');
  if (!/\d/.test(pwd))               errors.push('Um número');
  if (!/[^A-Za-z0-9]/.test(pwd))    errors.push('Um caractere especial (!@#$%...)');
  return errors;
}

function pwdStrength(pwd: string): number {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

const STRENGTH_LABELS = ['Muito fraca', 'Fraca', 'Regular', 'Forte', 'Muito forte'];
const STRENGTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#10b981', '#06b6d4'];

const MAX_BIRTHDATE = (() => {
  const d = new Date();
  return new Date(d.getFullYear() - 10, d.getMonth(), d.getDate())
    .toISOString().slice(0, 10);
})();

// ── Small reusable components ───────────────────────────────────────────────
function SectionCard({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="game-card"
      style={{ padding: '24px', marginBottom: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: '#7c3aed20', border: '1px solid #7c3aed40',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7',
        }}>
          {icon}
        </div>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5, fontWeight: 600 }}>
      {children}
    </label>
  );
}

function StatItem({ icon, label, value, color = '#a855f7' }: {
  icon: React.ReactNode; label: string; value: string | number; color?: string;
}) {
  return (
    <div style={{
      background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 10,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: `${color}20`, border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#f1f5f9' }}>{value}</div>
      </div>
    </div>
  );
}

function PwdInput({
  id, label, value, onChange, show, onToggle,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="game-input"
          style={{ width: '100%', paddingRight: 44, boxSizing: 'border-box' }}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={onToggle}
          style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', padding: 2, display: 'flex', alignItems: 'center',
          }}
          tabIndex={-1}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export function ProfilePage() {
  const { user: authUser } = useAuthStore();
  const { user, workouts, achievements, updateProfile, cleanReset } = useGameStore();

  // ── Personal data form ──
  const [name, setName]           = useState(user.name ?? '');
  const [sex, setSex]             = useState<Sex | ''>(user.sex ?? '');
  const [birthDate, setBirthDate] = useState(
    user.birthDate ?? MAX_BIRTHDATE
  );
  const [isTrainer, setIsTrainer] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError]     = useState('');

  // Sync local state when store updates (e.g. initial load)
  useEffect(() => {
    setIsTrainer(user.isTrainer ?? false);
    setName(user.name ?? '');
    setSex(user.sex ?? '');
    if (user.birthDate) setBirthDate(user.birthDate);
  }, [user.name, user.sex, user.birthDate, user.isTrainer]);

  async function handleSaveProfile() {
    if (!name.trim()) { setSaveError('O nome não pode ser vazio.'); return; }
    setSaveLoading(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await updateProfile({
        name: name.trim(),
        sex: sex || undefined,
        birthDate: birthDate || undefined,
        isTrainer,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaveLoading(false);
    }
  }

  // ── Password change ──
  const [showPwdSection, setShowPwdSection] = useState(false);
  const [currentPwd, setCurrentPwd]   = useState('');
  const [newPwd, setNewPwd]           = useState('');
  const [confirmPwd, setConfirmPwd]   = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwdLoading, setPwdLoading]   = useState(false);
  const [pwdError, setPwdError]       = useState('');
  const [pwdSuccess, setPwdSuccess]   = useState(false);

  const pwdErrors    = validatePassword(newPwd);
  const strength     = newPwd ? pwdStrength(newPwd) : 0;
  const strengthFill = newPwd ? ((strength / 4) * 100) : 0;
  const strengthLabel = newPwd ? STRENGTH_LABELS[strength] : '';
  const strengthColor = newPwd ? STRENGTH_COLORS[strength] : '#1e2d4a';

  const allRequirements = [
    { label: 'Mínimo 8 caracteres',               ok: newPwd.length >= 8 },
    { label: 'Uma letra maiúscula',                ok: /[A-Z]/.test(newPwd) },
    { label: 'Uma letra minúscula',                ok: /[a-z]/.test(newPwd) },
    { label: 'Um número',                          ok: /\d/.test(newPwd) },
    { label: 'Um caractere especial (!@#$%...)',   ok: /[^A-Za-z0-9]/.test(newPwd) },
  ];

  // ── Reset data ──
  const [showReset, setShowReset]       = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetting, setResetting]       = useState(false);
  const RESET_PHRASE = 'Excluir Dados';

  async function handleResetData() {
    setResetting(true);
    await cleanReset();
    setResetting(false);
    setShowReset(false);
    setResetConfirmText('');
  }

  function clearPwdFields() {
    setCurrentPwd('');
    setNewPwd('');
    setConfirmPwd('');
    setPwdError('');
    setPwdSuccess(false);
  }

  function handleCancelPwd() {
    clearPwdFields();
    setShowPwdSection(false);
  }

  async function handleSavePwd() {
    setPwdError('');
    if (!currentPwd) { setPwdError('Informe a senha atual.'); return; }
    if (pwdErrors.length > 0) { setPwdError('A nova senha não atende aos requisitos.'); return; }
    if (newPwd !== confirmPwd) { setPwdError('As senhas não coincidem.'); return; }
    if (!authUser?.email) { setPwdError('Usuário não autenticado.'); return; }

    setPwdLoading(true);
    try {
      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authUser.email,
        password: currentPwd,
      });
      if (signInError) {
        setPwdError('Senha atual incorreta.');
        setPwdLoading(false);
        return;
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
      if (updateError) {
        setPwdError('Erro ao atualizar a senha. Tente novamente.');
        setPwdLoading(false);
        return;
      }

      setPwdSuccess(true);
      clearPwdFields();
      setTimeout(() => {
        setPwdSuccess(false);
        setShowPwdSection(false);
      }, 2500);
    } catch {
      setPwdError('Ocorreu um erro inesperado. Tente novamente.');
    } finally {
      setPwdLoading(false);
    }
  }

  // ── Derived stats ──
  const unlockedCount = achievements.filter(a => a.unlockedAt).length;

  function formatJoinedDate(iso: string) {
    try {
      const d = parseISO(iso);
      if (!isValid(d)) return iso;
      return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch { return iso; }
  }

  function formatLastTrained(iso?: string) {
    if (!iso) return '—';
    try {
      const d = parseISO(iso);
      if (!isValid(d)) return iso;
      return format(d, "dd/MM/yyyy", { locale: ptBR });
    } catch { return iso; }
  }

  // Avatar letter
  const avatarLetter = (user.name || authUser?.email || '?')[0].toUpperCase();

  return (
    <div className="page-wrap fade-in-up">

      {/* ── Page header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>
          Meu Perfil
        </h1>
        <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: 13 }}>
          Gerencie suas informações e configurações de conta
        </p>
      </div>

      {/* ── Profile hero ── */}
      <div
        className="game-card"
        style={{
          padding: '24px', marginBottom: 20,
          background: 'linear-gradient(135deg, #111827 0%, #1a1033 100%)',
          border: '1px solid #7c3aed40',
          display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
        }}
      >
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 900, color: '#fff',
          boxShadow: '0 0 0 3px #7c3aed40, 0 8px 24px rgba(124,58,237,0.3)',
        }}>
          {avatarLetter}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', marginBottom: 2 }}>
            {user.name || 'Herói'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>
            {authUser?.email}
          </div>
          {user.joinedAt && (
            <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={12} />
              Membro desde {formatJoinedDate(user.joinedAt)}
            </div>
          )}
        </div>

        {/* Level badge */}
        <div style={{
          textAlign: 'center', background: '#7c3aed20', border: '1px solid #7c3aed40',
          borderRadius: 12, padding: '12px 20px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#a855f7' }}>
            {user.level}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>NÍVEL</div>
        </div>
      </div>

      {/* ── Dados Pessoais ── */}
      <SectionCard title="Dados Pessoais" icon={<User size={18} />}>
        {/* Nome */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Nome</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="game-input"
            placeholder="Seu nome de herói"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Email */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>E-mail</FieldLabel>
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              value={authUser?.email ?? ''}
              readOnly
              className="game-input"
              style={{
                width: '100%', boxSizing: 'border-box',
                color: '#475569', cursor: 'not-allowed',
                paddingLeft: 40,
              }}
            />
            <Mail
              size={15}
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#475569' }}
            />
          </div>
          <p style={{ margin: '5px 0 0', fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Lock size={11} />
            Para alterar o email, entre em contato com o suporte
          </p>
        </div>

        {/* Sexo */}
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Sexo</FieldLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['male', 'female', 'other'] as Sex[]).map(s => {
              const labels: Record<Sex, string> = {
                male: 'Masculino', female: 'Feminino', other: 'Prefiro não informar',
              };
              const active = sex === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(active ? '' : s)}
                  style={{
                    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 500,
                    border: `1px solid ${active ? '#7c3aed' : '#1e2d4a'}`,
                    background: active ? '#7c3aed20' : 'transparent',
                    color: active ? '#a855f7' : '#64748b',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Data de Nascimento */}
        <div style={{ marginBottom: 20 }}>
          <DatePickerInput
            label="Data de Nascimento"
            value={birthDate}
            onChange={setBirthDate}
            max={MAX_BIRTHDATE}
          />
        </div>

        {/* Feedback */}
        {saveError && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 8,
            background: '#ef444415', border: '1px solid #ef444430',
            color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <XCircle size={15} /> {saveError}
          </div>
        )}
        {saveSuccess && (
          <div style={{
            marginBottom: 14, padding: '10px 14px', borderRadius: 8,
            background: '#10b98115', border: '1px solid #10b98130',
            color: '#10b981', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <CheckCircle size={15} /> Perfil atualizado com sucesso!
          </div>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={saveLoading}
          className="btn-primary"
          style={{ opacity: saveLoading ? 0.7 : 1 }}
        >
          {saveLoading
            ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
            : <><Save size={15} /> Salvar alterações</>
          }
        </button>
      </SectionCard>

      {/* ── Segurança da Conta ── */}
      <SectionCard title="Segurança da Conta" icon={<Shield size={18} />}>
        {/* Password row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', borderBottom: showPwdSection ? '1px solid #1e2d4a' : 'none',
          marginBottom: showPwdSection ? 20 : 0, flexWrap: 'wrap', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={16} color="#64748b" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Senha</div>
              <div style={{ fontSize: 13, color: '#475569', letterSpacing: 2 }}>••••••••</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showPwdSection) { clearPwdFields(); }
              setShowPwdSection(v => !v);
            }}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            {showPwdSection ? <><ChevronUp size={15} /> Cancelar</> : <><ChevronDown size={15} /> Alterar senha</>}
          </button>
        </div>

        {/* Expanded password form */}
        {showPwdSection && (
          <div>
            <PwdInput
              id="currentPwd"
              label="Senha atual"
              value={currentPwd}
              onChange={setCurrentPwd}
              show={showCurrent}
              onToggle={() => setShowCurrent(v => !v)}
            />

            <PwdInput
              id="newPwd"
              label="Nova senha"
              value={newPwd}
              onChange={setNewPwd}
              show={showNew}
              onToggle={() => setShowNew(v => !v)}
            />

            {/* Password strength bar */}
            {newPwd && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Força da senha</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: strengthColor }}>{strengthLabel}</span>
                </div>
                <div style={{
                  height: 6, borderRadius: 3, background: '#1e2d4a', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${strengthFill}%`,
                    background: strengthColor,
                    transition: 'width 0.3s, background 0.3s',
                  }} />
                </div>
                {/* Requirements list */}
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {allRequirements.map(req => (
                    <div key={req.label} style={{
                      display: 'flex', alignItems: 'center', gap: 7,
                      fontSize: 12, color: req.ok ? '#10b981' : '#64748b',
                    }}>
                      {req.ok
                        ? <CheckCircle size={13} color="#10b981" />
                        : <XCircle size={13} color="#475569" />}
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <PwdInput
              id="confirmPwd"
              label="Confirmar nova senha"
              value={confirmPwd}
              onChange={setConfirmPwd}
              show={showConfirm}
              onToggle={() => setShowConfirm(v => !v)}
            />

            {/* Confirm match indicator */}
            {confirmPwd && (
              <div style={{
                marginBottom: 14, fontSize: 12,
                color: newPwd === confirmPwd ? '#10b981' : '#ef4444',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {newPwd === confirmPwd
                  ? <><CheckCircle size={13} /> As senhas coincidem</>
                  : <><XCircle size={13} /> As senhas não coincidem</>}
              </div>
            )}

            {/* Feedback */}
            {pwdError && (
              <div style={{
                marginBottom: 14, padding: '10px 14px', borderRadius: 8,
                background: '#ef444415', border: '1px solid #ef444430',
                color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <XCircle size={15} /> {pwdError}
              </div>
            )}
            {pwdSuccess && (
              <div style={{
                marginBottom: 14, padding: '10px 14px', borderRadius: 8,
                background: '#10b98115', border: '1px solid #10b98130',
                color: '#10b981', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <CheckCircle size={15} /> Senha atualizada com sucesso!
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleSavePwd}
                disabled={pwdLoading}
                className="btn-primary"
                style={{ opacity: pwdLoading ? 0.7 : 1 }}
              >
                {pwdLoading
                  ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Salvando...</>
                  : <><Save size={15} /> Salvar nova senha</>
                }
              </button>
              <button
                type="button"
                onClick={handleCancelPwd}
                disabled={pwdLoading}
                className="btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Mais opções (movidas do menu mobile) ── */}
      <SectionCard title="Mais opções" icon={<Trophy size={18} />}>
        <div style={{ display: 'grid', gap: 10 }}>
          <Link to="/muscles" style={{
            display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
            background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, background: '#a855f720', border: '1px solid #a855f740',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', flexShrink: 0,
            }}>
              <Dumbbell size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Músculos</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Veja o nível de cada grupo muscular</div>
            </div>
            <ChevronRight size={18} color="#475569" />
          </Link>

          <Link to="/achievements" style={{
            display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
            background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, background: '#10b98120', border: '1px solid #10b98140',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0,
            }}>
              <Trophy size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Conquistas</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{unlockedCount} desbloqueadas</div>
            </div>
            <ChevronRight size={18} color="#475569" />
          </Link>

          <Link to="/records" style={{
            display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
            background: '#0d1526', border: '1px solid #1e2d4a', borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 9, background: '#06b6d420', border: '1px solid #06b6d440',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#06b6d4', flexShrink: 0,
            }}>
              <Target size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>Recordes pessoais</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Veja seus melhores resultados por exercício</div>
            </div>
            <ChevronRight size={18} color="#475569" />
          </Link>
        </div>
      </SectionCard>

      {/* ── Estatísticas ── */}
      <SectionCard title="Estatísticas" icon={<TrendingUp size={18} />}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
        }}>
          <StatItem icon={<Star size={18} />}    label="Nível"          value={user.level}                    color="#a855f7" />
          <StatItem icon={<TrendingUp size={18} />} label="XP Total"    value={user.totalXP.toLocaleString()} color="#7c3aed" />
          <StatItem icon={<Flame size={18} />}   label="Streak atual"   value={`${user.streak} dias`}         color="#f97316" />
          <StatItem icon={<Flame size={18} />}   label="Maior Streak"   value={`${user.longestStreak} dias`}  color="#eab308" />
          <StatItem icon={<Dumbbell size={18} />} label="Total de Treinos" value={workouts.length}            color="#06b6d4" />
          <StatItem icon={<Trophy size={18} />}  label="Conquistas"     value={`${unlockedCount} desbloqueadas`} color="#10b981" />
          <StatItem icon={<Calendar size={18} />} label="Último treino" value={formatLastTrained(user.lastTrainedDate)} color="#64748b" />
        </div>
      </SectionCard>

      {/* ── Zona de risco ── */}
      <SectionCard title="Zona de risco" icon={<AlertTriangle size={18} />}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>Zerar dados</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Apaga treinos, recordes, XP e conquistas. Os exercícios são mantidos, com nível e XP zerados.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowReset(true)}
            style={{
              background: 'none', border: '1px solid #ef444440', borderRadius: 8,
              padding: '10px 16px', cursor: 'pointer', color: '#ef4444', fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}
          >
            <Trash2 size={14} /> Zerar dados
          </button>
        </div>
      </SectionCard>

      {/* ── Reset confirm modal ── */}
      {showReset && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div style={{
            background: '#111827', border: '1px solid #ef444440', borderRadius: 16,
            padding: 28, maxWidth: 400, width: '100%',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 48 }}>⚠️</div>
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#f1f5f9', textAlign: 'center' }}>
              Zerar todos os dados?
            </h3>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: '#94a3b8', textAlign: 'center' }}>
              Apaga <strong style={{ color: '#f1f5f9' }}>treinos, recordes, XP e conquistas</strong>.
            </p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: '#64748b', textAlign: 'center' }}>
              Os exercícios são mantidos, mas com nível e XP zerados.
            </p>

            <p style={{ margin: '0 0 8px', fontSize: 13, color: '#94a3b8' }}>
              Para confirmar, digite <strong style={{ color: '#f1f5f9' }}>{RESET_PHRASE}</strong>:
            </p>
            <input
              className="game-input"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              placeholder={RESET_PHRASE}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 20 }}
              autoFocus
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => { setShowReset(false); setResetConfirmText(''); }}
                disabled={resetting}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: '1px solid #1e2d4a', background: 'transparent',
                  color: '#94a3b8', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleResetData}
                disabled={resetting || resetConfirmText.trim() !== RESET_PHRASE}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8, border: 'none',
                  background: '#ef4444', color: 'white', fontWeight: 700, fontSize: 14,
                  cursor: resetting ? 'not-allowed' : 'pointer',
                  opacity: resetting || resetConfirmText.trim() !== RESET_PHRASE ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {resetting
                  ? <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #ffffff60', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Zerando...</>
                  : <><Trash2 size={14} /> Sim, zerar tudo</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import { useGameStore } from '../store/gameStore';
import { format, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock } from 'lucide-react';

function formatDate(iso: string) {
  try {
    const d = parseISO(iso);
    if (!isValid(d)) return iso;
    return format(d, "dd 'de' MMM, yyyy", { locale: ptBR });
  } catch { return iso; }
}

export function AchievementsPage() {
  const { achievements } = useGameStore();
  const unlocked = achievements.filter(a => a.unlockedAt);
  const locked = achievements.filter(a => !a.unlockedAt);

  return (
    <div className="fade-in-up" style={{ padding: '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#f1f5f9' }}>🏆 Conquistas</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
          {unlocked.length} de {achievements.length} conquistadas
        </p>
      </div>

      {/* Progress bar */}
      <div className="game-card" style={{ padding: '16px 20px', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: '#e2e8f0' }}>Progresso geral</span>
          <span style={{ color: '#eab308', fontWeight: 700 }}>
            {Math.floor((unlocked.length / achievements.length) * 100)}%
          </span>
        </div>
        <div style={{ height: 12, background: '#1e2d4a', borderRadius: 6, overflow: 'hidden' }}>
          <div className="xp-bar-fill" style={{
            height: '100%',
            width: `${(unlocked.length / achievements.length) * 100}%`,
            borderRadius: 6,
            transition: 'width 0.6s',
          }} />
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
          {achievements.length - unlocked.length} conquistas restantes
        </div>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#eab308', marginBottom: 14 }}>
            ⭐ Conquistadas ({unlocked.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12, marginBottom: 28 }}>
            {unlocked.map(a => (
              <div key={a.id} className="game-card" style={{
                padding: '16px 18px',
                background: 'linear-gradient(135deg, #111827, #1a1a2e)',
                border: '1px solid #eab30840',
                boxShadow: '0 0 20px rgba(234,179,8,0.08)',
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: '#eab30820', border: '2px solid #eab30840',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                  }}>
                    {a.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 3 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{a.description}</div>
                    {a.unlockedAt && (
                      <div style={{ fontSize: 11, color: '#eab308' }}>
                        🗓️ {formatDate(a.unlockedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#64748b', marginBottom: 14 }}>
            <Lock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
            Bloqueadas ({locked.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {locked.map(a => (
              <div key={a.id} className="game-card" style={{ padding: '16px 18px', opacity: 0.6 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                    background: '#1e2d4a', border: '2px solid #2a3f6a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                    filter: 'grayscale(80%)',
                  }}>
                    {a.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 3 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#475569' }}>{a.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

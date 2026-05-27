# ⚔️ FitRPG — Academia com Progressão RPG

> Transforme seus treinos em uma jornada épica. Ganhe XP, suba de nível, desbloqueie conquistas e acompanhe seu progresso como um personagem de RPG.

🌐 **Demo ao vivo:** [fitness-rpg-eight.vercel.app](https://fitness-rpg-eight.vercel.app)

---

## ✨ Funcionalidades

- 🏋️ **Registro de treinos** — Registre exercícios com séries, repetições, carga e nível de dificuldade
- ⚡ **Sistema de XP e Níveis** — Cada exercício e grupo muscular tem seu próprio nível que evolui com o treino
- 💪 **13 grupos musculares** — Peitoral, Costas, Ombros, Bíceps, Tríceps, Antebraços, Core, Glúteos, Quadríceps, Isquiotibiais, Panturrilhas, Trapézio e Latíssimo
- 🗺️ **Mapa corporal interativo** — Visualize frente e costas com indicadores de nível e calor de treino por músculo
- 🏆 **17 conquistas** — Desbloqueie medalhas por marcos de treino, sequências e recordes
- 🎯 **Recordes pessoais (PRs)** — Rastreamento automático de carga máxima, volume, repetições e séries
- 📊 **Histórico completo** — Todos os treinos com XP ganho, volume total e evolução por data
- 🔥 **Sistema de sequência (streak)** — Acompanhe dias consecutivos de treino
- 👤 **Multi-usuário** — Cada conta tem dados completamente isolados via RLS no PostgreSQL
- 📱 **Mobile-first** — Layout responsivo otimizado para celular com barra de navegação inferior

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + TypeScript |
| Build | Vite 8 |
| Estilização | Tailwind CSS v4 + CSS-in-JS inline |
| Estado global | Zustand v5 |
| Roteamento | React Router DOM v7 |
| Backend / Banco | Supabase (PostgreSQL + Auth) |
| Autenticação | Supabase Auth (JWT + bcrypt) |
| Deploy | Vercel |

---

## 🏗️ Estrutura do Projeto

```
src/
├── components/
│   ├── AuthGuard.tsx        # Rota protegida: verifica sessão e carrega dados
│   ├── BodyMap.tsx          # Mapa SVG frente/costas interativo
│   ├── Navigation.tsx       # Sidebar desktop + barra mobile + header mobile
│   └── ui/
│       ├── LevelBadge.tsx
│       ├── LevelUpModal.tsx
│       └── XPBar.tsx
├── data/
│   └── seedData.ts          # Dados iniciais (músculos e exercícios padrão)
├── lib/
│   └── supabase.ts          # Cliente Supabase
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── Dashboard.tsx
│   ├── MusclesPage.tsx
│   ├── ExercisesPage.tsx
│   ├── WorkoutLogPage.tsx
│   ├── HistoryPage.tsx
│   ├── AchievementsPage.tsx
│   └── RecordsPage.tsx
├── services/
│   ├── achievementChecker.ts
│   ├── levelCalculator.ts
│   └── xpCalculator.ts
├── store/
│   ├── authStore.ts         # Estado de autenticação (Zustand)
│   └── gameStore.ts         # Estado do jogo / dados do usuário (Zustand)
├── types/
│   └── index.ts
└── App.tsx                  # Rotas e CSS global
```

---

## ⚙️ Como Rodar Localmente

### Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) (plano gratuito funciona)

### 1. Clone o repositório

```bash
git clone https://github.com/ThiagoGTK/Fitness-rpg.git
cd Fitness-rpg
npm install
```

### 2. Configure as variáveis de ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica_aqui
```

> As chaves ficam em: Supabase Dashboard → Project Settings → API

### 3. Configure o banco de dados

No Supabase, vá em **SQL Editor** e execute o script completo em [`docs/schema.sql`](docs/schema.sql) (ou veja a seção abaixo).

<details>
<summary>📋 Ver script SQL completo</summary>

```sql
-- Perfis de usuário
create table if not exists public.profiles (
  id               uuid primary key references auth.users on delete cascade,
  name             text not null default '',
  level            int  not null default 1,
  total_xp         int  not null default 0,
  weekly_xp        int  not null default 0,
  streak           int  not null default 0,
  longest_streak   int  not null default 0,
  last_trained_date text,
  joined_at        timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Progresso por grupo muscular
create table if not exists public.muscle_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  muscle_id       text not null,
  level           int  not null default 1,
  current_xp      int  not null default 0,
  total_xp_earned int  not null default 0,
  unique(user_id, muscle_id)
);

-- Exercícios cadastrados pelo usuário
create table if not exists public.exercises (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users on delete cascade,
  name              text not null,
  primary_muscle_id text not null,
  secondary_muscles jsonb not null default '[]',
  type              text not null default 'strength',
  notes             text not null default '',
  level             int  not null default 1,
  current_xp        int  not null default 0,
  total_xp_earned   int  not null default 0,
  times_performed   int  not null default 0,
  created_at        timestamptz not null default now()
);

-- Sessões de treino
create table if not exists public.workout_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       text not null,
  total_xp   int  not null default 0,
  notes      text not null default '',
  created_at timestamptz not null default now()
);

-- Entradas de exercício dentro de uma sessão
create table if not exists public.workout_entries (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.workout_sessions on delete cascade,
  user_id     uuid not null references auth.users on delete cascade,
  exercise_id uuid not null,
  sets        jsonb not null default '[]',
  difficulty  int  not null default 7,
  notes       text not null default '',
  rest_time   int,
  duration    int,
  xp_gained   int  not null default 0,
  muscle_xp   jsonb not null default '{}',
  is_pr       boolean not null default false
);

-- Recordes pessoais
create table if not exists public.personal_records (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users on delete cascade,
  exercise_id         uuid not null,
  max_weight          numeric not null default 0,
  max_volume          numeric not null default 0,
  max_reps_in_set     int not null default 0,
  max_sets_in_session int not null default 0,
  date                text not null,
  unique(user_id, exercise_id)
);

-- Conquistas desbloqueadas
create table if not exists public.user_achievements (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users on delete cascade,
  achievement_id text not null,
  unlocked_at    timestamptz not null default now(),
  unique(user_id, achievement_id)
);

-- Row Level Security (isolamento total de dados por usuário)
alter table public.profiles          enable row level security;
alter table public.muscle_progress   enable row level security;
alter table public.exercises         enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.workout_entries   enable row level security;
alter table public.personal_records  enable row level security;
alter table public.user_achievements enable row level security;

create policy "own data" on public.profiles          for all using (id = auth.uid());
create policy "own data" on public.muscle_progress   for all using (user_id = auth.uid());
create policy "own data" on public.exercises         for all using (user_id = auth.uid());
create policy "own data" on public.workout_sessions  for all using (user_id = auth.uid());
create policy "own data" on public.workout_entries   for all using (user_id = auth.uid());
create policy "own data" on public.personal_records  for all using (user_id = auth.uid());
create policy "own data" on public.user_achievements for all using (user_id = auth.uid());

-- Trigger: cria perfil + 13 linhas de muscle_progress ao registrar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));

  insert into public.muscle_progress (user_id, muscle_id)
  values
    (new.id, 'chest'),       (new.id, 'back'),
    (new.id, 'shoulders'),   (new.id, 'biceps'),
    (new.id, 'triceps'),     (new.id, 'forearms'),
    (new.id, 'core'),        (new.id, 'glutes'),
    (new.id, 'quadriceps'),  (new.id, 'hamstrings'),
    (new.id, 'calves'),      (new.id, 'traps'),
    (new.id, 'lats');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

</details>

### 4. Desative a confirmação de e-mail

No Supabase: **Authentication → Providers → Email** → desmarque **"Confirm email"** → Salvar.

### 5. Rode o projeto

```bash
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173)

---

## 🚀 Deploy (Vercel)

1. Faça o fork / clone e suba para o GitHub
2. Importe o repositório no [Vercel](https://vercel.com)
3. Adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. O arquivo `vercel.json` já configura o redirecionamento SPA automaticamente

---

## 🔐 Segurança e Privacidade

- Senhas armazenadas com **bcrypt** via Supabase Auth (nunca em texto puro)
- Sessões gerenciadas por **JWT** com refresh automático
- **Row Level Security (RLS)** no PostgreSQL: cada usuário só acessa seus próprios dados, mesmo com a chave pública exposta
- Todas as mutações usam duplo filtro (`id + user_id`) no cliente, além do RLS no banco
- Chave pública (`anon key`) é segura para o frontend — o RLS garante o isolamento

---

## 📐 Sistema de XP

**XP por exercício:**
```
baseXP = max(volume / 10, séries × 3)
XP final = baseXP × dificuldade (0.76 – 1.36) + bônus de PR
```

**Curva de nível dos músculos:**
```
XP necessário = 100 × nível × 1.25^(nível - 1)
```

**Curva de nível dos exercícios:**
```
XP necessário = 50 × nível × 1.30^(nível - 1)
```

---

## 📄 Licença

MIT — use à vontade para aprender, adaptar ou evoluir o projeto.

---

<div align="center">
  Feito com 💜 e muita repetição
</div>

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
- 🔥 **Sistema de sequência (streak)** — Dias consecutivos de treino, com 3 dias de tolerância antes de perder a sequência (quebra no 4º dia sem treinar, mesmo sem abrir o app)
- 👤 **Multi-usuário** — Cada conta tem dados completamente isolados via RLS no PostgreSQL
- 📱 **Mobile-first** — Layout responsivo com barra de navegação inferior enxuta (itens secundários ficam em "Mais opções" no Perfil)
- 📈 **Evolução** — Gráficos de volume/XP por semana e tabela de progresso de força por exercício (carga, reps e séries: primeiro registro vs. mais recente)

### 🥗 Módulo de Nutrição

- **Resumo diário** — barra de progresso de calorias, macros (proteína/carbs/gorduras) e hidratação
- **Registro de refeições** — 5 tipos (café da manhã, almoço, lanche, jantar, ceia), cada um com lista de alimentos e macros opcionais
- **Tabela TACO integrada** — 130 alimentos brasileiros (UNICAMP, 4ª ed.) com busca por autocomplete (sem acento obrigatório); selecionar um alimento preenche os macros automaticamente; alterar a quantidade recalcula em tempo real; entrada manual disponível como fallback
- **Rastreamento de água** — botões de adição rápida (150ml–750ml), quantidade personalizada e log do dia
- **Calculadora de macros** — fórmula Mifflin-St Jeor: calcula TMB, TDEE e distribui macros conforme objetivo e nível de atividade; resultado salvo como metas pessoais
- **Histórico de peso corporal** — registro por data com delta entre entradas e variação total
- **Gamificação nutricional** — XP por refeição registrada, meta de água atingida e peso logado; conquistas de primeiro registro
- **4 objetivos** — Ganho de massa, Emagrecimento, Manutenção e Definição (ajustam calorias e macros automaticamente)
- **Plano alimentar prescrito** — se o aluno tiver um personal, o card "Dieta prescrita" aparece no Resumo com os alimentos por refeição, macros por item e total diário (expansível)

### 🧑‍💼 Módulo Personal Trainer

- **3 papéis**: `admin`, `trainer` (personal) e `student` (aluno)
- Personal cria o login do aluno — o aluno já nasce vinculado automaticamente
- Personal pode vincular ou **remover** alunos (com confirmação por e-mail) a qualquer momento
- Personal monta **planos de treino prescritos**, com **dias da semana** (Seg–Dom, múltipla escolha), séries, reps, carga e descanso por exercício
- Personal pode **criar um exercício novo direto no formulário do plano**, sem sair da tela
- Aluno vê um card **"Treino de hoje"** no dashboard quando há um plano agendado para o dia — registrar o treino já vem com os exercícios pré-preenchidos
- Personal compara o prescrito vs. realizado em **cards por exercício** (séries/reps/peso/volume, com badges de variação) e um resumo de % de adesão ao plano
- Personal monta **planos alimentares prescritos** com 5 seções de refeição (café da manhã, almoço, lanche, jantar, ceia) — cada alimento usa a busca TACO com preenchimento automático de macros; quantidade ajustável por item
- Aluno vê o **plano alimentar** em um card colapsável na aba Resumo de Nutrição, com macros por alimento e total diário
- Personal pode excluir planos de treino e alimentares quando quiser
- Aluno troca de senha obrigatoriamente no primeiro acesso
- Admin cria personal trainers com **código PT único** (PT-001, PT-002…)
- Admin pode **excluir personal trainers** (com confirmação por nome); alunos são desvinculados e planos removidos automaticamente
- Admin vê o **número de alunos** de cada personal diretamente no painel, destacado em azul
- Pessoas sem personal podem criar conta própria e usar o app normalmente (vínculo é opcional)

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

## 🔑 Sistema de Papéis

| Papel | Acesso |
|-------|--------|
| `student` | App completo (treinos, histórico, conquistas, nutrição, perfil) |
| `trainer` | Tudo do aluno + painel `/trainer` (alunos, planos prescritos) |
| `admin` | Tudo do trainer + painel `/admin` (criar/excluir personal trainers) |

- O **admin** cria contas de personal trainer via painel Admin
- O **personal** cria contas de aluno via painel Personal — o aluno já nasce vinculado
- Alunos com conta existente podem ser vinculados pelo personal via busca por e-mail
- Na primeira entrada, alunos e personais criados pelo sistema devem trocar a senha

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
│   ├── seedData.ts          # Dados iniciais (músculos e exercícios padrão)
│   └── taco.ts              # 130 alimentos TACO (UNICAMP) + searchTaco() + scaleTaco()
├── lib/
│   └── supabase.ts          # Cliente Supabase
├── pages/
│   ├── LoginPage.tsx          # Abas Aluno / Personal
│   ├── RegisterPage.tsx
│   ├── ChangePasswordPage.tsx # Troca obrigatória no 1º acesso
│   ├── Dashboard.tsx
│   ├── MusclesPage.tsx
│   ├── ExercisesPage.tsx
│   ├── WorkoutLogPage.tsx
│   ├── HistoryPage.tsx
│   ├── AchievementsPage.tsx
│   ├── RecordsPage.tsx
│   ├── WeeklyPlanPage.tsx
│   ├── EvolutionPage.tsx      # Gráficos de progresso
│   ├── NutritionPage.tsx      # Nutrição: resumo, refeições (TACO), calculadora, peso
│   ├── TrainerDashboard.tsx   # Painel do personal
│   ├── TrainerStudentsPage.tsx
│   ├── TrainerStudentPage.tsx # Detalhe do aluno: treinos + planos de treino + planos alimentares
│   ├── TrainerPlanForm.tsx    # Formulário de plano de treino
│   ├── TrainerDietPlanForm.tsx # Formulário de plano alimentar (com busca TACO)
│   └── AdminPage.tsx
├── services/
│   ├── achievementChecker.ts
│   ├── levelCalculator.ts
│   └── xpCalculator.ts
├── store/
│   ├── authStore.ts         # Estado de autenticação (Zustand)
│   ├── gameStore.ts         # Estado do jogo / dados do usuário (Zustand)
│   ├── nutritionStore.ts    # Estado do módulo de nutrição
│   ├── trainerStore.ts      # Estado do módulo personal trainer (treino + dieta)
│   └── weeklyStore.ts       # Estado do plano semanal
├── types/
│   ├── index.ts
│   └── nutrition.ts         # Tipos nutrição + TrainerDietPlan + TrainerDietPlanItem
├── utils/
│   └── nutritionCalc.ts     # Fórmulas BMR/TDEE + constantes XP nutrição
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

No Supabase, vá em **SQL Editor** e execute os scripts na ordem abaixo.

**Script base** (tabelas principais + RLS inicial) — veja a seção expandível abaixo.

**Script do módulo personal** — [`supabase/trainer_module_migration.sql`](supabase/trainer_module_migration.sql):
adiciona tabelas `trainer_plans` e `trainer_plan_exercises`, colunas `trainer_id` e `email` em profiles.

**Script do sistema de papéis** — [`supabase/role_system_migration.sql`](supabase/role_system_migration.sql):
adiciona `role` (admin/trainer/student), `trainer_code`, `must_change_password` e reescreve as políticas RLS com função `is_admin()` para evitar recursão.

**Script do módulo de nutrição** — [`supabase/nutrition_migration.sql`](supabase/nutrition_migration.sql):
cria as tabelas `meal_entries`, `water_logs`, `weight_logs` e `nutrition_goals` com RLS e índices.

**Tabelas de planos alimentares do personal** — execute no SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS public.trainer_diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_name TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT 'maintenance',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.trainer_diet_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.trainer_diet_plans(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL DEFAULT 'breakfast',
  food_name TEXT NOT NULL DEFAULT '',
  quantity_g DECIMAL(8,1),
  calories DECIMAL(8,1) NOT NULL DEFAULT 0,
  protein DECIMAL(6,1) NOT NULL DEFAULT 0,
  carbs DECIMAL(6,1) NOT NULL DEFAULT 0,
  fats DECIMAL(6,1) NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.trainer_diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_diet_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainer manage diet plans" ON public.trainer_diet_plans FOR ALL USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "Student read diet plans"   ON public.trainer_diet_plans FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Trainer manage diet plan items" ON public.trainer_diet_plan_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.trainer_diet_plans p WHERE p.id = plan_id AND p.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trainer_diet_plans p WHERE p.id = plan_id AND p.trainer_id = auth.uid()));
CREATE POLICY "Student read diet plan items" ON public.trainer_diet_plan_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.trainer_diet_plans p WHERE p.id = plan_id AND p.student_id = auth.uid()));
```

> Após rodar os scripts, defina o papel de admin diretamente no SQL:
> ```sql
> update public.profiles set role = 'admin'
>   where id = (select id from auth.users where email = 'seu@email.com');
> ```

<details>
<summary>📋 Ver script SQL base</summary>

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

### 4. Deploy das Edge Functions

```bash
supabase functions deploy create-user
supabase functions deploy delete-trainer
```

- `create-user` — cria personal trainers (admin) e alunos (personal) com senha temporária e vínculo automático
- `delete-trainer` — exclui personal trainer: desvincula alunos, remove planos e deleta a conta (admin only)

### 5. Desative a confirmação de e-mail

No Supabase: **Authentication → Providers → Email** → desmarque **"Confirm email"** → Salvar.

### 6. Rode o projeto

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

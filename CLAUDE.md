# CLAUDE.md — Trading Journal

> Documento de arquitectura y contexto para Claude Code.
> Personal trading journal para futuros crypto (Bitget / Bitunix / BingX / otros), con arquitectura preparada para multi-cuenta, multi-usuario y despliegue futuro en Vercel.
> Prosa en español; identificadores, tablas y campos en inglés.

---

## 1. Propósito

App web para registrar y analizar operaciones de trading manualmente. Uso personal hoy, pero con arquitectura sólida para crecer a multi-usuario y desplegarse en la nube. Inspirada en la UX de TradeZella (dashboard, score radar, progress tracker, calendario con totales semanales, equity curve, account balance) pero con métricas y nombres propios.

**Principios rectores**
- Modelo de datos correcto desde el día uno (multi-cuenta, roles, separación de depósitos/retiros).
- Dev y prod idénticos: Postgres en local (Supabase Docker) y en la nube.
- Métricas de rendimiento calculadas **solo** desde la tabla `trades`; los depósitos/retiros nunca las tocan.
- UI desacoplada de datos vía Atomic Design.
- i18n (ES/EN) y theming (light/dark) montados desde el inicio, no retrofitteados.

---

## 2. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Estilos | Tailwind CSS + shadcn/ui |
| Componentes | Atomic Design (ver §7) |
| ORM | Drizzle ORM |
| Base de datos | Postgres (Supabase — **local vía Docker/CLI** en desarrollo, free tier al desplegar) |
| Storage | Supabase Storage (capturas de gráficos; en BD solo se guarda la ruta) |
| Auth | Supabase Auth |
| i18n | next-intl (segmento `[locale]`) |
| Theming | next-themes + tokens CSS |
| Gráficos | Recharts (o Tremor para dashboards) |
| Deploy futuro | Vercel + Supabase (vía Marketplace) |

**Reglas de stack**
- Dinero: tipo `numeric`/`decimal` en BD; manejar como string/decimal en TS, nunca `float`, para evitar errores de redondeo.
- Fechas: UTC en BD; mostrar en zona horaria del usuario.
- Imágenes: **nunca** como `bytea`/base64 en Postgres. Archivos al bucket; en BD solo el `storage_path`. Abstraer la subida tras una interfaz `uploadScreenshot()` para poder cambiar a Cloudflare R2 después sin reescribir.

---

## 3. Estructura de carpetas

```
src/
  app/
    [locale]/
      (auth)/
        login/page.tsx
      (app)/
        dashboard/page.tsx
        trades/page.tsx
        trades/[id]/page.tsx
        journal/page.tsx
        start-my-day/page.tsx
        reports/page.tsx
        settings/page.tsx
        admin/page.tsx            # solo super_admin (fase posterior)
        layout.tsx               # shell: sidebar + topbar (account selector)
      layout.tsx                 # provee locale + theme
  components/
    atoms/
    molecules/
    organisms/
    templates/
  lib/
    db/
      schema.ts                  # tablas Drizzle
      client.ts
      migrations/
    metrics/                     # funciones puras, testeables, sin side effects
    i18n/
    auth/
    storage/                     # uploadScreenshot(), getSignedUrl()
  server/
    actions/                     # mutaciones (server actions): createTrade, createAccount...
    queries/                     # lecturas para Server Components
  config/
    evaluator.ts                 # array de preguntas del evaluador pre-trade (§10)
  messages/
    en.json
    es.json
  styles/
    tokens.css                   # variables de color light/dark
```

**Reconciliación Atomic Design ↔ App Router**
- "Pages" en sentido atómico = los `page.tsx` (Server Components) que hacen fetch vía `server/queries` y pasan datos a un template.
- "Templates" = componentes presentacionales que arman organismos en un layout, reciben datos por props.
- Atoms / molecules / organisms: **siempre presentacionales**, sin acceso a BD ni server actions directos (reciben handlers por props).

---

## 4. Modelo de datos

Todo se llavea por `account_id`; la cuenta cuelga del usuario. Las métricas de rendimiento salen solo de `trades`.

### users
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | = auth.users.id de Supabase |
| email | text unique | |
| role | enum('super_admin','user') | default 'user' |
| max_accounts | int | cuota de cuentas activas, default 1 |
| locale | text | 'es' \| 'en', default 'es' |
| theme | text | 'light' \| 'dark' \| 'system', default 'system' |
| selected_account_ids | uuid[] | preferencia del filtro global de cuentas |
| created_at | timestamptz | |

### accounts
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| name | text | |
| status | enum('active','archived') | default 'active' |
| exchange | text | 'Bitget','Bitunix',... (nullable) |
| currency | text | default 'USD' |
| starting_balance | numeric | default 0 |
| created_at | timestamptz | |

### trades
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK → accounts | |
| symbol | text | activo (BTC/USDT...) |
| direction | enum('long','short') | |
| result | enum('win','loss','breakeven') | explícito (derivable de net_pnl) |
| opened_at | timestamptz | fecha+hora de entrada |
| closed_at | timestamptz | fecha+hora de salida |
| entry_price | numeric | |
| exit_price | numeric | |
| quantity | numeric | tamaño / contratos |
| leverage | numeric | nullable (futuros) |
| fees | numeric | default 0 |
| gross_pnl | numeric | |
| net_pnl | numeric | gross_pnl − fees |
| planned_rr | numeric | nullable |
| realized_rr | numeric | nullable |
| risk_amount | numeric | $ arriesgado, nullable |
| session | enum('asia','london','newyork','overlap','other') | |
| setup_id | uuid FK → setups | nullable |
| evaluation_id | uuid FK → pre_trade_evaluations | nullable (link al evaluador) |
| notes | text | |
| created_at / updated_at | timestamptz | |

Derivados (calculados, no almacenados): `hold_time = closed_at − opened_at`, `roi = net_pnl / (entry_price × quantity)`.

### transactions  (depósitos / retiros — SEPARADO de trades)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK → accounts | |
| type | enum('deposit','withdrawal') | |
| amount | numeric | positivo; el signo lo da `type` |
| occurred_at | timestamptz | |
| note | text | nullable |
| created_at | timestamptz | |

### setups  (estrategias / playbooks)
`id PK, user_id FK, name, description, created_at` — ej.: Breakout, OB, FVG, SMC MTF.

### tags + trade_tags  (vocabulario SMC, opcional)
`tags(id, user_id, name, color)` · `trade_tags(trade_id, tag_id)` — order block, FVG, BOS, CHoCH.

### screenshots
`id PK, trade_id FK, storage_path text, caption text, created_at`. Solo la ruta; el archivo vive en el bucket.

### daily_prep  (Start My Day: prep + checklist diario)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users | |
| account_id | uuid FK → accounts | nullable (prep puede ser global) |
| date | date | |
| notes | text | plantilla de prep (operación, calidad de ejecución, intensidad emocional, disparador, aprendizaje...) |
| checklist | jsonb | estado de reglas manuales/automáticas |
| score | int | ej. 1 |
| max_score | int | ej. 8 |
| created_at / updated_at | timestamptz | unique(user_id, date) |

Alimenta el **progress tracker** (heatmap de cumplimiento diario) y el "Today's score X/8".

### journal_entries  (Daily Journal / Notebook)
`id PK, user_id FK, account_id FK (nullable), date, title, content (rich text), template (nullable), folder (nullable), created_at, updated_at`.

### pre_trade_evaluations  (Evaluador de Trades — §10)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| account_id | uuid FK → accounts | |
| answers | jsonb | `{setup:'y', stop:'y', size:'n', rr:'y', limit:'y', emo:'a', tp:'y'}` |
| verdict | enum('blocked','category_a','category_b','category_c') | |
| assigned_risk_pct | numeric | nullable |
| linked_trade_id | uuid FK → trades | nullable (al registrar el trade) |
| created_at | timestamptz | |

Ejemplo Drizzle de las dos tablas más delicadas:

```ts
export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  direction: tradeDirection('direction').notNull(),
  result: tradeResult('result').notNull(),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  entryPrice: numeric('entry_price'),
  exitPrice: numeric('exit_price'),
  quantity: numeric('quantity'),
  leverage: numeric('leverage'),
  fees: numeric('fees').default('0'),
  grossPnl: numeric('gross_pnl').notNull(),
  netPnl: numeric('net_pnl').notNull(),
  plannedRr: numeric('planned_rr'),
  realizedRr: numeric('realized_rr'),
  riskAmount: numeric('risk_amount'),
  session: tradeSession('session'),
  setupId: uuid('setup_id').references(() => setups.id),
  evaluationId: uuid('evaluation_id').references(() => preTradeEvaluations.id),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  type: txType('type').notNull(),        // 'deposit' | 'withdrawal'
  amount: numeric('amount').notNull(),   // positivo
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

---

## 5. Reglas de negocio críticas

1. **Separación depósitos/retiros.** `transactions` es independiente de `trades`. Ninguna métrica de rendimiento (P&L, win rate, profit factor, expectancy, R, drawdown) incluye depósitos/retiros. El gráfico **Account Balance** = `starting_balance + Σ(net_pnl de trades) + Σ(transactions con signo)`, mostrado como dos series superpuestas: "Account Balance" y "Deposits/Withdrawals".

2. **Multi-cuenta + cuota + roles.**
   - `users.role` distingue `super_admin` de `user`; `users.max_accounts` es la cuota.
   - La cuota se valida al **crear** cuenta: el server action cuenta cuentas `active` del usuario y bloquea si llegó al límite (salvo `super_admin`). Archivar libera un cupo y conserva los datos.
   - El `super_admin` puede editar `max_accounts` de cada usuario (panel admin, fase posterior).

3. **Filtro global de cuentas** (selector arriba a la derecha). Multi-select con checkboxes ("All accounts" + activas + archivadas). Se persiste en `users.selected_account_ids`; por defecto = todas las activas. Las agregaciones corren sobre el conjunto seleccionado; los depósitos/retiros se mantienen por cuenta.

4. **RLS (Supabase).** Un usuario solo ve sus propias `accounts` y los datos colgados de ellas. Policy adicional `role = 'super_admin'` para acceso total. Toda mutación valida ownership en el server action además de RLS.

---

## 6. Métricas y cálculos  (`lib/metrics/`, funciones puras)

Todas reciben un array de `trades` ya filtrado por cuenta(s) y periodo. Unit-testables, sin side effects.

- `netPnl`, `grossPnl`
- `winRate` = wins / total
- `dayWinRate` = días ganadores / días operados
- `profitFactor` = Σ(net de ganadores) / |Σ(net de perdedores)|
- `avgWin`, `avgLoss`, `avgWinLossRatio`
- `expectancy` = (winRate × avgWin) − (lossRate × avgLoss)
- `maxDrawdown` (sobre la equity curve de net_pnl), `maxDrawdownPct`
- `recoveryFactor` = netPnl / maxDrawdown
- `avgRr` (planned y realized)
- `consistency` (ej.: desviación estándar del P&L diario, o % de días rentables)
- estadísticas de `holdTime`

**Trade Score** (reemplazo del "Zella Score", radar de 6 ejes): normaliza a 0–100 cada submétrica — Win %, Profit factor, Avg win/loss, Max drawdown (invertido), Recovery factor, Consistency — y promedia (ponderable). Documentar la normalización de cada eje en el código; los pesos son configurables.

---

## 7. Frontend — Atomic Design

Capas presentacionales (atoms/molecules/organisms) sin BD ni server actions: reciben datos y handlers por props. La obtención de datos vive en `page.tsx` (Server Components) → templates.

**Atoms** (primitivas, basadas en shadcn/ui + tokens): `Button`, `Input`, `Label`, `Select`, `Switch`, `Badge`, `Icon`, `Spinner`, `Card`, `Checkbox`, `Tooltip`.

**Molecules** (combinaciones pequeñas): `FormField` (label+input+error), `StatCard` (KPI), `DateRangePicker`, `SearchBar`, `ThemeToggle`, `LanguageSelector`, `ChecklistItem`, `AccountChip`, `ImageThumb`.

**Organisms** (secciones complejas, conscientes del dominio): `KpiCardRow` (Net P&L, Trade win %, Profit factor, Day win %, Avg win/loss), `EquityCurveChart` (daily net cumulative P&L), `AccountBalanceChart` (balance vs deposits/withdrawals), `PerformanceRadar` (Trade Score), `ProgressHeatmap` (progress tracker), `TradeCalendar` (mensual con totales por semana), `TradeTable`, `TradeForm`, `TradeDetail`, `TransactionForm`, `AccountSelector` (multi-select), `PreTradeEvaluator`, `StartMyDayPanel`, `DailyJournalEditor`, `SettingsPanel`, `AdminUsersTable`.

**Templates** (arman organismos en layout, datos por props): `DashboardTemplate`, `TradesTemplate`, `TradeDetailTemplate`, `JournalTemplate`, `StartMyDayTemplate`, `ReportsTemplate`, `SettingsTemplate`, `AdminTemplate`.

**Pages** (Server Components en `app/[locale]/(app)/.../page.tsx`): fetch vía `server/queries`, pasan datos al template.

---

## 8. Funcionalidades (mapeadas a TradeZella)

- **Dashboard**: `KpiCardRow` + `PerformanceRadar` (Trade Score) + `ProgressHeatmap` + `EquityCurveChart` + `TradeCalendar` (totales semanales) + `AccountBalanceChart` + recent trades.
- **Trades**: tabla (open/close date, symbol, status, entry/exit, net P&L, ROI) + alta/edición manual con subida de capturas + filtros por periodo/resultado/cuenta.
- **Trade detail**: stats del trade + notas + capturas (+ gráfico, fase posterior).
- **Start My Day**: prep diario con plantilla + `PreTradeEvaluator` + checklist diario que alimenta el progress tracker.
- **Daily Journal / Notebook**: entradas por día con plantillas, carpetas y tags.
- **Reports** (fase posterior): overview de stats (R-multiple, expectancy, drawdown, hold times...), Day & Time, Symbols, Risk, Compare.
- **Settings**: idioma (ES/EN) + tema (light/dark/system) + (fase posterior) gestión de cuentas y, para super_admin, gestión de usuarios y cuotas.

---

## 9. i18n + Theming

- **i18n**: next-intl con segmento `[locale]`. **Todos** los textos en `messages/es.json` y `messages/en.json` desde el primer componente. Nada de strings hardcodeados.
- **Theming**: next-themes + variables CSS en `styles/tokens.css` (paleta light/dark). Componentes consumen tokens, no colores literales. Preferencia persistida en `users.theme`.

---

## 10. Evaluador Pre-Trade  (`config/evaluator.ts`)

Preguntas (de la app actual del usuario). `type: 'yn'` = Sí/No; `type: 'ae'` = Análisis/Emoción. `correct` = respuesta que habilita; `mandatory` = bloquea si falla.

```ts
export const EVALUATOR_QUESTIONS = [
  { id: 'setup', q: '¿El trade tiene un setup claro definido en el plan?', mandatory: false, type: 'yn', correct: 'y' },
  { id: 'stop',  q: '¿El stop loss está definido antes de entrar?',        mandatory: true,  type: 'yn', correct: 'y' },
  { id: 'size',  q: '¿El tamaño de posición fue calculado con la fórmula?', mandatory: false, type: 'yn', correct: 'y' },
  { id: 'rr',    q: '¿El R:R es al menos 1:2?',                             mandatory: false, type: 'yn', correct: 'y' },
  { id: 'limit', q: '¿Estás dentro del límite diario de pérdida?',          mandatory: true,  type: 'yn', correct: 'y' },
  { id: 'emo',   q: '¿Estás operando por análisis o por emoción?',          mandatory: false, type: 'ae', correct: 'a' },
  { id: 'tp',    q: '¿Tenés plan de TP parciales (TP1, TP2, mover stop)?',  mandatory: false, type: 'yn', correct: 'y' },
] as const;
```

**Veredicto**
- Si alguna obligatoria falla → `blocked` ("no operar", sin riesgo asignado).
- Si está incompleto → pendiente (sin veredicto).
- Si pasa: `score` = opcionales correctas / opcionales totales →
  - todas correctas → `category_a` (riesgo completo 1–2%)
  - ≥ mitad → `category_b` (riesgo reducido)
  - resto → `category_c` (riesgo mínimo)
- El resultado se guarda en `pre_trade_evaluations` y puede vincularse (`linked_trade_id`) al trade que se registre después.

(Para MVP las preguntas son una constante tipada; opcionalmente migrar a tabla `evaluation_questions` editable más adelante.)

---

## 11. Server actions / seguridad

- Mutaciones en `server/actions`, lecturas en `server/queries`. Atoms/molecules/organisms nunca llaman a la BD directo.
- Cada mutación: valida sesión, valida ownership de la cuenta, y aplica reglas (ej. cuota en `createAccount`).
- RLS en Supabase como segunda barrera. Storage: subir vía `lib/storage`, servir con signed URLs.

---

## 12. Orden de construcción (fases)

- **Fase 0 — Scaffold**: Next.js+TS, Tailwind+shadcn, Drizzle, Supabase local (Docker), next-intl, next-themes, tokens, carpetas atomic.
- **Fase 1 — MVP core**: auth (super_admin sembrado por migración) · `accounts` CRUD + cuota · `trades` CRUD manual + capturas · `AccountSelector` · Dashboard (KPIs, equity curve, calendario, Trade Score radar, progress heatmap) · `transactions` + Account Balance chart · Settings (idioma + tema).
- **Fase 2**: Start My Day (prep + checklist + progress) + Evaluador Pre-Trade · Daily Journal / Notebook.
- **Fase 3**: Reports avanzados (overview, Day & Time, Symbols, Risk, Compare) · Trade detail con gráfico.
- **Fase 4**: Registro abierto de usuarios + panel super_admin (gestión de usuarios y `max_accounts`) · (opcional) auto-import de fills desde Bitget/Bitunix vía Vercel Cron.
- **Fase 5**: Deploy a Vercel + Supabase cloud; mover storage a Cloudflare R2 si las capturas superan el free tier.

---

## 13. Validación de formularios

**Stack fijo (elegir UNO y usarlo en todos los formularios):** **React Hook Form** + **Zod** + `@hookform/resolvers/zod`, sobre el primitivo **`Field` de shadcn/ui** (`npx shadcn@latest add field`).

> Desde oct-2025 shadcn separó el layout del estado: `<Field>` es un primitivo agnóstico (funciona con Server Actions, RHF, TanStack Form, etc.) y reemplaza al antiguo `<Form>`/`<FormField>` acoplado a RHF (ese sigue funcionando pero ya no es el punto de partida recomendado). **Usar `<Field>`, no `<Form>`/`<FormField>`.**
>
> Elegimos React Hook Form (no TanStack Form ni Formisch): es la opción madura y de mayor ecosistema, encaja con formularios de complejidad moderada y server actions, y los formularios de la Fase 1 ya están en RHF → cero migración de librería. TanStack Form solo se justificaría en formularios muy complejos (wizards multi-paso); Formisch es demasiado nueva para este proyecto.

**Regla de oro:** la validación de cliente es solo UX (feedback inmediato); el **server action es la fuente de verdad** y siempre re-valida. Nunca confiar solo en la validación del navegador.

**Esquema único compartido.** Un esquema por entidad en `lib/validations/` (`tradeSchema`, `accountSchema`, `transactionSchema`, `dailyPrepSchema`, `evaluatorSchema`...). Se importa desde el formulario (cliente) y desde el server action (servidor); cero duplicación. El tipo se deriva con `z.infer<typeof schema>`.

```ts
// lib/validations/trade.ts
import { z } from 'zod';
export const tradeSchema = z.object({
  symbol: z.string().min(1),
  direction: z.enum(['long', 'short']),
  // ...
});
export type TradeInput = z.infer<typeof tradeSchema>;
```

**Cliente** (organism, ej. `TradeForm`, `'use client'`):
```ts
const form = useForm<TradeInput>({ resolver: zodResolver(tradeSchema) });
// usar el primitivo <Field>/<FieldGroup> de shadcn (no el <Form>/<FormField> antiguo)
```

**Servidor** (server action): mismo esquema con `safeParse`, **luego** validar sesión, ownership de la cuenta y reglas de negocio (ej. cuota en `createAccount`). Devolver errores estructurados y exponer `pending` con `useActionState`.
```ts
'use server';
export async function createTrade(prev, formData) {
  const parsed = tradeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };
  // validar sesión + ownership de account_id + reglas, luego insertar
}
```

**i18n de los mensajes.** No hardcodear el texto del error dentro del esquema (`.min(2, { message: '...' })`). Usar un **error map** de Zod (o claves que se resuelvan con next-intl) para que los mensajes de validación salgan en ES/EN como el resto de la UI.

**Versión.** Fijar **Zod v4** y usar su sintaxis (p. ej. `z.email()` en lugar de `z.string().email()`); evitar mezclar ejemplos de v3.

**Ubicación en Atomic Design.** El `Form`/`FormField` vive en los organisms de formulario (`TradeForm`, `AccountForm`, `TransactionForm`...); los esquemas y cualquier lógica de validación pura quedan en `lib/validations/` (testeable, sin UI).

> Nota Fase 1: los formularios ya construidos (trades, cuentas, transacciones) deben verificarse contra este patrón — esquema en `lib/validations/`, re-validación en el server action, y mensajes vía i18n.

---

## 14. Convenciones

- Server Components por defecto; `'use client'` solo donde haya interactividad.
- Capas atomic presentacionales y testeables; lógica de métricas en funciones puras.
- Migraciones con Drizzle; nunca editar la BD a mano.
- Dinero en `numeric`/decimal (no float); fechas UTC en BD.
- Imágenes: solo path en BD, archivo en bucket, subida tras interfaz abstracta.
- Todo string de UI en `messages/{es,en}.json`.
- Toda tabla con datos de usuario protegida por RLS + validación de ownership en el server action.

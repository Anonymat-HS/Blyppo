# StudyForge — Contexte projet pour assistant IA (OpenCode)

> **État de référence : `HANDOFF.md` (passation) et `AGENTS.md` (conventions).**
> Ce document décrit la vision et les décisions de départ ; certaines parties
> sont périmées (il mentionne Next.js, `pdf-parse`, `screens/`, l'ancien modèle
> Groq, et l'absence de plans). En cas de contradiction, `HANDOFF.md` fait foi.

> Ce fichier sert de mémoire de projet. Toute IA (OpenCode, Claude, etc.) qui aide sur ce repo doit lire ce document en premier pour comprendre le contexte, les contraintes et les décisions déjà prises.

---

## 1. Vision du projet

**StudyForge** est une plateforme web où un étudiant uploade son cours (PDF ou texte) et reçoit automatiquement :
- un **quiz** (QCM) généré par IA
- des **flashcards** (recto/verso) générées par IA

Objectif long terme : vendre ça à des établissements (écoles, universités) ou des profs comme outil de génération d'exercices. Pour l'instant : **MVP solo, budget 0€**.

**Utilisateur cible initial** : moi-même (étudiant L1 CS à HEI), pour réviser mes propres cours (réseau, Java, API/PROG2). Ça sert de test terrain réel avant tout lancement plus large.

**Pédagogie visée** : privilégier des questions qui font réfléchir (pas du pur par-cœur), dans un esprit socratique quand c'est possible.

---

## 2. Contraintes IMPORTANTES (à respecter absolument)

- 🚫 **Budget = 0€.** Aucune dépense possible (pas de domaine payant, pas d'API payante, pas de plan payant Supabase/Vercel). Tout doit tenir dans les tiers gratuits.
- ✅ Le LLM utilisé doit être **gratuit** (voir section 4 — le choix n'est PAS figé sur un seul provider, garder le code modulaire pour changer facilement de fournisseur LLM).
- L'utilisateur (moi) est **amateur** sur la partie IA/LLM (choix d'API, prompting avancé, self-hosting) → toujours expliquer simplement les options avant de trancher, pas juste balancer une décision technique sans justification.
- Préférence generale : **guidage socratique sur les exercices de cours** (Java, réseau) mais **PAS sur ce projet** — ici je veux de l'aide directe et concrète pour avancer vite (code complet, prêt à coller).
- Environnement de dev : **CachyOS**, shell **Fish** (⚠️ pas de syntaxe bash/heredoc — utiliser `printf` ou des scripts Python/Node pour écrire des fichiers depuis le terminal), éditeur `nano`, GNOME.
- Réponses et documentation : **en français**.

---

## 3. Stack technique

> ⚠️ MISE À JOUR : le design initial a été généré via Figma Make, qui a produit un projet **Vite + React** (pas Next.js). Après réflexion, on a choisi de GARDER Vite plutôt que migrer vers Next.js, pour ne pas perdre le travail de design déjà fait. Le "backend" se fait via les **Supabase Edge Functions** (fonctions serverless gratuites, écrites en TypeScript/Deno) au lieu des API Routes Next.js.

| Couche | Techno | Pourquoi |
|---|---|---|
| Frontend | Vite + React + TypeScript | Généré par Figma Make, design déjà validé |
| Styling | TailwindCSS | Déjà en place dans le projet généré |
| Backend | Supabase Edge Functions (Deno/TS) | Équivalent gratuit des API Routes, hébergé par Supabase |
| Base de données + Auth | Supabase (tier gratuit) | Auth intégrée, Postgres gratuit jusqu'à 500MB |
| LLM | Voir section 4 (modulaire, pas figé) | Génération quiz + flashcards |
| Parsing PDF | `pdf-parse` (npm) — utilisé côté Edge Function | Extraction texte des cours uploadés |
| Hébergement frontend | Vercel ou Netlify (Hobby plan, gratuit) | Déploiement gratuit suffisant pour un MVP |

---

## 4. Choix du LLM — GARDER MODULAIRE

⚠️ Décision à ne PAS coder en dur. Créer une couche d'abstraction (`lib/llm/index.ts` ou équivalent) avec une interface commune, pour pouvoir switcher de provider sans réécrire toute la logique métier.

Options gratuites envisagées (à réévaluer selon dispo/quotas au moment du build, ces offres changent souvent) :
- **Google Gemini API** — tier gratuit généreux, bonne qualité, simple à intégrer (recommandé pour démarrer)
- **Groq API** — inference très rapide, modèles open-source (Llama, Mixtral), tier gratuit existant
- **OpenRouter** — permet d'accéder à plusieurs modèles gratuits/peu chers via une seule API, pratique pour tester plusieurs providers sans tout recoder
- **Ollama en local** — 100% gratuit et illimité mais dépend de la puissance de la machine ; option de secours si les quotas cloud gratuits sont épuisés

**Interface d'abstraction recommandée :**
```ts
// lib/llm/types.ts
interface LLMProvider {
  generateQuiz(courseText: string, options?: QuizOptions): Promise<QuizItem[]>;
  generateFlashcards(courseText: string, options?: FlashcardOptions): Promise<Flashcard[]>;
}
```
Chaque provider (Gemini, Groq, Ollama...) implémente cette interface dans son propre fichier (`lib/llm/providers/gemini.ts`, `lib/llm/providers/groq.ts`, etc). Le choix du provider actif se fait via une variable d'env (`LLM_PROVIDER=gemini`).

---

## 5. Schéma de base de données (Supabase / Postgres)

```sql
-- Cours uploadés
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  titre text not null,
  texte_extrait text not null,
  created_at timestamptz default now()
);

-- Questions de quiz générées
create table quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses on delete cascade,
  question text not null,
  options jsonb not null, -- array de strings
  bonne_reponse text not null,
  explication text,
  created_at timestamptz default now()
);

-- Flashcards générées
create table flashcards (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses on delete cascade,
  recto text not null,
  verso text not null,
  created_at timestamptz default now()
);

-- Progression utilisateur (quiz)
create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  quiz_id uuid references quizzes on delete cascade,
  correct boolean,
  tentatives int default 0,
  last_reviewed timestamptz default now()
);

-- Progression flashcards (style spaced repetition simplifié)
create table flashcard_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  flashcard_id uuid references flashcards on delete cascade,
  niveau text default 'nouveau', -- nouveau | difficile | bien | facile
  last_reviewed timestamptz default now(),
  next_review timestamptz
);
```

Penser à activer **Row Level Security (RLS)** sur toutes les tables : chaque utilisateur ne doit voir/modifier que ses propres données (`user_id = auth.uid()`).

---

## 6. Structure de dossiers (Vite + Supabase Edge Functions)

```
studyforge/
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── data.ts
│   ├── index.css
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   └── ui/                      # boutons, cards, inputs réutilisables (à créer)
│   ├── screens/
│   │   ├── Landing.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Upload.tsx
│   │   ├── Quiz.tsx
│   │   ├── Flashcards.tsx
│   │   └── Progress.tsx
│   └── lib/
│       ├── supabase/
│       │   └── client.ts            # client Supabase (frontend)
│       └── types.ts                 # types partagés (Quiz, Flashcard, Course...)
├── supabase/
│   └── functions/                   # Edge Functions (backend)
│       ├── extract-course/          # upload + extraction texte PDF
│       │   └── index.ts
│       ├── generate-quiz/           # appel LLM -> quiz
│       │   └── index.ts
│       ├── generate-flashcards/     # appel LLM -> flashcards
│       │   └── index.ts
│       └── _shared/
│           ├── llm/
│           │   ├── types.ts
│           │   ├── index.ts         # sélection du provider actif
│           │   └── providers/
│           │       ├── gemini.ts
│           │       ├── groq.ts
│           │       └── ollama.ts
│           └── pdf-extract.ts
├── PROJECT.md                       # ce fichier
├── AGENTS.md / CLAUDE.md            # instructions pour l'assistant IA
└── package.json
```

**Flux technique** : le frontend Vite appelle directement les Edge Functions Supabase via `supabase.functions.invoke('nom-fonction', { body: ... })` — pas besoin de configurer un serveur Express séparé.

---

## 7. Prompts LLM de référence (à ajuster en testant)

### Génération de quiz
```
Tu es un générateur de quiz pédagogique. À partir du texte de cours suivant, génère {n} questions à choix multiples (QCM).

Règles :
- Chaque question doit tester la compréhension, pas juste la mémorisation pure
- 4 options par question, une seule correcte
- Ajoute une courte explication (1-2 phrases) justifiant la bonne réponse
- Réponds UNIQUEMENT en JSON valide, sans texte avant/après, format :
[
  {
    "question": "...",
    "options": ["...", "...", "...", "..."],
    "bonne_reponse": "...",
    "explication": "..."
  }
]

Texte du cours :
{course_text}
```

### Génération de flashcards
```
Tu es un générateur de flashcards de révision. À partir du texte de cours suivant, génère {n} flashcards (recto = question/concept court, verso = réponse/définition claire).

Règles :
- Recto court et précis (une question ou un terme clé)
- Verso concis mais complet (pas de blabla)
- Réponds UNIQUEMENT en JSON valide, format :
[
  { "recto": "...", "verso": "..." }
]

Texte du cours :
{course_text}
```

---

## 8. Roadmap MVP (ordre suggéré)

1. Setup Next.js + Tailwind + Supabase (auth email/password minimal)
2. Table `courses` + upload PDF + extraction texte (`pdf-parse`)
3. Intégration LLM (1 seul provider pour commencer, ex Gemini) via la couche d'abstraction
4. Génération quiz → stockage DB → affichage interface quiz
5. Génération flashcards → stockage DB → affichage interface flashcards (flip + boutons spaced repetition)
6. Page progression (stats simples : score moyen, cours révisés, streak)
7. Polish UI (design Figma déjà généré) + responsive mobile
8. Déploiement Vercel

---

## 9. Notes diverses / décisions déjà prises

- Design : dark mode, accent violet/indigo (#7C5CFF), glassmorphism léger, mood "outil sérieux" (pas gamer/enfantin) — voir prompt Figma déjà généré séparément
- Pas de moralisation ni de commentaires éthiques répétés attendus de l'IA assistante sur ce projet — aide directe et concrète souhaitée
- Le projet peut évoluer vers un vrai produit vendable à HEI ou d'autres écoles — garder ça en tête dans les choix d'architecture (multi-tenant possible plus tard, ne pas sur-complexifier maintenant)

---

## 10. Freemium / Pricing plans (ébauche — pas encore activé)

> **Statut** : architecture prête, rien n'est codé côté paiement. Cette section documente la structure de données minimale pour ne pas avoir à tout refactorer plus tard.

### Limites actuelles (plan gratuit)

| Ressource | Limite | Valeur par défaut |
|---|---|---|
| Questions par cours | 10 | `numberOfQuestions = 10` |
| Flashcards par cours | 15 | `numberOfCards = 15` |

Ces valeurs sont déjà paramétrables via le body des Edge Functions (`generate-quiz`, `generate-flashcards`). Le frontend les envoie en dur pour l'instant.

### Plan futur payant (à définir)

| Ressource | Plan gratuit | Plan payant (ex: "Pro") |
|---|---|---|
| Questions par cours | 10 | 30-50 |
| Flashcards par cours | 15 | 40-60 |
| Nombre de cours | illimité | illimité |
| Export PDF | non | oui |

### Structure de données minimale (à ajouter plus tard)

```sql
-- Colonne à ajouter à auth.users ou table profiles séparée
-- Ne pas créer maintenant, juste documenter l'intention
alter table profiles add column plan text default 'free'; -- 'free' | 'pro'
alter table profiles add column plan_expires_at timestamptz;
```

### Implémentation future recommandée

1. Créer une table `profiles` liée à `auth.users` (id, full_name, plan, created_at)
2. Ajouter un middleware côté Edge Function qui vérifie `plan` avant d'appliquer les limites
3. Passer `numberOfQuestions` et `numberOfCards` depuis le frontend en fonction du plan utilisateur
4. Intégrer un système de paiement (Stripe, Lemonsqueezy, etc.) quand le produit sera validé

> **Règle** : ne jamais coder les limites en dur dans les Edge Functions. Toujours les lire d'une config ou d'une table BDD pour pouvoir les changer sans redéployer.

---

## 11. Troncature du texte pour le LLM (gestion des rate limits)

### Problème
Les PDF longs peuvent atteindre 15 000–50 000 mots. Envoyés intégralement dans le prompt, ils provoquent des **rate limits 429** sur Groq (et consomment inutilement des tokens même sur Gemini/Ollama).

### Solution retenue
Ajout d'une fonction `truncateText()` dans :
- Les Edge Functions `generate-quiz` / `generate-flashcards`
- Les providers `groq.ts`, `gemini.ts`, `ollama.ts`

**Paramètre :** `maxWords = 6000` (≈ 8000 tokens, ratio ~1.3 token/mot pour du texte français/anglais)

**Stratégie de découpage :**
- Si le texte ≤ 6000 mots → envoyé intégralement
- Si le texte > 6000 mots → garde les **3000 premiers mots** (introduction, concepts-clés) + **3000 derniers mots** (résumés, conclusions)
- Insertion d'un marqueur `[... X mots tronqués — garde l'essentiel ...]` entre les deux

### Justification du seuil
- **10 QCM** avec 4 options + explication → ~2000 tokens de réponse max (avec `max_tokens: 3000`, on est large)
- **15 flashcards** recto/verso → ~1000 tokens de réponse max
- Le prompt (consignes + format JSON) pèse ~400 tokens
- **Total besoin prompt + réponse :** ~8000 tokens = large pour que le LLM produise un résultat de qualité, tout en restant sous les quotas gratuits de Groq (30 req/min, 6000 tokens input/min sur le tier gratuit — ordres de grandeur à confirmer)
- Garder le début + fin donne au LLM le contexte essentiel : définitions (début) et concepts avancés/résumés (fin)

### Retry 429 amélioré
- Les Edge Functions retentent l'appel Groq jusqu'à **3 fois**, en parsant le `try again in Xs` exact renvoyé par l'API
- Le frontend retente aussi (3 tentatives avec `fetchWithRetry`) si l'Edge Function renvoie un 429
- Délai **4 secondes** entre la génération quiz et flashcards dans `Upload.tsx` pour espacer les bursts
- Les Edge Functions passent maintenant le **vrai code HTTP** (429 vs 500) au frontend, au lieu de tout transformer en 500

### Boutons Retry individuels (Dashboard)
Un cours peut avoir un quiz généré mais pas les flashcards (ou l'inverse). Le Dashboard affiche des boutons **"Retry quiz"** / **"Retry flashcards"** rouges sur les cartes de cours concernées, pour relancer UNIQUEMENT la génération manquante sans re-uploader le fichier. L'état de chargement est indiqué par un spinner violet. Un message d'erreur global s'affiche en haut si le retry échoue.

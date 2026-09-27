# `@ui-registry/guide` — spec v1

> Statut : spec complète, validée sur le principe le 2026-09-27. Livraison par lots (§14).
> Origine : le tour de bridge-training (`packages/ui/src/primitives/tour.tsx` + `components/tour/setup`).

Une lib pour **guider l'utilisateur dans l'UI** : des points ancrés sur des éléments, liés à un contenu
rendu par l'app, orchestrés en séquences qui peuvent traverser les pages, avec persistance.
Le package décrit la mécanique ; les usages (tour, hint, annonce) vivent dans le registry.

## Vocabulaire

| Terme | Définition |
|---|---|
| **Step** | Un point ancré : une cible dans l'UI + des défauts de placement. Donnée vanilla, partageable entre guides. |
| **Guide** | Une orchestration de steps : ordre, pages, lifecycle, mode, déclencheur, persistance. (Ce qu'on appelait « tour ».) |
| **Run** | Un guide en cours d'exécution : son step courant, son index, son statut. Au plus un run par guide. |
| **Record** | L'état persistant d'un guide pour l'utilisateur (en cours, terminé, fermé). |
| **Frame** | Le conteneur flottant global d'un run (position, chrome : compteur, navigation). Rendu par l'app. |
| **Content** | Le contenu d'un step, fourni par le composant qui porte l'ancre, injecté dans la Frame. |

## 0. Packaging

| Entrée | Contenu | Dépendances |
|---|---|---|
| `@ui-registry/guide` | `createGuideStep`, `defineGuide`, `onPage`, `createGuideManager`, `localStorageAdapter`, `memoryAdapter`, `defaultPlacement`, `spotlightPath`, types | aucune |
| `@ui-registry/guide/react` | `GuideRoot`, `useGuide`, `useGuideRun`, `useGuideAnchor`, `GuideFrame`, `useGuideSpotlight`, types `GuideContext`, `WithGuideContext`, `FrameContext` | `react` (peer, optionnel pour l'entrée vanilla) |

Registry `guide` (base-nova, fichiers possédés par l'app une fois installés) :

| Item | Type | Rôle |
|---|---|---|
| `tour-frame` | component | Frame modale shadcn : contenu, compteur, Passer / Précédent / Suivant / Terminer. Libellés en props, défauts anglais. |
| `guide-spotlight` | component | Voile `bg-black/50` + trou du spotlight, clic = fermer (si `dismissible`). |
| `hint` | component | Frame passive : pastille pulsante sur l'ancre, popover au clic, fermer. |
| `welcome-dialog` | component | Exemple d'auto-start : lit le record, propose Démarrer / Reprendre / Passer. |
| `next-router-adapter` | lib | `nextRouterAdapter({ router, pathname })`. |

Pas de SSR à gérer : toute la donnée est client. Le rendu serveur produit simplement « aucun run ».

## 1. Step

```ts
export const createGroupStep = createGuideStep({
  id: "groups.create",       // unique par manager (warning dev si deux steps différents partagent un id)
  side: "bottom",            // "top" | "bottom" | "left" | "right" — défaut "bottom"
  align: "end",              // "start" | "center" | "end" — défaut "center"
  sideOffset: 16,            // défaut : celui du manager
  spotlightPadding: 8,       // défaut : celui du manager
  target: ".group-row",      // optionnel, repli quand aucune ref n'est enregistrée :
                             // string | () => Element | Element[] | null
});
```

- Retourne un objet figé (`Object.freeze`), sans aucune notion de rendu ni de contenu.
- Un sélecteur invalide résout à « aucune cible » (warning dev), jamais une exception.

## 2. Guide

```ts
export const onboarding = defineGuide({
  id: "onboarding",
  version: 2,                     // défaut 1 ; bump → record ignoré → reproposé
  mode: "modal",                  // "modal" | "passive" — défaut "modal"
  trigger: "manual",              // "manual" | "visible" | { on: "visible", delay?, threshold? } — défaut "manual"
  when: () => user.role === "teacher", // éligibilité (déclencheur et start) — défaut toujours vrai
  dismissible: true,              // défaut : celui du manager
  onMissing: "skip",              // "skip" | "end" — défaut : celui du manager
  waitTimeout: 3000,
  hookTimeout: 10_000,
  onError: ({ error, phase }) => "end",
  steps: [
    ...onPage("/groups", [createGroupStep, viewToggleStep]),
    ...onPage("/deals/new", [
      dealerStep,
      { step: bidsStep, beforeEnter: () => editorUi.openTab("auction"), onMissing: "end" },
      { step: studentStep, when: () => flags.students },
    ]),
  ],
});
```

```ts
type GuideEntry = {
  step: GuideStep;
  route?: string | ((pathname: string) => boolean); // déclaratif, idempotent
  when?: (ctx: WhenContext) => boolean;             // évalué au start → total stable pendant le run
  beforeEnter?: Hook; afterEnter?: Hook; beforeLeave?: Hook; afterLeave?: Hook;
  onMissing?: "skip" | "end";
  waitTimeout?: number;
  hookTimeout?: number;
  dismissible?: boolean;
  side?: Side; align?: Align;                       // surcharges du step pour ce guide
};
```

- `steps` accepte `GuideStep | GuideEntry` ; un step nu est normalisé en `{ step }`.
- `onPage(route, steps)` pose `route` sur chaque entrée, en conservant hooks et surcharges existants.
- Une route `string` est comparée au pathname exact (sans query ni hash).
- Un même step ne peut apparaître qu'une fois dans un guide (erreur à `defineGuide`).

### Résolution des options

Pour toute option présente à plusieurs niveaux : **entrée > guide > manager > défaut**.

| Option | Défaut |
|---|---|
| `dismissible` | `true` |
| `onMissing` | `"skip"` |
| `waitTimeout` | `3000` ms |
| `hookTimeout` | `10000` ms |
| `onError` | retourne `"end"` |

## 3. Modes et concurrence

| | `modal` | `passive` |
|---|---|---|
| Runs simultanés | **1 seul** run modal à la fois | plusieurs |
| Voile + spotlight | oui | non |
| Scroll vers la cible | oui | non (le step attend que l'ancre soit visible) |
| Focus | pris par la Frame, restauré à la fin | jamais volé |
| Clavier (Échap, ←/→) | oui, global | Échap seulement si le focus est dans la Frame du run |
| Effet sur les autres runs | suspend les runs passifs (masqués, état conservé) | aucun |

Règles :

- `start()` d'un guide modal alors qu'un run modal existe : **refusé** (warning dev, retourne `false`),
  sauf `start(id, { replace: true })` qui termine le run courant (`end("replaced")`) puis démarre.
- Un déclenchement automatique (`trigger: "visible"`) d'un guide modal alors qu'un run modal existe :
  **mis en file** et relancé quand le run modal se termine, si toujours éligible.
- Pendant qu'un run modal est actif, les runs passifs sont `suspended` : leurs Frames ne se rendent pas,
  leurs transitions en attente continuent. Ils reprennent à la fin du run modal.
- Un run par guide : `start()` d'un guide déjà en cours est ignoré (retourne `false`).

## 4. Déclencheurs

- **`"manual"`** : seul `manager.start(id)` démarre le guide.
- **`"visible"`** : le manager observe (IntersectionObserver) les ancres du step de départ
  (premier step, ou step du record si `in-progress`). Quand l'une devient visible
  (`threshold` défaut 0.5, pendant `delay` défaut 0) **et** que le guide est éligible, il démarre seul.
  - Éligible = `when()` vrai **et** record absent, d'une version antérieure, ou `in-progress` (reprise).
  - Un guide `completed` ou `dismissed` (version courante) ne se redéclenche jamais seul.
- Un guide `manual` ne reprend jamais seul après un reload : le record `in-progress` est exposé et
  l'app (ex. `welcome-dialog`) propose la reprise.

## 5. Manager

```ts
export const guides = createGuideManager({
  guides: [onboarding, dealEditorTour, exportHint],
  storage: localStorageAdapter(),      // défaut ; memoryAdapter() pour tests
  placement: defaultPlacement,         // stratégie remplaçable (§10)
  collisionContainer: () => null,      // défaut : viewport
  viewportMargin: 20,
  sideOffset: 16,
  spotlightPadding: 8,
  scroll: { behavior: "auto", block: "center", lock: false }, // "auto" respecte prefers-reduced-motion
  keyboard: true,
  dismissible: true,
  onMissing: "skip",
  waitTimeout: 3000,
  hookTimeout: 10_000,
  onError: undefined,                  // défaut effectif : "end"
  onEvent: (event) => analytics.track(event.type, event),
});
```

| Méthode | Rôle |
|---|---|
| `getState()` / `subscribe(fn)` | état « lent » : runs, records (§6) |
| `getLayout(guideId)` / `subscribeLayout(guideId, fn)` | état « rapide » : rects des cibles du run. Canal séparé. |
| `start(guideId, { from?, replace? })` → `boolean` | `from` : `"resume"` (défaut si record `in-progress`), `"start"`, ou un `stepId` |
| `next(guideId)` / `prev(guideId)` / `goTo(guideId, stepId)` | navigation dans un run |
| `end(guideId, reason = "dismissed")` | `"completed"` \| `"dismissed"` ; refusé si non `dismissible` et `reason === "dismissed"` |
| `resetRecord(guideId)` | oublie le record |
| `setRouter(router)` / `notifyPathname(pathname)` | branché par `GuideRoot` ; à la main en vanilla |
| `registerAnchor(stepId, element)` → cleanup | bas niveau (utilisé par `/react`) |
| `registerContent(stepId, entry)` → cleanup | bas niveau (utilisé par `/react`) |
| `registerLifecycle(stepId, hooks)` → cleanup | lifecycle local (utilisé par `/react`) |
| `destroy()` | termine les runs (nettoyage §8), retire listeners et observers |

En vanilla (e2e, console), exposer le manager suffit : `window.__guides = guides`.

## 6. État

```ts
type GuideState = {
  runs: GuideRun[];                                 // ordre de démarrage
  records: Record<string, GuideRecord | null>;
  hydrated: boolean;                                // records lus depuis le storage
};

type GuideRun = {
  guide: Guide;
  status: "transitioning" | "active" | "suspended";
  step: GuideStep | null;                           // null pendant la première transition
  entry: GuideEntry | null;
  entries: GuideEntry[];                            // entrées retenues au start (après `when`)
  index: number;                                    // dans `entries`
  total: number;
  dismissible: boolean;                             // résolu pour l'entrée courante
};
```

## 7. Transition

Cas général `current → target` d'un run (`start`, `next`, `prev`, `goTo`). Par run, **la dernière
demande gagne** : une nouvelle demande annule la transition en cours (son `signal` est aborté).

1. `status = "transitioning"`. La Frame se masque ; en modal, le voile reste.
2. S'il y a un step courant : `beforeLeave` entrée, puis `beforeLeave` local.
3. **Route** : si `entry.route` ne correspond pas au pathname → `navigate(route)`, attente du pathname
   (`waitTimeout`). Pas de router configuré → erreur `phase: "route"`.
4. `beforeEnter` entrée.
5. **Attente** : au moins une cible de taille non nulle (ancre enregistrée ou `target`) **et**, si le step
   est lié à un contenu via `/react`, contenu enregistré. Borné par `waitTimeout`. En passif, la cible doit
   aussi être visible dans le viewport (pas de scroll forcé). Délai dépassé → `onMissing` :
   - `"skip"` : même direction ; plus de step → `end("completed")` en avant, retour au step courant en
     arrière (ou `end("missing")` s'il n'y en a pas).
   - `"end"` : `end("missing")`.
6. `beforeEnter` local (enregistré par le composant, donc disponible seulement maintenant).
7. **Scroll** (modal) : cible amenée dans la vue ; attente de `scrollend` capturé sur `document`
   (conteneurs imbriqués compris), repli 500 ms.
8. **Commit** : `status = "active"`, record `{ status: "in-progress", stepId }`, événement `step`.
9. `afterLeave` du step quitté (local, puis entrée), puis `afterEnter` (entrée, puis local).

Chaque hook est borné par `hookTimeout` ; dépassement = erreur `phase: "timeout"`.

```ts
type Hook = (ctx: HookContext) => void | Promise<void>;

type HookContext = {
  guide: Guide;
  from: GuideStep | null;
  to: GuideStep;
  direction: "forward" | "backward" | "jump";
  signal: AbortSignal;                       // aborté par end(), une nouvelle transition, ou le timeout
  navigate: (path: string) => Promise<void>; // résout quand le pathname correspond
  pathname: string;
  waitFor: (target: GuideStep | string, timeout?: number) => Promise<boolean>;
  manager: GuideManager;
};
```

## 8. Fin d'un run et nettoyage

`end(reason)` — raisons : `"completed" | "dismissed" | "missing" | "error" | "replaced" | "destroyed"`.

1. La transition en cours est abortée.
2. **Nettoyage** : `beforeLeave` puis `afterLeave` du step actif (local, puis entrée). Leurs erreurs sont
   **avalées** et signalées (événement `error`, `phase: "cleanup"`), sans rappeler `onError`.
3. Record :

   | Raison | Record |
   |---|---|
   | `completed` | `{ status: "completed" }` |
   | `dismissed` | `{ status: "dismissed", stepId }` |
   | `missing`, `error` | reste `in-progress` au dernier step valide, `lastError: { phase, at }` |
   | `replaced`, `destroyed` | inchangé (`in-progress`) |

4. **Libération garantie** (`finally`) : voile, verrou de scroll, listeners clavier, observers, focus
   restauré (modal). Les runs passifs suspendus reprennent ; la file des déclenchements modaux avance.

## 9. Erreurs

```ts
type OnError = (ctx: {
  error: unknown;
  phase: "beforeLeave" | "beforeEnter" | "afterEnter" | "afterLeave" | "route" | "storage" | "timeout";
  guide: Guide; step: GuideStep | null; entry: GuideEntry | null;
  direction: Direction; attempt: number; manager: GuideManager;
}) => ErrorAction | Promise<ErrorAction>;

type ErrorAction = "end" | "skip" | "retry" | "stay";
```

| Action | Effet |
|---|---|
| `"end"` (défaut) | `end("error")`, **même si** `dismissible: false` |
| `"skip"` | step suivant dans la même direction |
| `"retry"` | rejoue la transition une fois ; second échec → `"end"` |
| `"stay"` | reste sur le step courant ; refusé (→ `"end"`) sans step courant ou si non `dismissible` |

- `onError` résolu guide > manager.
- `onError` qui lève ou dépasse `hookTimeout` → `end("error")` forcé, les deux erreurs remontées.
- Les erreurs de `storage` n'interrompent pas le run : rollback de l'écriture optimiste + événement.
  `onError` n'est appelé que pour les erreurs de transition et de route.

## 10. DOM, placement, spotlight

**Cibles** — ancres enregistrées pour le step (`Set<Element>`, plusieurs éléments), sinon `target`.
Les rects de taille nulle sont filtrés (variantes mobile/desktop masquées).

**Attente** — `MutationObserver` `childList` sur `document` + événements d'enregistrement d'ancre.

**Suivi** (run actif) — `ResizeObserver` sur les cibles, `scroll` capturé, `resize`, `visualViewport`,
coalescés par `requestAnimationFrame`. Pas d'observation d'attributs sur tout le body.
Ancre démontée pendant un step actif → Frame masquée, retour à l'étape 5 de la transition.

**Scroll** (modal) — pas de verrou par défaut, le spotlight suit. `scroll.lock: true` pose
`overflow: hidden` + `scrollbar-gutter: stable` sur le scroller, restaure la valeur inline d'origine.

**Clics** — le voile bloque tout sauf le trou du spotlight ; la cible reste cliquable.

**Placement** — stratégie remplaçable (ex. adapter floating-ui plus tard) :

```ts
type PlacementStrategy = (input: {
  targets: Rect[]; floating: Size; side: Side; align: Align;
  sideOffset: number; margin: number; view: Rect; obstacles: Rect[];
}) => { x: number; y: number; side: Side; align: Align };
```

`defaultPlacement` reprend l'algo de bridge-training : ancre = plus grand rect ; ordre de repli
demandé → opposé → perpendiculaires ; évitement des obstacles (spotlights paddés, en modal) ; clamp dans
la vue. Il retourne le côté **effectif** (bridge-training exposait le côté demandé).

**Spotlight** — `spotlightPath(rects, padding, viewport)` : `clip-path: path(evenodd, …)`, fusion des
rects qui se chevauchent (y compris en chaîne), clamp au viewport. Aucun rect → voile plein.

## 11. Records et storage

```ts
type GuideRecord = {
  status: "in-progress" | "completed" | "dismissed";
  version: number;
  stepId?: string;
  lastError?: { phase: string; at: number };
  updatedAt: number;
};

type GuideStorage = {
  get(guideId: string): Promise<GuideRecord | null>;
  set(guideId: string, record: GuideRecord): Promise<void>;
  remove(guideId: string): Promise<void>;
  subscribe?(notify: () => void): () => void;   // cross-tab / serveur → relecture
};
```

- Hydratation de tous les guides à la création du manager (`hydrated` passe à `true`).
- `record.version < guide.version` → traité comme `null` (pas supprimé tant qu'il n'est pas réécrit).
- Écritures optimistes dans `state.records`, rollback + événement `error` (`phase: "storage"`) en cas d'échec.
- `localStorageAdapter({ prefix = "guide:" })` : JSON, valeur invalide → `null`, exceptions (quota,
  mode privé) avalées → comportement « mémoire », événement `storage` pour le cross-tab.
- `memoryAdapter(initial?)` : tests, environnements sans `window`.

## 12. Événements

```ts
type GuideEvent =
  | { type: "start"; guideId; stepId; resumed: boolean; trigger: "manual" | "visible" }
  | { type: "step"; guideId; stepId; index; from: string | null; direction }
  | { type: "missing"; guideId; stepId; action: "skip" | "end" }
  | { type: "suspend" | "resume"; guideId }
  | { type: "end"; guideId; stepId: string | null; reason: EndReason }
  | { type: "error"; guideId; stepId: string | null; phase; error: unknown; action?: ErrorAction };
```

## 13. `/react`

```tsx
<GuideRoot
  manager={guides}
  router={nextRouterAdapter({ router: useRouter(), pathname: usePathname() })} // optionnel
>
  {children}
  <GuideSpotlight />                                   {/* registry */}
  <TourFrame />                                        {/* registry — runs modaux */}
  <Hint />                                             {/* registry — runs passifs */}
</GuideRoot>
```

| Export | Signature |
|---|---|
| `GuideRoot` | `{ manager, router?, children }` — pousse `router` et `pathname` dans le manager |
| `useGuide(selector?)` | `{ state, start, next, prev, goTo, end, resetRecord }` via `useSyncExternalStore` |
| `useGuideRun(guideId)` | le run d'un guide ou `null` |
| `useGuideAnchor(step, options?)` | `{ ref, portal }` |
| `GuideFrame` | headless ; rend `children(frame)` pour chaque run sélectionné |
| `useGuideSpotlight()` | `{ active, clipPath, rects }` du run modal |

### `useGuideAnchor`

```tsx
// 95 % des cas : composant, rendu par la lib, reçoit `ctx`
const { ref } = useGuideAnchor(createGroupStep, { content: CreateGroupContent });

// props en plus : fonction de rendu, appelée par la lib
const { ref } = useGuideAnchor(createGroupStep, {
  render: (ctx) => <CreateGroupContent ctx={ctx} count={count} />,
});

// besoin d'un provider de l'arbre du composant : rendu local + portal dans la Frame
const { ref, portal } = useGuideAnchor(formStep, { portal: true, content: FormHint });
return (<><Field ref={ref} />{portal}</>);
```

```ts
type UseGuideAnchorOptions =
  ( { content: ComponentType<WithGuideContext>; render?: never }
  | { render: (ctx: GuideContext) => ReactNode; content?: never } )
  & {
    portal?: boolean;          // défaut false
    lifecycle?: StepLifecycle; // hooks locaux (§7 étapes 2, 6, 9)
    enabled?: boolean;         // défaut true ; false = ni ancre, ni contenu, ni lifecycle
  };
```

- `ref` : ref callback avec cleanup (React 19), posable sur plusieurs éléments.
- `content` est **rendu** (`<Content ctx={ctx} />`) : hooks et state propres, identité stable attendue.
- `render` est **appelé** (`render(ctx)`) : voit la closure, pas de remount, pas de hook directement dedans.
  En mode frame, la dernière version est conservée et la Frame notifiée quand le composant re-rend
  (uniquement quand le step est actif).
- `portal: true` : le contenu est rendu dans l'arbre du composant puis portalé dans l'outlet de la Frame ;
  `portal` vaut `null` hors step actif. Il sert uniquement à hériter de providers locaux.
- Sans `content` ni `render` : l'ancre seule est enregistrée (la Frame reçoit un outlet vide ; warning dev
  si le step devient actif sans contenu).

### Types de contenu

```ts
type GuideContext = {
  guide: Guide; step: GuideStep; mode: "modal" | "passive";
  index: number; total: number; isFirst: boolean; isLast: boolean;
  dismissible: boolean;
  next(): void; prev(): void; end(reason?: "completed" | "dismissed"): void;
  ids: { title: string; description: string };   // pour aria-labelledby / describedby
};

type WithGuideContext<P = {}> = P & { ctx: GuideContext };
```

### `GuideFrame`

```tsx
<GuideFrame select={(run) => run.guide.mode === "modal"} container={document.body}>
  {(frame) => (
    <Card {...frame.floatingProps}>
      <frame.Content />
      <footer>{frame.index + 1}/{frame.total}</footer>
    </Card>
  )}
</GuideFrame>
```

```ts
type FrameContext = GuideContext & {
  run: GuideRun;
  Content: ComponentType;          // outlet du contenu du step actif
  placed: boolean;                 // false pendant la première mesure
  floatingProps: {
    ref: RefCallback<HTMLElement>;
    style: CSSProperties;          // position fixed, top/left, visibility tant que !placed
    role: "dialog";
    "aria-modal": boolean;         // true en modal
    "aria-labelledby": string; "aria-describedby": string;
    "data-side": Side; "data-align": Align; "data-mode": "modal" | "passive";
    tabIndex: -1;
  };
};
```

- `select` : défaut « tous les runs actifs non suspendus » ; une Frame par run sélectionné.
- Focus (modal) : la Frame prend le focus à chaque step actif ; restauré à la fin du run.

### Avertissements (dev uniquement)

- `content` qui change d'identité pendant que le step est actif → « utilise `render` ».
- `portal: true` dont le nœud n'est jamais monté alors que le step est actif.
- Deux steps distincts avec le même `id`.
- Step actif sans ancre ni contenu à l'expiration de `waitTimeout`.
- `route` déclarée sans router configuré.
- `end("dismissed")` refusé car non `dismissible`.
- `start()` refusé (run modal déjà actif, guide déjà en cours, non éligible).

## 14. Registry

- **`tour-frame`** : `GuideFrame` sélectionnant les runs modaux ; `Card` + `Button` shadcn ; masque
  « Passer » si `!ctx.dismissible` ; « Terminer » au dernier step ; animations CSS via `data-side`
  (pas de `motion`). Props : `labels`, `className`, `stepLabel`.
- **`guide-spotlight`** : `useGuideSpotlight()` ; clic → `end("dismissed")` si `dismissible` (prop
  `closeOnClick`, défaut true).
- **`hint`** : `GuideFrame` sélectionnant les runs passifs ; pastille pulsante positionnée sur la
  cible, popover au clic, bouton fermer (`end("dismissed")`).
- **`welcome-dialog`** : `AlertDialog` shadcn ; ouvert quand `hydrated` et record absent (ou
  `in-progress` → variante « Reprendre ») ; `start` / `end("dismissed")`.
- **`next-router-adapter`** :

  ```ts
  export const nextRouterAdapter = ({ router, pathname }: {
    router: AppRouterInstance; pathname: string;
  }): GuideRouter => ({ navigate: (path) => router.push(path), pathname });
  ```

## 15. Tests

Seuils vitest (coverage v8) : **100 % lignes et branches** sur l'entrée vanilla, **90 %** sur `/react`.
Environnements : `node` pour la logique pure, `jsdom` pour le DOM et React. Fakes explicites pour
`ResizeObserver`, `IntersectionObserver`, `scrollend`, `getBoundingClientRect` (pas de polyfill global).

Vanilla :

| Suite | Couvre |
|---|---|
| `step` | défauts, gel, `target` (string, fonction, tableau, null, sélecteur invalide) |
| `guide` | `defineGuide`, normalisation, `onPage` (conserve hooks/surcharges, route fonction), doublons |
| `options` | résolution entrée > guide > manager > défaut pour chaque option |
| `manager.state` | start/next/prev/goTo/end, index/total, bornes, id inconnu, `when` au start, destroy |
| `manager.lifecycle` | ordre exact des hooks (entrée/local), direction, from/to |
| `manager.concurrency` | dernière demande gagne, abort du `signal`, hooks lents |
| `manager.modes` | exclusivité modale, `replace`, file des déclenchements, suspension/reprise des passifs, un run par guide |
| `manager.trigger` | `visible` (threshold, delay, éligibilité, reprise, completed/dismissed jamais), `manual` jamais auto |
| `manager.route` | idempotence, attente pathname, timeout, sans router, route fonction |
| `manager.missing` | attente puis résolution tardive, skip avant/arrière/bornes, end, ancre démontée en cours |
| `manager.dismissible` | niveaux, Échap/voile ignorés, `end("dismissed")` refusé, `completed` possible |
| `manager.errors` | chaque phase × chaque action, priorité guide > manager, stay refusé, retry puis échec, timeout hook, onError qui échoue, nettoyage qui avale, libération complète |
| `manager.keyboard` | Échap, ←/→, `keyboard: false`, passif (focus dans la Frame uniquement), idle |
| `manager.records` | hydratation, resume, version, optimiste + rollback, resetRecord, subscribe |
| `manager.events` | chaque événement et son payload |
| `storage` | localStorage (préfixe, JSON invalide, exceptions, cross-tab), memory |
| `dom` | ancres multiples, rects nuls, scroll (reduced motion, scrollend capturé, repli), lock, suivi, nettoyage des listeners |
| `placement` | côtés, alignements, repli, obstacles, clamp, container, côté effectif |
| `spotlight` | evenodd, fusion en chaîne, clamp, aucun rect |

React : `GuideRoot` (router, pathname), `useGuide` (sélecteur), `useGuideRun`, `useGuideAnchor`
(content / render / portal, ref multiple, enabled, lifecycle local), exclusivité content/render
(tests de types), `GuideFrame` (select, outlet, placed, focus), `useGuideSpotlight`, avertissements.

## 16. Lots de livraison

| Lot | Contenu | Livrable |
|---|---|---|
| **1 — Core** | step, guide, `onPage`, options, manager (état multi-run, modes, transitions, lifecycle, route, missing, dismissible, erreurs, records, storage, événements, clavier) — sans DOM réel | package vanilla testé à 100 % |
| **2 — DOM** | résolution et attente des cibles, suivi, scroll, lock, déclencheur `visible`, `defaultPlacement`, `spotlightPath` | vanilla complet |
| **3 — React** | `/react` complet | bindings testés |
| **4 — Tour** | registry `tour-frame`, `guide-spotlight`, `welcome-dialog`, `next-router-adapter` ; page de docs ; catalogue ; changeset | **première publication** |
| **5 — Hint** | registry `hint` ; section docs | usage passif |
| Plus tard | adapter floating-ui, adapter React Router, helpers Playwright (`/testing`), spotlight arrondi, item `announcement` | — |

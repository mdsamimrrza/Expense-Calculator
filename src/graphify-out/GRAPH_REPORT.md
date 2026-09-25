# Graph Report - src  (2026-09-25)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 663 nodes · 1932 edges · 30 communities (25 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9b02c072`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- cn
- constants.ts
- bs.ts
- app/layout.tsx
- actions/auth.ts
- useToast
- sources.ts
- handoff-core.ts
- actions/fund-config.ts
- auth
- dashboard.ts
- profile-image-manager.tsx
- auth.ts
- tax.ts
- settings/page.tsx
- entries.ts
- tax-breakdown-view.tsx
- history/page.tsx
- lib/types.ts
- getDashboardData
- latest-nav-input.tsx
- schemas/auth.ts
- notifications/page.tsx
- FundConfig
- GET
- { GET, POST }
- { handlers, signIn, signOut }

## God Nodes (most connected - your core abstractions)
1. `cn()` - 91 edges
2. `auth` - 42 edges
3. `useToast()` - 33 edges
4. `formatCurrencyWhole()` - 30 edges
5. `createClient()` - 29 edges
6. `FundConfigForm()` - 23 edges
7. `FundConfig` - 22 edges
8. `Button` - 22 edges
9. `Card` - 21 edges
10. `CardContent` - 21 edges

## Surprising Connections (you probably didn't know these)
- `StatusPill()` --calls--> `cn()`  [EXTRACTED]
  components/settings/notification-settings.tsx → lib/utils.ts
- `ToastAction` --calls--> `cn()`  [EXTRACTED]
  components/ui/toast.tsx → lib/utils.ts
- `StatPill()` --calls--> `formatCurrencyWhole()`  [EXTRACTED]
  components/layout/daily-installments-popup.tsx → lib/format.ts
- `SettingsNotificationsPage()` --calls--> `auth`  [EXTRACTED]
  app/(app)/settings/notifications/page.tsx → auth.ts
- `LandingPage()` --calls--> `auth`  [EXTRACTED]
  app/page.tsx → auth.ts

## Import Cycles
- None detected.

## Communities (30 total, 5 thin omitted)

### Community 0 - "cn"
Cohesion: 0.07
Nodes (64): metadata, formatFundShortName(), FUND_NAME_ALIASES, ParsedRow, BottomTabBar(), tabItems, UserAvatarMenuProps, OnboardingWizard() (+56 more)

### Community 1 - "constants.ts"
Cohesion: 0.08
Nodes (53): DashboardPageProps, metadata, Step, GoogleButton(), GoogleButtonProps, FeeDragArea(), CustomPieTooltip(), InvestedVsGainPie() (+45 more)

### Community 2 - "bs.ts"
Cohesion: 0.06
Nodes (58): GET(), handleCronReminders(), POST(), DailyInstallmentsPopup(), handleClose(), loadItems(), getLastShown(), groupInstallments() (+50 more)

### Community 3 - "app/layout.tsx"
Cohesion: 0.07
Nodes (24): metadata, metadata, inter, metadata, metadata, ANDROID_FEATURES, LandingPage(), Header() (+16 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.10
Nodes (36): PATCH(), POST(), PUT(), nextAuthClient(), POST(), PUT(), ForgotPasswordPage(), handleEmailSubmit() (+28 more)

### Community 5 - "useToast"
Cohesion: 0.09
Nodes (31): AuthNotifier(), LoginPage(), NotificationSettings(), handleSavePreferences(), handleTogglePush(), NotificationSettingsProps, StatusPill(), Toast (+23 more)

### Community 6 - "sources.ts"
Cohesion: 0.09
Nodes (25): chunk(), FundRow, GET(), handleCronFetchNav(), POST(), fetchTable(), MONTHS, nimbaceAdapter (+17 more)

### Community 7 - "handoff-core.ts"
Cohesion: 0.13
Nodes (22): DELETE(), GET(), nextAuthClient(), publicClient(), POST(), authenticateMobileRequest(), consumeHandoffToken(), ExchangeResult (+14 more)

### Community 8 - "actions/fund-config.ts"
Cohesion: 0.14
Nodes (16): FundConfigForm(), handleDelete(), handleNext(), handleSaveClick(), submitAll(), validateStep(), createFundConfig(), deleteFundConfig() (+8 more)

### Community 9 - "auth"
Cohesion: 0.21
Nodes (16): GET(), POST(), DELETE(), isValidPushEndpoint(), POST(), PUSH_SERVICE_HOSTS, AppLayout(), auth (+8 more)

### Community 10 - "dashboard.ts"
Cohesion: 0.16
Nodes (17): FeeDragAreaProps, MonthlyContributionsBarProps, NavHistoryChartProps, PortfolioChartProps, SummaryCardsProps, TaxBreakdownViewProps, DashboardData, calculateFeeDrag() (+9 more)

### Community 11 - "profile-image-manager.tsx"
Cohesion: 0.25
Nodes (16): SettingsPage(), metadata, SettingsProfilePage(), ProfileImageManager(), handleFileChange(), handleRemove(), refreshSession(), ProfileImageManagerProps (+8 more)

### Community 12 - "auth.ts"
Cohesion: 0.14
Nodes (11): authConfig, getNextAuthClient, getPublicClient, next-auth, nextAuth, providers, Session, { auth } (+3 more)

### Community 13 - "tax.ts"
Cohesion: 0.14
Nodes (11): CGT_UNRESOLVED_MESSAGE, CgtRateInfo, EXIT_LOAD_SCHEDULES, ExitLoadTier, getCapitalGainsStatus(), getExitLoadSchedule(), getTaxStatusSummary(), TaxRule (+3 more)

### Community 14 - "settings/page.tsx"
Cohesion: 0.26
Nodes (11): metadata, MobileProfileHero(), MobileSettingsGroup(), MobileSettingsRow(), MobileSettingsRowProps, Avatar(), AvatarProps, SETTINGS_SECTIONS (+3 more)

### Community 15 - "entries.ts"
Cohesion: 0.19
Nodes (10): CsvImportDialog(), handleImport(), GetEntriesParams, importEntriesFromCsv(), MAX_NOTES_LENGTH, CsvRowData, csvRowSchema, EntryFormData (+2 more)

### Community 16 - "tax-breakdown-view.tsx"
Cohesion: 0.22
Nodes (11): HistoryFundSelector(), formatExitLoadSummary(), TaxBreakdownView(), TabsContent, TabsList, TabsTrigger, formatUnits(), CGT_NP_REDEMPTION (+3 more)

### Community 17 - "history/page.tsx"
Cohesion: 0.26
Nodes (9): HistoryPage(), HistoryPageProps, metadata, metadata, SettingsDangerPage(), metadata, SettingsFundsPage(), getEntries() (+1 more)

### Community 18 - "lib/types.ts"
Cohesion: 0.18
Nodes (10): buildCashFlows(), ActionResult, CashFlow, CsvRow, EntryBreakdown, EntryFormData, FundConfigFormData, FundPreset (+2 more)

### Community 19 - "getDashboardData"
Cohesion: 0.22
Nodes (8): DashboardPage(), ProjectionsPage(), loadData(), metadata, TaxBreakdownPage(), TaxBreakdownPageProps, getDashboardData(), calculateXirr()

### Community 20 - "latest-nav-input.tsx"
Cohesion: 0.29
Nodes (9): LatestNavInput(), handleSave(), LatestNavInputProps, EntryTable(), handleDeleteConfirm(), deleteEntry(), updateLatestNav(), formatCurrency() (+1 more)

### Community 21 - "schemas/auth.ts"
Cohesion: 0.20
Nodes (9): MIN_PASSWORD_LENGTH, ForgotPasswordFormData, forgotPasswordSchema, LoginFormData, loginSchema, ResetPasswordFormData, resetPasswordSchema, SignupFormData (+1 more)

### Community 22 - "notifications/page.tsx"
Cohesion: 0.22
Nodes (5): metadata, metadata, SettingsNotificationsPage(), AppDownloadCard(), MobileDetailHeader()

### Community 23 - "FundConfig"
Cohesion: 0.33
Nodes (7): CsvImportDialogProps, EntryFormProps, EntryTableProps, HistoryFundSelectorProps, FundConfigFormProps, Entry, FundConfig

### Community 24 - "GET"
Cohesion: 0.73
Nodes (5): errorPage(), GET(), isNonce(), POST(), webOrigin()

## Knowledge Gaps
- **118 isolated node(s):** `ParsedRow`, `UserAvatarMenuProps`, `DeleteAccountDialogProps`, `Props`, `ButtonProps` (+113 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 163 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `constants.ts`, `bs.ts`, `app/layout.tsx`, `useToast`, `auth`, `profile-image-manager.tsx`, `settings/page.tsx`, `tax-breakdown-view.tsx`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `auth` connect `auth` to `bs.ts`, `app/layout.tsx`, `actions/auth.ts`, `handoff-core.ts`, `actions/fund-config.ts`, `dashboard.ts`, `profile-image-manager.tsx`, `auth.ts`, `settings/page.tsx`, `entries.ts`, `history/page.tsx`, `getDashboardData`, `latest-nav-input.tsx`, `notifications/page.tsx`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Why does `useToast()` connect `useToast` to `cn`, `constants.ts`, `app/layout.tsx`, `actions/auth.ts`, `actions/fund-config.ts`, `auth`, `profile-image-manager.tsx`, `entries.ts`, `latest-nav-input.tsx`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `ParsedRow`, `UserAvatarMenuProps`, `DeleteAccountDialogProps` to the rest of the system?**
  _118 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.06715506715506715 - nodes in this community are weakly interconnected._
- **Should `constants.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08485540334855403 - nodes in this community are weakly interconnected._
- **Should `bs.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06308610400682012 - nodes in this community are weakly interconnected._
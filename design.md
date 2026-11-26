# GreenCloud AI — UI & Overview Dashboard Design Specification (`design.md`)

> Living reference capturing every design token, layout rule, Material 3 Expressive pattern, telemetry chart standard, and iterative correction made for the GreenCloud AI landing page and overview shell. Follow this document for all future UI updates and sub-page alignments.

---

## 1. Core Design Principles & Guardrails

1. **Tonal Hierarchy Over Harsh Borders**:
   - Separate surfaces with warm pastel elevation tiers (`#FFFDF4`, `#FAF6E8`, `#FBF6E3`, `#F5EED6`, `#FFFFFF`) and soft warm shadows (`shadow-warm-*`) instead of grey 1px border grids.
2. **Purposeful Color Psychology (No Random Colors)**:
   - **Sun Yellow (`#FFF76A` / `#FFF3A8`)**: Primary call-to-action buttons, active toggles, and **Potential Savings**.
   - **Warm Oat (`#F3EEDB` / `#FAF6E8`)**: Secondary buttons, resting toggles, inactive neutral containers.
   - **Honey Amber (`#FBE7CB` / `#9A6B00`)**: **Cloud Spend**, compute & database utilization cost metrics.
   - **Sage Mint (`#E2F5EF` / `#D7F0E4` / `#1F8A70`)**: **Carbon Footprint**, sustainability gains, optimization forecasts.
   - Keep button colors semantic; never scatter unrelated pastel tints across controls.
3. **Restrained, Purposeful Motion**:
   - Connected buttons **must not** morph border-radius on hover (`only` on selection state change `[data-selected="true"]` → full capsule, preventing corner flicker/negative-radius overshoot glitches).
   - Keep `font-weight: 600` constant between selected and unselected segmented buttons so toggling `7D / 30D / 90D` or `All / Compute / Database / Storage` never causes horizontal layout jitter.
   - Tap feedback is subtle (`active:scale-[0.99]`); respect `prefers-reduced-motion: reduce` globally.
4. **No Clutter Badges or Eyebrow Spam**:
   - Do **not** wrap simple statuses (`Available now`, `In roadmap`) or headings in bordered uppercase pill tags (`DEMO DATA`, `SYSTEM ARCHITECTURE`). Keep status labels clean colored typography.
5. **Natural, Direct Product Copy**:
   - **Zero em dashes (`—`)** or AI-style marketing filler (`"Turn raw... into..."`, `"one read-only control plane"`).
   - **Never add demo/disclaimer footers** such as `"Demo dataset active · Zero cloud credentials required"`, `"Public Reading Showcase"`, or `"Illustrative demo metrics"` anywhere on pages or CTAs.
   - Keep text plain, scannable, user-facing (never paste internal spec/schema notes onto public pages), and tied directly to actual AWS/CloudWatch/Terraform capabilities.
   - Use 1-sentence descriptions on overview step cards so cards remain compact.
6. **Meaningful Icons & Real Provider Assets**:
   - Match every icon to the actual domain action (`rocket_launch` for Start setup, `link` for Connect AWS, `play_circle` for Live demo, `trending_down` for optimization actions, `dns` for EC2 compute servers, `database` for RDS, `hard_drive` for EBS disks, `folder_zip` for S3 archive tiering). Never use `bolt` (lightning bolt) on AWS connect buttons or compute cards.
   - Never use generic wireframe stroke icons (`<Cloud />`) for cloud vendors—use real multi-color SVG brand assets from `public/icons/`.

---

## 2. Typography & Iconography

- **Primary Font**: `"Google Sans Flex"` with `font-variation-settings: "ROND" 100` loaded in [layout.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/app/layout.tsx) and applied to `body` in [globals.css](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/styles/globals.css).
- **Fallbacks & Monospace**: `Inter` (`--font-inter`), system sans-serif; `IBM Plex Mono` (`--font-mono`, `.code-font` with `font-variation-settings: normal`) strictly for Terraform code snippets and technical IDs.
- **Numeric Stability**: Always apply `.tabular-nums` (`font-variant-numeric: tabular-nums`) on KPI figures, chart headers, Y-axis ticks, tooltips, and savings totals.
- **Icons**:
  - `Material Symbols Outlined` (`opsz 20`, `.icon-filled` with `'FILL' 1, 'wght' 500`) for semantic UI icons.
  - `lucide-react` (`ArrowRight`, `X`, `Copy`, `Check`) for navigation arrows and modal controls.
  - Real SVG logos under `public/icons/`:
    - [aws.svg](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/public/icons/aws.svg): White `"aws"` wordmark (`#FFFFFF`) + `#FF9900` arrow (for dark `#181711` tape and `#232F3E` squid-ink containers).
    - [aws-dark.svg](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/public/icons/aws-dark.svg): Dark slate `"aws"` wordmark (`#252f3e`) + `#FF9900` arrow (for light pastel `#FFF3A8` M3 shapes).
    - [gcp.svg](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/public/icons/gcp.svg): Official 4-color Google Cloud mark.
    - [azure.svg](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/public/icons/azure.svg): Official Microsoft Azure gradient ribbon.

---

## 3. Color Tokens & Provider Themes

Defined in [tailwind.config.js](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/tailwind.config.js) and [globals.css](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/styles/globals.css):

| Token / Surface | Hex Value | Usage |
|---|---|---|
| `warm-bg` / `warm-surface` | `#FFFDF4` | Page background canvas, inner chart plot canvas, modal card |
| `warm-container-low` | `#FAF6E8` | Right telemetry console wrapper, outer section cards (`Optimization`, `WhyGreenOps`), footer |
| `warm-container` | `#FBF6E3` | Decision step cards, Persona cards, Documentation cards, metric trays |
| `warm-container-high` | `#F5EED6` | Sticky NavigationBar pill shell (`bg-[#F5EED6]`) |
| `ink` | `#2E2B1A` | Primary headings, active indicators, terminal dark code block background |
| `ink-muted` | `#686450` | Body copy, subtitles, secondary labels |
| `ink-subtle` | `#8D8975` | Axis ticks, muted chart annotations |
| `sunshine` / hover | `#FFF76A` / `#F5EC50` | Primary `.m3-pastel-sun` action buttons, selected toggle capsules |
| Savings KPI / EC2 shape | `#FFF3A8` / `#FFE985` | Potential savings KPI card, Step `01` M3 shape |
| Spend KPI / RDS tray | `#FBE7CB` / `#F7DAB3` | Cloud spend KPI card, RDS optimization theme |
| Carbon KPI / Storage | `#D7F0E4` / `#E2F5EF` | Carbon footprint KPI card, `.m3-pastel-mint`, Storage optimization theme |
| Chart Spend / Carbon strokes | `#9A6B00` / `#1F8A70` | Dual-axis spend and carbon series strokes |

### Dynamic Cloud Provider Themes ([IntegrationMatrix.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/IntegrationMatrix.tsx))

- **Amazon Web Services**: Active card `bg-[#FFF4D1]`, resting `bg-[#FFF8E3]`, focus ring `ring-2 ring-[#F59E0B]/55`, M3 shape `#232F3E` + `aws.svg`, highlight dot `#FF9900`, CTA `bg-[#FFB340]` ink `#232F3E`.
- **Google Cloud Platform**: Active card `bg-[#E6F0FE]`, resting `bg-[#EFF5FE]`, focus ring `ring-2 ring-[#4285F4]/50`, M3 shape `#D2E3FC` + `gcp.svg`, highlight dot `#4285F4`, CTA `bg-[#D2E3FC]` ink `#174EA6`.
- **Microsoft Azure**: Active card `bg-[#E0F2FE]`, resting `bg-[#ECF7FF]`, focus ring `ring-2 ring-[#0078D4]/50`, M3 shape `#C7E8FF` + `azure.svg`, highlight dot `#0078D4`, CTA `bg-[#C7E8FF]` ink `#004E8C`.

### Warm Shadows

- `shadow-warm-sm`: `0 2px 8px -2px rgba(46, 43, 26, 0.05)`
- `shadow-warm-md`: `0 10px 30px -10px rgba(46, 43, 26, 0.07)`
- `shadow-warm-lg`: `0 20px 48px -16px rgba(46, 43, 26, 0.09)`
- `shadow-warm-xl`: `0 28px 64px -18px rgba(46, 43, 26, 0.12)`

---

## 4. Material 3 Expressive Components & Motion Rules

### Connected Button Groups ([globals.css](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/styles/globals.css))

- **Hero Action Pair (`.m3-hero-cluster` / `.m3-hero-row`)**:
  - `max-width: 420px`, 2-column grid (`gap: 4px`), left button `border-radius: 23px 8px 8px 23px`, right button `border-radius: 8px 23px 23px 8px`, full-width secondary pill `border-radius: 23px`, `min-height: 46px`.
  - Collapses cleanly to 1 stacked rounded-pill column below `420px`.
- **Connected Segmented Controls (`.m3-connected-h > .m3-seg`)**:
  - `gap: 4px`, `flex-wrap: wrap` so narrow screens never overflow cards.
  - Inner buttons use `border-radius: 8px`; outer corners `19px`; `[data-selected="true"]` morphs smoothly (`220ms`) into a full **`19px` capsule**.
  - Below `480px`, `.m3-seg` compacts to `min-height: 34px; padding: 0 10px; font-size: 12px`.

### Organic Shape Containers (`HeroShapeMorph` in [MotionPrimitives.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/MotionPrimitives.tsx))

- Procedural 72-point Catmull-Rom closed contours: `cookie9` (9 lobes), `sunny` (8 lobes), `flower` (6 lobes), `clover` (4 lobes).
- Transitions smoothly between shapes (`680ms` cubic easing).
- **Restraint Rule (Do Not Overuse Shape Containers)**:
  - Reserve `HeroShapeMorph` strictly for primary landing/overview highlights (hero showcase carousel, count badges, top-level optimization category badges, `DecisionLoop` step numbers, and `IntegrationMatrix` showcase cards).
  - Do **not** wrap icons in organic container shapes inside onboarding step cards, selectable radio/option cards, provider pickers, or secondary forms. Use crisp direct icons or clean SVG logos (`aws-dark.svg`, `gcp.svg`, `azure.svg`) without shape blobs, and distinguish selectable option cards via a warm `#FAF6E8` selector tray holding `#FFFDF4` option surfaces (`#FFF3A8` when selected) with explicit radio indicators instead of strokes or colored pills.

### Visibility & Number Animation Safety ([MotionPrimitives.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/MotionPrimitives.tsx))

- **`ScrollRevealObserver`**: Combines `IntersectionObserver`, immediate above-the-fold reveal (`rect.top < innerHeight * 0.96`), and a `MutationObserver` fallback so dynamically added nodes never stick at `opacity: 0`.
  - **Rule**: Never put `.gc-rv` on stateful/filterable/carousel card arrays (`OptimizationSection`, `IntegrationMatrix`) where re-renders or tab switching must stay 100% visible (`opacity-100` always).
- **`CountUpNumber`**: Stores last displayed value in `valueRef` so switching `7D → 30D → 90D` animates from current value to target rather than resetting to zero.

---

## 5. Telemetry & Forecast Chart Specification ([SpendCarbonChart.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/SpendCarbonChart.tsx))

Built with **Recharts** (`ComposedChart`, `ResponsiveContainer`):

1. **Visual Cleanliness (No Bar Histograms / No Caterpillar Dots)**:
   - Only smooth `Area` + `Line` traces (removed background `<Bar>` stripes).
   - Thin, legible strokes: Spend `1.5px`, Carbon `1.4px`, Per-day avg `1.1px` (`2 3`), Projected optimized `1.45px` (`4 4`), Avg drift `1.15px` (`3 3`).
   - Subtle vertical gradient fills (`0.11` → `0` spend, `0.09` → `0` carbon).
   - `dot={false}` along series; render focal rings **strictly at the `Today` pivot (`r=2.8`) and forecast endpoint (`r=2.5`)**.
2. **Dense C¹-Smooth Curves Without Comb Oscillation**:
   - Sample macro weekly/daily billing keyframes via **`catmullRomSample`** (`108` points for `7D`, `120` points for `30D`, `120` points for `90D`)—avoiding repeating high-frequency intraday sine waves that create sawtooth comb patterns across 30/90-day plots.
   - Model Carbon independently using compute demand + grid intensity cycles rather than a raw scaled clone of Spend.
3. **Aligned, Non-Overlapping Dual Y-Axis Domains**:
   - **Left Spend Y-axis**: `domain={[440, 980]}`, ticks `[500, 650, 800, 950]` (`$500–$950`). Spend sits cleanly in the **34%–85%** vertical band.
   - **Right Carbon Y-axis**: `domain={[0.19, 0.73]}`, ticks `[0.25, 0.4, 0.55, 0.7]` (`0.25t–0.7t`). Carbon sits cleanly in the **20%–52%** vertical band.
   - All 4 horizontal gridlines align 1-to-1 (`11.1%`, `38.9%`, `66.7%`, `94.4%`) across both left and right axes—keeping curves elevated out of the bottom edge while avoiding empty sky ceiling.
4. **Average-Driven Phased Rollout Forecast**:
   - Computes real period daily averages (`7D`: `$838/day` & `0.41 tCO₂e/day`; `30D`: `$828/day` & `0.43 tCO₂e/day`; `90D`: `$815/day` & `0.39 tCO₂e/day`) reconciling directly with Hero KPI cards (`$5,866`, `$24,842`, `$73,350`).
   - Plots trailing **Per-day avg** (`dailyAvgSpend`) through historical data and extrapolates monotonic upward **Avg drift** (`baselineSpend`) using measured `linearSlope`.
   - Applies **`phasedSavingsRatio`** across Days 1–21 (`Phase 1` EC2 auto-stop −$90/day → `Phase 2` RDS rightsizing −$171/day → `Phase 3` S3 & EBS cleanup −$214/day) settling onto a steady post-fix plateau (`~$626/day` on `30D`) through Day 30 (`Save $214/day with fixes`, matching `$6,420/mo`).
5. **Edge-Safe X-Axis & Tooltips**:
   - Uses 5 evenly spaced unique `xKey` ticks (`0%`, `25%`, `50%`, `Today` at `~75%`, `+7d`/`+30d` at `100%`) with `CustomXAxisTick` (`start` / `middle` / `end` anchors) so labels never overlap or clip.

---

## 6. Overview Page Layout, Components & Spatial Rhythm

### Page Shell & Section Spacing ([page.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/app/page.tsx))

- Root container: `min-h-screen overflow-x-clip bg-[#FFFDF4] text-[#2E2B1A] flex flex-col justify-between`.
- Main wrapper: `max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 w-full flex-grow space-y-14 sm:space-y-20` (`56px` mobile / `80px` desktop between sections).
- Section internal cadence: `space-y-6 sm:space-y-7` between section headers (`space-y-2` title/subtitle) and `gap-5` card grids.
- Headings drop artificial `max-w-2xl` constraints on outer blocks (putting `max-w-3xl` only on `<p>`) so titles like *"Why cloud cost and carbon belong together"* sit cleanly on one line when horizontal width allows.
- Footer ([ComplianceFooter.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/common/ComplianceFooter.tsx)): `mt-14 sm:mt-20`, matching `max-w-[1360px] px-4 sm:px-6 lg:px-8`.

### Section Breakdown

1. **[NavigationBar.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/common/NavigationBar.tsx)**:
   - Sticky backdrop-blurred wrapper (`pt-2.5 pb-2.5 mb-2`), pill container `bg-[#F5EED6] rounded-full shadow-warm-sm` with balanced 3-zone layout (Brand left, centered segmented nav track `bg-[#FAF6E8]/85`, CTA pills right).
   - Ordered navigation tabs grouped seamlessly: contiguous homepage sections (`Overview`, `Actions`, `Integrations`, `Docs`) followed by a `w-px bg-[#DFD6B5]` divider and standalone routes (`How it works`, `Why?`), ensuring scroll-spy transitions smoothly left-to-right (`1 -> 2 -> 3 -> 4`) and reaches `Docs` at page bottom.
   - Selected tab highlights via a gliding `#155E4B` Deep Forest Emerald indicator pill (`text-[#FFFDF4]`, animating smoothly across clicks, scroll-spy updates, and `sessionStorage`-handed route changes) plus `window.scrollTo({ behavior: "smooth" })` header-offset scrolling on anchor navigation.
   - Mobile/tablet (`< lg`): secondary circular icon hidden below `sm` (moved inside popover), active route highlighting in `#155E4B`, `Escape` + outside-click closes `rounded-[30px]` popover.
2. **[HeroSection.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/HeroSection.tsx)**:
   - **Left Column**:
     - Top `CloudShapesCarousel`: 3-icon Material 3 Expressive shapes carousel (`Google Cloud`, `AWS`, `Microsoft Azure`), starting first rotation `950ms` after mount then every `2.4s`, inline status caption (`flex-wrap min-[430px]:flex-nowrap`), interactive click + M3 dots.
     - Headline (`xl:whitespace-nowrap`, responsive `30px` → `46px`), natural 2-sentence product summary, connected button cluster (`Go to dashboard` / `Start setup`, `Connect AWS` / `Live demo`, `Explore recommendations` with `clover` `4` badge), trust line.
     - **Single Running Black Ticker Tape**: Placed in flow `mt-6 h-[68px]` directly below trust line (`bg-[#181711]`, zero borders/strokes, `z-0` passing full-width behind right card), scrolling `aws.svg` / `gcp.svg` / `azure.svg` icons (`30px–34px`, 12 repeats/half) calmly via `.gc-tape-track` (`92s linear infinite`). Never duplicate as a second parallel strip at top+bottom.
   - **Right Column**:
     - `bg-[#FAF6E8] rounded-[28px] shadow-warm-lg` card holding scope line, 3 dynamic `CountUpNumber` pastel KPI cards, [SpendCarbonChart](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/SpendCarbonChart.tsx), and hover-linked `Resource breakdown` (`grid-cols-1 min-[420px]:grid-cols-3`).
3. **[OptimizationSection.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/OptimizationSection.tsx)**:
   - Connected category filter tabs (`All (4)`, `Compute`, `Database`, `Storage`), 2×2 `rounded-[28px]` cards (`rounded-[32px]` outer container) with `HeroShapeMorph` category shapes + semantic icons (`dns`, `database`, `hard_drive`, `folder_zip`), tonal `rounded-[20px]` savings trays, and height-safe scrollable modal (`max-h-[90dvh] overflow-y-auto`).
4. **[DecisionLoop.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/DecisionLoop.tsx)**:
   - Header with **`Know more →`** capsule button linking to `/how-it-works`.
   - 4 compact cards (`p-5 rounded-[24px] bg-[#FBF6E3]`) with inline `44px` M3 number shapes (`01` `sunny`, `02` `clover`, `03` `flower`, `04` `cookie9`), overline subtitle placed above card title, and crisp 1-sentence descriptions.
5. **[WhyGreenOps.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/WhyGreenOps.tsx)**, **[UserPersonasSection.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/UserPersonasSection.tsx)**, **[DocumentationSection.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/DocumentationSection.tsx)**:
   - Responsive `sm:grid-cols-2 lg:grid-cols-4` / `md:grid-cols-3` grids, `text-center lg:text-left` headings, consistent `rounded-[24px]`–`[32px]` warm containers.
6. **[IntegrationMatrix.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/overview/IntegrationMatrix.tsx)**:
   - Synced Material 3 Icon Carousel tab bar (`AWS`, `Google Cloud`, `Azure`) + 3 provider-themed cards (`grid-cols-1 lg:grid-cols-3`), all remaining 100% visible at all times (`opacity-100`). Clicking an unselected card focuses it; clicking the active card again unselects (`null`) to display all 3 equally.

---

## 7. Responsive Rules Summary

- **`320px–479px` (Small Phones)**: 1-col hero CTA row (`< 420px`), 1-col resource breakdown (`< 420px`), wrapped carousel caption (`< 430px`), compact segmented tabs, modal internal scroll, `px-4` gutters.
- **`480px–1023px` (Large Phones & Tablets / Split Windows)**: Centered single-column Hero (`items-center text-center`), centered section headers (`text-center lg:text-left`), `max-w-[740px]` centered Hero console, `sm:grid-cols-2` 2×2 card grids, mobile popover menu.
- **`1024px–1279px` (Compact Laptops)**: 2-col Hero activates (`lg:grid-cols-12`) with scaled `34px` `<h1>` (no forced `nowrap` overflow into right card), compact inline nav padding (`px-2.5`).
- **`1280px+` (Desktop & Ultrawide)**: Centered `max-w-[1360px]` stage, 3-line unwrapped `<h1>` (`xl:whitespace-nowrap`), 12-repeat marquee covers up to 4K widths seamlessly.

---

## 8. Aligned Sub-Pages

- [how-it-works/page.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/app/how-it-works/page.tsx) + [HowItWorksData.ts](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/how-it-works/HowItWorksData.ts) + [GateWalkthrough.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/components/how-it-works/GateWalkthrough.tsx): Plain-English user guide on how GreenCloud works (`Read-only IAM` -> `Usage & peak safety` -> `Terraform diffs` -> `Post-change bill verification`), interactive 3-scenario walkthrough, and borderless M3 tonal styling.
- [why/page.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/app/why/page.tsx): Borderless tonal FinOps + GreenOps pillars, `HeroShapeMorph` pipeline cards, team views, and clean CTAs without demo/disclaimer banners.
- [audit-history/page.tsx](file:///d:/VOLUME%20E/GreenCloudAI-MiniPROJECT/src/app/audit-history/page.tsx): Wrapped with `NavigationBar` and `ComplianceFooter`, borderless `#FAF6E8` ledger table (`#FFFDF4`), safe JSON metadata summary, and `HeroShapeMorph` empty state.
- Note unrelated pre-existing backend TS error in `src/services/dnsFallback.ts(23,5): TS2741`.

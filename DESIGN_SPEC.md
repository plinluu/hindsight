# Hindsight design specification
## Reference observations (source pixels, approximate bounds)
- Foundable ui.png, 1366 × 730. A dark sky fills a frame inset 16px. The 340 × 276px focal panel is centered horizontally at x=513, y=215. Its pill action is 298 × 52px with 21px side insets. A compact dock sits at bottom center.
- sky.png, 1366 × 730. The central cloud spans roughly x=641–726 and y=335–401. Preserve the open sky around it and crop the narrow outer border.
- liquid-glass.png, 294 × 296. A bright rim and soft inner highlight enclose four glossy circular controls in a square grid. Use the supplied glass tokens below.
- hindsight-site.png is missing.
- Prolepsis at 1280px. Centered 1048px wrapper, 72px nav row, six links in a dark pill. Serif hero 42/48px at y=221 beside a 380 × 86px ticker. Weather sits beside the greeting. Import begins at y=433, forecasts at 769, route previews at 1093, scorecard at 1249. Section titles 21/33px, body 15px. Sunset plum fades into near-black.
- Prolepsis at 390px with a 15px scrollbar. The 343px column has 16px gutters. The top nav stays horizontal. Hero wraps to two lines at 28/32px. Search and the 343 × 86px ticker stack below the intro, with 32px before the next section.
- Foundable live home requires sign-in. Its 1280 × 720 public screen splits at x=640, with a 384px form and 44px controls. Use the supplied ui.png for authenticated panel and navigation observations.

## Hindsight implementation dimensions (CSS px)
- Center a single Today column with width min(1048px, 100% − 32px). At 1280px use 116px margins. At 390px use 16px margins and a 358px column with overlay scrollbars. Keep section content left-aligned beneath the centered hero.
- Desktop from 768px: center a fit-content glass pill inside a 72px nav row. Give links at least 44px height. Order Today, Markets, News, Review, Learn, Settings, Tools dropdown. Distinguish the active route with a filled pill and visible keyboard focus.
- Below 768px: fixed bottom bar with five equal targets, 64px plus safe-area inset. Today, Markets, News, Review, More. More opens a sheet containing Learn, Settings and Tools. Reserve bar height plus 16px below content.
- Today order: centered title and one context line, default-symbol chart preview, market overview strip, news and market recap, weather with sunset, then products. Chart and news previews link to their full routes. Align each section to the same column.
- Spacing scale 4, 8, 12, 16, 24, 32, 48, 64. Hero block padding 48px desktop / 32px mobile. Section gaps 48 / 32px. Panel padding 32 / 16px. Use 8px between a label and its value.
- Self-host Newsreader 500 for wordmark and headings, DM Sans 400/600 for UI. Hero 42/48 desktop and 32/36 mobile. Section headings 24/30, body 16/24, controls 14/20, metadata 12/16. Use tabular numerals for quotes and times.
- Base background navy #101626 fading to #1D2940 through Phase 4. Text #F4F1EA, secondary rgba(244,241,234,.70). Add rgba(10,14,28,.35) under glass where needed for legibility.
- Glass fill linear-gradient(to bottom,rgba(255,255,255,.16),rgba(255,255,255,.07)). Backdrop blur(24px) saturate(160%). Border 1px solid rgba(255,255,255,.28).
- Shadow inset 0 1px 0 rgba(255,255,255,.35), 0 12px 32px rgba(0,0,0,.35). Sheen linear-gradient(135deg,rgba(255,255,255,.10),transparent 40%). Fallback rgba(18,24,40,.85).
- Radii 40px panels, 28px cards, 999px pills, 50% circular controls. Quick settings form a 2 × 2 grid with 20px gaps and circles about one third of panel width. Use a fine bright rim, diagonal sheen, soft shadow and line icons.
- Primary blue #7BA7F7 → #5D8EEF. Secondary orange #F59E5E → #EE8A4C or purple #C79CF6 → #A97BE9. Gradients run top to bottom. Use dark button text and sufficiently contrasted icons.
- Label fallback content “Sample data” on each affected card. Add short plain-language explanations of financial terms. Review and Learn carry sample content until product integration.
- Loader on every document load. Center sky.png at cover × 1.03. Place an opaque navy core in a feathered radial scrim centered behind the wordmark, at least 10% of the rendered image width and 12% of its height to fully mask the cloud at any crop. Add a 56/64px serif wordmark (40/48 mobile) and a 96 × 2px progress line beneath.
- Render Today underneath immediately. Begin the 600ms loader crossfade when first content is ready after 1.2s, or by 1.9s so the loader is gone by 2.5s. Route changes bypass the loader.
- Motion uses opacity and transform only. Controls ease out over 150ms, sheets over 250ms. Scene crossfade 700ms and loader fade 600ms are explicit exceptions. Reduced motion shows the destination immediately. Avoid flashing.

Revision — Show sky.png alone on load. Today uses a plum-to-charcoal horizon, left-aligned greeting with weather, adjacent market ticker, and compact briefing panels. Stack these on mobile.

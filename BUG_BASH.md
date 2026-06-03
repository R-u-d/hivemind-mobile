# Bug Bash — Fix Log

Tracked fixes from issue [#39 Bug bash](https://github.com/R-u-d/HiveMind/issues/104). All changes land on `fix/39-bug-bash`.

---

## `fix(cross)` — Profile tab header scrolls with content instead of staying fixed

- **Static header** — the "Profile" title and edit button were inside the `ScrollView`, so they scrolled away with the content. Restructured to match the other tabs: `SafeAreaView` wraps the whole screen, header sits outside the scroll view and stays pinned to the top.

---

## `fix(cross)` — Move create community button to header, search to FAB in Discover tab

- **Header `+` button** — the create community button is now in the top-right of the Discover header, matching the Events tab layout. Easier to reach and more consistent across tabs.
- **Search FAB** — the search button moved to a floating action button in the bottom-right corner, freeing up the header and making search more discoverable.

---

## `fix(cross)` — Search screen notch/swipe-back, join/leave race, keyboard tap, community nav

- **Notch and swipe-back** — the search overlay was a `Modal`, which can never support iOS swipe-back gesture and doesn't respect the Dynamic Island/notch. Replaced with a proper Expo Router screen (`discover/search.tsx`); the native stack now handles safe area and swipe-to-go-back automatically.
- **Join/leave race condition** — tapping join then quickly tapping leave (or vice versa) would cause the button to flicker and fire a duplicate request (visible as a `400 Bad Request` on `/leave/` in server logs). Root cause: the `invalidateQueries` from a completed join triggered a search refetch that arrived *after* the leave, resetting `is_member` back to `true`. Fixed by calling `cancelQueries` in `onMutate` for both hooks — any in-flight community fetches are cancelled before the optimistic state is applied, so stale responses can never overwrite it.
- **Keyboard blocks tap** — with the search keyboard open, the first tap on a join/leave button was consumed by dismissing the keyboard instead of triggering the action. Fixed with `keyboardShouldPersistTaps="handled"` on the results list, which passes taps straight through to pressables without closing the keyboard.
- **"Type to search" hidden by keyboard** — the empty hint state was centred in the full screen height, putting it behind the keyboard. Wrapped the content area in `KeyboardAvoidingView` so it shrinks to the visible space above the keyboard and the hint is always visible.
- **Tapping a community navigates to it** — search results now navigate to the community detail screen on card press, consistent with the rest of the app.

---

## `fix(cross)` — Bio char counter shake at limit, danger threshold 200 → 180

- **Shake animation** — a new `useShakeAnimation` hook fires a 6-step left-right shake (native driver) when the bio counter hits 200. Same hook reused on event and community description counters.
- **Danger threshold** — bio danger colour now triggers at 180 (96%) instead of 200 (100%), aligning with the 80%/96% warn/danger pattern used across all three counters (bio 150/180, event 1200/1400, community 400/480).

---

## `fix(cross)` — Create community screen polish

- **Native header** — replaced the custom `View` header (clipped by notch/Dynamic Island) with a native `Stack.Screen` header matching create event; safe area handled automatically.
- **Type pills** — no default selection on open; tapping the selected pill again deselects it. Pills are now a single-row horizontal scroll (matching Discover filter chips) instead of a wrapping grid.
- **Description char counter** — 500 char limit with warn at 400 and danger at 480; shake animation fires when the hard limit is hit.

---

## `fix(cross)` — Create event polish

- **Private event toggle** — Switch row after the community picker ("Only community members can see this event"); `is_private` BooleanField added to the Event model (migration `0003`, default `False`), exposed in both serializers.
- **Community location map hint** — when a community with a location is selected, the map silently geocodes it and pans to that city at a broad zoom with hint "Near X · tap to drop a pin". Pin and manual address geocoding still take full priority.
- **Timezone map default** — map default region derived from device timezone via `Intl` (no permission needed) instead of hardcoded continental US. Europe/Berlin → central Europe, Asia/Tokyo → central Asia, etc.
- **`CommunityMinimalSerializer`** — now includes `location` so the list endpoint exposes it to `useMyCommunities` in the create event form.

---

## `fix(cross)` — RSVP label rename, past event copy, cache fixes

- **Not Interested** — "Not going" renamed to "Not Interested" with eye-off icon. Past-tense card badges: Went / Saved / Passed.
- **Past event banner** — event detail shows "You saved this event" (star), "You passed on this" (eye-off), "Event ended" (no RSVP) instead of generic "This event has ended".
- **Attendees row** — past events show "12 attended · 3 saved"; upcoming keeps "12 going · 3 interested".
- **EventCard meta** — past events show "X attended" next to the people icon instead of a raw number.
- **RSVP list cache** — `useRsvp` `onMutate` now patches all event list caches optimistically so the RSVP pill updates instantly on back-navigation (no 1–2 s delay).
- **Profile count refresh** — `useRsvp` `onSettled` invalidates `['users', 'me']` so the Events RSVP'd counter updates immediately after any RSVP change.

---

## `feat(cross)` — My Events sheet on profile

- **Tappable stat card** — tapping "Events RSVP'd" on the profile opens a "My Events" bottom sheet.
- **Going / Interested sections** — upcoming RSVPd events split by status; FilterChips toggle switches to past events.
- **Smooth reorder animation** — Reanimated `LinearTransition` + `FadeIn`/`FadeOut` animates cards between sections when RSVP status changes.
- **Context-aware empty state** — "No upcoming events" vs "No past events / Events you RSVPd to will appear here."
- **Upcoming-only counter** — `event_count` in both user serializers now counts only future RSVPs so the profile stat shows events you are planning to attend.

---

## `fix(cross)` — Tab header consistency

- **Feed notification bell** — was a bare `Ionicons` with no touch target; wrapped in `Pressable` with `hitSlop={12}` and `padding: 4` to match Discover, Events, and Profile.
- **Profile edit button** — missing `accessibilityRole="button"` added.
- **Profile content top spacing** — `paddingTop` reduced from `spacing.base` (16px) to `spacing.xs` (4px) so the avatar section sits the same distance from the header as list content does on the Feed tab (16px total gap).

---

## `fix(cross)` — Instant community join

- **Root cause** — `post_save` on `Membership` fires `fan_out.delay()` which tried to connect to the Redis/Celery broker on every join. With Redis not running locally, Celery waited ~2-3s for the connection timeout before failing, blocking the HTTP response.
- **Fix** — `CELERY_TASK_ALWAYS_EAGER` now defaults to `True` when `DEBUG=True`; tasks run inline without a broker. `Notification` rows are still written to the local DB; push delivery is a no-op (no push tokens registered in dev).
- **AbortSignal wiring** — threaded `signal` through all 5 community `queryFn`s (`useCommunities`, `useCommunityDetail`, `useCommunityMembers`, `useCommunityChannels`, `useMyCommunities`) so `await cancelQueries` in `onMutate` resolves immediately when a query is in-flight instead of waiting for the network round-trip.
- **Profile Communities tap** — tapping the Communities stat card scrolls to the section with a `textMuted → text` label highlight (Reanimated `interpolateColor`).
- **Feed gradient** — body-fade `LinearGradient` start changed from `'transparent'` (`rgba(0,0,0,0)`) to `${colors.surface}00` so the fade blends correctly in light theme.
- **Pre-push tests** — `pytest` and `jest` moved to `pre-push` stage; `ruff`, `eslint`, and `typecheck` remain on `pre-commit` for fast per-commit feedback.

---

## `fix(events)` — Gate events behind community membership

- **Problem** — events were fully public: anyone (even unauthenticated) could list, view, see attendees, and RSVP regardless of membership, while communities/channels/feed require joining first. Events now follow the same access rules.
- **List** (`GET /api/events/`) — requires auth and returns only events from communities the user has joined (plus any they organise), mirroring the feed.
- **Detail / attendees / RSVP** — require auth + membership of the event's community, enforced object-level via a new `IsEventCommunityMember` permission. Non-member → **403** (consistent with channels); unauthenticated → 401.
- **Organiser bypass** — the event organiser always retains read/RSVP access even if they later leave the community, so they're never locked out of an event they created.
- **403 not 404** — the member filter is scoped to the `list` action only; detail lookups hit the unfiltered queryset so a non-member gets an explicit 403 rather than a silent 404 (no existence leak; `?community=`/`?channel=` still AND with the membership filter).
- **Leaving withdraws RSVPs** — `LeaveView` now also deletes the user's RSVPs to that community's events (except events they organise, since the organiser keeps access). Frees capacity slots a departed member would otherwise hold, and keeps the profile "Events RSVP'd" counter in sync with the now member-gated "My Events" sheet.
- **Frontend** — events tab and detail already sit behind auth; `event/[id].tsx` degrades to its existing "Couldn't load event" state on a 403 deep-link. Private/invite-only events remain future work.
- **Profile counter sync** — `event_count` counted raw RSVP rows with no visibility filter, so orphan RSVPs (RSVP'd before gating, never joined) inflated the counter while being invisible in the filtered My Events list. Now counts only RSVPs the user can see (member of the event's community or organiser), via a shared `visible_upcoming_rsvp_count` helper mirroring the list rule.
- **Seed data** — `seed_events` RSVP'd 5 seed users to every event regardless of membership, creating ~220 orphan RSVPs once gating landed. It now joins each RSVP user to the community first so seeded data stays consistent.
- **Prune command** — `manage.py prune_orphan_rsvps` (`--dry-run`, `--email`) removes pre-existing orphan RSVPs that still hold event capacity slots.
- **Tests** — events suite reworked to the unauth/non-member/member/organiser matrix (68 passing); leave tests cover RSVP withdrawal + organiser-RSVP preservation; `event_count` test asserts orphan RSVPs are excluded.

---

## `fix(cross)` — Onboarding Continue button dead on iOS Expo Go

- **Bottom touch dead-zone** — on iOS Expo Go the footer "Continue"/"Let's go" button on all three onboarding steps didn't respond to taps (worked fine on Android and in Xcode dev builds). The screens rendered content into the bottom home-indicator strip using a manual `paddingTop: 54` + `useSafeAreaInsets().bottom` on the footer, leaving the button inside an iOS-Expo-Go region that doesn't deliver touches to JS.
- **Fix** — replaced the outer `View` on `index.tsx`, `step2.tsx`, and `step3.tsx` with `SafeAreaView edges={['top','bottom']}` (the pattern the working tab screens use). The bottom inset now sits *below* the footer, lifting the button clear of the dead-zone. Confirmed working end-to-end in iOS Expo Go. Full write-up in `design/onboarding-continue-button-ios-expo-go-bug.md`.

---

## `feat(cross)` — Event search

- **Search FAB** — floating search button on the Events tab (bottom-right, matches Discover).
- **`events/search.tsx`** — debounced search screen with two parallel queries: upcoming results first (soonest at top), past results below (most recent first) with section headers. Tapping a result navigates to the event detail page; RSVP picker works inline via the existing `EventCard`.
- **Backend q filter fix** — changed `qs.filter() | qs.filter()` to `qs.filter(Q() | Q())` so the `upcoming` filter is preserved when combining title and description search.
- **`useEvents` hook** — `q` param added to `UseEventsArgs`, `buildPath`, and the query key so each search term gets its own cache entry.

---

## `fix(cross)` — Splash screen iOS fix, icon branding, cache + auth resilience

- **Splash iOS fix** — on iOS New Architecture (Fabric), two absoluteFill native-backed SVG layers (gradient + honeycomb) caused the compositor to hide all JS-managed content (logo, wordmark, loader). Fixed by pre-rendering the gradient + 3D perspective honeycomb as a single WebP (`splash-bg.webp`) displayed via one `expo-image` layer. Also removed `logoOpacity` animated value (was silently failing on iOS Fabric, leaving logo permanently invisible), and removed `overflow: 'hidden'` that was clipping the rotated hex grid to 70% of screen height.
- **Splash hex alignment** — backdrop WebP generated with SVG pattern offset (`x=3.9 y=-10`) engineered so an A-type hex cell center aligns with the `HexLoader` position (`bottom:90`) to within ±5px on both iPhone 14 (390×844) and 14 Pro Max (430×932).
- **Index screen loading state** — replaced bare `null` return (caused white "index" header flash while auth check ran) with a branded `HexLoader` on `colors.bg`, matching the post-splash idle state.
- **Index header** — added `<Stack.Screen name="index" options={{ headerShown: false }} />` to suppress the default "index" title shown during the auth check.
- **Auth resilience** — response interceptor now distinguishes network failures from token rejections: only clears tokens and redirects to login when the server returns a 4xx on the refresh endpoint. A downed API no longer logs the user out. `index.tsx` falls through to feed (TanStack Query handles error/stale state) when tokens still exist after a failed API call.
- **Leave community cache** — `useLeaveCommunity.onSuccess` now invalidates `['events']` and `['users', 'me']`, so the events tab and profile RSVP counter update immediately without a manual refresh.
- **HiveLogo rotation dots** — 3 rotation-marker circles gated on `animated` prop; hidden on all 5 auth screens (size 32, static), visible only on the animated splash (size 72, spinning).
- **App name** — `"name": "app"` → `"HiveMind"`, `"slug": "app"` → `"hivemind"` in `app.json`.
- **App icon** — regenerated with splash-screen radial gradient baked in (Expo Go dev mode ignores `app.json backgroundColor`, transparent PNGs render as black boxes). `resizeMode` changed to `"cover"` to prevent letterboxing.
- **Adaptive icon** — foreground changed to off-white mark on transparent background; `app.json` Android `backgroundColor` corrected from `#ffffff` to `#130C2E`. Now consistent with iOS icon (white mark on dark purple) instead of inverted.
- **Asset cleanup** — removed unused `SpaceMono-Regular.ttf`, `auth-bg.png`, `favicon.png`, and superseded `generate-icons.mjs`.

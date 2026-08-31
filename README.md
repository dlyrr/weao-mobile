# WhatExpsAre.Online — mobile

An unofficial iOS + Android client for [weao.xyz](https://weao.xyz), built on its
public API. One Expo/React Native codebase, styled from the site's own design
tokens.

## What's in it

**Exploits tab** — every tracked exploit, grouped and ordered exactly the way the
site does it: Windows / Mac / Android / iOS script executors first, then the
externals, each section sorted by `index` ascending. Search, the full filter set
(Pricing, Platform, Status, Key System, Type, Detection), the four sort orders,
and long-press to pin an exploit to the top of its section. Exploits flagged
`hidden` by the API are omitted, matching the site.

`clientmods` is presented as a **Client Mod Bypass** detection badge rather than
a neutral capability chip, matching where the site files it — its filter panel
lists it under DETECTION alongside Detected/Undetected.

**Exploit detail** — the site's modal, as a screen: logo, owner, version, status,
badges, sUNC/UNC bars, the `fullDescription` blurb rendered with its bullets,
warning callouts and links intact, screenshots, the feature grid
(Decompiler / Multi-Instance / Raknet / Client Mod Bypass / Key System), the
target Roblox version hash with copy-to-clipboard, website / Discord / purchase
links, and changelogs where the API has them.

**Versions tab** — current Roblox versions for all four platforms plus the
future and past Windows/Mac builds, each with a copyable hash.

**Settings tab** — theme picker, notification switches, effect quality, compact
list mode.

## Themes

All ten of the site's themes, with tokens copied from its compiled stylesheets:
Dark, Light, Revision, voxlis.NET, Pulsery, Amoled, Kyoto, Sirmeme, Ball 2.0,
and Olemad. Olemad ships in the site's stylesheet but not its picker, so it sits
behind **Show hidden themes**.

The theme effects are reproduced too, using the site's own assets:

- **voxlis.NET** rains `red-heart`, and tapping the list bursts more from your
  finger — the site enables the click burst for this theme only.
- **Sirmeme** rains `sirmeme.png`, no click burst.
- **Ball 2.0** replaces the app's imagery with `ball2.0.png`: the screen
  background, every card surface, every exploit logo, and every screenshot.
  Badges, pills and chrome keep their normal styling, and card surfaces carry a
  scrim, so the text stays readable on top of the artwork.

  Logos and screenshots swap the image *source* rather than overlaying the
  artwork — the file is 1024x1024 with its subject in a wide white margin, so
  overlaying it on a 42px logo tile rendered as a blank white square. Swapping
  the source lets `contentFit` crop to the subject at any size.

Particle counts and size ranges follow the site's own low/medium/high tiers;
**Settings → Effect quality** exposes them, plus Off.

## Notifications

Local, on-device, no account and no server. A background task polls the WEAO API
and raises a notification when:

- a **watched exploit** changes version, or comes back up after being down —
  toggled per exploit from its detail screen, and reviewable in Settings
- **Roblox ships a new client version** on Windows, Mac, Android or iOS —
  toggled per platform in Settings or on the Versions tab

Enabling a watch records a baseline first, so you never get a burst of alerts
for things that changed before you were watching.

The OS decides when background work actually runs. Android is usually close to
the 15-minute floor; iOS is opportunistic and can be much less frequent,
especially on low battery. The app is honest about this in Settings rather than
promising instant delivery.

## About the API

Everything comes from the documented public endpoints at
[docs.weao.xyz](https://docs.weao.xyz). All requests send the required
`User-Agent: WEAO-3PService`. A 429 surfaces as a readable message rather than
an empty screen, and requests fall through `weao.xyz` → `whatexpsare.online` →
`weao.gg` if a domain is unreachable. The last good response is cached, so the
app opens with data even offline.

### On the websocket

WEAO publishes no public websocket that I could find. Checked: every JS chunk on
weao.xyz (the string `WebSocket` does not appear), all four documentation pages
plus `llms.txt` / `llms-full.txt`, the older `v3.weao.xyz` GitBook, the sitemap,
the community proxy API, and ~65 candidate `wss://` URLs across `weao.xyz`,
`weao.gg`, `weao.dev`, `whatexpsare.online` and `rdd.weao.gg`.

What the site actually uses for push is a service worker (`/sw.js`) plus
`POST /api/notifications/subscribe` — browser Web Push, which a native app
cannot subscribe to.

So the app polls. `src/api/transport.ts` hides that behind a `WeaoTransport`
interface and already contains a `WebSocketTransport` that falls back to polling
if the socket drops. If a socket URL turns up, fill in its message shape and
change the one line in `getTransport()`; no screen code changes.

## Screenshots

In `docs/screenshots/`, captured from the real app at 412×915 against live WEAO
data. See **Previewing in a browser** below for how they were produced.

| | |
|---|---|
| `01-exploits-dark` | exploit list, default Dark theme |
| `02-filters` | filter + sort sheet |
| `03/04-detail-volt` | exploit detail, top and scrolled |
| `05-versions` | Roblox versions, all four platforms |
| `06-settings-themes` | theme picker |
| `07-exploits-light` | Light theme |
| `08-exploits-voxlis-rain` | voxlis.NET, raining hearts |
| `09-exploits-sirmeme-rain` | Sirmeme, raining logos |
| `10-exploits-ball20` | Ball 2.0, exploit list |
| `11-detail-ball20` | Ball 2.0, exploit detail |

## Previewing in a browser

The web target renders the same components, which is useful for quick visual
checks without a device. It needs a proxy, because a browser cannot set the
`User-Agent` WEAO requires and WEAO sends no CORS headers:

```bash
pnpm exec expo export --platform web --output-dir dist   # with the env var below
node scripts/preview-server.mjs 8088                     # serves dist/ + proxies /api
```

Build with the client pointed at the proxy:

```bash
EXPO_PUBLIC_WEAO_HOSTS=http://localhost:8088 pnpm exec expo export --platform web --output-dir dist
```

`EXPO_PUBLIC_WEAO_HOSTS` is only read when set; native builds use the real hosts.

Note the API rate-limits fairly aggressively — driving the preview through many
page loads in a row will earn a 429.

## Running it

```bash
pnpm install
pnpm start          # then scan the QR with Expo Go
```

> This repo has its own `pnpm-workspace.yaml`. That is deliberate: without it
> pnpm walks up and finds `C:\Users\santi\pnpm-workspace.yaml`, and installs
> this project's dependencies into `C:\Users\santi\node_modules`. It also sets
> `nodeLinker: hoisted`, which Metro and Expo autolinking expect.

Other scripts:

```bash
pnpm typecheck      # tsc --noEmit
pnpm prebuild       # regenerate android/ and ios/
```

## Building

### Locally

Requires a JDK and the Android SDK. On this machine they are already installed:

| | |
|---|---|
| JDK 17 | `C:\Users\santi\scoop\apps\temurin17-jdk\current` (scoop, `java` bucket) |
| Android SDK | `C:\Users\santi\Android\Sdk` |
| Components | platform-tools, `platforms;android-36`, `build-tools;36.0.0`, `ndk;27.1.12297006`, `cmake;3.22.1` |

```bash
export JAVA_HOME='C:\Users\santi\scoop\apps\temurin17-jdk\current'
export ANDROID_HOME='C:\Users\santi\Android\Sdk'
pnpm exec expo prebuild --platform android --no-install --clean
cd android && ./gradlew assembleRelease --no-daemon
# -> android/app/build/outputs/apk/release/app-release.apk
```

`android/local.properties` must point at the SDK (`sdk.dir=C:/Users/santi/Android/Sdk`);
it is gitignored and regenerated per machine.

### Signing

Release builds are signed with an upload key supplied through Gradle
properties, read from `~/.gradle/gradle.properties` so the credentials never
enter the repo:

```properties
WEAO_STORE_FILE=C:/Users/santi/keys/weao-upload.jks
WEAO_STORE_PASSWORD=...
WEAO_KEY_ALIAS=weao
WEAO_KEY_PASSWORD=...
```

**Back that keystore up.** Android identifies an app by its signature, so
losing it means never being able to ship an update to anyone who already
installed the app — they would have to uninstall and lose their data. If the
properties are absent the build falls back to the debug key, which produces an
installable APK that must never be distributed.

### Per-ABI output

`assembleRelease` emits one APK per architecture rather than a universal one,
because a fat APK carries native libraries for four ABIs, two of which only run
in an emulator:

| APK | For |
|---|---|
| `app-arm64-v8a-release.apk` | every modern phone |
| `app-armeabi-v7a-release.apk` | older 32-bit devices |

A first build takes well over ten minutes because of the native compilation, so
run it detached rather than inside anything that imposes a timeout.

### CI

Android builds also run on [Codemagic](https://codemagic.io) — see `codemagic.yaml`.

- **`android-apk`** — a sideloadable release APK. Needs no signing setup; the
  release build falls back to the debug keystore.
- **`android-play`** — a Play Store AAB. Upload an keystore to Codemagic under
  the reference name `weao_upload`; the workflow wires it into Gradle and then
  verifies the output was *not* debug-signed before publishing.

`android/` and `ios/` are gitignored and regenerated by `expo prebuild` on every
build, so `plugins/withReleaseSigning.js` re-applies the release signing config
each time rather than it being a one-off hand edit.

**iOS** is not wired up, by choice — it needs an Apple Developer account and a
macOS instance. The app code is already cross-platform, so adding an iOS
workflow later is a Codemagic config change, not an app change.

## Layout

```
app/                      expo-router routes
  (tabs)/index.tsx        exploit list
  (tabs)/versions.tsx     Roblox versions
  (tabs)/settings.tsx     themes + notifications
  exploit/[key].tsx       exploit detail
src/
  api/                    client, types, grouping/filtering, transport
  components/             cards, filter sheet, rain, ball surface, primitives
  notifications/          background task + change detection
  state/                  settings and data providers
  theme/                  the ten themes and typography
plugins/                  Expo config plugin for Android release signing
```

## Credit

All exploit data, logos, descriptions, screenshots and theme artwork belong to
WEAO / Vienna Softworks. This is a third-party client built against their public
API, not an official app.

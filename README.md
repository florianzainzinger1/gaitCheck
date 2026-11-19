# Gait Check

**Catch it early. Get back to training sooner.**

Gait Check is an app for horse owners that uses AI to detect lameness early, before the human eye can see it. You film your horse trotting for 30 seconds once a week. The app learns that horse's own movement baseline and alerts you when something changes.

The project started in the startVienna Sprint and is currently at the prototype and pitch stage, working towards Demo Day.

## The problem

- **Lameness gets noticed too late.** Horses are prey animals and hide pain. Mild lameness (AAEP grades 1–2) starts as a few millimetres of asymmetry, which even experienced owners miss.
- **Owners go back to training too early.** During rehab, the owner decides from gut feeling whether the horse "looks okay" between vet visits. Restarting too soon causes relapses, especially with tendon injuries.
- **Vets only see a snapshot.** At a lameness exam the vet watches one trot-up and doesn't know what *normal* looks like for this particular horse.

Our case study is **Blume**, who has a tendon injury in her left hind leg. She has been lame for over a year and relapsed twice after training was restarted.

## How it works

| Step | What happens |
|------|--------------|
| **01 Film** | Once a week, film a 30-second trot in hand, away from the phone and back. You only need a phone: no sensors or extra equipment. |
| **02 Learn** | The AI tracks key points on the horse, analyses symmetry for each leg and builds a personal baseline. Almost no horse moves perfectly symmetrically, so the app compares each horse to itself. |
| **03 Act** | When a leg moves outside its usual range, you get an alert. You can film again the next day to double-check, or send the movement history to your vet with one tap. |

The same data answers the rehab question: *is she back in her normal range and ready to train again?*

## Who it's for

- **Riders & owners**: early warnings and confidence during rehab
- **Stables & trainers**: monitoring many horses at once (stable view)
- **Vets**: weeks of objective movement data instead of "she seems a bit off"

## Repository contents

| Path | Description |
|------|-------------|
| `index.html`, `site/` | **Website**: landing page with the live demo embedded in a phone frame (served at the GitHub Pages root) |
| `app/` | **Interactive demo web app** (see below) |
| `website/index.html` | Earlier clickable prototype as a single standalone HTML page |
| `mockp/Gait Check – App Mockup.html` / `.pdf` | Full app mockup |
| `mockp/Gait Check – App Mockup-png/` | Mockup screens: Today, Record, Analysing, Result, Change detected, Send to vet, History, Baseline learning, Ready to train, Stable view |
| `Infos/`, `Horse&Lameness Briefing.pdf` | Internal team documents: pitch slides, script, team overview and the Q&A briefing. Kept locally and not pushed (see `.gitignore`) |

## Demo web app (`app/`)

The demo app is a working version of the mockup. It keeps real state and remembers checks, horses, vet reports and training sessions in the browser.

**What you can do in it**

- **Today**: the current horse's symmetry score, an alert when a leg is out of range, and a "ready to train" card. Switch between horses here.
- **Record**: shows demo footage of Blume with animated tracking points. You can also film live with the phone camera or pick a video from the phone. The 30-second timer and the step-by-step "analysing" screen run as on a phone.
- **Result**: symmetry for each leg compared with the horse's own range, plus an interactive chart (drag across it to read each check).
- **Change detected**: an in-app push notification, the flagged leg's chart and what the change means.
- **Send to vet → vet report**: choose what to include and add a note. The app then creates a link to a report for the vet with charts per leg, a table of all checks, and the training log. The report can be printed or saved as a PDF.
- **History**: every check, filterable by leg, labelled Flagged, Improving, Back in range or In range.
- **Learning the baseline**: the first 4 checks of a new horse. After the 4th, the horse's personal range is calculated.
- **Back to training**: a rehab plan with checks twice a week and a session log.
- **Stable view**: all horses at a glance, add a horse, invite a stable, trainer or vet.

**Presenter controls** (left of the phone on a laptop):

- Jump to any of the 10 steps of the pitch flow. Each step sets up the data it needs and shows a talking point from the pitch script.
- **Next recording**: choose whether the next trot comes out *In range* or as a *Hind left change*, then record live on stage.
- **Fast recording**: the 30 s recording runs in 5 s.
- Keyboard: `←` `→` step through the flow, `C` switches the next result, `Shift+R` resets the demo data.
- On a phone: tap "Gait Check" on the Today screen three times to open the same controls.

**Run it**

```powershell
python -m http.server 5173 --directory app
```

Then open http://localhost:5173. Opening `app/index.html` directly from disk also works, but camera, offline mode and "install" need http(s) or localhost.

On GitHub Pages (or any static host) the app can be installed on a phone ("Add to Home Screen") and keeps working **offline** once it has been opened, so the demo doesn't depend on Wi-Fi at the venue. After changing files, bump `VERSION` in `app/sw.js`.

> The gait analysis in the demo is **simulated**. Values are generated around each horse's own range, or as a hind-left drop when the presenter picks it. The live camera and video upload are real, but no pose model runs on them yet.

**Code layout**: `js/data.js` holds the data model, demo seed, baseline and flagging rules, and the simulated analysis. `js/screens.js` has all the screens, `js/charts.js` the SVG charts, and `js/app.js` the router, phone frame and presenter scenes. There is no build step and no dependencies apart from Google Fonts.

## Team

| Person | Focus |
|--------|-------|
| Aurelia | Lead, research with Blume, sharpening the idea, pitch |
| Tizian | Finance, pricing, business models, market size, willingness to pay, legal |
| Maya | Sales and customer contact |
| Florian | App & IT |

## Roadmap to Demo Day

- [ ] Pitch slides
- [ ] Pitch script
- [ ] Q&A preparation and horse briefing
- [ ] Clickable prototype

## Disclaimer

Gait Check is a monitoring tool and does not replace a veterinary diagnosis. It flags changes in movement. Diagnosis and treatment stay with the vet.

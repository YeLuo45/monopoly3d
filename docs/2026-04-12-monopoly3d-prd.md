# PRD: Monopoly 3D Educational Game

**Document Version:** 1.0  
**Date:** 2026-04-12  
**Status:** `prd_pending_confirmation`  
**Proposal ID:** `PROP-2026-0412-001`

---

## 1. Overview

### Background

Traditional educational methods often fail to sustain engagement for children in kindergarten and early primary school. Meanwhile, the Monopoly board game mechanic—centered on dice rolling, property acquisition, resource management, and social interaction—has proven universal appeal across age groups. Combining 3D game visuals with curriculum-aligned knowledge points creates a self-reinforcing learning loop: gameplay drives engagement, and knowledge questions drive game progression.

### Opportunity

WebGL enables browser-based 3D experiences without installation, making the product immediately accessible on PCs and tablets in homes and classrooms. A 3D Monopoly variant with embedded educational content addresses:
- Declining attention spans for passive learning
- Lack of collaborative play that reinforces academic concepts
- Parents seeking screen time that is demonstrably productive

### Problem Statement

Children aged 4–10 lack an entertaining, game-based platform that simultaneously teaches kindergarten and primary school subject matter through a proven board game mechanic delivered in 3D via a web browser.

---

## 2. Goals

### Business Goals
- Deliver a fully playable single-player and local-multiplayer 3D Monopoly experience in a web browser (WebGL)
- Embed publicly available kindergarten and primary school knowledge content without requiring integration with live textbooks or curriculum systems
- Support 1–4 local players per game session

### User Goals

| User | Goal |
|------|------|
| Child (ages 4–10) | Have fun, win the game, and unconsciously absorb knowledge |
| Parent / Guardian | Feel confident that screen time is educational; can play alongside the child |
| Teacher | Use the game in classroom settings for group-based learning reinforcement |

---

## 3. Non-Goals

- **No real-money transactions** — in-game currencies and properties are purely virtual
- **No backend / online multiplayer** — this PRD covers local multiplayer only (shared screen)
- **No live curriculum integration** — knowledge content uses publicly available subject outlines only; no connection to any specific school's LMS or textbook
- **No mobile-native build** — primary target is desktop / tablet web browsers
- **No account / login system** — game can be started immediately without registration

---

## 4. Target Users

### Primary Users
- Children aged **4–10** enrolled in kindergarten (ages 4–6) or primary school grades 1–4 (ages 6–10)

### Secondary Users
- **Parents / guardians** playing alongside children at home
- **Teachers** using the game in small-group classroom activities (up to 4 players per device)

### User Profiles

| User | Age | Tech Comfort | Play Context |
|------|-----|-------------|--------------|
| Kindergartener | 4–6 | Low; needs large touch targets; minimal reading required | With parent or teacher present |
| Early primary | 6–8 | Moderate; can follow simple text instructions | With parent or in small group |
| Upper primary | 8–10 | Moderate–High; can manage full game rules independently | Solo or with peers |

---

## 5. Scope

### 5.1 Core Game Mechanics (Monopoly-Based)

| Feature | Description | Priority |
|---------|-------------|----------|
| 3D Game Board | Isometric or full-3D board with 20–24 tile spaces arranged in a loop | P0 |
| Dice Rolling | Animated 3D dice roll with random outcome (1–6 per die, 2 dice) | P0 |
| Turn System | Sequential turns across 1–4 local players | P0 |
| Player Token Movement | Animated token moving step-by-step along the board path | P0 |
| Property Tiles | Buy / rent properties; tile groups by color theme | P0 |
| Chance & Community Chest | Random event tiles triggering knowledge questions or game effects | P0 |
| Currency & Balance | Virtual money system; track each player's cash balance | P0 |
| Bank System | Central bank manages money issuance, transactions, and bankruptcy | P0 |
| Knowledge Question Events | Landing on specific tiles triggers age-appropriate quiz (correct = reward, incorrect = penalty) | P0 |
| Win Condition | Last player remaining with cash / assets after others go bankrupt, or highest net worth after a fixed number of rounds | P0 |
| Game UI Overlay | HUD showing player balances, property ownership, current turn indicator | P0 |

### 5.2 Educational Content

| Feature | Description | Priority |
|---------|-------------|----------|
| Question Bank (Kindergarten) | ~200 questions covering colors, shapes, numbers 1–20, basic animals, simple emotions | P1 |
| Question Bank (Primary 1–2) | ~200 questions covering addition/subtraction within 100, simple multiplication, days/months, basic geography | P1 |
| Question Bank (Primary 3–4) | ~200 questions covering multiplication/division, fractions, simple reading comprehension, science facts | P1 |
| Age Tier Selection | Player selects difficulty tier at game start (Kindergarten / Primary 1–2 / Primary 3–4) | P1 |
| Question Presentation | Large text + audio narration for younger children; text-only for older | P1 |
| Subject Categories | Questions tagged by subject: Math, Language, Science, General Knowledge | P2 |

### 5.3 Game Modes

| Mode | Description | Priority |
|------|-------------|----------|
| Solo Mode | Single player vs. 1–3 AI opponents | P1 |
| Local Multiplayer | 2–4 human players on shared screen | P0 |
| Classroom Mode | Teacher-controlled game pacing, option to disable timers | P2 |

### 5.4 UI / UX

| Feature | Description | Priority |
|---------|-------------|----------|
| Main Menu | New Game, How to Play, Credits | P0 |
| Player Setup Screen | Select 1–4 players, assign names, choose tokens | P0 |
| 3D Camera | Default isometric view; player can orbit / zoom | P1 |
| Animated Feedback | Visual + sound effects for correct/incorrect answers, purchases, rent payments | P1 |
| Game Over Screen | Winner announcement, summary of questions answered correctly | P1 |
| Audio Narration | Read-aloud for tiles, questions, and game events (especially for ages 4–6) | P1 |

---

## 6. User Flow

```
[Main Menu]
    │
    ├── "New Game" ──→ [Age Tier Selection] ──→ [Player Setup] ──→ [Game Board]
    │                                                              │
    │                                                              ├── [Roll Dice] ──→ [Token Animation] ──→ [Tile Event]
    │                                                              │                                              │
    │                                                              │                    ┌─── Property Tile ──→ [Buy / Pass]
    │                                                              │                    │
    │                                                              │                    ├── Chance/Quiz Tile ──→ [Question Display]
    │                                                              │                    │                              │
    │                                                              │                    │                              ├── Correct ──→ Reward (money / free rent)
    │                                                              │                    │                              └── Incorrect ──→ Penalty (pay fine / skip turn)
    │                                                              │                    │
    │                                                              │                    ├── Tax Tile ──→ [Deduct Currency]
    │                                                              │                    │
    │                                                              │                    └── Go / Jail / etc.
    │                                                              │
    │                                                              └── [Turn End] ──→ [Next Player's Turn]
    │
    ├── "How to Play" ──→ [Tutorial Overlay]
    │
    └── "Credits"
```

**Win Condition Check** after each turn:
- If only 1 player remains solvent → Game Over
- If fixed round limit (default: 20 rounds) is reached → Rank by net worth

---

## 7. Requirements

### 7.1 Functional Requirements

#### F0 – Game Board & Rendering
- R0.1: The game renders a 3D board with 20–24 distinct tile spaces using WebGL (Three.js or similar)
- R0.2: All players see the same board state on a shared screen
- R0.3: The board is fully visible and all tile labels are readable at default camera angle

#### F0 – Dice & Movement
- R0.4: Two dice are rolled; result is 2–12 (sum of 2d6)
- R0.5: The player's token animates step-by-step along the board path to the destination tile
- R0.6: Rolling doubles grants one extra roll; rolling three consecutive doubles sends player to Jail

#### F0 – Property System
- R0.7: Each property tile has: name, purchase price, rent schedule (base rent + 1–4 house rent), mortgage value, owner
- R0.8: Unowned properties can be purchased; owned properties charge rent on visit
- R0.9: Players can sell properties to the bank (at mortgage value) or to other players (negotiated)
- R0.10: If a player cannot pay rent, they may mortgage properties or go bankrupt

#### F0 – Knowledge Question Events
- R0.11: At least 25% of all tile spaces trigger a knowledge question
- R0.12: Questions are drawn randomly from the selected age tier's question bank
- R0.13: Correct answer: player receives a monetary reward (+$50–$200 depending on difficulty)
- R0.14: Incorrect answer: player pays a fine or loses one turn (+$20–$100 penalty or skip next roll)
- R0.15: Questions display large text; audio narration plays automatically for ages 4–6

#### F0 – Economy
- R0.16: Each player starts with $1,500 in virtual currency
- R0.17: The bank maintains an unlimited supply of virtual money
- R0.18: All transactions (purchase, rent, fines, rewards) are reflected immediately in player balances

#### F0 – Win / Loss
- R0.19: A player is eliminated when their balance goes to $0 or below and they have no unmortgaged properties to sell
- R0.20: The last remaining player is declared the winner
- R0.21: If a round limit is set and reached, the player with the highest net worth (cash + unmortgaged property values) wins

#### F1 – AI Opponents (Solo Mode)
- R1.1: 1–3 AI players make decisions: roll dice, buy properties if affordable, pay rent automatically
- R1.2: AI uses simple rule-based logic; no learning model required

#### F1 – Audio
- R1.3: Background ambient music during gameplay (looping, toggleable)
- R1.4: Sound effects for dice roll, token movement, correct/incorrect answer, property purchase
- R1.5: Text-to-speech narration for all question text for ages 4–6 tier

#### F1 – Camera Controls
- R1.6: Player can orbit the camera around the board (click-drag) and zoom in/out (scroll wheel)
- R1.7: Camera resets to default angle on "Reset Camera" button

### 7.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NF-1 | **Platform** | Web browser (Chrome, Edge, Safari, Firefox) via WebGL; no download required | 
| NF-2 | **Performance** | 60 FPS on mid-range desktop; 30 FPS minimum on tablet | 
| NF-3 | **Load Time** | Initial load < 10 seconds on broadband | 
| NF-4 | **Accessibility** | Color contrast ratios meet WCAG AA for all UI text; font size ≥ 14px | 
| NF-5 | **Scalability** | Question bank is data-driven (JSON), allowing future content additions without code changes | 
| NF-6 | **Local Play Only** | No network calls; all game state is in-memory | 
| NF-7 | **Save / Resume** | Optional: game state can be saved to browser localStorage and resumed | 

---

## 8. Acceptance Criteria

### AC-0 (P0 – Must Ship)

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-0.1 | A 3D board with 20+ tiles renders in the browser without errors | Load the game in Chrome; board is visible within 10s |
| AC-0.2 | 2 dice roll and produce random values 2–12 | Roll 20 times; each result is in range and distribution is plausible |
| AC-0.3 | Player tokens move step-by-step to the correct destination tile | Play 5 turns; token lands on expected tile each time |
| AC-0.4 | Properties can be purchased and rented | Buy an unowned property; land on it as another player; rent is deducted |
| AC-0.5 | Knowledge questions appear for at least 25% of tiles | Land on 20 question tiles; ≥5 trigger a question |
| AC-0.6 | Correct answers reward virtual money; incorrect deduct it | Answer 5 correct and 5 incorrect; balance changes match expected ± amounts |
| AC-0.7 | Game declares a winner when one player remains | Play until one player bankrupt; winner screen appears |
| AC-0.8 | 2–4 local players can complete a full game on the same device | Conduct a 4-player game from start to finish without crash |

### AC-1 (P1 – Should Ship)

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-1.1 | AI opponents can be selected (1–3) and play autonomously | Start solo mode with 1 AI; AI takes turns without user input |
| AC-1.2 | All 3 age tiers (K, P1–2, P3–4) load distinct question sets | Switch tier 3 times; questions match expected difficulty |
| AC-1.3 | Audio narration plays for K-tier questions | Enable audio; play 5 K-tier questions; all are narrated |
| AC-1.4 | Camera can orbit and zoom | Drag to orbit; scroll to zoom; camera responds within 1 frame |
| AC-1.5 | Game can be saved to localStorage and resumed | Save mid-game; refresh page; click Resume; exact state is restored |

### AC-2 (P2 – Nice to Have)

| ID | Criterion | Validation Method |
|----|-----------|-------------------|
| AC-2.1 | Subject category filtering for questions | Select "Math only"; answer 10 questions; all are math |
| AC-2.2 | Classroom mode disables turn timers | Activate classroom mode; no timer visible; pacing fully manual |

---

## 9. Risks and Open Questions

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 3D rendering performance on low-end devices | Medium | High | Target 30 FPS minimum; provide a "low quality" graphics toggle |
| Question bank content being too easy / too hard | Medium | Medium | Design questions in tiers with clear age-appropriate rubrics; allow tier switching |
| Local multiplayer confusion on shared screen (who's clicking?) | Low | Medium | Highlight the active player's token distinctly; clearly label whose turn it is |

### Open Questions (Awaiting Boss Confirmation)

| # | Question | Impact if Unanswered |
|---|---------|---------------------|
| OQ-1 | **Fixed round limit** — should a default round limit (e.g., 20 rounds) be the primary win condition, or should the game always run until all but one player is bankrupt? | Affects game balance and pacing |
| OQ-2 | **Property building (houses/hotels)** — should players be able to buy houses/hotels to increase rent, or keep the base property mechanic only? | Significantly affects game complexity and development scope |
| OQ-3 | **Question timer** — should there be a time limit per question (e.g., 15 seconds)? | Affects UX especially for younger children |
| OQ-4 | **Classroom mode specifics** — does the teacher need any special controls (mute players, skip questions, see statistics)? | Adds UI complexity if required |
| OQ-5 | **Monetization / branding** — is this a free game, or will there be premium content / DLC question packs? | Affects architecture decisions now |

---

## 10. Handoff

### Technical Stack Recommendation

| Component | Recommendation |
|-----------|----------------|
| **3D Engine** | Three.js (WebGL) — widely supported, JS-native |
| **Framework** | Vanilla JS or React-Three-Fiber for the game UI |
| **Audio** | Howler.js or Web Audio API |
| **Text-to-Speech** | Web Speech API (browser-native, no library needed) |
| **Data Storage** | JSON files for question banks; localStorage for save/resume |
| **Build** | Single HTML file or simple Vite project; deployable as static assets |

### Content Requirements

- A structured JSON file per age tier containing at minimum: `id`, `question`, `options` (array of 4), `correctIndex`, `subject`, `difficulty`
- Audio files (MP3/OGG) for UI sound effects (optional; can be synthesized)

### Milestones Suggestion (for dev planning)

| Phase | Deliverable |
|-------|-------------|
| M1 | 3D board, dice, token movement, basic turn system |
| M2 | Property purchase/rent, currency system, bankruptcy |
| M3 | Knowledge question engine + 1 question bank tier |
| M4 | AI opponents, audio, save/resume |
| M5 | Polish: camera controls, animations, all 3 question tiers, UI polish |

---

*Document prepared by Atlas PM | Workspace: workspace-pm | Next step: await Boss confirmation on this PRD and Open Questions before handoff to dev*

# Proposal Review UI - Visual Mockup

## Current UI (Before)
```
┌─────────────────────────────────────────┐
│         DEMOGRAPHICS                    │
│                                         │
│  AGE                                    │
│  27        ✓        28                  │
│                                         │
│  HEIGHT                                 │
│  5'10"     ○        5'10"               │
└─────────────────────────────────────────┘
```
**Problems:**
- ❌ Unclear whose stats are whose
- ❌ Checkmark meaning is ambiguous (good for left? right? both?)
- ❌ No visual separation between people
- ❌ Uses equality matching (not preference-based)

## New UI (After)

### Full Card with Gradient Borders
```
┌─┬─────────────────────────────────────┬─┐
│T│                                     │O│
│E│         DEMOGRAPHICS                │R│
│A│                                     │A│
│L│  AGE                                │N│
│ │  Sarah: 27    ✓    28 :John         │G│
│G│  [Person A]  [ok]  [Person B]       │E│
│R│                                     │ │
│A│  HEIGHT                             │G│
│D│  5'10"       ⚠→    5'10"            │R│
│I│  [Person A] [warn] [Person B]       │A│
│E│                                     │D│
│N│  LOCATION                           │I│
│T│  NYC         ✗     LA               │E│
│ │  [Person A] [bad]  [Person B]       │N│
└─┴─────────────────────────────────────┴─┘
  4px                                  4px
  Teal                                Orange
```

### Detailed Section Example: Demographics

**Version A: Dot + Count Header (RECOMMENDED)**
```
┌─┬─────────────────────────────────────────────────────┬─┐
│ │  ● DEMOGRAPHICS (3/4)                               │ │
│ │  ^green dot                                         │ │
│T│                                                     │O│
│E│  AGE                                                │R│
│A│  ┌─────────┐         ┌─────────┐                   │A│
│L│  │   27    │    ✓    │   28    │                   │N│
│ │  └─────────┘         └─────────┘                   │G│
│G│   ^subtle              ^subtle                     │E│
│R│   teal tint            orange tint                 │ │
│A│   rgba(20,184,         rgba(249,115,               │G│
│D│   166,0.08)            22,0.08)                     │R│
│I│                                                     │A│
│E│  HEIGHT                                             │D│
│ │  ┌─────────┐         ┌─────────┐                   │I│
│N│  │  5'10"  │   ⚠→    │  5'10"  │                   │E│
│T│  └─────────┘  (yellow└─────────┘                   │N│
│ │               gradient                              │T│
│ │               to right)                             │ │
│ │                                                     │ │
│ │  DATING DISTANCE                                    │ │
│ │  ┌─────────┐         ┌─────────┐                   │ │
│ │  │ 25 mi   │   ←⚠    │ 10 mi   │                   │ │
│ │  └─────────┘  (yellow└─────────┘                   │ │
│ │               gradient                              │ │
│ │               to left)                              │ │
│ │                                                     │ │
│ │  ETHNICITY                                          │ │
│ │  ┌─────────┐         ┌─────────┐                   │ │
│ │  │  Asian  │    ✓    │ Hispanic│                   │ │
│ │  └─────────┘         └─────────┘                   │ │
│ │                                                     │ │
└─┴─────────────────────────────────────────────────────┴─┘
```

**Alternative Versions to Test:**
- **Version B**: Full colored background header
- **Version C**: Just dot, no count
- **Version D**: Just count, no dot
**NOTE**: Implement Version A first, then test alternatives to see what looks best

## Icon States Visual Reference

### State 1: Both Happy (Green ✓)
```
     27          ✓          28
  [Sarah]    [GREEN]     [John]
             #10B981

Meaning: Sarah wants 25-30 age → John is 28 ✓
         John wants 20-30 age → Sarah is 27 ✓
```

### State 2a: Only Left Happy (Yellow Warning Left)
```
    5'10"       ⚠←        5'10"
  [Sarah]   [YELLOW]     [John]
            gradient
            to left
            #F59E0B

Meaning: Sarah wants 5'8"-6'0" → John is 5'10" ✓
         John wants 5'2"-5'8" → Sarah is 5'10" ✗
```

### State 2b: Only Right Happy (Yellow Warning Right)
```
     NYC        ⚠→         LA
  [Sarah]   [YELLOW]     [John]
            gradient
            to right
            #F59E0B

Meaning: Sarah wants max 10mi → actual 2500mi ✗
         John wants max 3000mi → actual 2500mi ✓
```

### State 3: Neither Happy (Red ✗)
```
  Christian      ✗        Atheist
  [Sarah]     [RED]      [John]
              #EF4444

Meaning: Sarah wants Christian → John is Atheist ✗
         John wants Atheist → Sarah is Christian ✗
```

### State 4: Unknown/Hidden (Grey ⊝)
```
   Sometimes     ⊝         —
  [Sarah]     [GREY]     [John]
              #94A3B8

Meaning: John set drinking to "prefer not to say"
         Cannot evaluate compatibility
```

## Lifestyle Section Example (Complex Logic)

### Scenario 1: Both Don't Care
```
┌─┬─────────────────────────────────────────────────────┬─┐
│ │  LIFESTYLE                                          │ │
│ │                                                     │ │
│T│  DRINKING                                           │O│
│E│  Routine:  Sometimes       Sometimes                │R│
│A│  Wants:    Don't care      Don't care               │A│
│L│  Result:      [   ✓ GREEN - Both Happy   ]          │N│
│ │                                                     │G│
│ │  CANNABIS                                           │E│
│ │  Routine:  No              Yes                      │ │
│ │  Wants:    Don't care      Don't care               │G│
│ │  Result:      [   ✓ GREEN - Both Happy   ]          │R│
│ │                                                     │A│
└─┴─────────────────────────────────────────────────────┴─┘
```

### Scenario 2: Mismatch with One Don't Care
```
┌─┬─────────────────────────────────────────────────────┬─┐
│ │  LIFESTYLE                                          │ │
│ │                                                     │ │
│T│  DRINKING                                           │O│
│E│  Routine:  Yes             No                       │R│
│A│  Wants:    Yes             Don't care               │A│
│L│  Result:      [ ⚠→ YELLOW - Only John Happy ]       │N│
│ │               Sarah wants Yes, John is No ✗         │G│
│ │               John doesn't care ✓                   │E│
│ │                                                     │ │
└─┴─────────────────────────────────────────────────────┴─┘
```

### Scenario 3: Prefer Not to Say
```
┌─┬─────────────────────────────────────────────────────┬─┐
│ │  LIFESTYLE                                          │ │
│ │                                                     │ │
│T│  CANNABIS                                           │O│
│E│  Routine:  —               Sometimes                │R│
│A│            (hidden)                                 │A│
│L│  Wants:    No              Sometimes                │N│
│ │  Result:      [  ⊝ GREY - Cannot Evaluate  ]        │G│
│ │               Sarah's routine is hidden             │E│
│ │                                                     │ │
└─┴─────────────────────────────────────────────────────┴─┘
```

## Values & Interests Section

### High Overlap (Green Section)
```
┌─┬─────────────────────────────────────────────────────┬─┐
│ │  ● VALUES & INTERESTS                               │ │
│ │  ^green dot indicator                               │ │
│ │                                                     │ │
│T│  SHARED VALUES (4/5 - 80% overlap)                  │O│
│E│  ┌───────────────────────────────────────────┐     │R│
│A│  │ Honesty • Family • Adventure • Kindness   │     │A│
│L│  └───────────────────────────────────────────┘     │N│
│ │  ^displayed in green text                          │G│
│ │                                                     │E│
│ │  UNIQUE TO SARAH: Ambition                         │ │
│ │  UNIQUE TO JOHN: Spirituality                      │G│
│ │                                                     │R│
│ │  SHARED INTERESTS (3/6 - 50% overlap)              │A│
│ │  ┌───────────────────────────────────────────┐     │D│
│ │  │ Hiking • Cooking • Reading                │     │I│
│ │  └───────────────────────────────────────────┘     │E│
│ │                                                     │N│
└─┴─────────────────────────────────────────────────────┴─┘
```

### Low Overlap (Red Section)
```
┌─┬─────────────────────────────────────────────────────┬─┐
│ │  ● VALUES & INTERESTS                               │ │
│ │  ^red dot indicator                                 │ │
│ │                                                     │ │
│T│  SHARED VALUES (1/6 - 17% overlap)                  │O│
│E│  ┌───────────────────────────────────────────┐     │R│
│A│  │ Honesty                                   │     │A│
│L│  └───────────────────────────────────────────┘     │N│
│ │                                                     │G│
│ │  UNIQUE TO SARAH: Family, Adventure, Growth,       │E│
│ │                   Kindness                          │ │
│ │  UNIQUE TO JOHN: Wealth, Status, Power             │G│
│ │                                                     │R│
└─┴─────────────────────────────────────────────────────┴─┘
```

## Color Palette Reference

### Person Colors (for borders & subtle tints)
- **Person A (Left)**: Teal `#14B8A6`
- **Person B (Right)**: Orange `#F97316`

### Status Colors
- **Both Happy**: Green `#10B981`
- **One Happy**: Yellow `#F59E0B` (with gradient toward happy person)
- **Neither Happy**: Red `#EF4444`
- **Unknown/Hidden**: Grey `#94A3B8`

### Section Indicators (Values/Interests)
- **High overlap (≥66%)**: Green dot/background
- **Medium overlap (33-66%)**: Yellow dot/background
- **Low overlap (<33%)**: Red dot/background

## Responsive Behavior

### Desktop/Tablet (>600px)
```
┌─────────────────────────────────────────┐
│  Sarah                  John            │
│  [photo]       ❤       [photo]          │
│  [Profile btn]      [Profile btn]       │
│                                         │
│  ┌─┬─────────────────────────────┬─┐   │
│  │T│  COMPARISON CARDS           │O│   │
│  │E│                             │R│   │
│  │A│  [Details here...]          │A│   │
│  │L│                             │N│   │
│  └─┴─────────────────────────────┴─┘   │
│                                         │
│  [Good Match] [Not a Fit] [For Friend] │
└─────────────────────────────────────────┘
```

### Mobile (<600px) - Keep Side-by-Side
```
┌───────────────────┐
│ Sarah    ❤   John │
│ [photo]   [photo] │
│  [Btn]     [Btn]  │
│                   │
│ ┌─┬───────────┬─┐ │
│ │T│           │O│ │
│ │E│  DEMO     │R│ │
│ │A│           │A│ │
│ │L│ 27  ✓  28 │N│ │
│ │ │           │G│ │
│ │G│ 5'10"     │E│ │
│ │R│   ⚠→      │ │ │
│ │A│   5'10"   │G│ │
│ │D│           │R│ │
│ └─┴───────────┴─┘ │
│                   │
│ [  Good Match  ] │
│ [NotFit][Friend] │
└───────────────────┘
```

## Animation Ideas (Optional Future Enhancement)

### Yellow Warning Gradient
- Subtle pulse animation (0.8s interval)
- Gradient smoothly transitions toward happy person
- Arrow could gently "point" with slight movement

### Section Expansion
- Smooth height transition when toggling details
- Fade in/out for unique values vs shared values

### Vote Feedback
- Checkmark/X animation on button press
- Card slide animation when advancing to next proposal
- Haptic feedback (already implemented)

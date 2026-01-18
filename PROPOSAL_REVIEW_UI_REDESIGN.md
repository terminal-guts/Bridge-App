# Proposal Review UI Redesign Specification

## Overview
Complete redesign of the ProposalReviewView component to make compatibility matching clear, intuitive, and visually digestible.

## Core Principle
**Preference-based matching, NOT equality-based matching**
- We check if Person A's profile meets Person B's preferences
- We check if Person B's profile meets Person A's preferences
- Exception: Values and Interests assume equality/overlap is compatible

## Visual Design System

### 1. Person Color Coding
Each person gets a distinct color identity throughout the UI:

**Selected Colors:**
- **Left Person (Person A)**: Purple `#8B5CF6`
- **Right Person (Person B)**: Teal `#14B8A6`

**Rationale**: High contrast, gender-neutral, accessible, and distinct from status colors (green/yellow/red). Purple and teal avoid gender signaling (unlike blue/pink) and don't conflict with status indicators.

### 2. Card Visual Structure

#### Gradient Borders
- **Left edge**: 4px vertical gradient in Person A's color (full height of card)
- **Right edge**: 4px vertical gradient in Person B's color (full height of card)
- Gradients run from top to bottom of each comparison section card

#### Implementation
```
[4px Purple] [White Card Content] [4px Teal]
     ↓                                  ↓
   Person A                          Person B
```

### 3. Match Status Indicators (Three-State System)

Located **center** between two values for each attribute:

#### State 1: Both Needs Met ✓
- **Icon**: Green checkmark circle `✓`
- **Color**: `#10B981`
- **Meaning**: Both Person A's preferences are satisfied by B's profile AND Person B's preferences are satisfied by A's profile

#### State 2: One Need Met ⚠
- **Icon**: Yellow warning icon with gradient shading toward satisfied side
  - Gradient shades LEFT (toward teal) if only Person A's needs are met
  - Gradient shades RIGHT (toward orange) if only Person B's needs are met
- **Color**: `#F59E0B` (warning yellow)
- **Meaning**: Only one person's preferences are satisfied

#### State 4: Unknown/Hidden Data ⊝
- **Icon**: Grey circle or neutral icon
- **Color**: `#94A3B8` (neutral grey)
- **Meaning**: One or both people have hidden this information ("prefer not to say") or data cannot be evaluated

#### State 3: Neither Need Met ✗
- **Icon**: Red X circle `✗`
- **Color**: `#EF4444`
- **Meaning**: Neither person's preferences are satisfied

### 4. Side Attribution & Layout
**DECISION: Option A - Subtle Background Tinting**

Display format: `[ 27 ] ✓ [ 28 ]`

**Implementation:**
- Left value (Person A): Very subtle purple background tint (e.g., `rgba(139, 92, 246, 0.08)`)
- Right value (Person B): Very subtle teal background tint (e.g., `rgba(20, 184, 166, 0.08)`)
- Light rounded rectangle background for each value
- Padding: 8-12px horizontal, 4-6px vertical
- Border radius: 8px

**Rationale:**
- No names revealed (privacy preserved)
- Relies on color coding + gradient borders to associate values with people
- Clean, minimal design
- Subtle enough to not overwhelm but clear enough to distinguish

### 5. Section Headers & Organization
**RECOMMENDATION: Colored Dot Indicator (Option C) + Count (Option B)**

**Recommended Approach:**
```
● Demographics (2/3)
^green dot
```

Combine the visual indicator (colored dot) with the count for maximum clarity:
- Colored dot (●) on the left in green/yellow/red based on section compatibility
- Section name in bold
- Count in lighter text showing "compatible/total"
- Example: `● Demographics (2/3)` in green means 2 out of 3 attributes are compatible

**Alternative Options to Test:**
- Option A: Full header background color (might be too heavy/distracting)
- Option C alone: Just dot without count (less informative)
- Option B alone: Just count without color coding (harder to scan quickly)

**Decision**: Implement Option C + B combination first, then test alternatives if needed during development to see what looks best and is most intuitive.

## Comparison Sections (In Order)

The UI will display these sections in this exact order:

1. **Age**
2. **Height**
3. **Dating Distance** (max distance willing to travel/date)
4. **Ethnicity** (preference-based matching)
5. **Politics** (assume people want the same - equality-based)
6. **Religion** (assume people want the same - equality-based)
7. **Lifestyle** (drinking, cannabis, tobacco - special logic, see below)
8. **Values and Interests** (assume people want the same - overlap-based)

## Matching Logic Details

### Hidden Data Handling
**All fields are mandatory** - everyone must enter data to join the matching pool.

However, users can choose to hide certain information from others. When hidden:
- Display: Em dash `—` instead of actual value
- Status Icon: Grey neutral icon (State 4)
- Matching: Cannot evaluate compatibility (grey state)

### Age Matching
**Formula**:
- Check if Person B's age falls within Person A's preferred age range
- Check if Person A's age falls within Person B's preferred age range

**Example**:
- Person A: age 20, wants 28-35
- Person B: age 30, wants 18-25
- A's needs: B is 30, A wants 28-35 → ✓ MET
- B's needs: A is 20, B wants 18-25 → ✓ MET
- **Result**: Both Happy (Green ✓)

### Height Matching
**Formula**:
- Check if Person B's height falls within Person A's preferred height range
- Check if Person A's height falls within Person B's preferred height range

**Example**:
- Person A: 5'10", wants 5'6"-6'2"
- Person B: 5'10", wants 5'0"-5'8"
- A's needs: B is 5'10", A wants 5'6"-6'2" → ✓ MET
- B's needs: A is 5'10", B wants 5'0"-5'8" → ✗ NOT MET
- **Result**: Only Left Happy (Yellow ◀)

### Location Matching
**Formula**: Direct equality check
- If same location → Both Happy (Green ✓)
- If different location → Neither Happy (Red ✗)

### Religion Matching
**Formula**: Direct equality check
- If same religion → Both Happy (Green ✓)
- If different religion → Neither Happy (Red ✗)

### Political Leaning Matching
**Formula**: Direct equality check
- If same political leaning → Both Happy (Green ✓)
- If different political leaning → Neither Happy (Red ✗)

### Dating Distance Matching
**Formula**: Check if distance between them falls within each person's max dating distance preference
- Check if distance ≤ Person A's max dating distance
- Check if distance ≤ Person B's max dating distance
- Both within range → Both Happy (Green ✓)
- Only one within range → One Happy (Yellow ⚠ with gradient)
- Neither within range → Neither Happy (Red ✗)

### Ethnicity Matching
**Formula**: Preference-based matching
- Check if Person B's ethnicity is in Person A's preferred ethnicities list
- Check if Person A's ethnicity is in Person B's preferred ethnicities list
- If person has no ethnicity preference (open to all) → that person is automatically happy
- Both happy → Green ✓
- Only one happy → Yellow ⚠ with gradient
- Neither happy → Red ✗

### Lifestyle Matching (Drinking/Cannabis/Tobacco)
**NEW SPECIAL LOGIC** - More complex than other attributes

#### Answer Options
**For personal routine:**
- `yes` - I do this
- `sometimes` - I occasionally do this
- `no` - I don't do this
- `prefer_not_to_say` - I don't want to share this

**For preference (what you want in a partner):**
- **Format**: Array of strings (supports multiple selections)
- Options: `["yes"]`, `["sometimes"]`, `["no"]`, `["don't care"]`
- Can select multiple: `["yes", "sometimes"]`
- Note: Uses "don't care" with apostrophe

#### Matching Algorithm

**Step 1: Check for "prefer not to say"**
- If either person's routine is `prefer_not_to_say` → **Grey State** (cannot evaluate)
- Display em dash `—` for that person's value

**Step 2: Normalize preferences to arrays**
- Convert string to array if needed: `"yes"` → `["yes"]`
- Supports legacy data and new array format

**Step 3: Check for "don't care"**
- If Person A's preference array includes `"don't care"` → Person A is automatically happy ✓
- If Person B's preference array includes `"don't care"` → Person B is automatically happy ✓
- If BOTH preference arrays include `"don't care"` → **Green State** (both happy)

**Step 4: Match routine with preference array**
- Person A is happy if: Person B's routine is IN Person A's preference array OR A has "don't care"
- Person B is happy if: Person A's routine is IN Person B's preference array OR B has "don't care"
- Example: If Person A prefers `["yes", "sometimes"]`, they're happy if Person B's routine is "yes" OR "sometimes"

**Step 5: Determine final state**
- Both happy → **Green State** ✓
- Only Person A happy → **Yellow State** ⚠ (gradient toward left/teal)
- Only Person B happy → **Yellow State** ⚠ (gradient toward right/orange)
- Neither happy → **Red State** ✗

#### Examples

**Example 1: Both don't care**
- Person A: routine `yes`, preference `["don't care"]`
- Person B: routine `no`, preference `["don't care"]`
- Result: Both happy (Green ✓) - both don't care

**Example 2: One prefers not to say**
- Person A: routine `prefer_not_to_say`, preference `["yes"]`
- Person B: routine `yes`, preference `["yes"]`
- Result: Grey ⊝ - cannot evaluate because A's routine is hidden

**Example 3: Mismatch with one don't care**
- Person A: routine `yes`, preference `["yes"]`
- Person B: routine `no`, preference `["don't care"]`
- A is happy? B's routine is `no`, A's preferences are `["yes"]` → `no` not in array → ✗
- B is happy? B has "don't care" → ✓
- Result: Only B happy (Yellow ⚠ toward orange)

**Example 4: Perfect match**
- Person A: routine `sometimes`, preference `["sometimes"]`
- Person B: routine `sometimes`, preference `["sometimes"]`
- A is happy? B's routine is `sometimes`, A's preferences are `["sometimes"]` → ✓
- B is happy? A's routine is `sometimes`, B's preferences are `["sometimes"]` → ✓
- Result: Both happy (Green ✓)

**Example 5: Multiple preferences accepted**
- Person A: routine `yes`, preference `["yes", "sometimes"]`
- Person B: routine `sometimes`, preference `["sometimes", "no"]`
- A is happy? B's routine is `sometimes`, A's preferences are `["yes", "sometimes"]` → ✓
- B is happy? A's routine is `yes`, B's preferences are `["sometimes", "no"]` → `yes` not in array → ✗
- Result: Only A happy (Yellow ⚠ toward teal)

**Example 6: Compatible with different routines**
- Person A: routine `yes`, preference `["no"]`
- Person B: routine `no`, preference `["yes"]`
- A is happy? B's routine is `no`, A's preferences are `["no"]` → ✓
- B is happy? A's routine is `yes`, B's preferences are `["yes"]` → ✓
- Result: Both happy (Green ✓)

### Family Plans Matching
**Formula**: Direct equality check
- If same family plans → Both Happy (Green ✓)
- If different family plans → Neither Happy (Red ✗)

### Values Matching (Special Case)
**Formula**: Overlap-based, assume people want the same values
- Calculate shared values: `commonValues = A.values ∩ B.values`
- Calculate unique values: `uniqueA = A.values - B.values`, `uniqueB = B.values - A.values`
- Calculate overlap percentage: `overlapPercent = (commonValues.length / max(A.values.length, B.values.length)) * 100`

**Display Strategy**:
1. Show count of shared values
2. List shared values in green
3. Show unique values separately (for context)

**Section Status** (Recommended Thresholds):
- Many shared (≥66% overlap) → Green section indicator ✓
- Some shared (33-66% overlap) → Yellow section indicator ⚠
- Few/none shared (<33% overlap) → Red section indicator ✗

### Interests Matching (Special Case)
**Same logic as Values** - overlap-based matching

## Visual Hierarchy (Top to Bottom)

1. **Progress Indicator** (existing, keep as-is)
2. **Person Photos + Heart Icon** (existing, keep as-is)
3. **Match Score Card** (existing, keep as-is with possible color gradient in progress bar)
4. **Comparison Sections** (redesigned with new system):
   - Demographics
   - Background
   - Lifestyle
   - Values & Interests

## Mobile Considerations

### Layout Strategy
**Recommendation**: Keep side-by-side layout for now
- Most attributes are short (age, height, etc.)
- Side-by-side reinforces "two people comparing"
- If text overflow becomes issue, truncate with ellipsis

### Accessibility
- Ensure color contrast meets WCAG AA standards
- Don't rely solely on color (use icons + color)
- Test with colorblind simulation tools
- Consider adding setting for "high contrast mode" in future

### Responsive Breakpoints
- On very small screens (<320px width), consider:
  - Smaller font sizes
  - Reduced padding
  - Icons only (no text labels)

## Implementation Questions to Resolve

1. ✅ **Side Attribution**: DECIDED - Use Option A (subtle background tinting)
   - No names revealed (privacy)
   - Subtle teal/orange tints for left/right values

2. **Section Headers**: RECOMMENDED - Colored dot + count (Option C + B)
   - Implementation: `● Demographics (2/3)` with colored dot
   - **TEST MULTIPLE**: During implementation, create 2-3 variations to compare
   - Options to try: full background color, dot only, count only, dot+count
   - Choose what looks best and is most scannable

3. **Lifestyle Data Structure**: Need to verify current data model
   - Does the backend store both routine AND preference for drinking/cannabis/tobacco?
   - Do we have `dont_care` and `prefer_not_to_say` options in the database?
   - May need backend updates to support new logic

4. **Dating Distance**: Need to verify if this field exists
   - Is "dating distance" already in the user preferences?
   - What unit (miles/km)?
   - How is actual distance between users calculated?

5. **Yellow Warning Gradient**: Implementation approach
   - CSS gradient toward satisfied person's color?
   - SVG icon with gradient fill?
   - Two-tone icon design?
   - Test for visual clarity

## Critical Data Model Findings

### Current State
After analyzing the codebase, here's what exists:

✅ **Dating Distance**: Already exists
- Field: `MatchPreferences.maxDistance` (in miles, null = no limit)
- Ready to use for matching logic

✅ **Lifestyle Fields**: Personal routines exist
- `drinkingFrequency`, `cannabisFrequency`, `tobaccoFrequency` exist on UserProfile
- Currently use simple values: "Yes", "Sometimes", "No"

✅ **Partner Preferences**: Partially exist
- Field: `partnerLifestylePreferences` exists with drinking, cannabis, tobacco
- Currently just strings, not structured with the new logic

### Required Changes

⚠️ **Lifestyle Data Model Needs Update**

**Current values:**
- Personal: "Yes", "Sometimes", "No"
- Partner prefs: Just strings

**Need to support:**
- Personal routine: "yes", "sometimes", "no", "prefer_not_to_say"
- Partner preference: "yes", "sometimes", "no", "dont_care"

**Impact:**
- Update onboarding screens to collect new values
- Update data types to support new options
- Migration strategy for existing data (map "Yes"→"yes", etc.)
- Backend needs to support new enum values

### Distance Calculation

Need to verify:
- How is actual distance between two users calculated?
- Is it based on coordinates? Zip codes? City names?
- Currently `maxDistance` exists in preferences but need to check if distance is calculated in proposals

## Next Steps

1. ✅ Finalize color palette (Teal/Orange selected)
2. Create mock-ups or wireframes for layout options
3. Get approval on design direction
4. Begin implementation with trial-and-error sections marked
5. User testing with real data
6. Iterate based on feedback

## Files to Modify

- `/src/components/community/ProposalReviewView.tsx` (main component)
- Possibly create new components:
  - `ComparisonRow.tsx` (reusable row component)
  - `MatchStatusIcon.tsx` (three-state icon logic)
  - `PersonGradientCard.tsx` (card with gradient borders)

## Design Philosophy

**Make it obvious at a glance:**
- Who is who (color coding)
- What's compatible (green)
- What's a potential issue (red/yellow)
- Who wants what (preference-based, not equality-based)

**Progressive disclosure:**
- Top-level: Match score + color coding
- Mid-level: Section-by-section compatibility
- Detail-level: Specific attribute matches

**User trust:**
- Transparent about matching logic
- Clear visual language
- Consistent throughout the app

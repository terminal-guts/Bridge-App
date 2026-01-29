# Bridge Matching Algorithm

**Mutual percentage-based matching. Gradient scoring: closer = higher. All categories sum to 100%.**

## Category Weights

| Category | Weight |
|----------|--------|
| Age Range | 18% |
| Distance | 15% |
| Lifestyle Substances | 12% |
| Values | 10% |
| Interests | 10% |
| Family | 8% |
| Religion | 6% |
| Politics | 6% |
| Height | 5% |
| Ethnicity | 5% |
| Education | 3% |
| Career | 2% |

---

## Scoring Formulas

### 1. Age Range (18%)
```
If age outside range → 0%
If in range:
  ideal_age = (ageMin + ageMax) / 2
  distance_from_ideal = |person_age - ideal_age|
  score = 100% - (distance_from_ideal / ((ageMax - ageMin) / 2)) * 50%

Mutual: average both directions
Final = mutual_score * 18%
```

---

### 2. Distance (15%)
```
max_acceptable = min(A.maxDistance, B.maxDistance)
If maxDistance = 200 or null → "no preference", use 200 baseline

If actual_distance > max_acceptable → 0%
Else: score = 100% * (1 - (actual_distance / max_acceptable)^0.7)

Final = score * 15%
```

---

### 3. Lifestyle Substances (12%)
```
For each substance (drinking, cannabis, tobacco, otherDrugs):
  If B accepts "dont_care" → 100%
  If A's habit in B's preferences array → 100%
  If A = "sometimes" and B accepts only ["yes"] or ["no"] (not both) → 50%
  If A = "prefer_not_to_say" → 50%
  Else → 0%

Mutual per substance: average both directions
Final = avg(all 4 substances) * 12%
Each substance = 3% of total
```

---

### 4. Values (10%)
```
Jaccard similarity = shared_values / union_values
Final = score * 10%
```

---

### 5. Interests (10%)
```
Jaccard similarity = shared_interests / union_interests
Final = score * 10%
```

---

### 6. Family (8%)

**Has Children (3.2%):**
```
If B has "has_children" non-negotiable:
  A has kids → 0%, A no kids → 100%
Else:
  Both same → 100%
  One has, one doesn't → 50%
  Either "prefer_not_to_say" → 75%

Mutual: average both directions
```

**Family Plans (4.8%):**
```
Compatibility matrix:
want_someday + want_someday = 100%
want_someday + open = 80%
want_someday + not_sure = 60%
want_someday + dont_want = 0%
want_someday + prefer_not_to_say = 50%

dont_want + dont_want = 100%
dont_want + open = 40%
dont_want + not_sure = 40%

open + open = 100%
open + not_sure = 80%

not_sure + not_sure = 90%

prefer_not_to_say + anything = 50%

Mutual: average both directions
```

---

### 7. Religion (6%)
```
If B has "different_religion" non-negotiable:
  Same religion → 100%, Different → 0%

If no non-negotiable:
  Same religion → 100%
  Similar (Christian/Spiritual, Buddhist/Spiritual) → 75%
  Different but not opposing → 50%
  Opposing (Atheist/Religious) → 25%

Mutual: average both directions
Final = score * 6%
```

---

### 8. Politics (6%)
```
If B accepts "No Preference" → 100%
If A's leaning in B's preferences → 100%

Adjacent leanings:
  very_liberal + liberal = 80%
  liberal + moderate = 70%
  moderate + conservative = 70%
  conservative + very_conservative = 80%
  moderate + not_political = 80%
  any + not_political = 60%

Opposite extremes (very_liberal + very_conservative) = 0%
prefer_not_to_say + anything = 50%

Mutual: average both directions
Final = score * 6%
```

---

### 9. Height (5%)
```
If height outside range → 0%
If in range:
  ideal_height = (heightMin + heightMax) / 2
  distance_from_ideal = |person_height - ideal_height|
  score = 100% - (distance_from_ideal / ((heightMax - heightMin) / 2)) * 50%

Mutual: average both directions
Final = score * 5%
```

---

### 10. Ethnicity (5%)
```
If B accepts "No Preference" → 100%
If A's ethnicity in B's preferences → 100%
If A has multiple (e.g., "Asian / White"), split on " / ":
  If any component matches → 100%
If custom ethnicity not in standard list → 50%
Else → 0%

Mutual: average both directions
Final = score * 5%
```

---

### 11. Education (3%)
```
Hierarchy:
  L0: no_high_school
  L1: high_school
  L2: some_college, trade_school
  L3: associates
  L4: bachelors
  L5: masters
  L6: phd, beyond_masters, professional
  LX: other (treat as L3)

Same level → 100%
1 level apart → 80%
2 levels apart → 60%
3 levels apart → 40%
4+ levels apart → 20%
Either null → 50%

Final = score * 3%
```

---

### 12. Career (2%)
```
Same company or school → 100%
Similar job keywords → 75%
Both have values but no match → 50%
Either field missing → 50%
No overlap → 25%

Final = score * 2%
```

---

## Edge Cases

**Missing/Optional Fields:**
- Education, school, company, hometown null → 50%
- "other", "prefer_not_to_say" → 50%

**No Preference Options:**
- Ethnicity "No Preference" → 100%
- Politics "No Preference" → 100%
- Lifestyle "dont_care" → 100%

**Custom Entries:**
- Custom ethnicity: same → 100%, different → 50%
- Custom gender: matches interestedInGenders → 100%, else → 0%
- Custom politics: exact match → 100%, else → 50%

**Multi-value Fields:**
- Gender arrays: any overlap → pass to pool
- Ethnicity "Asian / White": either component matches → 100%

**Non-Negotiables:**
- Violated → 0% in that category
- Met → 100% in that category

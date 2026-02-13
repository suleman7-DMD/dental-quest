# Meal & Food System

## Table of Contents
- [Quick Meal Modal -- Primary Entry Point](#quick-meal-modal--primary-entry-point)
  - [`openQuickMealModal()` -- Line 11528](#openquickmealmodal--line-11528)
  - [Quantity Selector](#quantity-selector)
  - [Meal Creation Pattern](#meal-creation-pattern)
- [Custom Meal](#custom-meal)
  - [`addCustomMeal()` -- Line ~10640](#addcustommeal--line-10640)
- [Edit/Delete Meals](#editdelete-meals)
  - [`editMeal(mealId)` -- Line ~10500](#editmealmealid--line-10500)
  - [`deleteMeal(mealId)` -- Line ~10560](#deletemealmealid--line-10560)
- [Import from Claude](#import-from-claude)
  - [`openImportMealModal(dateStr)` -- Line 11185](#openimportmealmodaldatestr--line-11185)
  - [`openImportWorkoutModal(dateStr)` -- Line 11318](#openimportworkoutmodaldatestr--line-11318)
- [Frequent Foods Library](#frequent-foods-library)
  - [Default Foods (21 items)](#default-foods-21-items)
  - [Frequent Foods Merge](#frequent-foods-merge)
  - [Empty Frequent Foods Protection](#empty-frequent-foods-protection)
  - [`getDefaultFrequentFoods()` -- Line ~7730](#getdefaultfrequentfoods--line-7730)
- [Meal Rendering](#meal-rendering)
  - [`renderSimpleMealList()` -- Line 8763](#rendersimplemeallist--line-8763)
  - [`renderMealsList()` -- Line ~10164](#rendermealslist--line-10164)
- [Totals Calculation](#totals-calculation)
  - [`getTodayTotals()` -- Line 8236](#gettodaytotals--line-8236)
  - [`getTotalsForDate(dateStr)` -- Line 8266](#gettotalsfordatedatestr--line-8266)
- [Array-to-Object Migration](#array-to-object-migration)
  - [`ensureMealsObject(dateStr)` -- Line ~10765](#ensuremealsobjectdatestr--line-10765)
- [Key Functions Reference](#key-functions-reference)

## Quick Meal Modal — Primary Entry Point

### `openQuickMealModal()` — Line 11528

Main meal logging interface. Shows frequent foods sorted by usage count, with search filter and quantity selector.

Flow:
1. User taps "+ Meal" button
2. Modal shows frequent foods grid sorted by `uses` count (most used first)
3. User taps a food item → opens quantity selector (1x, 2x, 0.5x, custom)
4. `confirmQtyAdd(foodId, qty)` creates the meal entry
5. `saveState()` + `saveDayLog()` + `awardXP(10, 'Logged meal')` + `checkDayCompletion()` + `renderSimpleView()`

### Quantity Selector
```javascript
// Options: 0.5x, 1x, 1.5x, 2x, 3x, Custom
// Custom allows entering exact multiplier
// Macros are scaled: calories * qty, protein * qty, carbs * qty
```

### Meal Creation Pattern
```javascript
const mealId = generateId('meal');
state.today.meals[mealId] = {
    id: mealId,
    name: food.name + (qty !== 1 ? ` (${qty}x)` : ''),
    calories: Math.round(food.calories * qty),
    protein: Math.round(food.protein * qty),
    carbs: Math.round(food.carbs * qty),
    time: formatTimeET(new Date()),
    date: getLocalDateString()
};
food.uses++;  // Increment usage counter for sort priority
```

## Custom Meal

### `addCustomMeal()` — Line ~10640

For meals not in the frequent foods library:
1. User enters name, calories, protein, carbs manually
2. Creates meal object with same pattern as above
3. Does NOT add to frequent foods library

## Edit/Delete Meals

### `editMeal(mealId)` — Line ~10500

Opens inline edit in the meal list. Changes are applied in-place:
```javascript
state.today.meals[mealId] = { ...state.today.meals[mealId], name, calories, protein, carbs };
```

### `deleteMeal(mealId)` — Line ~10560

Removes meal from `state.today.meals`:
```javascript
delete state.today.meals[mealId];
saveState();
saveDayLog();
renderSimpleView();
```

## Import from Claude

### `openImportMealModal(dateStr)` — Line 11185

Bulk import meals from text format. Supports importing to any date (today or historical).

Format: `MEAL|Name|Calories|Protein|Carbs|Fat` (one per line, Fat optional)

```javascript
// For today's date: adds to state.today.meals
// For historical date: adds to state.dailyLogs[date].meals
// Calls ensureMealsObject() to ensure object-based storage
```

### `openImportWorkoutModal(dateStr)` — Line 11318

Same pattern for workouts: `WORKOUT|Type|Duration|Calories|Time` (Time optional, HH:MM format)

## Frequent Foods Library

### Default Foods (21 items)

Stored as `state.frequentFoods`, keyed by `ff_001` through `ff_021`.

| ID | Name | Cal | Protein | Carbs |
|----|------|-----|---------|-------|
| ff_001 | Just Bare Chicken (6oz) | 340 | 38 | 18 |
| ff_002 | Just Bare Chicken (3oz) | 170 | 19 | 9 |
| ff_003 | Vital Farms Egg (1) | 70 | 6 | 0 |
| ff_004 | Vital Farms Eggs (2) | 140 | 12 | 0 |
| ff_005 | 365 Salmon Patty | 170 | 17 | 2 |
| ff_006 | Orgain Shake 30g | 160 | 30 | 3 |
| ff_007 | Orgain Plant 20g | 150 | 20 | 15 |
| ff_008 | Oikos Greek Yogurt | 90 | 15 | 4 |
| ff_009 | Chipotle 2x Chicken Bowl | 1035 | 81 | 85 |
| ff_010 | Chipotle + 1 Tortilla | 1355 | 89 | 130 |
| ff_011 | Dave's 2 Sliders + Mac | 1200 | 55 | 95 |
| ff_012 | 365 Margherita Pizza | 880 | 32 | 96 |
| ff_013 | 365 Wheat Bread (1 slice) | 90 | 4 | 17 |
| ff_014 | 365 Wheat Bread (2 slices) | 180 | 8 | 34 |
| ff_015 | Eggs + Toast (2+2) | 320 | 20 | 34 |
| ff_016 | Trail Mix (handful) | 220 | 7 | 20 |
| ff_017 | Trail Mix (big handful) | 330 | 10 | 30 |
| ff_018 | 365 Flax Cereal (1 cup) | 210 | 8 | 38 |
| ff_020 | Kirkland Turkey Burger | 200 | 22 | 3 |
| ff_021 | Rotisserie Chicken (6oz) | 280 | 38 | 0 |

Note: ff_019 is missing from defaults (gap in numbering).

### Frequent Foods Merge

`mergeFrequentFoods(local, firebase)` — Preserves local additions while updating usage counts from Firebase. Used during `loadFromFirebase()` and `setupRealtimeSync()`.

### Empty Frequent Foods Protection

Multiple safeguards against empty frequent foods:
1. `loadState()` line 15143: if empty after load, repopulate defaults
2. `loadFromFirebase()` line 15275: if empty after merge, repopulate defaults
3. `loadState()` line 15047: check `getCount(loadedFoods) > 0` before using loaded foods

### `getDefaultFrequentFoods()` — Line ~7730

Returns the default 21 frequent foods as an object. Called when `frequentFoods` is empty after any load operation.

## Meal Rendering

### `renderSimpleMealList()` — Line 8763

Inline meal list in Simple View. Shows sorted by time, with edit/delete buttons per meal.

### `renderMealsList()` — Line ~10164

Full meal list in Dashboard view (less commonly used in v3).

## Totals Calculation

### `getTodayTotals()` — Line 8236

```javascript
function getTodayTotals() {
    const meals = getValues(state.today.meals);
    return {
        calories: meals.reduce((sum, m) => sum + (m.calories || 0), 0),
        protein: meals.reduce((sum, m) => sum + (m.protein || 0), 0),
        carbs: meals.reduce((sum, m) => sum + (m.carbs || 0), 0),
        mealCount: meals.length
    };
}
```

### `getTotalsForDate(dateStr)` — Line 8266

Same calculation but works for any date — uses `state.today.meals` if today, otherwise reads from `state.dailyLogs[dateStr]`.

## Array-to-Object Migration

Before any meal operation on loaded data:
```javascript
if (!state.today.meals || Array.isArray(state.today.meals)) {
    state.today.meals = migrateArrayToObject(state.today.meals, 'meal');
}
```

### `ensureMealsObject(dateStr)` — Line ~10765

Ensures `state.dailyLogs[dateStr].meals` is an object (not array). Called before import operations on historical dates.

## Key Functions Reference

| Function | Line | Purpose |
|----------|------|---------|
| `openQuickMealModal()` | 11528 | Primary meal entry |
| `confirmQtyAdd(foodId, qty)` | ~11580 | Complete meal add with quantity |
| `addCustomMeal()` | ~10640 | Manual meal entry |
| `editMeal(mealId)` | ~10500 | Edit existing meal |
| `deleteMeal(mealId)` | ~10560 | Delete meal |
| `openImportMealModal(dateStr)` | 11185 | Claude text import |
| `processImportedMeals()` | 11239 | Parse and add imported meals |
| `renderSimpleMealList()` | 8763 | Simple View meal list |
| `getTodayTotals()` | 8236 | Sum today's macros |
| `getTotalsForDate(dateStr)` | 8266 | Sum any date's macros |
| `getDefaultFrequentFoods()` | ~7730 | Default food library |
| `mergeFrequentFoods(local, firebase)` | ~7750 | Merge food lists |
| `ensureMealsObject(dateStr)` | ~10765 | Array-to-object migration |

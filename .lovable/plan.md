

## Plan: Import Products Data from CSV

### CSV Analysis

The CSV has **178 products** with 22 columns. Comparing with the current `products` table schema:

**Columns that match the DB schema (keep):**
id, title, description, category_id, farmer_id, price, old_price, unit, image_url, is_new, is_featured, created_at, updated_at, is_active, prep_time_minutes, composition, calories, protein, fat, carbs, shelf_life

**Column to drop (not in current schema):**
- `archived_at` — this column does not exist in the current `products` table. It will be excluded from the import.

**Column in DB but missing from CSV:**
- `stock` — has a default value of `100`, so it will be auto-filled.

### Important Issues

1. **Image URLs point to old Supabase** (`lmzpkssvigloabvxueyz.supabase.co`). These images will still load as long as that old project's storage is public, but they should eventually be migrated to the new project's storage.

2. **Foreign keys**: The `category_id` and `farmer_id` columns reference `categories` and `farmers` tables. These tables must have matching data or the inserts will fail (no FK constraints exist currently, so they should insert fine but queries with joins will return null for missing references).

### Implementation Steps

1. Read the full CSV file (all 179 lines)
2. Parse each row, excluding the `archived_at` column
3. Handle NULL values (empty `old_price`, empty `archived_at`, etc.)
4. Generate SQL INSERT statements and execute them using the Supabase insert tool
5. Insert in batches to avoid hitting size limits

### Technical Details

- Boolean values in CSV are `TRUE`/`FALSE` — will convert to SQL `true`/`false`
- Numeric fields like `calories`, `protein`, `fat`, `carbs` may be empty — will use `NULL`
- Text fields with commas are quoted in CSV — standard CSV parsing applies
- `prep_time_minutes` empty values default to `0` per schema


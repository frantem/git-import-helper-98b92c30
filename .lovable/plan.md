

## Plan: Merge house/entrance/apartment into one column

### Database Migration

Add a new `address_details` column to `farmers`, migrate existing data, then drop the three old columns.

```sql
-- Add new column
ALTER TABLE farmers ADD COLUMN address_details text;

-- Migrate data: combine house, entrance, apartment
UPDATE farmers SET address_details = CONCAT_WS(', ',
  CASE WHEN house IS NOT NULL AND house != '' THEN 'д.' || house END,
  CASE WHEN entrance IS NOT NULL AND entrance != '' THEN 'подъезд ' || entrance END,
  CASE WHEN apartment IS NOT NULL AND apartment != '' THEN 'кв.' || apartment END
) WHERE house IS NOT NULL OR entrance IS NOT NULL OR apartment IS NOT NULL;

-- Drop old columns
ALTER TABLE farmers DROP COLUMN house;
ALTER TABLE farmers DROP COLUMN entrance;
ALTER TABLE farmers DROP COLUMN apartment;
```

### Code Changes

**1. `src/pages/seller/SellerSettings.tsx`**
- Replace `house`, `entrance`, `apartment` in state with single `address_details`
- Replace the 3-column grid (lines 272-285) with one input:
  ```
  Label: "Дом, подъезд, квартира"
  Placeholder: "д.37 под.2 кв.61"
  ```
- Update `handleSave` to save `address_details` instead of three fields

**2. `src/pages/Checkout.tsx`**
- Update `FarmerInfo` interface: remove `house`, `entrance`, `apartment`, add `address_details`
- Update select query (line 403): replace three columns with `address_details`
- Update `getFarmerAddress` to append `address_details` if present

**3. `supabase/functions/send-self-pickup-notification/index.ts`**
- Update select query to use `address_details` instead of three columns
- Simplify address building: just append `address_details` if present

### Summary

One migration (add column + migrate data + drop old columns), three file edits. No data loss — existing values are concatenated into the new column before the old ones are removed.


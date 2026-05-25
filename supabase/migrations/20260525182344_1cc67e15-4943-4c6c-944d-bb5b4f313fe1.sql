WITH candidates AS (
  SELECT DISTINCT ON (sa.user_id)
    sa.user_id,
    btrim(regexp_replace(sa.phone, '\s+', ' ', 'g')) AS phone,
    sa.created_at
  FROM public.seller_applications sa
  WHERE sa.phone IS NOT NULL AND btrim(sa.phone) <> ''
  ORDER BY sa.user_id, sa.created_at DESC
),
deduped AS (
  SELECT DISTINCT ON (phone) user_id, phone
  FROM candidates
  ORDER BY phone, created_at DESC
),
filtered AS (
  SELECT d.user_id, d.phone
  FROM deduped d
  WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p2
    WHERE p2.phone = d.phone
  )
)
UPDATE public.profiles p
SET phone = f.phone
FROM filtered f
WHERE p.user_id = f.user_id
  AND (p.phone IS NULL OR btrim(p.phone) = '');
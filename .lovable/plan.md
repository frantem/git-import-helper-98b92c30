

## Problem
The "Ошибка загрузки изображения" error occurs because the `banners` storage bucket has **Row Level Security enabled but zero policies**. This means all upload/read operations are blocked by RLS.

This affects ALL storage buckets (product-images, avatars, farmer-avatars, banners, site-assets) — none have policies.

## Fix
Add a SQL migration that creates storage policies for all 5 buckets:

**1. Public read access** — anyone can view images (buckets are already marked public)
**2. Authenticated upload** — logged-in users can upload files
**3. Authenticated update/delete** — logged-in users can manage their uploads

### SQL migration to create:
```sql
-- Public read for all buckets
CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id IN ('banners','product-images','avatars','farmer-avatars','site-assets'));

-- Authenticated users can upload
CREATE POLICY "Auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('banners','product-images','avatars','farmer-avatars','site-assets'));

-- Authenticated users can update
CREATE POLICY "Auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('banners','product-images','avatars','farmer-avatars','site-assets'));

-- Authenticated users can delete
CREATE POLICY "Auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('banners','product-images','avatars','farmer-avatars','site-assets'));
```

### Files to modify
- New SQL migration file for storage policies

One migration, fixes uploads across the entire app.


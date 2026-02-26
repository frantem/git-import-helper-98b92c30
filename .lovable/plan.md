

## Plan: Migrate "Furniture Haven / Fermers" Project to Locus

### Project Analysis

I successfully accessed the GitHub repository. The project is a **farmer products marketplace** (currently branded "Fermers"), not "Furniture Haven" as the repo name suggests. It is a full-stack React + Supabase app with:

**Pages (14 total):**
- Index, Catalog, Product, Cart, Checkout, Auth, Profile, Orders, Favorites, SellerDashboard, SellerProfile, Settings
- Admin panel: AdminBanners, AdminBlocks, AdminCategories, AdminOrders, AdminPickupPoints, AdminSellerApplications, AdminSellers, AdminSettings

**Components (10 custom):**
- BannerCarousel, BottomNavigation, DynamicMeta, Header, PageHeader, PickupSettingsSection, ProductCard, ProductCardSkeleton, ProductReviews, SellerApplicationForm

**Hooks (14 custom):**
- useAdminMetrics, useBanners, useCategories, useDeliveryTime, useFavorites, useHomepageBlocks, usePendingOrdersCount, useProduct, useProductCustomFields, useProducts, useProductsRequiredFields, useScrollRestoration, useVisitorTracking, plus standard use-mobile/use-toast

**Contexts:** AuthContext, CartContext

**Data:** products.ts

### Critical Issue: Database Schema

The old project connects to a **different Supabase instance** (`lmzpkssvigloabvxueyz`) that has many tables (products, orders, categories, banners, sellers, etc.). Your new Supabase project (`jxklppwhgmndlivvtxdd`) currently has **zero tables**. The app will not function without recreating the database schema.

### Implementation Plan

The work will be done in **multiple steps** due to the large number of files (~50+ source files):

#### Step 1: Fetch and write all source files from GitHub
Read every file from the repository and write it into the current project. This includes:
- `index.html` (with Meta Pixel code)
- `src/App.tsx` (with all routes and providers)
- `src/App.css`, `src/index.css`
- All 14 page files
- All 10 component files
- All 14 hook files
- 2 context files
- `src/data/products.ts`
- `tailwind.config.ts` (has custom theme)
- `package.json` (adds `@lovable.dev/cloud-auth-js`, `@tailwindcss/typography`)

#### Step 2: Update Supabase connection
The old client uses `import.meta.env.VITE_SUPABASE_URL` which is fine -- the `.env` file in this project already has the correct values for the new Supabase instance (`jxklppwhgmndlivvtxdd`). The `supabase/client.ts` will keep using the existing hardcoded approach from this project.

The `src/integrations/supabase/types.ts` from the old project (~32KB) contains the full database schema types. This file will be copied as-is, but **it will be out of sync** with the new empty database.

#### Step 3: Rename branding to "Locus"
Search-and-replace across all files:
- "Fermers" → "Locus"
- "Furniture Haven" → "Locus"
- "MebelHub" → "Locus"
- "fermersMarket" → "locus" (Twitter handle in meta tags)
- "фермерских продуктов" → appropriate Locus description
- Update all Russian-language marketplace descriptions

#### Step 4: Database migration
Create the required tables in the new Supabase to match the old schema. Based on the types.ts, this likely includes tables for:
- products, categories, orders, order_items
- profiles, sellers, seller_applications
- banners, homepage_blocks, pickup_points
- favorites, reviews, visitors
- site_settings, product_custom_fields, products_required_fields

This will require a SQL migration with all table definitions and RLS policies.

### Important Notes

1. **This is a very large migration** -- roughly 50+ files totaling ~400KB+ of source code. It will require multiple implementation steps.
2. **The database must be recreated** -- without the tables, the app will show errors. The old types.ts file tells us exactly what schema to create.
3. **The old Supabase data will NOT transfer** -- only the schema (structure) can be recreated. Product data, user accounts, orders etc. from the old instance will not be available.
4. **Dependencies change** -- the project adds `@lovable.dev/cloud-auth-js` and `@tailwindcss/typography` as new dependencies.

### Recommended Approach

Due to the size, I recommend we proceed in batches:
1. First batch: Core files (App.tsx, index.html, package.json, contexts, data, integrations, CSS, config)
2. Second batch: All pages
3. Third batch: All components and hooks
4. Fourth batch: Branding rename to "Locus"
5. Fifth batch: Database migration SQL

Shall I proceed with this plan?


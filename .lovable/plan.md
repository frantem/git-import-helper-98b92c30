

## Plan: Privacy Policy Page for Belarus

### Data collected by the app (based on codebase analysis):

1. **Account data**: email, full name, phone, avatar (via registration or Google OAuth)
2. **Order data**: delivery address, order items, payment method
3. **Visitor tracking**: visitor_id (localStorage UUID), page path, referrer, user agent, visit duration → stored in `site_visits` table
4. **Meta Pixel (Facebook)**: PageView, Purchase events with order value in BYN
5. **Meta Conversions API**: server-side event tracking (email hash, user agent, IP)
6. **localStorage**: cart contents (`locus-cart`), visitor ID, Supabase auth session tokens
7. **Seller data**: company name, description, address, phone, village

### Legal framework for Belarus:
- Law of the Republic of Belarus No. 99-З "On Personal Data Protection" (effective 15.11.2021)
- Requires: legal basis for processing, list of data collected, purposes, retention periods, third-party transfers, data subject rights

### Implementation:

1. **Create `src/pages/PrivacyPolicy.tsx`** — full privacy policy page in Russian, covering:
   - Operator info (Locus / locusfood.by)
   - Types of personal data collected
   - Purposes of processing
   - Legal basis (consent, contract execution)
   - Cookies and tracking technologies (localStorage, Meta Pixel)
   - Third-party services (Supabase, Google OAuth, Meta/Facebook)
   - Data retention periods
   - Data subject rights (access, correction, deletion, withdrawal of consent)
   - Cross-border data transfer notice
   - Contact information for data protection inquiries
   - Effective date

2. **Add route in `src/App.tsx`**: `/privacy-policy`

3. **Add link to privacy policy** in the Profile page footer or BottomNavigation area, and optionally on the Auth page near the sign-up button


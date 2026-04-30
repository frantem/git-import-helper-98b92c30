import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DynamicMeta } from "@/components/DynamicMeta";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { MetaPageTracker } from "@/components/MetaPageTracker";
import Index from "./pages/Index";

const Catalog = lazy(() => import("./pages/Catalog"));
const Product = lazy(() => import("./pages/Product"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Profile = lazy(() => import("./pages/Profile"));
const Auth = lazy(() => import("./pages/Auth"));
const Orders = lazy(() => import("./pages/Orders"));
const Favorites = lazy(() => import("./pages/Favorites"));
const SellerDashboard = lazy(() => import("./pages/SellerDashboard"));
const SellerProducts = lazy(() => import("./pages/seller/SellerProducts"));
const SellerOrders = lazy(() => import("./pages/seller/SellerOrders"));
const SellerSettings = lazy(() => import("./pages/seller/SellerSettings"));
const SellerProfile = lazy(() => import("./pages/SellerProfile"));
const SellerApplication = lazy(() => import("./pages/SellerApplication"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminSellers = lazy(() => import("./pages/admin/AdminSellers"));
const AdminSellerApplications = lazy(() => import("./pages/admin/AdminSellerApplications"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminBanners = lazy(() => import("./pages/admin/AdminBanners"));
const AdminPickupPoints = lazy(() => import("./pages/admin/AdminPickupPoints"));
const AdminBlocks = lazy(() => import("./pages/admin/AdminBlocks"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const Settings = lazy(() => import("./pages/Settings"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const LocalLanding = lazy(() => import("./pages/LocalLanding"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <DynamicMeta />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <MetaPageTracker />
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/product/:id" element={<Product />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/seller" element={<SellerDashboard />} />
                <Route path="/seller/products" element={<SellerProducts />} />
                <Route path="/seller/orders" element={<SellerOrders />} />
                <Route path="/seller/settings" element={<SellerSettings />} />
                <Route path="/seller/:id" element={<SellerProfile />} />
                <Route path="/seller-application" element={<SellerApplication />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/sellers" element={<AdminSellers />} />
                <Route path="/admin/applications" element={<AdminSellerApplications />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/banners" element={<AdminBanners />} />
                <Route path="/admin/pickup-points" element={<AdminPickupPoints />} />
                <Route path="/admin/blocks" element={<AdminBlocks />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/vitebsk/:slug" element={<LocalLanding />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

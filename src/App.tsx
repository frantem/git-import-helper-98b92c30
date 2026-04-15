import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DynamicMeta } from "@/components/DynamicMeta";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import Index from "./pages/Index";
import Catalog from "./pages/Catalog";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Orders from "./pages/Orders";
import Favorites from "./pages/Favorites";
import SellerDashboard from "./pages/SellerDashboard";
import SellerProducts from "./pages/seller/SellerProducts";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerSettings from "./pages/seller/SellerSettings";
import SellerProfile from "./pages/SellerProfile";
import SellerApplication from "./pages/SellerApplication";
import Admin from "./pages/Admin";
import AdminSellers from "./pages/admin/AdminSellers";
import AdminSellerApplications from "./pages/admin/AdminSellerApplications";
import AdminOrders from "./pages/admin/AdminOrders";

import AdminBanners from "./pages/admin/AdminBanners";
import AdminPickupPoints from "./pages/admin/AdminPickupPoints";
import AdminBlocks from "./pages/admin/AdminBlocks";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProducts from "./pages/admin/AdminProducts";
import Settings from "./pages/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function VisitorTracker() {
  useVisitorTracking();
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <VisitorTracker />
      <CartProvider>
        <TooltipProvider>
          <DynamicMeta />
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

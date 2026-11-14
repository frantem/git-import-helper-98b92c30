import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SellerTopBar } from "@/components/seller/SellerTopBar";
import { SellerBottomNav } from "@/components/seller/SellerBottomNav";
import { SellerAppearanceCard } from "@/components/seller/SellerAppearanceCard";
import { Button } from "@/components/ui/button";

/** Отдельная страница оформления сохранена для прямых ссылок; основной путь — /seller/settings. */
export default function SellerPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 md:pb-0">
      <SellerTopBar />
      <main className="mx-auto w-full max-w-2xl px-3 py-4">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/seller")} aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Оформление витрины</h1>
        </div>
        <section className="rounded-2xl border border-border bg-card p-4">
          <SellerAppearanceCard />
        </section>
      </main>
      <SellerBottomNav />
    </div>
  );
}

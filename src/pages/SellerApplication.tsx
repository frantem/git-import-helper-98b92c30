import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { SellerApplicationForm } from "@/components/SellerApplicationForm";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function SellerApplication() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />
      <main className="container mx-auto px-3 py-4 max-w-lg">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Назад
        </button>

        <h1 className="text-xl font-bold text-foreground mb-1">Заявка на продавца</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Заполните форму и мы свяжемся с вами
        </p>

        <SellerApplicationForm
          onSuccess={() => navigate("/profile")}
        />
      </main>
      <BottomNavigation />
    </div>
  );
}

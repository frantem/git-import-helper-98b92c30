import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

/** Галерея шаблонов сторис: выбор шаблона перед редактором. */
export default function SellerStoryGallery() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pb-24 md:pb-0 bg-[#faf5ea]">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-4 md:py-6">
        <div className="mb-4 flex items-center gap-2 md:gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/seller")} aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold md:text-2xl">Создать изображение</h1>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">Выберите шаблон</p>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {/* Шаблон «В наличии» */}
          <Link
            to="/seller/story/stock"
            className="group overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-b from-[#6b4130] via-[#4a2b1f] to-[#3a2118] p-3">
              <div className="mb-3 text-center text-[10px] font-extrabold uppercase tracking-wide text-white/95">
                В наличии
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="overflow-hidden rounded-md bg-white">
                    <div className="aspect-square bg-black/10" />
                    <div className="space-y-1 p-1">
                      <div className="h-1 w-3/4 rounded bg-black/40" />
                      <div className="h-1.5 w-1/2 rounded bg-black/70" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/25 bg-white/15 p-1.5 text-center text-[7px] font-semibold text-white/90">
                Переходите на сайт и заказывайте
              </div>
            </div>
            <div className="p-3">
              <h2 className="font-bold">В наличии</h2>
              <p className="text-xs text-muted-foreground">До 4 товаров: фото, цена и срок</p>
            </div>
          </Link>

          {/* Шаблон «О продукте» */}
          <Link
            to="/seller/story/about"
            className="group overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-b from-[#2f5d45] via-[#234835] to-[#172f23] p-3">
              <div className="relative mt-4 overflow-hidden rounded-lg bg-black/20" style={{ aspectRatio: "3 / 4" }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />
                <div className="absolute inset-x-2 bottom-2 space-y-1">
                  <div className="h-2 w-3/4 rounded bg-white/90" />
                  <div className="h-1 w-full rounded bg-white/50" />
                  <div className="flex gap-1 pt-1">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="flex-1 space-y-0.5">
                        <div className="mx-auto h-1.5 w-2/3 rounded bg-white/85" />
                        <div className="mx-auto h-1 w-1/2 rounded bg-white/45" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-3 bottom-3 rounded-lg border border-white/25 bg-white/15 p-1.5 text-center text-[7px] font-semibold text-white/90">
                Переходите на сайт и заказывайте
              </div>
            </div>
            <div className="p-3">
              <h2 className="font-bold">Новинка</h2>
              <p className="text-xs text-muted-foreground">1–2 товара: описание и рейтинг</p>
            </div>
          </Link>

          {/* Шаблон «Меню» */}
          <Link
            to="/seller/story/menu"
            className="group overflow-hidden rounded-2xl bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-b from-[#c8734f] via-[#a95a3b] to-[#7d3f29] p-2.5">
              <div className="mb-2 flex items-center justify-between gap-2 text-white">
                <div className="text-[9px] font-extrabold leading-tight">Доступно<br />для заказа</div>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="h-7 w-7 rounded-full border-2 border-white/80 bg-white/90" />
                  <div className="h-1 w-8 rounded bg-white/80" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={index} className="flex h-10 overflow-hidden rounded bg-white/95 p-1">
                    <div className="flex-1 space-y-0.5 pt-0.5">
                      <div className="h-1 w-3/4 rounded bg-black/70" />
                      <div className="h-0.5 w-full rounded bg-black/20" />
                      <div className="h-0.5 w-2/3 rounded bg-black/20" />
                      <div className="mt-1 h-1 w-1/3 rounded bg-black/60" />
                    </div>
                    <div className="h-8 w-8 shrink-0 rounded bg-black/10" />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3">
              <h2 className="font-bold">Меню</h2>
              <p className="text-xs text-muted-foreground">До 8 товаров с описанием и составом</p>
            </div>
          </Link>
        </div>
      </main>
      <BottomNavigation />
    </div>
  );
}

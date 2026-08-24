import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Star, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSellerReviews } from "@/hooks/useSellerReviews";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SellerReviews() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useSellerReviews(id);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const farmer = data?.farmer;
  const reviews = data?.reviews || [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEO
        title={farmer ? `Отзывы о ${farmer.name} — LOCUS` : "Отзывы продавца — LOCUS"}
        description={
          farmer
            ? `Отзывы покупателей о продавце ${farmer.name}: ${data?.total || 0} оценок за все товары.`
            : "Отзывы покупателей о продавце на площадке LOCUS."
        }
      />
      <Header />

      <main className="mx-auto max-w-2xl px-4 pt-4">
        <PageHeader title="Отзывы о продавце" />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !farmer ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Продавец не найден.</p>
        ) : (
          <>
            {/* Summary */}
            <section className="rounded-xl bg-card p-4">
              <Link
                to={`/seller/${farmer.slug || farmer.id}`}
                className="flex items-center gap-3"
              >
                {farmer.photo_url ? (
                  <img
                    src={farmer.photo_url}
                    alt={farmer.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">🧑‍🌾</span>
                )}
                <div>
                  <p className="font-semibold text-foreground">{farmer.name}</p>
                  <p className="text-xs text-primary hover:underline">Перейти на страницу продавца</p>
                </div>
              </Link>

              {data && data.total > 0 ? (
                <div className="mt-4 flex items-start gap-5">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground">
                      {data.average.toFixed(1).replace(".", ",")}
                    </p>
                    <div className="mt-1 flex justify-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={cn(
                            "h-3.5 w-3.5",
                            Math.round(data.average) >= s
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          )}
                        />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{data.total} отзывов</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = data.distribution[star] || 0;
                      const pct = data.total ? (count / data.total) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="w-3 text-xs text-muted-foreground">{star}</span>
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-right text-xs text-muted-foreground">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </section>

            {/* List */}
            {reviews.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                У продавца пока нет отзывов.
              </p>
            ) : (
              <section className="mt-4 space-y-3">
                {reviews.slice(0, visible).map((review) => (
                  <article key={review.id} className="rounded-xl bg-card p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                          {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-foreground">{review.userName}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                    </div>

                    <div className="mb-2 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={cn(
                            "h-4 w-4",
                            review.rating >= star
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground"
                          )}
                        />
                      ))}
                    </div>

                    <Link
                      to={`/product/${review.productSlug || review.productId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      {review.productTitle}
                    </Link>

                    {review.text && (
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                        {review.text}
                      </p>
                    )}

                    {review.images.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {review.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setLightboxImage(img)}
                            className="h-16 w-16 overflow-hidden rounded-lg bg-secondary"
                          >
                            <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </article>
                ))}

                {visible < reviews.length && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  >
                    Показать ещё
                  </Button>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-h-[90vh] max-w-[90vw] p-2">
          {lightboxImage && (
            <img src={lightboxImage} alt="" className="h-auto max-h-[80vh] w-full rounded object-contain" />
          )}
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}

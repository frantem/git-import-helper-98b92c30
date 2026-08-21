import { Link, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { SEO } from "@/components/SEO";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { useSellerPost } from "@/hooks/useSellerPage";

/** Полная страница статьи продавца: /seller/:sellerSlug/post/:postSlug */
export default function SellerPost() {
  const { sellerSlug, postSlug } = useParams();
  const { data, isLoading } = useSellerPost(sellerSlug, postSlug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf5ea] pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto flex items-center justify-center px-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#faf5ea] pb-16 md:pb-0">
        <SEO title="Статья не найдена" noindex />
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="mb-2 text-xl font-bold text-foreground">Статья не найдена</h1>
          <Link to="/catalog" className="text-primary hover:underline">
            Вернуться в каталог
          </Link>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const { post, farmer } = data;
  const sellerPath = `/seller/${farmer.slug || farmer.id}`;
  const description = (post.body || `${post.title} — ${farmer.name}`)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);

  return (
    <div className="min-h-screen bg-[#faf5ea] pb-16 md:pb-0">
      <SEO
        title={`${post.title} — ${farmer.name}`}
        description={description}
        image={post.image_url || farmer.photo_url || undefined}
        canonical={`https://locusfood.by${sellerPath}/post/${post.slug || post.id}`}
        ogType="article"
        jsonLd={{
          "@type": "Article",
          headline: post.title,
          description,
          image: post.image_url || undefined,
          author: { "@type": "Organization", name: farmer.name },
          publisher: { "@type": "Organization", name: "Locus" },
          mainEntityOfPage: `https://locusfood.by${sellerPath}/post/${post.slug || post.id}`,
        }}
      />
      <Header />

      <main className="container mx-auto max-w-3xl px-3 py-4">
        <PageHeader title={farmer.name} backPath={sellerPath} />

        <article className="overflow-hidden rounded-3xl bg-card">
          {post.image_url && (
            <OptimizedImage
              src={post.image_url}
              alt={post.title}
              preset="detail"
              loading="eager"
              fetchPriority="high"
              className="aspect-[4/3] w-full"
            />
          )}
          <div className="p-4 md:p-6">
            <h1 className="mb-3 font-serif text-2xl font-bold leading-tight text-foreground md:text-4xl">
              {post.title}
            </h1>
            {post.body && (
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-muted-foreground">
                {post.body}
              </p>
            )}

            <Link
              to={sellerPath}
              className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
            >
              ← Все товары и статьи {farmer.name}
            </Link>
          </div>
        </article>
      </main>

      <BottomNavigation />
    </div>
  );
}

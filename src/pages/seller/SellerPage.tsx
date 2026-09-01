import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Plus, Trash2, Upload, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import { cdnImage } from "@/lib/imageCdn";
import { useSellerPlan } from "@/hooks/useSellerPlan";

const MAX_VIDEO_MB = 15;

const THEMES: { value: string; label: string }[] = [
  { value: "forest", label: "Лес" },
  { value: "terracotta", label: "Терракота" },
  { value: "night", label: "Ночной синий" },
  { value: "sand", label: "Песок" },
];

interface HitRow {
  id: string;
  title: string;
  is_featured: boolean;
}

interface PostRow {
  id: string;
  slug: string | null;
  title: string;
  body: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

interface PromoRow {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export default function SellerPage() {
  const { user, role, isLoading: authLoading } = useAuth();
  const { canShowContacts } = useSellerPlan();

  const navigate = useNavigate();

  const [farmerId, setFarmerId] = useState<string | null>(null);
  const [farmerSlug, setFarmerSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [hero, setHero] = useState({
    tagline: "",
    about_text: "",
    hero_media_url: "",
    hero_media_type: "",
    location_label: "",
    unique_fact: "",
    delivery_note: "",
    theme: "forest",
    contact_phone: "",
    contact_instagram: "",
    contact_telegram: "",
    contact_viber: "",
    contact_whatsapp: "",
  });

  const [hits, setHits] = useState<HitRow[]>([]);

  const [postsBlockTitle, setPostsBlockTitle] = useState("");
  const [posts, setPosts] = useState<PostRow[]>([]);

  const [promos, setPromos] = useState<PromoRow[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: farmer } = await supabase
      .from("farmers")
      .select("id, slug, tagline, about_text, hero_media_url, hero_media_type, location_label, posts_block_title, unique_fact, delivery_note, contacts, theme")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!farmer) {
      setIsLoading(false);
      return;
    }

    setFarmerId(farmer.id);
    setFarmerSlug(farmer.slug || farmer.id);
    setHero({
      tagline: farmer.tagline || "",
      about_text: farmer.about_text || "",
      hero_media_url: farmer.hero_media_url || "",
      hero_media_type: farmer.hero_media_type || "",
      location_label: farmer.location_label || "",
      unique_fact: (farmer as any).unique_fact || "",
      delivery_note: (farmer as any).delivery_note || "",
      theme: (farmer as any).theme || "forest",
      contact_phone: ((farmer as any).contacts as any)?.phone || "",
      contact_instagram: ((farmer as any).contacts as any)?.instagram || "",
      contact_telegram: ((farmer as any).contacts as any)?.telegram || "",
      contact_viber: ((farmer as any).contacts as any)?.viber || "",
      contact_whatsapp: ((farmer as any).contacts as any)?.whatsapp || "",
    });
    setPostsBlockTitle(farmer.posts_block_title || "");


    const [productsRes, postsRes, promosRes] = await Promise.all([
      supabase
        .from("products")
        .select("id, title, is_featured")
        .eq("farmer_id", farmer.id)
        .eq("is_deleted", false)
        .order("title"),
      supabase
        .from("seller_posts")
        .select("id, slug, title, body, image_url, sort_order, is_active")
        .eq("farmer_id", farmer.id)
        .order("sort_order"),
      supabase
        .from("seller_promos")
        .select("id, title, description, image_url, link_url, sort_order, is_active")
        .eq("farmer_id", farmer.id)
        .order("sort_order"),
    ]);

    setHits((productsRes.data as HitRow[]) || []);
    setPosts((postsRes.data as PostRow[]) || []);
    setPromos((promosRes.data as PromoRow[]) || []);
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (role !== "seller" && role !== "admin") { navigate("/"); return; }
    load();
  }, [user, role, authLoading, load, navigate]);

  const uploadFile = async (file: File, kind: "image" | "video"): Promise<string | null> => {
    if (!user) return null;
    setUploading(true);
    try {
      let upload: File = file;
      if (kind === "image") {
        upload = await compressImage(file, "banner");
      } else if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        toast.error(`Видео больше ${MAX_VIDEO_MB} МБ — сожмите файл`);
        return null;
      }

      const ext = upload.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
      const path = `seller-page/${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("site-assets")
        .upload(path, upload, { contentType: upload.type || undefined, upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      return data.publicUrl;
    } catch (e) {
      console.error(e);
      toast.error("Не удалось загрузить файл");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const saveHero = async () => {
    if (!farmerId) return;
    setIsSaving(true);
    const { error } = await supabase
      .from("farmers")
      .update({
        tagline: hero.tagline || null,
        about_text: hero.about_text || null,
        hero_media_url: hero.hero_media_url || null,
        hero_media_type: hero.hero_media_url ? hero.hero_media_type || "image" : null,
        location_label: hero.location_label || null,
        unique_fact: hero.unique_fact.trim() || null,
        delivery_note: hero.delivery_note.trim() || null,
        theme: hero.theme || "forest",
        contacts: {
          phone: hero.contact_phone.trim() || null,
          instagram: hero.contact_instagram.trim() || null,
          telegram: hero.contact_telegram.trim() || null,
          viber: hero.contact_viber.trim() || null,
          whatsapp: hero.contact_whatsapp.trim() || null,
        },
      })
      .eq("id", farmerId);
    setIsSaving(false);
    if (error) {
      toast.error("Ошибка сохранения");
      return;
    }
    toast.success("Обложка сохранена");
  };

  const featuredCount = hits.filter((h) => h.is_featured).length;

  const toggleHit = async (product: HitRow, value: boolean) => {
    if (value && featuredCount >= 4) {
      toast.error("Можно выбрать не больше 4 хитов");
      return;
    }
    const { error } = await supabase
      .from("products")
      .update({ is_featured: value })
      .eq("id", product.id);
    if (error) { toast.error("Не удалось сохранить"); return; }
    setHits((prev) => prev.map((h) => (h.id === product.id ? { ...h, is_featured: value } : h)));
  };

  // ---- Посты ----
  const savePostsBlockTitle = async () => {
    if (!farmerId) return;
    const { error } = await supabase
      .from("farmers")
      .update({ posts_block_title: postsBlockTitle.trim() || null })
      .eq("id", farmerId);
    if (error) { toast.error("Ошибка сохранения названия блока"); return; }
    toast.success("Название блока сохранено");
  };


  const addPost = async () => {
    if (!farmerId) return;
    const { data, error } = await supabase
      .from("seller_posts")
      .insert({ farmer_id: farmerId, title: "Новый пост", sort_order: posts.length })
      .select("id, slug, title, body, image_url, sort_order, is_active")
      .single();
    if (error || !data) { toast.error("Не удалось добавить пост"); return; }
    setPosts((prev) => [...prev, data as PostRow]);
  };

  const savePost = async (post: PostRow) => {
    if (!post.image_url) {
      toast.error("Добавьте фото — без него пост не публикуется");
      return;
    }
    const { error } = await supabase
      .from("seller_posts")
      .update({
        title: post.title,
        body: post.body,
        image_url: post.image_url,
        sort_order: post.sort_order,
        is_active: post.is_active,
      })
      .eq("id", post.id);
    if (error) { toast.error("Ошибка сохранения поста"); return; }
    toast.success("Пост сохранён");
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("seller_posts").delete().eq("id", id);
    if (error) { toast.error("Не удалось удалить"); return; }
    setPosts((prev) => prev.filter((p) => p.id !== id));
  };

  // ---- Акции ----
  const addPromo = async () => {
    if (!farmerId) return;
    const { data, error } = await supabase
      .from("seller_promos")
      .insert({ farmer_id: farmerId, title: "Новая акция", sort_order: promos.length })
      .select("id, title, description, image_url, link_url, sort_order, is_active")
      .single();
    if (error || !data) { toast.error("Не удалось добавить акцию"); return; }
    setPromos((prev) => [...prev, data as PromoRow]);
  };

  const savePromo = async (promo: PromoRow) => {
    const { error } = await supabase
      .from("seller_promos")
      .update({
        title: promo.title,
        description: promo.description,
        image_url: promo.image_url,
        link_url: promo.link_url,
        sort_order: promo.sort_order,
        is_active: promo.is_active,
      })
      .eq("id", promo.id);
    if (error) { toast.error("Ошибка сохранения акции"); return; }
    toast.success("Акция сохранена");
  };

  const deletePromo = async (id: string) => {
    const { error } = await supabase.from("seller_promos").delete().eq("id", id);
    if (error) { toast.error("Не удалось удалить"); return; }
    setPromos((prev) => prev.filter((p) => p.id !== id));
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf5ea]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!farmerId) {
    return (
      <div className="min-h-screen bg-[#faf5ea] pb-20 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="mb-2 text-xl font-bold">Профиль продавца не найден</h1>
          <Button onClick={() => navigate("/seller")}>В панель продавца</Button>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf5ea] pb-20 md:pb-0">
      <Header />
      <main className="container mx-auto max-w-3xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/seller")} aria-label="Назад">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Моя страница</h1>
          {farmerSlug && (
            <Link
              to={`/seller/${farmerSlug}`}
              className="ml-auto inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Открыть <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Обложка */}
        <section className="mb-6 rounded-2xl bg-card p-4">
          <h2 className="mb-3 font-bold">Обложка</h2>

          <div className="space-y-3">
            <div>
              <Label htmlFor="tagline">Девиз бренда</Label>
              <Textarea
                id="tagline"
                rows={3}
                value={hero.tagline}
                onChange={(e) => setHero({ ...hero, tagline: e.target.value })}
                placeholder="Короткий девиз, который увидят на обложке"
              />
            </div>

            <div>
              <Label htmlFor="about">О продавце</Label>
              <Textarea
                id="about"
                rows={4}
                value={hero.about_text}
                onChange={(e) => setHero({ ...hero, about_text: e.target.value })}
                placeholder="Пара предложений о вас и вашем хозяйстве"
              />
            </div>

            <div>
              <Label htmlFor="loc">Локация на обложке</Label>
              <Input
                id="loc"
                value={hero.location_label}
                onChange={(e) => setHero({ ...hero, location_label: e.target.value })}
                placeholder="📍 Витебский, Витебск"
              />
            </div>

            <div>
              <Label>Фото или видео обложки</Label>
              {hero.hero_media_url && (
                <div className="mb-2 overflow-hidden rounded-xl">
                  {hero.hero_media_type === "video" ? (
                    <video src={hero.hero_media_url} className="h-40 w-full object-cover" muted playsInline controls />
                  ) : (
                    <img src={cdnImage(hero.hero_media_url, "banner")} alt="" className="h-40 w-full object-cover" />
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" /> Фото
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await uploadFile(f, "image");
                      if (url) setHero((h) => ({ ...h, hero_media_url: url, hero_media_type: "image" }));
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <Upload className="h-4 w-4" /> Видео (до {MAX_VIDEO_MB} МБ)
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const url = await uploadFile(f, "video");
                      if (url) setHero((h) => ({ ...h, hero_media_url: url, hero_media_type: "video" }));
                      e.target.value = "";
                    }}
                  />
                </label>
                {hero.hero_media_url && (
                  <Button
                    variant="ghost"
                    onClick={() => setHero((h) => ({ ...h, hero_media_url: "", hero_media_type: "" }))}
                  >
                    Убрать
                  </Button>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="fact">Факт уникальности (одна строка)</Label>
              <Textarea
                id="fact"
                rows={2}
                value={hero.unique_fact}
                onChange={(e) => setHero({ ...hero, unique_fact: e.target.value })}
                placeholder="Например: печём на закваске без дрожжей, рецепту 40 лет"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Конкретный факт, а не общая фраза. Пока пусто — на странице виден плейсхолдер.
              </p>
            </div>

            <div>
              <Label htmlFor="delivery">Доставка и самовывоз (1–2 строки)</Label>
              <Textarea
                id="delivery"
                rows={2}
                value={hero.delivery_note}
                onChange={(e) => setHero({ ...hero, delivery_note: e.target.value })}
                placeholder="Самовывоз в Витебске, доставка на следующий день, от 5 р."
              />
            </div>

            <div>
              <Label>Цветовая тема страницы</Label>
              <div className="mt-1 flex flex-wrap gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setHero({ ...hero, theme: t.value })}
                    className={`rounded-full border px-4 py-1.5 text-sm ${
                      hero.theme === t.value
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-border"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              {!canShowContacts && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-[2px] p-3 text-center">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Контакты на Вашей странице<br />доступны по подписке Standard</p>
                  <Link to="/seller/tariffs">
                    <Button size="sm">Подключить Standard</Button>
                  </Link>
                </div>
              )}
              <div className={`grid gap-2 md:grid-cols-3 ${!canShowContacts ? "pointer-events-none select-none opacity-40" : ""}`}>
                <div>
                  <Label htmlFor="c-phone">Телефон</Label>
                  <Input
                    id="c-phone"
                    disabled={!canShowContacts}
                    value={hero.contact_phone}
                    onChange={(e) => setHero({ ...hero, contact_phone: e.target.value })}
                    placeholder="+375 29 000-00-00"
                  />
                </div>
                <div>
                  <Label htmlFor="c-ig">Instagram</Label>
                  <Input
                    id="c-ig"
                    disabled={!canShowContacts}
                    value={hero.contact_instagram}
                    onChange={(e) => setHero({ ...hero, contact_instagram: e.target.value })}
                    placeholder="@my_brand"
                  />
                </div>
                <div>
                  <Label htmlFor="c-tg">Telegram</Label>
                  <Input
                    id="c-tg"
                    disabled={!canShowContacts}
                    value={hero.contact_telegram}
                    onChange={(e) => setHero({ ...hero, contact_telegram: e.target.value })}
                    placeholder="@my_brand"
                  />
                </div>
                <div>
                  <Label htmlFor="c-vb">Viber (номер)</Label>
                  <Input
                    id="c-vb"
                    disabled={!canShowContacts}
                    value={hero.contact_viber}
                    onChange={(e) => setHero({ ...hero, contact_viber: e.target.value })}
                    placeholder="+375 29 000-00-00"
                  />
                </div>
                <div>
                  <Label htmlFor="c-wa">WhatsApp (номер)</Label>
                  <Input
                    id="c-wa"
                    disabled={!canShowContacts}
                    value={hero.contact_whatsapp}
                    onChange={(e) => setHero({ ...hero, contact_whatsapp: e.target.value })}
                    placeholder="+375 29 000-00-00"
                  />
                </div>
              </div>
            </div>


            <Button onClick={saveHero} disabled={isSaving || uploading} className="w-full">
              {isSaving ? "Сохранение…" : "Сохранить обложку"}
            </Button>
          </div>
        </section>

        {/* Хиты */}
        <section className="mb-6 rounded-2xl bg-card p-4">
          <h2 className="mb-1 font-bold">Хиты продаж</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Выберите до 4 товаров — они появятся сразу под блоком «О нас» с кнопкой «В корзину».
            Выбрано: {featuredCount}/4
          </p>

          {hits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет товаров</p>
          ) : (
            <div className="space-y-2">
              {hits.map((h) => (
                <div key={h.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">{h.title}</span>
                  <Switch
                    checked={h.is_featured}
                    onCheckedChange={(v) => toggleHit(h, v)}
                    aria-label={`Хит: ${h.title}`}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Посты */}
        <section className="mb-6 rounded-2xl bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Посты про продукты</h2>
            <Button size="sm" variant="outline" onClick={addPost}>
              <Plus className="mr-1 h-4 w-4" /> Добавить
            </Button>
          </div>

          <div className="mb-4">
            <Label className="mb-1 block">Название блока на странице</Label>
            <div className="flex gap-2">
              <Input
                value={postsBlockTitle}
                placeholder="О нас"
                onChange={(e) => setPostsBlockTitle(e.target.value)}
              />
              <Button variant="outline" onClick={savePostsBlockTitle}>Сохранить</Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Если оставить пустым, на странице будет «О нас».
            </p>
          </div>

          {posts.length === 0 && (
            <p className="text-sm text-muted-foreground">Пока нет постов</p>
          )}


          <div className="space-y-4">
            {posts.map((post, idx) => (
              <div key={post.id} className="rounded-xl border border-border p-3">
                {post.image_url && (
                  <img
                    src={cdnImage(post.image_url, "card")}
                    alt=""
                    className="mb-2 h-32 w-full rounded-lg object-cover"
                  />
                )}
                <Input
                  className="mb-2"
                  value={post.title}
                  placeholder="Заголовок"
                  onChange={(e) =>
                    setPosts((prev) => prev.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)))
                  }
                />
                <Textarea
                  className="mb-2"
                  rows={6}
                  value={post.body || ""}
                  placeholder="Полный текст статьи — он откроется на отдельной странице"
                  onChange={(e) =>
                    setPosts((prev) => prev.map((p, i) => (i === idx ? { ...p, body: e.target.value } : p)))
                  }
                />
                {post.slug && (
                  <a
                    href={`/seller/${farmerSlug}/post/${post.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-2 inline-block text-xs text-primary hover:underline"
                  >
                    Открыть страницу статьи: /seller/{farmerSlug}/post/{post.slug}
                  </a>
                )}
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                    <Upload className="h-4 w-4" /> Фото (обязательно)
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const url = await uploadFile(f, "image");
                        if (url) setPosts((prev) => prev.map((p, i) => (i === idx ? { ...p, image_url: url } : p)));
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={post.is_active}
                      onCheckedChange={(v) =>
                        setPosts((prev) => prev.map((p, i) => (i === idx ? { ...p, is_active: v } : p)))
                      }
                    />
                    Показывать
                  </div>
                  <Input
                    type="number"
                    className="w-20"
                    value={post.sort_order}
                    onChange={(e) =>
                      setPosts((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, sort_order: Number(e.target.value) || 0 } : p))
                      )
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => savePost(post)} disabled={uploading}>
                    Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deletePost(post.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Акции */}
        <section className="mb-6 rounded-2xl bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Акции и наборы</h2>
            <Button size="sm" variant="outline" onClick={addPromo}>
              <Plus className="mr-1 h-4 w-4" /> Добавить
            </Button>
          </div>

          {promos.length === 0 && (
            <p className="text-sm text-muted-foreground">Пока нет акций</p>
          )}

          <div className="space-y-4">
            {promos.map((promo, idx) => (
              <div key={promo.id} className="rounded-xl border border-border p-3">
                {promo.image_url && (
                  <img
                    src={cdnImage(promo.image_url, "card")}
                    alt=""
                    className="mb-2 h-32 w-full rounded-lg object-cover"
                  />
                )}
                <Input
                  className="mb-2"
                  value={promo.title}
                  placeholder="Заголовок"
                  onChange={(e) =>
                    setPromos((prev) => prev.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)))
                  }
                />
                <Textarea
                  className="mb-2"
                  rows={3}
                  value={promo.description || ""}
                  placeholder="Описание акции или набора"
                  onChange={(e) =>
                    setPromos((prev) => prev.map((p, i) => (i === idx ? { ...p, description: e.target.value } : p)))
                  }
                />
                <Input
                  className="mb-2"
                  value={promo.link_url || ""}
                  placeholder="Ссылка, например /product/tort-medovik"
                  onChange={(e) =>
                    setPromos((prev) => prev.map((p, i) => (i === idx ? { ...p, link_url: e.target.value } : p)))
                  }
                />
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
                    <Upload className="h-4 w-4" /> Фото
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const url = await uploadFile(f, "image");
                        if (url) setPromos((prev) => prev.map((p, i) => (i === idx ? { ...p, image_url: url } : p)));
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={promo.is_active}
                      onCheckedChange={(v) =>
                        setPromos((prev) => prev.map((p, i) => (i === idx ? { ...p, is_active: v } : p)))
                      }
                    />
                    Показывать
                  </div>
                  <Input
                    type="number"
                    className="w-20"
                    value={promo.sort_order}
                    onChange={(e) =>
                      setPromos((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, sort_order: Number(e.target.value) || 0 } : p))
                      )
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => savePromo(promo)} disabled={uploading}>
                    Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deletePromo(promo.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      <BottomNavigation />
    </div>
  );
}

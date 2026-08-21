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
import { ArrowLeft, Loader2, Plus, Trash2, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/imageUtils";
import { cdnImage } from "@/lib/imageCdn";

const MAX_VIDEO_MB = 15;

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
  });

  const [postsBlockTitle, setPostsBlockTitle] = useState("");
  const [posts, setPosts] = useState<PostRow[]>([]);

  const [promos, setPromos] = useState<PromoRow[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: farmer } = await supabase
      .from("farmers")
      .select("id, slug, tagline, about_text, hero_media_url, hero_media_type, location_label, posts_block_title")
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
    });

    const [postsRes, promosRes] = await Promise.all([
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
      })
      .eq("id", farmerId);
    setIsSaving(false);
    if (error) {
      toast.error("Ошибка сохранения");
      return;
    }
    toast.success("Обложка сохранена");
  };

  // ---- Посты ----
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

            <Button onClick={saveHero} disabled={isSaving || uploading} className="w-full">
              {isSaving ? "Сохранение…" : "Сохранить обложку"}
            </Button>
          </div>
        </section>

        {/* Посты */}
        <section className="mb-6 rounded-2xl bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">Посты про продукты</h2>
            <Button size="sm" variant="outline" onClick={addPost}>
              <Plus className="mr-1 h-4 w-4" /> Добавить
            </Button>
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
                    <Upload className="h-4 w-4" /> Фото
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

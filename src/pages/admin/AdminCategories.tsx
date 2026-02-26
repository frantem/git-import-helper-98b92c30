import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Plus, Pencil, Trash2, GripVertical } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  image_url: string | null;
  sort_order: number | null;
}

export default function AdminCategories() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    emoji: "",
    image_url: "",
    sort_order: "0",
  });

  useEffect(() => {
    if (!user || role !== "admin") {
      navigate("/");
      return;
    }
    fetchCategories();
  }, [user, role]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");

    if (!error && data) {
      setCategories(data);
    }
    setIsLoading(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setForm({
      name: "",
      slug: "",
      emoji: "",
      image_url: "",
      sort_order: "0",
    });
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      emoji: category.emoji || "",
      image_url: category.image_url || "",
      sort_order: category.sort_order?.toString() || "0",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.slug) {
      toast.error("Заполните название и slug");
      return;
    }

    const categoryData = {
      name: form.name,
      slug: form.slug,
      emoji: form.emoji || null,
      image_url: form.image_url || null,
      sort_order: parseInt(form.sort_order) || 0,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Ошибка при обновлении");
      } else {
        toast.success("Категория обновлена");
        fetchCategories();
      }
    } else {
      const { error } = await supabase
        .from("categories")
        .insert(categoryData);

      if (error) {
        toast.error("Ошибка при создании");
      } else {
        toast.success("Категория создана");
        fetchCategories();
      }
    }

    resetForm();
  };

  const handleDelete = async (categoryId: string) => {
    // Check for products in this category (both old category_id and new product_categories)
    const [productsCheck, productCategoriesCheck] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", categoryId),
      supabase.from("product_categories").select("id", { count: "exact", head: true }).eq("category_id", categoryId),
    ]);
    
    const totalProducts = (productsCheck.count || 0) + (productCategoriesCheck.count || 0);
    
    if (totalProducts > 0) {
      toast.error(`Нельзя удалить категорию с ${totalProducts} товарами. Сначала переместите товары в другую категорию.`);
      return;
    }
    
    if (!confirm("Удалить категорию?")) return;

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast.error("Ошибка при удалении: " + error.message);
    } else {
      toast.success("Категория удалена");
      fetchCategories();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-3 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Категории</h1>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetForm}>
                <Plus className="h-4 w-4 mr-1" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Редактировать категорию" : "Новая категория"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Название *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Овощи"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug *</Label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="vegetables"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Эмодзи</Label>
                    <Input
                      value={form.emoji}
                      onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                      placeholder="🥔"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Порядок</Label>
                    <Input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ссылка на фото</Label>
                  <Input
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editingCategory ? "Сохранить" : "Создать"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-3 rounded-xl bg-card p-3">
              <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
              <span className="text-2xl">{category.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-foreground">{category.name}</h3>
                <p className="text-xs text-muted-foreground">/{category.slug}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(category)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}

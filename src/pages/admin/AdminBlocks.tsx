import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { PageHeader } from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown, Loader2, LayoutGrid, Package, Blocks, X, Upload } from "lucide-react";
import { compressImage } from "@/lib/imageUtils";

interface Category {
  id: string;
  name: string;
  slug: string;
  emoji: string | null;
  image_url: string | null;
  sort_order: number | null;
}

interface Product {
  id: string;
  title: string;
  price: number;
  unit: string;
  image_url: string | null;
  farmer: {
    name: string;
  } | null;
  category: {
    name: string;
  } | null;
}

interface HomepageBlock {
  id: string;
  title: string;
  emoji: string | null;
  block_type: string;
  category_filter: string | null;
  max_items: number | null;
  sort_order: number;
  is_active: boolean;
}

interface BlockProduct {
  block_id: string;
  product_id: string;
  sort_order: number;
}

export default function AdminBlocks() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [blocks, setBlocks] = useState<HomepageBlock[]>([]);
  const [blockProducts, setBlockProducts] = useState<BlockProduct[]>([]);
  
  // Category form
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    emoji: "",
    image_url: "",
    seo_title: "",
    seo_description: "",
  });
  const [isUploadingImage, setIsUploadingImage] = useState(false);


  // Block form
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<HomepageBlock | null>(null);
  const [blockForm, setBlockForm] = useState({
    title: "",
    emoji: "",
    block_type: "all",
    category_filter: "",
    max_items: "4",
    is_active: true,
  });

  // Block products dialog
  const [showBlockProducts, setShowBlockProducts] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<HomepageBlock | null>(null);
  const [productIdInput, setProductIdInput] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (role !== "admin") {
      navigate("/");
      return;
    }
    fetchData();
  }, [user, role]);

  const fetchData = async () => {
    // Fetch categories
    const { data: categoriesData } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");

    if (categoriesData) {
      setCategories(categoriesData);
    }

    // Fetch all products
    const { data: productsData } = await supabase
      .from("products")
      .select(`
        id,
        title,
        price,
        unit,
        image_url,
        farmer:farmers(name),
        category:categories(name)
      `)
      .order("created_at", { ascending: false });

    if (productsData) {
      setProducts(productsData as Product[]);
    }

    // Fetch homepage blocks
    const { data: blocksData } = await supabase
      .from("homepage_blocks")
      .select("*")
      .order("sort_order");

    if (blocksData) {
      setBlocks(blocksData);
    }

    // Fetch block products
    const { data: blockProductsData } = await supabase
      .from("homepage_block_products")
      .select("*")
      .order("sort_order");

    if (blockProductsData) {
      setBlockProducts(blockProductsData);
    }

    setIsLoading(false);
  };

  // Category handlers
  const handleSaveCategory = async () => {
    if (!categoryForm.name || !categoryForm.slug) {
      toast.error("Заполните название и slug");
      return;
    }

    const categoryData = {
      name: categoryForm.name,
      slug: categoryForm.slug,
      emoji: categoryForm.emoji || null,
      image_url: categoryForm.image_url || null,
      seo_title: categoryForm.seo_title || null,
      seo_description: categoryForm.seo_description || null,
    };

    if (editingCategory) {
      const { error } = await supabase
        .from("categories")
        .update(categoryData)
        .eq("id", editingCategory.id);

      if (error) {
        toast.error("Ошибка при обновлении категории");
      } else {
        toast.success("Категория обновлена");
        fetchData();
      }
    } else {
      const maxSort = categories.reduce((max, c) => Math.max(max, c.sort_order || 0), 0);
      const { error } = await supabase
        .from("categories")
        .insert({ ...categoryData, sort_order: maxSort + 1 });

      if (error) {
        toast.error("Ошибка при создании категории");
      } else {
        toast.success("Категория создана");
        fetchData();
      }
    }

    resetCategoryForm();
  };

  const handleDeleteCategory = async (categoryId: string) => {
    // Check for products in this category (both old category_id and new product_categories)
    const [productsCheck, productCategoriesCheck] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", categoryId),
      supabase.from("product_categories").select("id", { count: "exact", head: true }).eq("category_id", categoryId),
    ]);
    
    const totalProducts = (productsCheck.count || 0) + (productCategoriesCheck.count || 0);
    
    const confirmMsg = totalProducts > 0
      ? `В этой категории ${totalProducts} товар(ов). Открепить товары и удалить категорию?`
      : "Удалить категорию?";
    
    if (!confirm(confirmMsg)) return;

    // Unlink products first
    if (totalProducts > 0) {
      await Promise.all([
        supabase.from("product_categories").delete().eq("category_id", categoryId),
        supabase.from("products").update({ category_id: null }).eq("category_id", categoryId),
      ]);
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", categoryId);

    if (error) {
      toast.error("Ошибка при удалении категории");
    } else {
      toast.success("Категория удалена");
      fetchData();
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      emoji: category.emoji || "",
      image_url: (category as any).image_url || "",
      seo_title: (category as any).seo_title || "",
      seo_description: (category as any).seo_description || "",
    });
    setShowCategoryForm(true);
  };

  const resetCategoryForm = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryForm({ name: "", slug: "", emoji: "", image_url: "", seo_title: "", seo_description: "" });
  };

  const handleUploadCategoryImage = async (file: File) => {
    setIsUploadingImage(true);
    try {
      const compressed = await compressImage(file, 400, 400, 0.85);
      const ext = compressed.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("category-images")
        .upload(fileName, compressed, { cacheControl: "3600", upsert: false });

      if (error) {
        toast.error("Ошибка загрузки: " + error.message);
        return;
      }
      const { data } = supabase.storage.from("category-images").getPublicUrl(fileName);
      setCategoryForm((prev) => ({ ...prev, image_url: data.publicUrl }));
      toast.success("Изображение загружено");
    } catch (e) {
      toast.error("Не удалось загрузить изображение");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleMoveCategoryUp = async (index: number) => {
    if (index === 0) return;
    
    const category = categories[index];
    const prevCategory = categories[index - 1];
    
    await supabase.from("categories").update({ sort_order: prevCategory.sort_order }).eq("id", category.id);
    await supabase.from("categories").update({ sort_order: category.sort_order }).eq("id", prevCategory.id);
    
    fetchData();
  };

  const handleMoveCategoryDown = async (index: number) => {
    if (index === categories.length - 1) return;
    
    const category = categories[index];
    const nextCategory = categories[index + 1];
    
    await supabase.from("categories").update({ sort_order: nextCategory.sort_order }).eq("id", category.id);
    await supabase.from("categories").update({ sort_order: category.sort_order }).eq("id", nextCategory.id);
    
    fetchData();
  };


  // Block handlers
  const handleSaveBlock = async () => {
    if (!blockForm.title) {
      toast.error("Заполните название блока");
      return;
    }

    const blockData = {
      title: blockForm.title,
      emoji: blockForm.emoji || null,
      block_type: blockForm.block_type,
      category_filter: blockForm.block_type === "category" ? blockForm.category_filter : null,
      max_items: parseInt(blockForm.max_items) || 4,
      is_active: blockForm.is_active,
    };

    if (editingBlock) {
      // If block type changed FROM "custom" to another type - clear pinned products
      const wasCustom = editingBlock.block_type === "custom";
      const isNowCustom = blockForm.block_type === "custom";
      
      if (wasCustom && !isNowCustom) {
        await supabase
          .from("homepage_block_products")
          .delete()
          .eq("block_id", editingBlock.id);
      }

      const { error } = await supabase
        .from("homepage_blocks")
        .update(blockData)
        .eq("id", editingBlock.id);

      if (error) {
        toast.error("Ошибка при обновлении блока");
      } else {
        toast.success("Блок обновлён");
        fetchData();
      }
    } else {
      const maxSort = blocks.reduce((max, b) => Math.max(max, b.sort_order || 0), 0);
      const { error } = await supabase
        .from("homepage_blocks")
        .insert({ ...blockData, sort_order: maxSort + 1 });

      if (error) {
        toast.error("Ошибка при создании блока");
      } else {
        toast.success("Блок создан");
        fetchData();
      }
    }

    resetBlockForm();
  };

  const handleEditBlock = (block: HomepageBlock) => {
    setEditingBlock(block);
    setBlockForm({
      title: block.title,
      emoji: block.emoji || "",
      block_type: block.block_type,
      category_filter: block.category_filter || "",
      max_items: (block.max_items || 4).toString(),
      is_active: block.is_active,
    });
    setShowBlockForm(true);
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm("Удалить блок?")) return;

    const { error } = await supabase
      .from("homepage_blocks")
      .delete()
      .eq("id", blockId);

    if (error) {
      toast.error("Ошибка при удалении блока");
    } else {
      toast.success("Блок удалён");
      fetchData();
    }
  };

  const resetBlockForm = () => {
    setShowBlockForm(false);
    setEditingBlock(null);
    setBlockForm({
      title: "",
      emoji: "",
      block_type: "all",
      category_filter: "",
      max_items: "4",
      is_active: true,
    });
  };

  const handleMoveBlockUp = async (index: number) => {
    if (index === 0) return;
    
    const block = blocks[index];
    const prevBlock = blocks[index - 1];
    
    await supabase.from("homepage_blocks").update({ sort_order: prevBlock.sort_order }).eq("id", block.id);
    await supabase.from("homepage_blocks").update({ sort_order: block.sort_order }).eq("id", prevBlock.id);
    
    fetchData();
  };

  const handleMoveBlockDown = async (index: number) => {
    if (index === blocks.length - 1) return;
    
    const block = blocks[index];
    const nextBlock = blocks[index + 1];
    
    await supabase.from("homepage_blocks").update({ sort_order: nextBlock.sort_order }).eq("id", block.id);
    await supabase.from("homepage_blocks").update({ sort_order: block.sort_order }).eq("id", nextBlock.id);
    
    fetchData();
  };

  const toggleBlockActive = async (blockId: string, currentActive: boolean) => {
    const { error } = await supabase
      .from("homepage_blocks")
      .update({ is_active: !currentActive })
      .eq("id", blockId);

    if (!error) {
      fetchData();
    }
  };

  // Block products handlers
  const openBlockProducts = (block: HomepageBlock) => {
    setSelectedBlock(block);
    setProductIdInput("");
    setShowBlockProducts(true);
  };

  const handleCloseBlockProducts = () => {
    setShowBlockProducts(false);
    setProductIdInput("");
    setSelectedBlock(null);
  };

  const getBlockProductIds = (blockId: string): string[] => {
    return blockProducts
      .filter(bp => bp.block_id === blockId)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(bp => bp.product_id);
  };

  const addProductById = async () => {
    if (!selectedBlock || !productIdInput.trim()) return;
    
    const productId = productIdInput.trim();
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(productId)) {
      toast.error("Неверный формат ID товара");
      return;
    }
    
    // Check if already added
    if (getBlockProductIds(selectedBlock.id).includes(productId)) {
      toast.error("Этот товар уже добавлен в блок");
      return;
    }
    
    setIsAddingProduct(true);
    
    // Verify product exists and is active
    const { data: product, error: checkError } = await supabase
      .from("products")
      .select("id, title")
      .eq("id", productId)
      .eq("is_active", true)
      .maybeSingle();
    
    if (checkError || !product) {
      toast.error("Товар с таким ID не найден или неактивен");
      setIsAddingProduct(false);
      return;
    }
    
    // Add product to block
    const existing = blockProducts.filter(bp => bp.block_id === selectedBlock.id);
    const maxSort = existing.reduce((max, bp) => Math.max(max, bp.sort_order), 0);

    const { error } = await supabase
      .from("homepage_block_products")
      .insert({
        block_id: selectedBlock.id,
        product_id: productId,
        sort_order: maxSort + 1,
      });

    setIsAddingProduct(false);

    if (error) {
      toast.error("Ошибка при добавлении товара");
    } else {
      toast.success(`Товар "${product.title}" добавлен`);
      setProductIdInput("");
      fetchData();
    }
  };

  const removeProductFromBlock = async (productId: string) => {
    if (!selectedBlock) return;

    const { error } = await supabase
      .from("homepage_block_products")
      .delete()
      .eq("block_id", selectedBlock.id)
      .eq("product_id", productId);

    if (!error) {
      fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-16 md:pb-0">
        <Header />
        <main className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <Header />

      <main className="container mx-auto px-4 py-4">
        <PageHeader title="Блоки главной" backPath="/admin" />

        <Tabs defaultValue="blocks" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="blocks" className="flex items-center gap-1">
              <Blocks className="h-4 w-4" />
              Блоки
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1">
              <LayoutGrid className="h-4 w-4" />
              Категории
            </TabsTrigger>
          </TabsList>

          {/* Blocks Tab */}
          <TabsContent value="blocks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-medium text-foreground">Блоки главной ({blocks.length})</h2>
              <Dialog open={showBlockForm} onOpenChange={setShowBlockForm}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => resetBlockForm()}>
                    <Plus className="h-4 w-4 mr-1" />
                    Добавить
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingBlock ? "Редактировать блок" : "Новый блок"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Название *</Label>
                      <Input
                        value={blockForm.title}
                        onChange={(e) => setBlockForm({ ...blockForm, title: e.target.value })}
                        placeholder="Со скидкой"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Эмодзи</Label>
                      <Input
                        value={blockForm.emoji}
                        onChange={(e) => setBlockForm({ ...blockForm, emoji: e.target.value })}
                        placeholder="🏷️"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Тип блока</Label>
                      <Select 
                        value={blockForm.block_type} 
                        onValueChange={(v) => setBlockForm({ ...blockForm, block_type: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все товары</SelectItem>
                          <SelectItem value="discount">Со скидкой</SelectItem>
                          <SelectItem value="new">Новинки</SelectItem>
                          <SelectItem value="category">По категории</SelectItem>
                          <SelectItem value="custom">Вручную выбранные</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {blockForm.block_type === "category" && (
                      <div className="space-y-2">
                        <Label>Категория</Label>
                        <Select 
                          value={blockForm.category_filter} 
                          onValueChange={(v) => setBlockForm({ ...blockForm, category_filter: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите категорию" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.slug}>
                                {cat.emoji} {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Макс. товаров</Label>
                        <Input
                          type="number"
                          value={blockForm.max_items}
                          onChange={(e) => setBlockForm({ ...blockForm, max_items: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Активен</Label>
                        <div className="pt-2">
                          <Switch
                            checked={blockForm.is_active}
                            onCheckedChange={(checked) => setBlockForm({ ...blockForm, is_active: checked })}
                          />
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleSaveBlock} className="w-full">
                      {editingBlock ? "Сохранить" : "Создать"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {blocks.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Нет блоков. Создайте первый блок для главной страницы.
              </div>
            ) : (
              <div className="space-y-2">
                {blocks.map((block, index) => (
                  <div key={block.id} className="flex items-center gap-3 rounded-xl bg-card p-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveBlockUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveBlockDown(index)}
                        disabled={index === blocks.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-2xl">{block.emoji || "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{block.title}</h3>
                        {!block.is_active && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            Скрыт
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {block.block_type === "discount" && "Товары со скидкой"}
                        {block.block_type === "new" && "Новинки"}
                        {block.block_type === "category" && `Категория: ${block.category_filter}`}
                        {block.block_type === "all" && "Все товары"}
                        {block.block_type === "custom" && "Вручную выбранные"}
                        {getBlockProductIds(block.id).length > 0 && ` + ${getBlockProductIds(block.id).length} закреплённых`}
                        {" • "}Макс: {block.max_items}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Switch
                        checked={block.is_active}
                        onCheckedChange={() => toggleBlockActive(block.id, block.is_active)}
                      />
                      <Button variant="ghost" size="icon" onClick={() => openBlockProducts(block)}>
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditBlock(block)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteBlock(block.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Block products dialog */}
            <Dialog open={showBlockProducts} onOpenChange={(open) => {
              if (!open) handleCloseBlockProducts();
              else setShowBlockProducts(open);
            }}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Товары блока "{selectedBlock?.title}"
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Добавленные товары</Label>
                    {selectedBlock && getBlockProductIds(selectedBlock.id).length === 0 && (
                      <p className="text-sm text-muted-foreground">Нет товаров</p>
                    )}
                    {selectedBlock && getBlockProductIds(selectedBlock.id).map(productId => {
                      const product = products.find(p => p.id === productId);
                      if (!product) return null;
                      return (
                        <div key={productId} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                          <img 
                            src={product.image_url || "https://placehold.co/40x40"} 
                            className="w-10 h-10 rounded object-cover"
                            alt=""
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm truncate block">{product.title}</span>
                            <span className="text-xs text-muted-foreground font-mono">{productId.slice(0, 8)}...</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => removeProductFromBlock(productId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    <Label>Добавить товар по ID</Label>
                    <p className="text-xs text-muted-foreground">
                      Скопируйте ID товара со страницы /product/[id]
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={productIdInput}
                        onChange={(e) => setProductIdInput(e.target.value)}
                        placeholder="44c7a695-0575-48a5-9b24-26b10ba9537f"
                        className="flex-1 font-mono text-xs"
                      />
                      <Button 
                        onClick={addProductById}
                        disabled={!productIdInput.trim() || isAddingProduct}
                        size="icon"
                      >
                        {isAddingProduct ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-medium text-foreground">Категории ({categories.length})</h2>
              <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => resetCategoryForm()}>
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
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        placeholder="Овощи"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Slug (URL) *</Label>
                      <Input
                        value={categoryForm.slug}
                        onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                        placeholder="vegetables"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Эмодзи</Label>
                      <Input
                        value={categoryForm.emoji}
                        onChange={(e) => setCategoryForm({ ...categoryForm, emoji: e.target.value })}
                        placeholder="🥕"
                      />
                    </div>
                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-medium text-muted-foreground mb-3">SEO (необязательно)</p>
                      <div className="space-y-2">
                        <Label>SEO Title</Label>
                        <Input
                          value={categoryForm.seo_title}
                          onChange={(e) => setCategoryForm({ ...categoryForm, seo_title: e.target.value })}
                          placeholder="Заголовок для поисковиков"
                        />
                      </div>
                      <div className="space-y-2 mt-2">
                        <Label>SEO Description</Label>
                        <Input
                          value={categoryForm.seo_description}
                          onChange={(e) => setCategoryForm({ ...categoryForm, seo_description: e.target.value })}
                          placeholder="Описание для поисковиков"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveCategory} className="w-full">
                      {editingCategory ? "Сохранить" : "Создать"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {categories.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Нет категорий
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((category, index) => (
                  <div key={category.id} className="flex items-center gap-3 rounded-xl bg-card p-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveCategoryUp(index)}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleMoveCategoryDown(index)}
                        disabled={index === categories.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-2xl">{category.emoji || "📁"}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">{category.name}</h3>
                      <p className="text-xs text-muted-foreground">{category.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditCategory(category)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
}
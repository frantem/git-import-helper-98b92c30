-- Reviews table for products
CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own reviews" 
ON public.reviews 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" 
ON public.reviews 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" 
ON public.reviews 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Banners table for carousel management
CREATE TABLE public.banners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    subtitle text,
    discount_text text,
    image_url text NOT NULL,
    link_url text,
    link_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    link_category text,
    color_gradient text NOT NULL DEFAULT 'from-success/80 to-success/40',
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- RLS policies for banners
CREATE POLICY "Banners are viewable by everyone" 
ON public.banners 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage banners" 
ON public.banners 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON public.banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Homepage blocks table for ordering sections
CREATE TABLE public.homepage_blocks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    block_type text NOT NULL, -- 'banner', 'sets', 'discounts', 'popular', 'new'
    title text NOT NULL,
    emoji text,
    category_filter text,
    sort_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    max_items integer DEFAULT 4,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homepage_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for homepage_blocks
CREATE POLICY "Homepage blocks are viewable by everyone" 
ON public.homepage_blocks 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage homepage blocks" 
ON public.homepage_blocks 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_homepage_blocks_updated_at
BEFORE UPDATE ON public.homepage_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
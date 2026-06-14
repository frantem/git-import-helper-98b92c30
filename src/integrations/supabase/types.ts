export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          color_gradient: string
          created_at: string
          discount_text: string | null
          id: string
          image_url: string
          is_active: boolean
          link_category: string | null
          link_product_id: string | null
          link_url: string | null
          sort_order: number
          subtitle: string | null
          title: string
        }
        Insert: {
          color_gradient?: string
          created_at?: string
          discount_text?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_category?: string | null
          link_product_id?: string | null
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title: string
        }
        Update: {
          color_gradient?: string
          created_at?: string
          discount_text?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_category?: string | null
          link_product_id?: string | null
          link_url?: string | null
          sort_order?: number
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      email_change_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          new_email: string
          user_id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          new_email: string
          user_id: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          new_email?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      email_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified?: boolean
        }
        Relationships: []
      }
      farmers: {
        Row: {
          address_details: string | null
          busy_dates: Json | null
          city: string | null
          created_at: string
          description: string | null
          district: string | null
          id: string
          is_blocked: boolean | null
          max_orders_per_day: number | null
          name: string
          photo_url: string | null
          pickup_slots: Json | null
          rating: number | null
          slug: string | null
          street: string | null
          telegram_chat_id: string | null
          telegram_link_code: string | null
          user_id: string | null
          vacation_dates: Json | null
          village: string | null
        }
        Insert: {
          address_details?: string | null
          busy_dates?: Json | null
          city?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          is_blocked?: boolean | null
          max_orders_per_day?: number | null
          name: string
          photo_url?: string | null
          pickup_slots?: Json | null
          rating?: number | null
          slug?: string | null
          street?: string | null
          telegram_chat_id?: string | null
          telegram_link_code?: string | null
          user_id?: string | null
          vacation_dates?: Json | null
          village?: string | null
        }
        Update: {
          address_details?: string | null
          busy_dates?: Json | null
          city?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          is_blocked?: boolean | null
          max_orders_per_day?: number | null
          name?: string
          photo_url?: string | null
          pickup_slots?: Json | null
          rating?: number | null
          slug?: string | null
          street?: string | null
          telegram_chat_id?: string | null
          telegram_link_code?: string | null
          user_id?: string | null
          vacation_dates?: Json | null
          village?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_block_products: {
        Row: {
          block_id: string
          id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          block_id: string
          id?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          block_id?: string
          id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "homepage_block_products_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "homepage_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homepage_block_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_blocks: {
        Row: {
          block_type: string
          category_filter: string | null
          created_at: string
          emoji: string | null
          id: string
          is_active: boolean
          max_items: number | null
          sort_order: number
          title: string
        }
        Insert: {
          block_type?: string
          category_filter?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          max_items?: number | null
          sort_order?: number
          title: string
        }
        Update: {
          block_type?: string
          category_filter?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          is_active?: boolean
          max_items?: number | null
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          confirmed_at: string | null
          created_at: string
          custom_fields: Json | null
          farmer_id: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          settled_at: string | null
          settled_by: string | null
          status: string
          unit_price: number
          variant_label: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          farmer_id: string
          id?: string
          order_id: string
          product_id: string
          quantity?: number
          settled_at?: string | null
          settled_by?: string | null
          status?: string
          unit_price: number
          variant_label?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          custom_fields?: Json | null
          farmer_id?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          settled_at?: string | null
          settled_by?: string | null
          status?: string
          unit_price?: number
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          confirmation_method: string
          created_at: string
          delivery_address: string | null
          delivery_cost: number | null
          delivery_date: string | null
          delivery_type: string
          estimated_delivery_time: string | null
          id: string
          notes: string | null
          payment_method: string
          pickup_point_id: string | null
          referrer_farmer_id: string | null
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          confirmation_method?: string
          created_at?: string
          delivery_address?: string | null
          delivery_cost?: number | null
          delivery_date?: string | null
          delivery_type?: string
          estimated_delivery_time?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          pickup_point_id?: string | null
          referrer_farmer_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          confirmation_method?: string
          created_at?: string
          delivery_address?: string | null
          delivery_cost?: number | null
          delivery_date?: string | null
          delivery_type?: string
          estimated_delivery_time?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          pickup_point_id?: string | null
          referrer_farmer_id?: string | null
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_referrer_farmer_id_fkey"
            columns: ["referrer_farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
      phone_send_log: {
        Row: {
          id: string
          phone: string
          sent_at: string
        }
        Insert: {
          id?: string
          phone: string
          sent_at?: string
        }
        Update: {
          id?: string
          phone?: string
          sent_at?: string
        }
        Relationships: []
      }
      pickup_points: {
        Row: {
          address: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          working_hours: string | null
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          working_hours?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          working_hours?: string | null
        }
        Relationships: []
      }
      product_addons: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          product_id: string
          selection_type: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price?: number
          product_id: string
          selection_type?: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          product_id?: string
          selection_type?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_addons_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          id: string
          product_id: string
        }
        Insert: {
          category_id: string
          id?: string
          product_id: string
        }
        Update: {
          category_id?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_custom_field_options: {
        Row: {
          field_id: string
          id: string
          label: string
          sort_order: number | null
        }
        Insert: {
          field_id: string
          id?: string
          label: string
          sort_order?: number | null
        }
        Update: {
          field_id?: string
          id?: string
          label?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_custom_field_options_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "product_custom_fields"
            referencedColumns: ["id"]
          },
        ]
      }
      product_custom_fields: {
        Row: {
          created_at: string
          field_type: string
          id: string
          label: string
          max_length: number | null
          placeholder: string | null
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          field_type?: string
          id?: string
          label: string
          max_length?: number | null
          placeholder?: string | null
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          field_type?: string
          id?: string
          label?: string
          max_length?: number | null
          placeholder?: string | null
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_custom_fields_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          discount_percent: number | null
          id: string
          is_default: boolean | null
          label: string
          price: number
          product_id: string
          sort_order: number | null
          unit: string
        }
        Insert: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          is_default?: boolean | null
          label: string
          price: number
          product_id: string
          sort_order?: number | null
          unit?: string
        }
        Update: {
          created_at?: string
          discount_percent?: number | null
          id?: string
          is_default?: boolean | null
          label?: string
          price?: number
          product_id?: string
          sort_order?: number | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          calories: number | null
          carbs: number | null
          category_id: string | null
          composition: string | null
          created_at: string
          description: string | null
          farmer_id: string | null
          fat: number | null
          id: string
          image_url: string | null
          is_active: boolean
          is_deleted: boolean
          is_featured: boolean | null
          is_new: boolean | null
          old_price: number | null
          order_lead_time_hours: number
          prep_time_minutes: number
          price: number
          protein: number | null
          shelf_life: string | null
          slug: string | null
          stock: number
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          category_id?: string | null
          composition?: string | null
          created_at?: string
          description?: string | null
          farmer_id?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          is_featured?: boolean | null
          is_new?: boolean | null
          old_price?: number | null
          order_lead_time_hours?: number
          prep_time_minutes?: number
          price?: number
          protein?: number | null
          shelf_life?: string | null
          slug?: string | null
          stock?: number
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          category_id?: string | null
          composition?: string | null
          created_at?: string
          description?: string | null
          farmer_id?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_deleted?: boolean
          is_featured?: boolean | null
          is_new?: boolean | null
          old_price?: number | null
          order_lead_time_hours?: number
          prep_time_minutes?: number
          price?: number
          protein?: number | null
          shelf_life?: string | null
          slug?: string | null
          stock?: number
          title?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_farmer_id_fkey"
            columns: ["farmer_id"]
            isOneToOne: false
            referencedRelation: "farmers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          busy_dates: Json | null
          created_at: string
          delivery_address: string | null
          email: string | null
          full_name: string | null
          has_password: boolean
          id: string
          max_orders_per_day: number | null
          phone: string | null
          phone_verified: boolean
          pickup_slots: Json | null
          telegram_chat_id: string | null
          telegram_link_code: string | null
          updated_at: string
          user_id: string
          vacation_dates: Json | null
        }
        Insert: {
          avatar_url?: string | null
          busy_dates?: Json | null
          created_at?: string
          delivery_address?: string | null
          email?: string | null
          full_name?: string | null
          has_password?: boolean
          id?: string
          max_orders_per_day?: number | null
          phone?: string | null
          phone_verified?: boolean
          pickup_slots?: Json | null
          telegram_chat_id?: string | null
          telegram_link_code?: string | null
          updated_at?: string
          user_id: string
          vacation_dates?: Json | null
        }
        Update: {
          avatar_url?: string | null
          busy_dates?: Json | null
          created_at?: string
          delivery_address?: string | null
          email?: string | null
          full_name?: string | null
          has_password?: boolean
          id?: string
          max_orders_per_day?: number | null
          phone?: string | null
          phone_verified?: boolean
          pickup_slots?: Json | null
          telegram_chat_id?: string | null
          telegram_link_code?: string | null
          updated_at?: string
          user_id?: string
          vacation_dates?: Json | null
        }
        Relationships: []
      }
      review_images: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          review_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          review_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          review_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          created_at: string
          id: string
          product_id: string
          rating: number
          text: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          rating: number
          text?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          text?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_applications: {
        Row: {
          admin_comment: string | null
          created_at: string
          description: string | null
          district: string | null
          id: string
          name: string
          phone: string
          status: string
          updated_at: string
          user_id: string
          village: string | null
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          name: string
          phone: string
          status?: string
          updated_at?: string
          user_id: string
          village?: string | null
        }
        Update: {
          admin_comment?: string | null
          created_at?: string
          description?: string | null
          district?: string | null
          id?: string
          name?: string
          phone?: string
          status?: string
          updated_at?: string
          user_id?: string
          village?: string | null
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          duration_seconds: number | null
          id: string
          page_path: string
          referrer: string | null
          user_agent: string | null
          visited_at: string
          visitor_id: string
        }
        Insert: {
          duration_seconds?: number | null
          id?: string
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_id: string
        }
        Update: {
          duration_seconds?: number | null
          id?: string
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_seller_read_order: { Args: { _order_id: string }; Returns: boolean }
      can_seller_update_order: { Args: { _order_id: string }; Returns: boolean }
      confirm_order_items_for_farmer: {
        Args: { _farmer_id: string; _order_id: string }
        Returns: number
      }
      ensure_unique_product_slug: {
        Args: { _base: string; _self_id: string }
        Returns: string
      }
      generate_product_slug: { Args: { _title: string }; Returns: string }
      get_buyer_profiles_for_seller: {
        Args: { _buyer_ids: string[] }
        Returns: {
          full_name: string
          phone: string
          user_id: string
        }[]
      }
      get_orders_count_by_dates: {
        Args: { p_check_dates: string[]; p_farmer_ids: string[] }
        Returns: {
          farmer_id: string
          order_count: number
          order_date: string
        }[]
      }
      get_public_profile_names: {
        Args: { _user_ids: string[] }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      get_seller_pickup_settings: {
        Args: { farmer_ids: string[] }
        Returns: {
          busy_dates: Json
          farmer_id: string
          max_orders_per_day: number
          pickup_slots: Json
          vacation_dates: Json
        }[]
      }
      mark_order_confirmed_if_all: {
        Args: { _order_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCallback } from "react";

export function useFavorites() {
  const { user } = useAuth();

  const { data: favoriteIds = new Set<string>(), isLoading } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      if (!user) return new Set<string>();
      const { data, error } = await supabase
        .from("favorites")
        .select("product_id")
        .eq("user_id", user.id);
      if (error) return new Set<string>();
      return new Set(data.map((f) => f.product_id));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const queryClient = useQueryClient();

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (!user) {
        toast.error("Войдите, чтобы добавить в избранное");
        return;
      }

      const isFav = favoriteIds.has(productId);

      // Optimistic update
      queryClient.setQueryData<Set<string>>(["favorites", user.id], (old) => {
        const next = new Set(old);
        if (isFav) next.delete(productId);
        else next.add(productId);
        return next;
      });

      if (isFav) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) {
          queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
          return;
        }
        toast.success("Удалено из избранного");
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ user_id: user.id, product_id: productId });
        if (error) {
          queryClient.invalidateQueries({ queryKey: ["favorites", user.id] });
          return;
        }
        toast.success("Добавлено в избранное");
      }
    },
    [user, favoriteIds, queryClient]
  );

  return { favoriteIds, isLoading, toggleFavorite };
}

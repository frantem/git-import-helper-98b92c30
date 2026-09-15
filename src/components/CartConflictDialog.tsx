import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * В корзине допустим только один продавец. Диалог появляется при попытке
 * добавить товар другого продавца.
 */
export function CartConflictDialog() {
  const { conflict, cancelConflict, replaceCartWithPending } = useCart();
  const navigate = useNavigate();

  return (
    <AlertDialog open={!!conflict} onOpenChange={(open) => { if (!open) cancelConflict(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Товары только от одного продавца</AlertDialogTitle>
          <AlertDialogDescription>
            {conflict && (
              <>
                В корзине уже есть товары от {conflict.currentSellerName}. Чтобы добавить товар
                от {conflict.newSellerName}, нужно сначала оформить или очистить текущую корзину.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            onClick={() => {
              cancelConflict();
              navigate("/cart");
            }}
          >
            Оформить текущий заказ
          </Button>
          <Button variant="outline" className="w-full" onClick={replaceCartWithPending}>
            Очистить и добавить новый товар
          </Button>
          <Button variant="ghost" className="w-full" onClick={cancelConflict}>
            Отмена
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

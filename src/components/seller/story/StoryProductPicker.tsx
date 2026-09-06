import { Checkbox } from "@/components/ui/checkbox";
import { cdnImage } from "@/lib/imageCdn";
import type { StoryProduct } from "./StoryProductCard";

interface Props {
  products: StoryProduct[];
  selectedIds: string[];
  max: number;
  onToggle: (id: string) => void;
}

export function StoryProductPicker({ products, selectedIds, max, onToggle }: Props) {
  return (
    <section className="rounded-xl bg-card p-3 md:p-4">
      <div className="mb-2 flex items-center justify-between md:mb-3">
        <h2 className="font-bold">Товары</h2>
        <span className="text-sm text-muted-foreground">
          Выбрано {selectedIds.length} из {max}
        </span>
      </div>
      <div className="max-h-[42svh] space-y-2 overflow-y-auto pr-1 md:max-h-none md:overflow-visible md:pr-0">
        {products.map((p) => {
          const checked = selectedIds.includes(p.id);
          const disabled = !checked && selectedIds.length >= max;
          return (
            <label
              key={p.id}
              className={`flex items-center gap-3 rounded-lg border p-2 ${disabled ? "opacity-50" : "cursor-pointer"} ${checked ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <Checkbox checked={checked} disabled={disabled} onCheckedChange={() => onToggle(p.id)} />
              <img
                src={cdnImage(p.image_url, "thumb")}
                alt=""
                className="h-10 w-10 shrink-0 rounded-md object-cover bg-secondary md:h-12 md:w-12"
              />
              <span className="line-clamp-2 text-sm font-medium">{p.title}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

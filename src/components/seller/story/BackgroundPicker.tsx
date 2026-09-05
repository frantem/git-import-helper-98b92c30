import { useRef } from "react";
import { Upload, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryBackground } from "./storyBackgrounds";

interface Props {
  backgrounds: StoryBackground[];
  selectedId: string;
  onSelect: (bg: StoryBackground) => void;
  onUploadFile: (file: File) => void;
}

export function BackgroundPicker({ backgrounds, selectedId, onSelect, onUploadFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Загрузить своё"
          className="flex aspect-[9/16] w-[56px] shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-[10px] text-muted-foreground"
        >
          <Upload className="h-4 w-4" />
          Своё
        </button>
        {backgrounds.map((bg) => {
          const active = bg.id === selectedId;
          return (
            <button
              key={bg.id}
              type="button"
              onClick={() => onSelect(bg)}
              aria-label={bg.label}
              aria-pressed={active}
              className={cn(
                "relative aspect-[9/16] w-[56px] shrink-0 snap-start overflow-hidden rounded-lg border-2 transition-all",
                active ? "border-primary ring-2 ring-primary/40" : "border-border",
              )}
              style={{ background: bg.css }}
            >
              {bg.image && <img src={bg.image} alt="" className="h-full w-full object-cover" />}
              {active && (
                <span className="absolute inset-0 flex items-center justify-center bg-background/20">
                  <Check className="h-5 w-5 text-primary-foreground drop-shadow" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUploadFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

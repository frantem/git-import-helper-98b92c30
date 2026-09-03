import { useRef } from "react";
import { Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
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
                "relative aspect-[9/16] overflow-hidden rounded-lg border-2 transition-all",
                active ? "border-primary ring-2 ring-primary/40" : "border-transparent",
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
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="mr-2 h-4 w-4" />
        Загрузить своё
      </Button>
    </div>
  );
}

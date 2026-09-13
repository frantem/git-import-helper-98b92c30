import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Download } from "lucide-react";

interface Props {
  url: string | null;
  canShareFiles: boolean;
  onShare: () => void;
  onClose: () => void;
}

/**
 * Готовое изображение. Нужен для iOS, где ссылка с download не сохраняет файл:
 * там картинку сохраняют долгим нажатием или через системное «Поделиться».
 */
export function StoryResultDialog({ url, canShareFiles, onShare, onClose }: Props) {
  return (
    <Dialog open={!!url} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[92vw] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Изображение готово</DialogTitle>
        </DialogHeader>
        {url && (
          <img
            src={url}
            alt="Готовая сторис"
            className="mx-auto max-h-[55svh] w-auto rounded-lg shadow"
          />
        )}
        <p className="text-center text-sm text-muted-foreground">
          Нажмите и удерживайте картинку → «Сохранить в Фото»
          {canShareFiles ? ", или воспользуйтесь кнопкой ниже." : "."}
        </p>
        <div className="grid gap-2">
          {canShareFiles && (
            <Button size="lg" onClick={onShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Поделиться / Сохранить
            </Button>
          )}
          {url && (
            <Button asChild size="lg" variant="outline">
              <a href={url} download="locus-story.png" target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Открыть изображение
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

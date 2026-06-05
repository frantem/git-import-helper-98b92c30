import { useEffect, useState, useCallback, useRef } from "react";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { TransformWrapper, TransformComponent, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { cdnImage } from "@/lib/imageCdn";
import { cn } from "@/lib/utils";

interface ProductImageLightboxProps {
  images: string[];
  startIndex: number | null;
  alt: string;
  onClose: () => void;
}

export function ProductImageLightbox({
  images,
  startIndex,
  alt,
  onClose,
}: ProductImageLightboxProps) {
  const open = startIndex !== null;
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: startIndex ?? 0,
    loop: images.length > 1,
    duration: 20,
    watchDrag: true,
    containScroll: "trimSnaps",
  });
  const [selected, setSelected] = useState(startIndex ?? 0);
  const [zoomed, setZoomed] = useState(false);
  // Refs to each TransformWrapper so we can reset zoom on slide change.
  const transformRefs = useRef<Array<ReactZoomPanPinchRef | null>>([]);

  // Reset to startIndex whenever it changes (lightbox reopened on a different photo)
  useEffect(() => {
    if (open && emblaApi && startIndex !== null) {
      emblaApi.scrollTo(startIndex, true);
      setSelected(startIndex);
      setZoomed(false);
    }
  }, [open, emblaApi, startIndex]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const newIdx = emblaApi.selectedScrollSnap();
      setSelected((prev) => {
        // Reset zoom on the slide we're leaving so it reopens at scale 1.
        if (prev !== newIdx) {
          transformRefs.current[prev]?.resetTransform(0);
        }
        return newIdx;
      });
      setZoomed(false);
    };
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  // Toggle Embla drag based on zoom state — when zoomed, let user pan the image
  // without the carousel hijacking horizontal gestures.
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit({ watchDrag: !zoomed });
  }, [emblaApi, zoomed]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/95" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Закрыть"
            className="absolute right-3 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Carousel */}
          <div className="flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex h-full">
              {images.map((src, i) => (
                <div
                  key={i}
                  className="relative flex h-full min-w-0 shrink-0 grow-0 basis-full items-center justify-center"
                >
                  <TransformWrapper
                    ref={(el) => {
                      transformRefs.current[i] = el;
                    }}
                    doubleClick={{ mode: "toggle", step: 2 }}
                    pinch={{ step: 5 }}
                    wheel={{ step: 0.2 }}
                    minScale={1}
                    maxScale={4}
                    centerOnInit
                    panning={{ disabled: !zoomed || i !== selected }}
                    onTransform={(_ref, state) => {
                      if (i !== selected) return;
                      const isZoomed = state.scale > 1.01;
                      setZoomed((prev) => (prev !== isZoomed ? isZoomed : prev));
                    }}
                  >
                    <TransformComponent
                      wrapperClass="!h-full !w-full"
                      contentClass="!h-full !w-full flex items-center justify-center"
                    >
                      <img
                        src={cdnImage(src, "detail", 2)}
                        alt={`${alt} — фото ${i + 1}`}
                        className="max-h-[90vh] max-w-full object-contain select-none"
                        draggable={false}
                      />
                    </TransformComponent>
                  </TransformWrapper>
                </div>
              ))}
            </div>
          </div>


          {/* Prev/Next (desktop) */}
          {images.length > 1 && (
            <>
              <button
                onClick={scrollPrev}
                aria-label="Предыдущее фото"
                className="absolute left-3 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 md:flex"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <button
                onClick={scrollNext}
                aria-label="Следующее фото"
                className="absolute right-3 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20 md:flex"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </>
          )}

          {/* Counter + dots */}
          {images.length > 1 && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                {selected + 1} / {images.length}
              </span>
              <div className="pointer-events-auto flex gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => emblaApi?.scrollTo(i)}
                    aria-label={`Перейти к фото ${i + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === selected ? "w-5 bg-white" : "w-1.5 bg-white/40",
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

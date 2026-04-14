import { useState, useRef } from "react";
import { Star, Camera, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
  images?: string[];
}

interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  onAddReview?: (rating: number, text: string, files: File[]) => void;
}

export function ProductReviews({
  productId,
  reviews,
  averageRating,
  totalReviews,
  onAddReview,
}: ProductReviewsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (rating > 0 && onAddReview) {
      onAddReview(rating, text, selectedFiles);
      setText("");
      setRating(5);
      setSelectedFiles([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);
      setShowForm(false);
    }
  };

  const handleAddReviewClick = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setShowForm(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - selectedFiles.length;
    const newFiles = files.slice(0, remaining);
    if (newFiles.length === 0) return;

    setSelectedFiles(prev => [...prev, ...newFiles]);
    const newUrls = newFiles.map(f => URL.createObjectURL(f));
    setPreviewUrls(prev => [...prev, ...newUrls]);

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="rounded-lg bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Отзывы</h3>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          <span className="font-bold text-foreground">{averageRating.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">({totalReviews} отзывов)</span>
        </div>
      </div>

      {/* Add review button/form */}
      {!showForm ? (
        <Button
          variant="outline"
          className="mb-4 w-full"
          onClick={handleAddReviewClick}
        >
          Оставить отзыв
        </Button>
      ) : (
        <div className="mb-4 rounded-lg border border-border p-4">
          <div className="mb-3">
            <span className="text-sm text-muted-foreground">Ваша оценка:</span>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      "h-6 w-6 transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="Напишите ваш отзыв..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mb-3"
            rows={3}
          />

          {/* Photo previews */}
          {previewUrls.length > 0 && (
            <div className="mb-3 flex gap-2">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden bg-secondary">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5"
                  >
                    <X className="h-3.5 w-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSubmit}>Отправить</Button>
            {selectedFiles.length < 3 && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => {
              setShowForm(false);
              setSelectedFiles([]);
              previewUrls.forEach(url => URL.revokeObjectURL(url));
              setPreviewUrls([]);
            }}>
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-medium">
                    {review.userName.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-foreground">{review.userName}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(review.createdAt)}
                </span>
              </div>
              <div className="mb-2 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      review.rating >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground"
                    )}
                  />
                ))}
              </div>
              {review.text && (
                <p className="text-sm text-muted-foreground">{review.text}</p>
              )}
              {/* Review images */}
              {review.images && review.images.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {review.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxImage(img)}
                      className="h-16 w-16 rounded-lg overflow-hidden bg-secondary"
                    >
                      <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Пока нет отзывов. Будьте первым!
        </p>
      )}

      {/* Lightbox dialog */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2">
          {lightboxImage && (
            <img src={lightboxImage} alt="" className="w-full h-auto max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

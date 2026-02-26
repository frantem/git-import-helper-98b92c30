import { useState } from "react";
import { Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  createdAt: string;
}

interface ProductReviewsProps {
  productId: string;
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  onAddReview?: (rating: number, text: string) => void;
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

  const handleSubmit = () => {
    if (rating > 0 && onAddReview) {
      onAddReview(rating, text);
      setText("");
      setRating(5);
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
          <div className="flex gap-2">
            <Button onClick={handleSubmit}>Отправить</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
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
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Пока нет отзывов. Будьте первым!
        </p>
      )}
    </div>
  );
}

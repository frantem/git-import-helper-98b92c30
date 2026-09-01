import { Link } from "react-router-dom";
import { Clock } from "lucide-react";

interface TrialBannerProps {
  daysLeft: number;
}

function pluralDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "дня";
  return "дней";
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  return (
    <Link
      to="/seller/tariffs"
      className="mb-4 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4"
    >
      <Clock className="h-5 w-5 shrink-0 text-primary" />
      <p className="text-sm font-medium text-foreground">
        Пробный период заканчивается через {daysLeft} {pluralDays(daysLeft)}.{" "}
        <span className="underline">Выбрать тариф</span>
      </p>
    </Link>
  );
}

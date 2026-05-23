import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "locus-cookies-ack";

export const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // ignore
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[60] bg-foreground text-background shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="dialog"
      aria-label="Уведомление об использовании cookies"
    >
      <div className="container mx-auto px-3 py-2 flex items-center gap-3 flex-wrap justify-center md:justify-between">
        <p className="text-xs leading-snug flex-1 min-w-[200px]">
          Мы используем cookies и аналитику для улучшения сервиса. Подробнее — в{" "}
          <Link to="/cookies" className="underline hover:no-underline">
            Политике cookies
          </Link>
          .
        </p>
        <Button
          size="sm"
          variant="secondary"
          onClick={accept}
          className="h-7 px-3 text-xs shrink-0"
        >
          Понятно
        </Button>
      </div>
    </div>
  );
};

export default CookieBanner;

import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <SEO
        title="Страница не найдена — Locus"
        description="Запрошенная страница не найдена или была удалена. Перейдите в каталог фермерских продуктов Locus."
        noindex
      />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Страница не найдена</p>
        <div className="flex items-center justify-center gap-4">
          <Link to="/" className="text-primary underline hover:text-primary/90">
            На главную
          </Link>
          <Link to="/catalog" className="text-primary underline hover:text-primary/90">
            В каталог
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

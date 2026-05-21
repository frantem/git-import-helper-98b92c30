import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="border-t border-border py-4 pb-20 md:pb-4">
      <div className="container mx-auto px-3 flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
        <span className="text-center whitespace-pre-line">
          УНП: CE6154534{"\n"}Котович Артём Владимирович, самозанятый
        </span>
        <div className="flex items-center gap-1 flex-wrap justify-center">
          <span>© 2026 Locus</span>
          <span>·</span>
          <Link to="/privacy-policy" className="hover:underline">Политика конфиденциальности</Link>
          <span>·</span>
          <Link to="/oferta" className="hover:underline">Публичная оферта</Link>
          <span>·</span>
          <Link to="/seller-terms" className="hover:underline">Условия для продавцов</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

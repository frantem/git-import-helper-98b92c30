import type { ReactNode } from "react";
import { useInView, usePrefersReducedMotion } from "./useMotion";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "li" | "article" | "figure";
};

/**
 * Появление блока при попадании в кадр. Анимируются только opacity и translate,
 * один раз на элемент. При prefers-reduced-motion блок сразу в конечном состоянии.
 */
export function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(true);
  const Tag = as;

  return (
    <Tag
      ref={ref}
      className={`motion-reveal ${className}`}
      data-visible={reduced || inView}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

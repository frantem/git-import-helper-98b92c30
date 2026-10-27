import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * FAQ-аккордеон на Radix: один открытый пункт за раз.
 *
 * Живёт внутри .for-sellers-theme, поэтому цвета берутся из темы лендинга
 * и не влияют на остальной сайт.
 */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  return (
    <Accordion.Root
      type="single"
      collapsible
      className="overflow-hidden rounded-2xl border border-border bg-card"
    >
      {items.map((item, index) => (
        <Accordion.Item
          key={item.question}
          value={`faq-${index}`}
          className="border-b border-border last:border-b-0"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/40 md:px-5">
              <span className="text-[14.5px] font-medium leading-snug text-foreground md:text-[15px]">
                {item.question}
              </span>
              <ChevronDown
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden">
            <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-muted-foreground md:px-5 md:text-sm">
              {item.answer}
            </p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

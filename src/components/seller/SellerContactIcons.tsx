import { memo } from "react";
import { Phone, Instagram } from "lucide-react";
import type { SellerContacts } from "./SellerTrustFooter";

/** Готовый текст для мессенджеров, поддерживающих предзаполнение. */
const TG_TEXT = encodeURIComponent("Здравствуйте! Пишу с сайта LOCUS");
const WA_TEXT = encodeURIComponent("Здравствуйте! Пишу с вашего сайта на LOCUS 👋");
const VB_TEXT = encodeURIComponent("Здравствуйте! Пишу с вашего сайта на LOCUS");

/** Telegram brand icon (lucide не предоставляет). */
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.13-3.05-1.99 1.93c-.23.23-.42.42-.84.42z" />
    </svg>
  );
}

/** Viber brand icon — phone handset in a speech bubble (official Viber mark). */
function ViberIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M11.4 0C5.12 0 1.1 3.35.86 8.7c-.1 2.2.2 3.6.9 5.2.3.7.35.9.35 1.6 0 .9-.15 1.45-.6 2.3-.25.45-.3.65-.3 1 0 .55.15.85.55 1.05.45.25.8.2 1.6-.15 1.4-.6 3.1-1.95 4.6-3.65 1.2-1.35 1.5-1.7 1.5-1.9 0-.15-.05-.25-.2-.3-.15-.05-.3-.02-.6.1-.7.3-1.4.45-2.1.45-.75 0-1.15-.2-1.15-.55 0-.15.1-.4.25-.6.35-.5.5-.9.5-1.45 0-.5-.05-.65-.4-1.25-.55-.95-.75-1.7-.8-3.1-.1-3.4 1.9-5.9 5.3-6.65 1.1-.25 3.2-.25 4.3 0 2.1.45 3.6 1.6 4.2 3.2.3.8.35 2.1.1 3-.3 1.1-1 2-2 2.55-.5.25-.65.27-1.3.27-.7 0-.75-.01-1.1-.25-.5-.35-.65-.75-.55-1.4.1-.45.3-.7.9-1.15.7-.5.95-.95.95-1.65 0-.85-.45-1.5-1.2-1.75-.45-.15-1.25-.15-1.7 0-.5.15-.9.5-1.05.9-.1.25-.15.55-.15 1.1 0 .6-.02.8-.15 1-.2.3-.6.45-1 .4-.55-.07-.85-.4-.95-1.05-.1-.7.05-1.5.4-2.25.6-1.25 1.75-2.05 3.25-2.25.5-.07 1.5-.02 2 .1 1.6.35 2.8 1.45 3.25 2.95.2.65.2 1.75 0 2.4-.3.95-.95 1.7-1.85 2.1-.3.15-.65.25-.8.25-.15 0-.25.05-.25.1 0 .1.15.2.5.35.7.3 1.25.35 2.1.2 1.5-.25 2.6-1.05 3.25-2.35.55-1.1.6-1.5.6-3.05 0-1.3-.05-1.6-.3-2.35-.6-1.8-2.1-3.25-4-3.85C14.5.25 13.2 0 11.4 0z" />
      <path d="M10.2 5.6c-.15 0-.2.05-.25.2-.1.25-.05 1.9.05 2.1.07.15.2.2.35.15.2-.05.25-.15.3-.55.1-.8.05-1.5.0-1.7-.05-.15-.3-.25-.45-.2zm2.4 0c-.2 0-.3.15-.3.4 0 .2.05.3.25.45.2.15.25.25.25.6 0 .3-.05.4-.2.5-.2.1-.2.4-.05.5.15.1.4.05.55-.1.25-.25.35-.6.35-1.1 0-.85-.35-1.25-.85-1.25zm-4.7.3c-.15.05-.2.2-.2.5 0 .45.1.6.35.6.2 0 .3-.15.3-.5 0-.4-.15-.65-.45-.6zm6.9.05c-.2.05-.3.2-.3.5 0 .35.1.5.35.5.25 0 .35-.15.35-.5 0-.4-.15-.6-.4-.5zm-3.45.85c-.2.05-.3.2-.3.5 0 .4.1.55.35.55.25 0 .35-.15.35-.5 0-.4-.15-.6-.4-.55zm-1.7.55c-.2.05-.3.2-.3.5 0 .4.1.55.35.55.25 0 .35-.15.35-.5 0-.4-.15-.6-.4-.55zm3.45 0c-.2.05-.3.2-.3.5 0 .4.1.55.35.55.25 0 .35-.15.35-.5 0-.4-.15-.6-.4-.55z" />
    </svg>
  );
}

/** WhatsApp brand icon. */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 1.9 0 1.1.8 2.2 1 2.3.1.2 1.6 2.5 4 3.5.6.2 1 .4 1.3.5.6.2 1.1.2 1.5.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.2.2-1.3-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z" />
    </svg>
  );
}

function normalizeHandle(value: string) {
  return value.replace(/^@/, "").replace(/^https?:\/\/(t\.me|telegram\.me|instagram\.com)\//i, "");
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

const ICON_BASE =
  "inline-flex h-9 w-9 items-center justify-center rounded-full bg-card text-foreground transition-colors hover:bg-primary/10";

/** Ряд круглых иконок контактов — открывают нативные приложения по deep-ссылкам. */
export const SellerContactIcons = memo(function SellerContactIcons({
  contacts,
}: {
  contacts?: SellerContacts | null;
}) {
  if (!contacts) return null;
  const phone = contacts.phone?.trim() || null;
  const telegram = contacts.telegram?.trim() || null;
  const instagram = contacts.instagram?.trim() || null;
  const viber = contacts.viber?.trim() || null;
  const whatsapp = contacts.whatsapp?.trim() || null;

  if (!phone && !telegram && !instagram && !viber && !whatsapp) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {phone && (
        <a
          href={`tel:${digitsOnly(phone)}`}
          aria-label="Позвонить продавцу"
          className={ICON_BASE}
        >
          <Phone className="h-4 w-4" />
        </a>
      )}
      {telegram && (
        <a
          href={`https://t.me/${normalizeHandle(telegram)}?text=${TG_TEXT}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Написать в Telegram"
          className={ICON_BASE}
        >
          <TelegramIcon className="h-4 w-4" />
        </a>
      )}
      {instagram && (
        <a
          href={`https://instagram.com/${normalizeHandle(instagram)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Открыть Instagram"
          className={ICON_BASE}
        >
          <Instagram className="h-4 w-4" />
        </a>
      )}
      {viber && (
        <a
          href={`viber://chat?number=%2B${digitsOnly(viber)}&text=${VB_TEXT}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Написать в Viber"
          className={ICON_BASE}
        >
          <ViberIcon className="h-4 w-4" />
        </a>
      )}
      {whatsapp && (
        <a
          href={`https://wa.me/${digitsOnly(whatsapp)}?text=${WA_TEXT}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Написать в WhatsApp"
          className={ICON_BASE}
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
      )}
    </div>
  );
});

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

/** Viber brand icon. */
function ViberIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 1C5.93 1 1 5.93 1 12s4.93 11 11 11 11-4.93 11-11S18.07 1 12 1zm5.62 7.2c.34 1.7.34 3.1.2 4.8-.2 2.1-1.1 3.1-3.1 3.3-.8.1-1.6.1-2.4 0-.3 0-.5.1-.6.4-.2.5-.4 1-.6 1.5-.1.3-.3.4-.6.3-.3-.1-.4-.3-.3-.6.2-.6.4-1.1.6-1.7.1-.2 0-.3-.2-.3-1.2-.3-2-.9-2.3-2.2-.2-1.1-.2-2.2 0-3.3.2-1.2 1-1.9 2.2-2.1 1.4-.2 2.8-.2 4.2 0 1.3.2 2.1 1 2.3 2.2.1.5.2 1 .2 1.6zm-2.9-1.3c-.1-.1-.2-.1-.3 0-.1.2-.2.3-.1.5.5.4.7.9.7 1.5 0 .2.1.3.3.3.2 0 .3-.1.3-.3 0-.8-.3-1.5-.9-2zm-.7-.7c-.1-.1-.3-.1-.4 0-.1.1-.2.3-.1.4 0 .1.1.2.2.2.2 0 .3-.1.3-.3 0-.1 0-.2-.2-.3zm-1.2.6c.1-.1.1-.3 0-.4-.1-.1-.3-.1-.4 0-.5.5-.7 1.1-.7 1.8 0 .2.1.3.3.3.2 0 .3-.1.3-.3 0-.5.2-1 .5-1.4z" />
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

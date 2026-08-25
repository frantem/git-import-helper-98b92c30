import { memo } from "react";
import { Phone, Instagram } from "lucide-react";
import type { SellerContacts } from "./SellerTrustFooter";

/** Готовый текст для мессенджеров, поддерживающих предзаполнение. */
const TG_TEXT = encodeURIComponent("Здравствуйте! Пишу с сайта LOCUS");
const WA_TEXT = encodeURIComponent("Здравствуйте! Пишу с вашего сайта на LOCUS 👋");
const VB_TEXT = encodeURIComponent("Здравствуйте! Пишу с вашего сайта на LOCUS");

/** Telegram brand icon (simple-icons). */
function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.259-1.91.177-.184 3.157-2.894 3.216-3.14.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.061 3.345-.479.329-.913.489-1.302.489-.428 0-1.252-.242-1.863-.441-.75-.243-1.349-.372-1.297-.786.027-.216.324-.437.891-.662 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

/** Viber brand icon (simple-icons). */
function ViberIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M13.16 0C6.68 0 1.36 4.39 1.36 10.3c0 3.55 1.97 6.28 4.95 8.04V24l4.52-2.49c1.21.34 2.49.53 3.81.53 6.48 0 11.8-4.39 11.8-10.3S19.64 0 13.16 0zm0 1.8c5.58 0 10.01 3.74 10.01 8.5s-4.43 8.5-10.01 8.5c-1.27 0-2.49-.2-3.62-.56l-.27-.08-2.81 1.55.04-2.95-0.27-.16C3.5 15.04 2.15 12.81 2.15 10.3c0-4.76 4.43-8.5 10.01-8.5zm-2.4 4.08c-.22-.01-.4.16-.4.38 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.39-.4-.38zm4.85 0c-.22-.01-.4.16-.4.38 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.39-.4-.38zm-7.27 1.5c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4zm9.69 0c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4zm-4.85.06c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4zm-2.43.66c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4zm4.85 0c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4zm-7.27 1.5c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4zm9.69 0c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4zm-4.85.06c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4zm-2.43.66c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4zm4.85 0c-.22 0-.4.18-.4.4 0 .22.18.4.4.4.22 0 .4-.18.4-.4 0-.22-.18-.4-.4-.4z" />
    </svg>
  );
}

/** WhatsApp brand icon (simple-icons). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
  "inline-flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform hover:scale-110";

/** Ряд круглых цветных иконок контактов — открывают нативные приложения по deep-ссылкам. */
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
    <div className="mb-6 flex flex-wrap gap-2">
      {phone && (
        <a
          href={`tel:${digitsOnly(phone)}`}
          aria-label="Позвонить продавцу"
          className={ICON_BASE}
          style={{ backgroundColor: "#34A853" }}
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
          style={{ backgroundColor: "#26A5E4" }}
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
          style={{ background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)" }}
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
          style={{ backgroundColor: "#7360F2" }}
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
          style={{ backgroundColor: "#25D366" }}
        >
          <WhatsAppIcon className="h-4 w-4" />
        </a>
      )}
    </div>
  );
});

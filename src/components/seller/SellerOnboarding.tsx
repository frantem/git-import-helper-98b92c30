import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Sparkles, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { trackMetaEvent } from "@/lib/metaPixel";
import { compressImage } from "@/lib/imageUtils";
import { BRAND_PRESETS, isHexColor } from "@/lib/sellerTheme";

type Step = "details" | "code" | "store" | "branding";
type StoreType = "food" | "apparel";

/** 9 цифр → «+375 29 123-45-67» */
function formatPhone(digits: string) {
  const d = digits.slice(0, 9);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  if (!parts.length) return "+375 ";
  const [code, a, b, c] = [parts[0], parts[1] ?? "", parts[2] ?? "", parts[3] ?? ""];
  let out = `+375 ${code}`;
  if (a) out += ` ${a}`;
  if (b) out += `-${b}`;
  if (c) out += `-${c}`;
  return out;
}

/** «Chocoberry» → «chocoberry», «Своё Подворье» → «svoe-podvore» */
function slugPreview(name: string) {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
    э: "e", ю: "yu", я: "ya",
  };
  return name
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

const STORE_TYPES: { id: StoreType; emoji: string; title: string; hint: string }[] = [
  {
    id: "food",
    emoji: "🍰",
    title: "Еда, десерты и ферма",
    hint: "Вес, КБЖУ, свежесть и график готовки — для кондитеров, пекарен и фермеров.",
  },
  {
    id: "apparel",
    emoji: "👗",
    title: "Одежда, обувь и крафт",
    hint: "Примерка, размеры и вертикальные фото 3:4 — для брендов одежды и ручной работы.",
  },
];

/**
 * Онбординг продавца: имя и телефон → код из SMS → название и тип витрины.
 * Никаких заявок и модерации: магазин создаётся сразу и открывается кабинет.
 */
export function SellerOnboarding() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", ""]);
  const [storeName, setStoreName] = useState("");
  const [storeType, setStoreType] = useState<StoreType>("food");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandColor, setBrandColor] = useState("#2F5D45");
  const [uniqueFact, setUniqueFact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Если человек уже вошёл: с витриной — в кабинет, без витрины — сразу к названию
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user || cancelled) return;
      const { data: farmer } = await supabase
        .from("farmers")
        .select("slug")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (farmer?.slug) window.location.assign("/seller");
      else setStep("store");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const sendCode = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError("Напишите, как вас зовут");
      return;
    }
    if (phone.replace(/\D/g, "").length !== 9) {
      setError("Введите номер в формате +375 29 123-45-67");
      return;
    }
    setLoading(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("send-otp", {
        body: { phone: `+375${phone}` },
      });
      const response = data as { success?: boolean; error?: string; retry_after?: number } | null;
      if (invokeError || !response?.success) {
        setError(response?.error || "Не удалось отправить код. Попробуйте ещё раз.");
        return;
      }
      setResendIn(response.retry_after ?? 60);
      setCode(["", "", "", ""]);
      setStep("code");
      window.setTimeout(() => codeRefs.current[0]?.focus(), 80);
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (fullCode: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("verify-otp", {
        body: { phone: `+375${phone}`, code: fullCode },
      });
      const response = data as {
        success?: boolean;
        access_token?: string;
        refresh_token?: string;
        error?: string;
      } | null;

      if (invokeError || !response?.success || !response.access_token || !response.refresh_token) {
        setError(response?.error || "Неверный код");
        setCode(["", "", "", ""]);
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: response.access_token,
        refresh_token: response.refresh_token,
      });
      if (sessionError) {
        setError("Не удалось войти. Попробуйте ещё раз.");
        return;
      }

      const { data: existing } = await supabase
        .from("farmers")
        .select("slug")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
        .maybeSingle();

      if (existing?.slug) {
        window.location.assign("/seller");
        return;
      }

      trackMetaEvent("CompleteRegistration", { method: "phone", status: true });
      setStep("store");
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const onCodeChange = (index: number, value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setCode((prev) => prev.map((item, i) => (i === index ? "" : item)));
      return;
    }
    const next = [...code];
    digits.split("").forEach((digit, offset) => {
      if (index + offset < 4) next[index + offset] = digit;
    });
    setCode(next);
    const filled = next.join("");
    if (filled.length === 4) void verifyCode(filled);
    else codeRefs.current[Math.min(index + digits.length, 3)]?.focus();
  };

  const uploadLogo = async (file: File) => {
    setError(null);
    setUploadingLogo(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) {
        setError("Не удалось загрузить логотип — обновите страницу и попробуйте снова.");
        return;
      }
      const compressed = await compressImage(file, "avatar");
      const ext = compressed.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, compressed, { upsert: true, contentType: compressed.type });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setLogoUrl(data.publicUrl);
    } catch {
      setError("Не удалось загрузить логотип. Попробуйте ещё раз.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const createStore = async () => {
    setError(null);
    if (storeName.trim().length < 2) {
      setError("Придумайте название витрины");
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc("create_seller_store" as never, {
        p_name: storeName.trim(),
        p_store_type: storeType,
      } as never);
      if (rpcError) {
        const message = (rpcError as { message?: string }).message || "";
        setError(
          message.includes("NAME_TOO_LONG")
            ? "Название слишком длинное — до 60 символов"
            : "Не получилось создать витрину. Попробуйте ещё раз.",
        );
        return;
      }
      const result = data as unknown as { id?: string; slug?: string; created?: boolean };

      // Каркас бренда: логотип, акцентный цвет и позиционирование.
      if (result?.id && result.created) {
        const { error: updateError } = await supabase
          .from("farmers")
          .update({
            photo_url: logoUrl || null,
            theme: brandColor || "#2F5D45",
            unique_fact: uniqueFact.trim() || null,
          })
          .eq("id", result.id);
        if (updateError) console.error("Failed to save storefront brand:", updateError);
      }

      trackMetaEvent("StartTrial", { store_type: storeType });

      // Письмо администратору о новом магазине — не блокирует переход в кабинет
      if (result?.created) {
        void supabase.functions.invoke("send-seller-application-notification", {
          body: {
            name: storeName.trim(),
            phone: formatPhone(phone),
            store_type: storeType,
            slug: result?.slug || slug,
          },
        });
      }

      window.location.assign(result?.created ? "/seller?welcome=1" : "/seller");
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (step === "details") navigate(-1);
    else if (step === "branding") setStep("store");
    else setStep("details");
  };

  const backLabel = step === "details" ? "Назад" : step === "branding" ? "Назад" : "Изменить номер";

  const slug = slugPreview(storeName);
  const factPlaceholder =
    storeType === "apparel"
      ? "Локальный бренд льняной одежды из Витебска"
      : "Авторские торты и бенто на заказ";

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFBF9]">
      <header className="flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-['Fraunces'] text-[22px] leading-none tracking-[-0.03em] text-[#1A1A1A]">
          Locus<span className="text-[#E5453D]">.</span>
        </Link>
        <button
          type="button"
          onClick={goBack}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-[#6B655C]"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </button>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 pb-10">
        {/* Прогресс */}
        <div className="mb-6 flex items-center gap-1.5">
          {["details", "code", "store", "branding"].map((item, index) => (
            <span
              key={item}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= ["details", "code", "store", "branding"].indexOf(step) ? "bg-[#E5453D]" : "bg-[#E7E2D8]",
              )}
            />
          ))}
        </div>

        {step === "details" && (
          <div className="space-y-4">
            <div>
              <h1 className="font-['Fraunces'] text-[28px] leading-[1.1] tracking-[-0.02em] text-[#1A1A1A]">
                Создайте свою витрину
              </h1>
              <p className="mt-2 text-[14px] leading-snug text-[#6B655C]">
                Два поля и код из SMS — магазин откроется сразу, без заявок и ожидания.
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-[#6B655C]">Как вас зовут?</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Анна"
                autoComplete="given-name"
                className="h-12 rounded-xl border-[#E7E2D8] bg-white text-[16px]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-[#6B655C]">Номер телефона</span>
              <Input
                value={formatPhone(phone)}
                onChange={(event) => {
                  let digits = event.target.value.replace(/\D/g, "");
                  if (digits.startsWith("375")) digits = digits.slice(3);
                  else if (digits.startsWith("80")) digits = digits.slice(2);
                  setPhone(digits.slice(0, 9));
                }}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+375 29 123-45-67"
                className="h-12 rounded-xl border-[#E7E2D8] bg-white text-[16px] tracking-wide"
              />
            </label>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}

            <Button
              onClick={sendCode}
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#E5453D] text-[15px] font-semibold hover:bg-[#D43830]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Получить код в SMS"}
            </Button>

            <p className="text-center text-[12px] leading-snug text-[#8A8478]">
              Код бесплатный. Регистрация не нужна — только телефон.
            </p>
          </div>
        )}

        {step === "code" && (
          <div className="space-y-4">
            <div>
              <h1 className="font-['Fraunces'] text-[28px] leading-[1.1] tracking-[-0.02em] text-[#1A1A1A]">
                Введите код
              </h1>
              <p className="mt-2 text-[14px] leading-snug text-[#6B655C]">
                Мы отправили 4 цифры на {formatPhone(phone)}
              </p>
            </div>

            <div className="flex justify-center gap-2.5">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    codeRefs.current[index] = element;
                  }}
                  value={digit}
                  onChange={(event) => onCodeChange(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Backspace" && !digit && index > 0) {
                      codeRefs.current[index - 1]?.focus();
                    }
                  }}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  aria-label={`Цифра ${index + 1}`}
                  className="h-14 w-14 rounded-xl border border-[#E7E2D8] bg-white text-center text-[22px] font-bold text-[#1A1A1A] outline-none focus:border-[#E5453D]"
                />
              ))}
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}

            <div className="flex items-center justify-between text-[13px] text-[#6B655C]">
              <button type="button" onClick={() => setStep("details")} className="font-medium underline">
                Изменить номер
              </button>
              <button
                type="button"
                disabled={resendIn > 0 || loading}
                onClick={sendCode}
                className="font-medium disabled:text-[#B5AFA3]"
              >
                {resendIn > 0 ? `Отправить ещё раз через ${resendIn} с` : "Отправить код ещё раз"}
              </button>
            </div>
          </div>
        )}

        {step === "store" && (
          <div className="space-y-4">
            <div>
              <h1 className="font-['Fraunces'] text-[28px] leading-[1.1] tracking-[-0.02em] text-[#1A1A1A]">
                Почти готово
              </h1>
              <p className="mt-2 text-[14px] leading-snug text-[#6B655C]">
                Осталось назвать витрину и выбрать, что вы продаёте.
              </p>
            </div>

            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-[#6B655C]">Название вашей витрины</span>
              <Input
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="Chocoberry"
                className="h-12 rounded-xl border-[#E7E2D8] bg-white text-[16px]"
              />
              <span className="mt-1.5 block text-[12px] text-[#8A8478]">
                Ваша ссылка будет: locusfood.by/seller/{slug || "nazvanie"}
              </span>
            </label>

            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-[#6B655C]">Что вы продаёте?</span>
              <div className="space-y-2">
                {STORE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setStoreType(type.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors",
                      storeType === type.id
                        ? "border-[#E5453D] bg-white shadow-[0_6px_20px_-12px_rgba(229,69,61,0.5)]"
                        : "border-[#E7E2D8] bg-white/60",
                    )}
                  >
                    <span className="text-[22px] leading-none">{type.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold text-[#1A1A1A]">{type.title}</span>
                      <span className="mt-1 block text-[12.5px] leading-snug text-[#6B655C]">{type.hint}</span>
                    </span>
                    {storeType === type.id && (
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E5453D] text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}

            <Button
              onClick={() => {
                setError(null);
                if (storeName.trim().length < 2) {
                  setError("Придумайте название витрины");
                  return;
                }
                setStep("branding");
              }}
              className="h-12 w-full rounded-xl bg-[#E5453D] text-[15px] font-semibold hover:bg-[#D43830]"
            >
              Далее →
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-[#8A8478]">
              <Sparkles className="h-3.5 w-3.5" />
              30 дней бесплатно, карта не нужна
            </p>
          </div>
        )}

        {step === "branding" && (
          <div className="space-y-4">
            <div>
              <h1 className="font-['Fraunces'] text-[28px] leading-[1.1] tracking-[-0.02em] text-[#1A1A1A]">
                Стиль вашего бренда
              </h1>
              <p className="mt-2 text-[14px] leading-snug text-[#6B655C]">
                Логотип, цвет и одна строка о вас — витрина соберётся под ваш бренд.
              </p>
            </div>

            {/* Логотип */}
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-[#6B655C]">Логотип или фото</span>
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-[#E7E2D8] bg-white/60 p-3">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F1EDE4]">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Логотип" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[24px] font-bold text-[#6B655C]">
                      {storeName.trim().charAt(0).toUpperCase() || "•"}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-[#1A1A1A]">
                    {uploadingLogo ? "Загружаем…" : "Загрузить изображение"}
                  </span>
                  <span className="mt-0.5 block text-[12px] text-[#8A8478]">Круглый аватар витрины, JPG или PNG</span>
                </span>
                <Upload className="h-4 w-4 shrink-0 text-[#8A8478]" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLogo(file);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>

            {/* Цвет бренда */}
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-[#6B655C]">Цвет бренда</span>
              <div className="grid grid-cols-4 gap-2">
                {BRAND_PRESETS.map((preset) => {
                  const selected = brandColor.toUpperCase() === preset.hex.toUpperCase();
                  return (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setBrandColor(preset.hex)}
                      className={cn(
                        "rounded-xl border p-2 text-left transition-colors",
                        selected ? "border-[#E5453D] bg-white shadow-sm" : "border-[#E7E2D8] bg-white/60",
                      )}
                    >
                      <span
                        className="block h-8 w-8 rounded-full ring-1 ring-black/5"
                        style={{ backgroundColor: preset.hex }}
                      />
                      <span className="mt-1.5 block text-[11px] font-semibold leading-tight text-[#1A1A1A]">
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="mt-3 flex items-center gap-3 rounded-xl border border-[#E7E2D8] bg-white/60 p-2.5">
                <input
                  type="color"
                  value={isHexColor(brandColor) ? brandColor : "#2F5D45"}
                  onChange={(event) => setBrandColor(event.target.value)}
                  className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  aria-label="Свой цвет бренда"
                />
                <input
                  value={brandColor}
                  onChange={(event) => setBrandColor(event.target.value)}
                  placeholder="#2F5D45"
                  maxLength={7}
                  className="w-full bg-transparent text-[14px] font-medium text-[#1A1A1A] outline-none"
                />
                <span className="shrink-0 text-[12px] text-[#8A8478]">Свой цвет</span>
              </label>
            </div>

            {/* Позиционирование */}
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-[#6B655C]">Короткое позиционирование</span>
              <Input
                value={uniqueFact}
                onChange={(event) => setUniqueFact(event.target.value)}
                placeholder={factPlaceholder}
                maxLength={120}
                className="h-12 rounded-xl border-[#E7E2D8] bg-white text-[16px]"
              />
              <span className="mt-1.5 block text-[12px] text-[#8A8478]">
                Одна строка, которая появится под названием витрины.
              </span>
            </label>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-600">{error}</p>}

            <Button
              onClick={createStore}
              disabled={loading || uploadingLogo}
              className="h-12 w-full rounded-xl bg-[#E5453D] text-[15px] font-semibold hover:bg-[#D43830]"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Открыть мой магазин →"}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-[12px] text-[#8A8478]">
              <Sparkles className="h-3.5 w-3.5" />
              30 дней бесплатно, карта не нужна
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

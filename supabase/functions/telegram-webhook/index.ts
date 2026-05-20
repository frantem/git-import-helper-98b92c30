// Telegram webhook: handles /start <code> linking + confirm callback buttons
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

async function tg(method: string, body: any) {
  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function deriveSecret(token: string): Promise<string> {
  const data = new TextEncoder().encode(`telegram-webhook:${token}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(a: string | null, b: string): boolean {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!TELEGRAM_BOT_TOKEN) return new Response("Not configured", { status: 500 });

  const expected = await deriveSecret(TELEGRAM_BOT_TOKEN);
  const actual = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (!safeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const update = await req.json();

  try {
    // ===== /start <code> =====
    const msg = update.message;
    if (msg?.text?.startsWith("/start")) {
      const parts = msg.text.trim().split(/\s+/);
      const code = parts[1];
      const chatId = msg.chat.id.toString();

      if (!code) {
        await tg("sendMessage", {
          chat_id: chatId,
          text: "Привет! Чтобы привязать аккаунт продавца, откройте раздел «Настройки» в личном кабинете и нажмите «Привязать Telegram».",
        });
        return new Response(JSON.stringify({ ok: true }));
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("telegram_link_code", code)
        .maybeSingle();

      if (!profile) {
        await tg("sendMessage", { chat_id: chatId, text: "Код недействителен или устарел. Сгенерируйте новый в личном кабинете." });
        return new Response(JSON.stringify({ ok: true }));
      }

      await supabase.from("profiles")
        .update({ telegram_chat_id: chatId, telegram_link_code: null })
        .eq("user_id", profile.user_id);

      await tg("sendMessage", {
        chat_id: chatId,
        text: `✅ Telegram привязан${profile.full_name ? `, ${profile.full_name}` : ""}! Теперь вы будете получать уведомления о новых заказах.`,
      });
      return new Response(JSON.stringify({ ok: true }));
    }

    // ===== Confirm callback =====
    const cb = update.callback_query;
    if (cb?.data?.startsWith("confirm:")) {
      const [, orderId, farmerId] = cb.data.split(":");
      const chatId = cb.message.chat.id.toString();
      const messageId = cb.message.message_id;

      // Verify that chat owner is the farmer's owner
      const { data: profile } = await supabase
        .from("profiles").select("user_id, full_name").eq("telegram_chat_id", chatId).maybeSingle();
      const { data: farmer } = await supabase
        .from("farmers").select("id, user_id, name").eq("id", farmerId).maybeSingle();

      if (!profile || !farmer || farmer.user_id !== profile.user_id) {
        await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Нет доступа", show_alert: true });
        return new Response(JSON.stringify({ ok: true }));
      }

      // Confirm items
      const { data: updatedCount } = await supabase.rpc("confirm_order_items_for_farmer", {
        _order_id: orderId, _farmer_id: farmerId,
      });
      const { data: allConfirmed } = await supabase.rpc("mark_order_confirmed_if_all", {
        _order_id: orderId,
      });

      await tg("answerCallbackQuery", { callback_query_id: cb.id, text: "Подтверждено!" });

      const originalText = cb.message.text || "Заказ";
      await tg("editMessageText", {
        chat_id: chatId,
        message_id: messageId,
        text: `${originalText}\n\n✅ Подтверждено`,
      });

      // Notify admin
      const { data: adminSetting } = await supabase
        .from("app_settings").select("value").eq("key", "admin_telegram_chat_id").maybeSingle();
      const adminChats = (adminSetting?.value || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const shortId = orderId.slice(0, 8);
      for (const adminChat of adminChats) {
        await tg("sendMessage", {
          chat_id: adminChat,
          text: `🟢 Продавец «${farmer.name}» подтвердил свои позиции в заказе #${shortId}.`,
        });
        if (allConfirmed) {
          await tg("sendMessage", {
            chat_id: adminChat,
            text: `🎉 Заказ #${shortId} полностью подтверждён всеми продавцами.`,
          });
        }
      }

      return new Response(JSON.stringify({ ok: true, updatedCount, allConfirmed }));
    }

    return new Response(JSON.stringify({ ok: true, ignored: true }));
  } catch (e: any) {
    console.error("telegram-webhook error:", e);
    return new Response(JSON.stringify({ error: e?.message }), { status: 500 });
  }
});

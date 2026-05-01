import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cdnImage } from "@/lib/imageCdn";

export function DynamicMeta() {
  useEffect(() => {
    const loadMeta = async () => {
      const { data: rows } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["favicon_url", "og_image_url", "google_verification"]);

      const map = new Map<string, string>();
      rows?.forEach((r: any) => {
        if (r?.key && r?.value) map.set(r.key, r.value);
      });

      const favicon = map.get("favicon_url");
      const ogImage = map.get("og_image_url");
      const verification = map.get("google_verification");

      // Update favicon
      if (favicon) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
          link.href = favicon;
        } else {
          link = document.createElement("link");
          link.rel = "icon";
          link.href = favicon;
          document.head.appendChild(link);
        }
      }

      // Update OG image (served via CDN at 1200x630 for social previews)
      if (ogImage) {
        const ogUrl = cdnImage(ogImage, "og");
        const ogMeta = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
        if (ogMeta) ogMeta.content = ogUrl;

        const twitterMeta = document.querySelector("meta[name='twitter:image']") as HTMLMetaElement;
        if (twitterMeta) twitterMeta.content = ogUrl;
      }

      // Google verification
      if (verification) {
        let verMeta = document.querySelector("meta[name='google-site-verification']") as HTMLMetaElement;
        if (verMeta) {
          verMeta.content = verification;
        } else {
          verMeta = document.createElement("meta") as HTMLMetaElement;
          verMeta.name = "google-site-verification";
          verMeta.content = verification;
          document.head.appendChild(verMeta);
        }
      }
    };

    // Defer non-critical meta loading until the browser is idle.
    const ric: typeof window.requestIdleCallback | undefined = (window as any).requestIdleCallback;
    const handle = ric
      ? ric(() => loadMeta(), { timeout: 3000 })
      : window.setTimeout(loadMeta, 1500);

    return () => {
      if (ric && (window as any).cancelIdleCallback) {
        (window as any).cancelIdleCallback(handle);
      } else {
        clearTimeout(handle as number);
      }
    };
  }, []);

  return null;
}

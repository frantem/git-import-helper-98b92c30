import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function DynamicMeta() {
  useEffect(() => {
    const loadMeta = async () => {
      const [faviconRes, ogImageRes, verificationRes] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "favicon_url").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "og_image_url").maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "google_verification").maybeSingle(),
      ]);

      // Update favicon
      if (faviconRes.data?.value) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (link) {
          link.href = faviconRes.data.value;
        } else {
          link = document.createElement("link");
          link.rel = "icon";
          link.href = faviconRes.data.value;
          document.head.appendChild(link);
        }
      }

      // Update OG image
      if (ogImageRes.data?.value) {
        const ogMeta = document.querySelector("meta[property='og:image']") as HTMLMetaElement;
        if (ogMeta) ogMeta.content = ogImageRes.data.value;
        
        const twitterMeta = document.querySelector("meta[name='twitter:image']") as HTMLMetaElement;
        if (twitterMeta) twitterMeta.content = ogImageRes.data.value;
      }

      // Google verification
      if (verificationRes.data?.value) {
        let verMeta = document.querySelector("meta[name='google-site-verification']") as HTMLMetaElement;
        if (verMeta) {
          verMeta.content = verificationRes.data.value;
        } else {
          verMeta = document.createElement("meta") as HTMLMetaElement;
          verMeta.name = "google-site-verification";
          verMeta.content = verificationRes.data.value;
          document.head.appendChild(verMeta);
        }
      }
    };

    loadMeta();
  }, []);

  return null;
}

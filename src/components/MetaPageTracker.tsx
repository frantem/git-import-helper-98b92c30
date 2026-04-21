import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { trackMetaEvent, setMetaUserData } from "@/lib/metaPixel";

/**
 * Sends PageView via CAPI on every route change (browser pixel already fires once via index.html).
 * Also syncs current user's email/phone into the metaPixel module so all events get hashed user_data.
 */
export const MetaPageTracker = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Keep user data fresh for all subsequent events (improves Match Quality)
  useEffect(() => {
    setMetaUserData({
      email: user?.email,
      phone: (user?.user_metadata as any)?.phone,
    });
  }, [user]);

  // Fire PageView via CAPI on every route change
  useEffect(() => {
    trackMetaEvent(
      "PageView",
      { page_path: location.pathname + location.search },
      { skipBrowser: true }
    );
  }, [location.pathname, location.search]);

  return null;
};

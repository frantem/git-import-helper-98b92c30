import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Покупательских аккаунтов больше нет: /profile ведёт продавца в кабинет,
 * а того, кто ещё не создал витрину — в онбординг.
 */
export default function Profile() {
  const { user, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (role === "seller" || role === "admin") {
      navigate("/seller", { replace: true });
      return;
    }
    navigate("/seller-application", { replace: true });
  }, [user, role, isLoading, navigate]);

  return null;
}

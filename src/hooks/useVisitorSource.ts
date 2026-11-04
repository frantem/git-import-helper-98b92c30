import { useEffect, useState } from "react";
import { getVisitorSource, subscribeVisitorSource, type VisitorSource } from "@/lib/visitorSource";

/** Источник визита с реактивным обновлением (нужно кнопкам и меню). */
export function useVisitorSource(): VisitorSource | null {
  const [source, setSource] = useState<VisitorSource | null>(() => getVisitorSource());

  useEffect(() => {
    setSource(getVisitorSource());
    return subscribeVisitorSource(() => setSource(getVisitorSource()));
  }, []);

  return source;
}

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Pause, Play, Search, Sparkles, Store } from "lucide-react";
import { useInView, usePrefersReducedMotion } from "@/components/motion/useMotion";

type Persona = "google" | "alice";

type Scene = {
  label: string;
  question: string;
  thinking: string;
  answer: string;
  followUp: string;
  followUpAnswer: string;
  source: { name: string; url: string; meta: string };
};

const scenes: Record<Persona, Scene> = {
  google: {
    label: "Google · ИИ",
    question: "Где в Витебске заказать торт ручной работы?",
    thinking: "Ищу по сайтам Витебска…",
    answer:
      "В Витебске торты ручной работы делает кондитерская «Своё Подворье». На сайте есть каталог с ценами и наличием, доставка по городу и самовывоз.",
    followUp: "А есть без сахара?",
    followUpAnswer:
      "Да — медовик на фруктозе и чизкейк без сахара. Наличие на сайте обновилось сегодня.",
    source: {
      name: "Своё Подворье — кондитерская мастерская",
      url: "locusfood.by/seller/svoe-podvorye",
      meta: "каталог · цены · доставка",
    },
  },
  alice: {
    label: "Алиса",
    question: "Где в Витебске заказать торт ручной работы?",
    thinking: "Смотрю каталоги поблизости…",
    answer:
      "Рядом есть «Своё Подворье» — торты ручной работы, самовывоз в центре и доставка по Витебску. Посмотреть цены?",
    followUp: "Да, покажи что есть сегодня",
    followUpAnswer:
      "Сегодня в наличии медовик, чизкейк и «Наполеон». Открываю каталог: locusfood.by/seller/svoe-podvorye",
    source: {
      name: "Своё Подворье — кондитерская мастерская",
      url: "locusfood.by/seller/svoe-podvorye",
      meta: "ответ по данным сайта · актуально",
    },
  },
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function AiSearchScene() {
  const [persona, setPersona] = useState<Persona>("google");
  const [typed, setTyped] = useState("");
  const [thinking, setThinking] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sourceVisible, setSourceVisible] = useState(false);
  const [followUpVisible, setFollowUpVisible] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [paused, setPaused] = useState(false);

  const reduced = usePrefersReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>(false);
  const runRef = useRef(0);
  const pausedRef = useRef(false);

  const scene = scenes[persona];
  const isTyping = typed.length > 0 && typed.length < scene.question.length;
  const isStreaming = !sourceVisible && answer.length > 0 && answer.length < scene.answer.length;

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    if (reduced) {
      setTyped(scene.question);
      setThinking(false);
      setAnswer(scene.answer);
      setSourceVisible(true);
      setFollowUpVisible(true);
      setFollowUpAnswer(scene.followUpAnswer);
      return;
    }
    if (!inView) return;

    const run = ++runRef.current;
    let cancelled = false;
    const alive = () => !cancelled && run === runRef.current;

    const gate = async () => {
      while (pausedRef.current && alive()) await sleep(110);
      return alive();
    };

    const wait = async (ms: number) => {
      let elapsed = 0;
      while (elapsed < ms) {
        await sleep(70);
        elapsed += 70;
        if (!alive()) return false;
        if (!(await gate())) return false;
      }
      return true;
    };

    const type = async (text: string, apply: (value: string) => void, perChar: number) => {
      for (let index = 1; index <= text.length; index += 1) {
        if (!alive() || !(await gate())) return false;
        apply(text.slice(0, index));
        await sleep(perChar + Math.random() * 18);
      }
      return true;
    };

    const stream = async (text: string, apply: (value: string) => void, perWord: number) => {
      const words = text.split(" ");
      for (let index = 1; index <= words.length; index += 1) {
        if (!alive() || !(await gate())) return false;
        apply(words.slice(0, index).join(" "));
        await sleep(perWord + Math.random() * 30);
      }
      return true;
    };

    void (async () => {
      while (alive()) {
        setTyped("");
        setThinking(false);
        setAnswer("");
        setSourceVisible(false);
        setFollowUpVisible(false);
        setFollowUpAnswer("");

        if (!(await wait(620))) return;
        if (!(await type(scene.question, setTyped, 30))) return;
        if (!(await wait(260))) return;

        setThinking(true);
        if (!(await wait(1250))) return;
        setThinking(false);

        if (!(await stream(scene.answer, setAnswer, 46))) return;
        if (!(await wait(240))) return;

        setSourceVisible(true);
        if (!(await wait(1250))) return;

        setFollowUpVisible(true);
        if (!(await wait(650))) return;

        if (!(await stream(scene.followUpAnswer, setFollowUpAnswer, 42))) return;
        if (!(await wait(3400))) return;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inView, reduced, persona, scene]);

  const tabs: Array<[Persona, string]> = [
    ["google", scenes.google.label],
    ["alice", scenes.alice.label],
  ];

  return (
    <div ref={ref} data-ai-scene className="min-h-[520px] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:min-h-0">
      <div className="flex items-center gap-1 border-b border-border px-3 py-2.5 md:px-5">
        <div role="tablist" aria-label="Пример ответа ИИ" className="flex items-center gap-1">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={persona === key}
              onClick={() => setPersona(key)}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                persona === key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            aria-label={paused ? "Запустить анимацию" : "Остановить анимацию"}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <div className="p-4 md:p-6">
        <p className="sr-only">
          Демонстрация: покупатель спрашивает у ИИ, где заказать торт ручной работы в Витебске. ИИ
          отвечает ссылкой на каталог продавца, затем отвечает на уточняющий вопрос о товарах без
          сахара.
        </p>

        <div aria-hidden="true">
          <div className="flex min-h-[48px] items-center gap-3 rounded-full border border-border bg-background px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-sm text-foreground/90">
              {typed || <span className="text-muted-foreground">Спросите что угодно</span>}
              {isTyping && (
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />
              )}
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 md:p-5">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {persona === "google" ? "Режим ИИ" : "Алиса"}
            </p>

            <div className="mt-3">
              {thinking ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  {scene.thinking}
                </p>
              ) : (
                <p className="text-[15px] leading-relaxed text-foreground/90">
                  {answer}
                  {isStreaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-middle" />}
                </p>
              )}
            </div>

            {sourceVisible && (
              <div className="scene-in mt-3 flex items-center gap-3 rounded-xl border border-border bg-background p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Store className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{scene.source.name}</p>
                  <p className="truncate text-xs text-primary">{scene.source.url}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{scene.source.meta}</p>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            )}

            {followUpVisible && (
              <div className="mt-4">
                <div className="scene-in flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-sm bg-secondary px-3.5 py-2 text-[13px] text-secondary-foreground">
                    {scene.followUp}
                  </p>
                </div>

                {followUpAnswer.length > 0 && (
                  <div className="scene-in mt-3 flex items-start gap-2">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <p className="text-[13px] leading-relaxed text-foreground/85">
                      {followUpAnswer}
                      {followUpAnswer.length < scene.followUpAnswer.length && (
                        <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-primary align-middle" />
                      )}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="mt-3 flex items-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Check className="h-3 w-3 text-primary" />
            Ответ собран из данных сайта: каталог, цены, наличие
          </p>
        </div>
      </div>
    </div>
  );
}

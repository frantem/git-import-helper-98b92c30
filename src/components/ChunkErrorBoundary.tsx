import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError, tryReloadForChunkError } from "@/lib/chunkReload";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  reloading: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null, reloading: false };

  static getDerivedStateFromError(error: Error): State {
    return { error, reloading: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (isChunkLoadError(error)) {
      const willReload = tryReloadForChunkError();
      if (willReload) {
        this.setState({ reloading: true });
        return;
      }
    }
    // Log non-chunk errors for visibility
    // eslint-disable-next-line no-console
    console.error("[ChunkErrorBoundary]", error, info);
  }

  private handleReload = () => {
    try {
      sessionStorage.removeItem("locus-chunk-reload-at");
    } catch {}
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = "/";
  };

  render() {
    const { error, reloading } = this.state;

    if (!error) return this.props.children;

    if (reloading) {
      // Brief blank state while reload is dispatched
      return <div className="min-h-screen bg-background" />;
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">
            Что-то пошло не так
          </h1>
          <p className="text-sm text-muted-foreground">
            Не удалось загрузить страницу. Обновите её или вернитесь на главную.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={this.handleReload}
              className="w-full rounded-lg bg-accent text-accent-foreground py-2.5 font-medium hover:opacity-90 transition-opacity"
            >
              Обновить
            </button>
            <button
              onClick={this.handleHome}
              className="w-full rounded-lg border border-border bg-card text-foreground py-2.5 font-medium hover:bg-muted transition-colors"
            >
              На главную
            </button>
          </div>
        </div>
      </div>
    );
  }
}

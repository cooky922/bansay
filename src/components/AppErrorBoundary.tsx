import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("BANSAY render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <main className="bansay-app flex min-h-[100dvh] items-center justify-center bg-[#F7F6FB] px-5 text-slate-900">
        <section role="alert" className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-display text-2xl font-bold text-violet-800">BANSAY</p>
          <h1 className="mt-4 text-lg font-semibold">This screen couldn’t load.</h1>
          <p className="mt-2 text-sm text-slate-600">Reload the page to try again. If it keeps happening, share this message with your administrator:</p>
          <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">{this.state.error.message}</pre>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white">Reload BANSAY</button>
        </section>
      </main>;
    }
    return this.props.children;
  }
}

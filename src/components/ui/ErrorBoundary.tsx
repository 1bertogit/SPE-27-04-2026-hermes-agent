import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-editorial-paper dark:bg-editorial-navy-dark flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-editorial-rose-light flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-editorial-rose" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-serif text-editorial-navy dark:text-editorial-cream">
                Algo deu errado
              </h1>
              <p className="text-sm text-editorial-muted leading-relaxed">
                Ocorreu um erro inesperado. Tente recarregar a pagina para continuar.
              </p>
            </div>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-editorial-navy text-white rounded-lg text-sm font-medium tracking-editorial uppercase hover:bg-editorial-navy-light transition-colors dark:bg-editorial-gold dark:text-editorial-navy dark:hover:bg-editorial-gold-light"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

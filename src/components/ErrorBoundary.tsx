import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('Erreur capturée par ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-white text-center p-10">
          <div className="text-4xl mb-3">🇧🇮</div>
          <h2 className="text-xl font-bold text-gray-800">Oups, une erreur est survenue</h2>
          <p className="text-gray-500 mt-2 text-sm">Réessaie, ou recharge l'application.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 rounded-full bg-red-500 text-white font-medium"
          >
            Recharger
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

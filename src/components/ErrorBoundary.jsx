import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL REACT ERROR CAUGHT BY ERROR BOUNDARY:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.removeItem('crm_schedule_reminders');
    } catch (e) {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-2xl">
                ⚠️
              </div>
              <div>
                <h2 className="text-lg font-bold text-rose-400">Application Error Detected</h2>
                <p className="text-xs text-slate-400">White screen se bachane ke liye safe recovery mode active hai.</p>
              </div>
            </div>

            <div className="p-3 bg-black/40 rounded-xl border border-rose-900/40 text-xs font-mono text-rose-300 break-all overflow-x-auto max-h-48">
              {this.state.error?.toString() || 'Unknown Error'}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                🔄 App Reload Karein
              </button>
              <button
                onClick={this.handleReset}
                className="py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all"
              >
                Safe Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

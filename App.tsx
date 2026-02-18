
import React, { useState, useEffect } from 'react';
import { AppStatus, FinancialData } from './types';
import { extractFinancialData } from './services/geminiService';
import FinancialTable from './components/FinancialTable';
import { convertToWideCSV, convertToLongCSV, downloadCSV } from './utils/csvUtils';

interface ExtractionResult {
  fileName: string;
  data: FinancialData;
}

interface FileState {
  name: string;
  status: 'uploading' | 'processing' | 'done' | 'error';
}

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<FileState[]>([]);
  const [processingMessage, setProcessingMessage] = useState<string>("Processing...");
  const [isKeyConfigured, setIsKeyConfigured] = useState<boolean>(true);

  // Check key configuration on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsKeyConfigured(hasKey);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
      await window.aistudio.openSelectKey();
      setIsKeyConfigured(true); // Assume success per race condition guidelines
    }
  };

  const processSingleFile = async (file: File): Promise<ExtractionResult | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          setQueue(prev => prev.map(f => f.name === file.name ? { ...f, status: 'processing' } : f));

          const data = await extractFinancialData(base64, file.type);

          setQueue(prev => prev.map(f => f.name === file.name ? { ...f, status: 'done' } : f));
          resolve({ fileName: file.name, data });
        } catch (err: any) {
          console.error(`Error in ${file.name}:`, err);

          // Check for API key errors
          const errorMsg = err.message || "";
          if (errorMsg.includes("API key not valid") || errorMsg.includes("Requested entity was not found")) {
            setIsKeyConfigured(false);
            setError("Authentication failed. Please re-configure your API key.");
          }

          setQueue(prev => prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f));
          resolve(null);
        }
      };

      reader.onerror = () => {
        setQueue(prev => prev.map(f => f.name === file.name ? { ...f, status: 'error' } : f));
        resolve(null);
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter(f => f.type === 'application/pdf');
    if (fileList.length === 0) {
      setError("Please select one or more PDF documents.");
      return;
    }

    setStatus(AppStatus.PROCESSING);
    setError(null);

    const newQueueItems: FileState[] = fileList.map(f => ({ name: f.name, status: 'uploading' }));
    setQueue(prev => [...prev, ...newQueueItems]);

    // Estimate based on number of files (simple heuristic)
    setProcessingMessage(`Estimated time: ~${fileList.length * 15}–${fileList.length * 30} seconds`);

    // Set a timeout to update the message if it takes longer than expected
    const timeoutId = setTimeout(() => {
      setProcessingMessage("Still processing… this is taking longer than expected.");
    }, 30000); // 30 seconds threshold

    const extractionPromises = fileList.map(processSingleFile);
    const settledResults = await Promise.all(extractionPromises);

    clearTimeout(timeoutId);

    const validResults = settledResults.filter((r): r is ExtractionResult => r !== null);

    if (validResults.length > 0) {
      setResults(prev => [...prev, ...validResults]);
      setStatus(AppStatus.SUCCESS);
    } else {
      setStatus(AppStatus.ERROR);
      if (!error) setError("The documents could not be processed.");
    }
  };

  const handleExportConsolidated = () => {
    if (!results.length) return;
    const csv = convertToLongCSV(results.map(r => r.data));
    const timestamp = new Date().toISOString().split('T')[0];
    downloadCSV(csv, `Consolidated_Financials_${timestamp}.csv`);
  };

  const handleExportSingle = (result: ExtractionResult) => {
    const csv = convertToWideCSV(result.data);
    const slug = (result.data.company_name || 'Report').replace(/[^a-z0-9]/gi, '_');
    downloadCSV(csv, `${slug}_Financials.csv`);
  };

  const handleClearAll = () => {
    setStatus(AppStatus.IDLE);
    setResults([]);
    setError(null);
    setQueue([]);
  };

  const handleRemoveItem = (index: number) => {
    setResults(prev => {
      const next = [...prev];
      next.splice(index, 1);
      if (next.length === 0) setStatus(AppStatus.IDLE);
      return next;
    });
  };

  if (!isKeyConfigured) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 rounded-3xl p-8 border border-white/10 shadow-2xl text-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m10-4.5V9a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h2m10-4.5a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Configure Workspace</h2>
          <p className="text-slate-400 text-sm mb-8">
            To use the high-fidelity Gemini 3 Pro agent, you must select a paid project API key.
          </p>
          <button
            onClick={handleSelectKey}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/25 mb-4"
          >
            Select API Key
          </button>
          <a
            href="https://ai.google.dev/gemini-api/docs/billing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
          >
            Learn about API billing & projects
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 selection:bg-indigo-100">
      <header className="bg-slate-900 text-white py-6 shadow-xl sticky top-0 z-50 border-b border-white/5">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">FinExtract <span className="text-indigo-400">Agent</span></h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Multi-Doc Extraction Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">

            {results.length > 0 && (
              <button
                onClick={handleClearAll}
                className="text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors border border-white/10"
              >
                Reset Workboard
              </button>
            )}
            <div className="hidden md:block px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-mono text-emerald-300">
              LLM: gemini-3-pro
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        {error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {status === AppStatus.IDLE && results.length === 0 && (
          <div className="max-w-2xl mx-auto py-12 animate-in fade-in duration-700">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Automate Financial Modeling.</h2>
              <p className="text-slate-500 text-lg leading-relaxed max-w-lg mx-auto">
                Drop your quarterly or annual reports below. Our Gemini 3 Pro agent extracts the P&L statement into structured data instantly.
              </p>
            </div>

            <label className="group relative block w-full aspect-video border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-3xl cursor-pointer bg-white hover:bg-indigo-50/20 transition-all duration-300 shadow-sm overflow-hidden">
              <input type="file" className="hidden" accept="application/pdf" multiple onChange={handleFileUpload} />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-slate-50 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center mb-6 transition-all group-hover:scale-110 shadow-sm">
                  <svg className="w-10 h-10 text-slate-300 group-hover:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-xl font-bold text-slate-700 mb-1">Upload Report Batch</p>
                <p className="text-sm text-slate-400">Supports multiple PDF files up to 20MB each</p>
              </div>
            </label>
          </div>
        )}

        {(status === AppStatus.PROCESSING) && (
          <div className="max-w-xl mx-auto mb-12">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Current Queue</h3>
            <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-sm overflow-hidden">
              {queue.filter(q => q.status !== 'done').map((f, i) => (
                <div key={i} className="px-6 py-4 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-2 h-2 rounded-full ${f.status === 'error' ? 'bg-rose-500' : 'bg-indigo-500 animate-pulse'}`} />
                    <span className="text-sm font-medium text-slate-700 truncate">{f.name}</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{f.status}</span>
                </div>
              ))}
            </div>



            <div className="mt-6 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
              <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4 shadow-sm" />
              <p className="text-sm font-semibold text-slate-600 tracking-tight">{processingMessage}</p>
            </div>
          </div>
        )
        }

        {
          results.length > 0 && (
            <div className="space-y-12">
              <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                <div className="z-10 text-center md:text-left">
                  <h2 className="text-2xl font-bold tracking-tight">Report Summary</h2>
                  <p className="text-indigo-200 text-sm mt-1">Found {results.length} valid statements across your batch.</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 z-10">
                  <label className="flex items-center gap-2 px-5 py-3 bg-white/10 text-white rounded-xl font-bold text-sm hover:bg-white/20 transition-all cursor-pointer backdrop-blur-md">
                    <input type="file" className="hidden" accept="application/pdf" multiple onChange={handleFileUpload} />
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Add More
                  </label>
                  <button
                    onClick={handleExportConsolidated}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-xl active:scale-95"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Consolidated CSV
                  </button>
                </div>
              </div>

              <div className="space-y-16">
                {results.map((result, idx) => (
                  <div key={`${result.fileName}-${idx}`} className="group relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4 px-2">
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Dataset {idx + 1}</span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{result.fileName}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 truncate">{result.data.company_name}</h3>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExportSingle(result)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Export Statement
                        </button>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="p-2.5 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-rose-500 hover:border-rose-200 transition-all shadow-sm"
                          title="Dismiss"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>

                    <FinancialTable data={result.data} />
                  </div>
                ))}
              </div>
            </div>
          )
        }
      </main >

      <footer className="py-12 border-t border-slate-200 mt-auto bg-white">
        <div className="container mx-auto px-4 text-center">
          <p className="text-[10px] text-slate-400 font-bold tracking-[0.3em] uppercase">
            Built for Analysts • Private & Secure • FinExtract Intelligence v2.2
          </p>
        </div>
      </footer>
    </div >
  );
};

export default App;

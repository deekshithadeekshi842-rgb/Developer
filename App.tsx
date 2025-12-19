
import React, { useState, useEffect, useCallback } from 'react';
import { AppTab, Cell, Experiment } from './types';
import { Icons, MOCK_MODELS, MOCK_DATASETS } from './constants';
import { simulateCellExecution, getAiDeveloperAssistantResponse } from './services/geminiService';

// --- Sub-components (Internal) ---

const SidebarItem: React.FC<{
  id: AppTab;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: (id: AppTab) => void;
}> = ({ id, active, label, icon, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
      active ? 'bg-zinc-800 text-indigo-400 border border-zinc-700' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
    }`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const CodeCell: React.FC<{
  cell: Cell;
  onUpdate: (id: string, content: string) => void;
  onExecute: (id: string) => void;
  onDelete: (id: string) => void;
}> = ({ cell, onUpdate, onExecute, onDelete }) => (
  <div className="group relative mb-6 border border-zinc-800 rounded-xl bg-zinc-900/50 overflow-hidden">
    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
      <div className="flex items-center space-x-2">
        <span className="text-xs font-mono text-zinc-500 uppercase">{cell.type}</span>
      </div>
      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onExecute(cell.id)}
          className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          disabled={cell.isExecuting}
        >
          {cell.isExecuting ? (
             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Icons.Play />
          )}
        </button>
        <button
          onClick={() => onDelete(cell.id)}
          className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400"
        >
          <Icons.Trash />
        </button>
      </div>
    </div>
    <div className="p-4">
      <textarea
        value={cell.content}
        onChange={(e) => onUpdate(cell.id, e.target.value)}
        rows={Math.max(3, cell.content.split('\n').length)}
        placeholder={cell.type === 'code' ? "# Enter python code..." : "# Enter markdown..."}
        className={`w-full bg-transparent resize-none focus:outline-none text-sm code-font ${
          cell.type === 'code' ? 'text-indigo-300' : 'text-zinc-300'
        }`}
      />
    </div>
    {cell.output && (
      <div className="border-t border-zinc-800 bg-black/40 p-4">
        <pre className="text-xs text-emerald-400/90 code-font whitespace-pre-wrap">{cell.output}</pre>
      </div>
    )}
  </div>
);

// --- Main App Component ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.NOTEBOOK);
  const [cells, setCells] = useState<Cell[]>([
    { id: '1', type: 'markdown', content: '# Welcome to Aether Studio\n\nInitialize your training environment below.' },
    { id: '2', type: 'code', content: 'import torch\nimport numpy as np\n\nprint(f"CUDA Available: {torch.cuda.is_available()}")\nprint(f"Device Name: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"}")' }
  ]);
  const [experiments, setExperiments] = useState<Experiment[]>([
    { id: 'exp-1', name: 'Baseline ResNet', status: 'completed', metrics: { accuracy: 0.92, loss: 0.21, epoch: 50 }, timestamp: Date.now() - 3600000 },
    { id: 'exp-2', name: 'Llama Finetune - V1', status: 'running', metrics: { accuracy: 0.78, loss: 0.45, epoch: 12 }, timestamp: Date.now() }
  ]);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [assistantChat, setAssistantChat] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [aiInput, setAiInput] = useState('');

  // Auto-save logic (Simulation)
  useEffect(() => {
    const timer = setInterval(() => {
      console.log("Auto-saving notebook...");
    }, 10000);
    return () => clearInterval(timer);
  }, [cells]);

  const addCell = (type: 'code' | 'markdown') => {
    const newCell: Cell = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: '',
      isExecuting: false
    };
    setCells([...cells, newCell]);
  };

  const updateCell = (id: string, content: string) => {
    setCells(cells.map(c => c.id === id ? { ...c, content } : c));
  };

  const executeCell = async (id: string) => {
    const cell = cells.find(c => c.id === id);
    if (!cell) return;

    setCells(cells.map(c => c.id === id ? { ...c, isExecuting: true } : c));
    
    const output = await simulateCellExecution(cell.content, cell.type);
    
    setCells(cells.map(c => c.id === id ? { ...c, output, isExecuting: false } : c));

    // Also simulate creating an experiment if certain keywords are used
    if (cell.content.toLowerCase().includes('train')) {
        setExperiments(prev => [
            { 
              id: `exp-${Date.now()}`, 
              name: 'Manual Training Session', 
              status: 'running', 
              metrics: { accuracy: 0, loss: 1, epoch: 0 }, 
              timestamp: Date.now() 
            },
            ...prev
        ]);
    }
  };

  const deleteCell = (id: string) => {
    setCells(cells.filter(c => c.id !== id));
  };

  const handleAiAsk = async () => {
    if (!aiInput.trim()) return;
    const userMsg = aiInput;
    setAssistantChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setAiInput('');
    
    const context = `Active Tab: ${activeTab}, Cell count: ${cells.length}`;
    const response = await getAiDeveloperAssistantResponse(userMsg, context);
    
    setAssistantChat(prev => [...prev, { role: 'ai', text: response }]);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col p-4">
        <div className="flex items-center space-x-3 px-4 py-6 mb-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="font-bold text-xl">A</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight">Aether Studio</h1>
        </div>

        <nav className="flex-1 space-y-1">
          <SidebarItem
            id={AppTab.NOTEBOOK}
            label="Notebooks"
            active={activeTab === AppTab.NOTEBOOK}
            icon={<Icons.Terminal />}
            onClick={setActiveTab}
          />
          <SidebarItem
            id={AppTab.MODELS}
            label="Model Zoo"
            active={activeTab === AppTab.MODELS}
            icon={<Icons.Box />}
            onClick={setActiveTab}
          />
          <SidebarItem
            id={AppTab.DATASETS}
            label="Datasets"
            active={activeTab === AppTab.DATASETS}
            icon={<Icons.Database />}
            onClick={setActiveTab}
          />
          <SidebarItem
            id={AppTab.EXPERIMENTS}
            label="Experiments"
            active={activeTab === AppTab.EXPERIMENTS}
            icon={<Icons.Activity />}
            onClick={setActiveTab}
          />
          <SidebarItem
            id={AppTab.API}
            label="API Access"
            active={activeTab === AppTab.API}
            icon={<Icons.Key />}
            onClick={setActiveTab}
          />
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-900">
          <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400">GPU Usage</span>
              <span className="text-xs font-mono text-indigo-400">42%</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[42%] transition-all"></div>
            </div>
            <div className="flex items-center justify-between mt-3 mb-2">
              <span className="text-xs text-zinc-400">VRAM</span>
              <span className="text-xs font-mono text-indigo-400">12.4 / 24 GB</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 w-[51%] transition-all"></div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-8 z-10">
          <div className="flex items-center space-x-4">
            <span className="text-zinc-500">Workspace</span>
            <span className="text-zinc-700">/</span>
            <span className="font-medium">training_pipeline_v2.ipynb</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
               <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-mono">Runtime: GPU-A100-80GB</span>
            </div>
            <button 
                onClick={() => setIsAiPanelOpen(!isAiPanelOpen)}
                className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
                title="AI Assistant"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
          {activeTab === AppTab.NOTEBOOK && (
            <div className="pb-32">
              {cells.map(cell => (
                <CodeCell 
                  key={cell.id} 
                  cell={cell} 
                  onUpdate={updateCell}
                  onExecute={executeCell}
                  onDelete={deleteCell}
                />
              ))}
              <div className="flex items-center justify-center space-x-4 mt-8 opacity-40 hover:opacity-100 transition-opacity">
                <button
                  onClick={() => addCell('code')}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full border border-zinc-700 hover:border-indigo-500 hover:text-indigo-400 transition-all text-xs font-medium"
                >
                  <Icons.Plus />
                  <span>Code Cell</span>
                </button>
                <button
                  onClick={() => addCell('markdown')}
                  className="flex items-center space-x-2 px-4 py-2 rounded-full border border-zinc-700 hover:border-indigo-500 hover:text-indigo-400 transition-all text-xs font-medium"
                >
                  <Icons.Plus />
                  <span>Markdown Cell</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === AppTab.MODELS && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {MOCK_MODELS.map(model => (
                 <div key={model.id} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/50 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                        <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-bold uppercase tracking-wider">{model.category}</span>
                        <span className="text-xs text-zinc-500">{model.version}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-zinc-100">{model.name}</h3>
                    <p className="text-sm text-zinc-400 mb-6">{model.description}</p>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Provider: <span className="text-zinc-300 font-medium">{model.provider}</span></span>
                        <button className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
                            <span>Pull Weights</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                        </button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === AppTab.DATASETS && (
            <div className="space-y-4">
               {MOCK_DATASETS.map(ds => (
                 <div key={ds.id} className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                    <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
                            <Icons.Database />
                        </div>
                        <div>
                            <h4 className="font-semibold text-zinc-100">{ds.name}</h4>
                            <p className="text-xs text-zinc-500">{ds.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-8">
                        <div className="text-right">
                            <p className="text-xs font-mono text-zinc-400">{ds.size}</p>
                            <p className="text-[10px] text-zinc-600 uppercase font-bold">{ds.type}</p>
                        </div>
                        <button className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium transition-colors">Mount Dataset</button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === AppTab.EXPERIMENTS && (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Experiment Tracking</h2>
                    <button className="text-xs text-indigo-400 font-medium hover:underline">Export to Tensorboard</button>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-black/20 text-zinc-500 uppercase text-[10px] font-bold tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Experiment</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Accuracy</th>
                                <th className="px-6 py-4">Loss</th>
                                <th className="px-6 py-4">Epochs</th>
                                <th className="px-6 py-4">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {experiments.map(exp => (
                                <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-zinc-200">{exp.name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            exp.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                            exp.status === 'running' ? 'bg-indigo-500/10 text-indigo-400 animate-pulse' :
                                            'bg-red-500/10 text-red-400'
                                        }`}>
                                            {exp.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono">{(exp.metrics.accuracy * 100).toFixed(1)}%</td>
                                    <td className="px-6 py-4 font-mono text-zinc-500">{exp.metrics.loss.toFixed(3)}</td>
                                    <td className="px-6 py-4 text-zinc-500">{exp.metrics.epoch}</td>
                                    <td className="px-6 py-4 text-zinc-600 text-xs">{new Date(exp.timestamp).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {activeTab === AppTab.API && (
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="p-8 rounded-3xl bg-indigo-600/10 border border-indigo-500/20">
                    <h2 className="text-2xl font-bold mb-4 text-indigo-400">Everything is an API</h2>
                    <p className="text-zinc-400 mb-8 leading-relaxed">
                        Automate your research cycle. Start training runs, fetch metrics, and deploy models using our unified SDK or REST API.
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                        {['Python SDK', 'Node.js SDK', 'Go Library'].map(sdk => (
                            <div key={sdk} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                                <span className="text-xs font-bold text-zinc-200">{sdk}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Your API Keys</h3>
                    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <Icons.Key />
                            <code className="text-sm text-zinc-400 font-mono">aether_live_5592_••••••••••••••••</code>
                        </div>
                        <button className="text-xs font-bold text-indigo-400 hover:underline">Copy Key</button>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Quick Start</h3>
                    <div className="rounded-xl bg-black border border-zinc-800 overflow-hidden">
                        <div className="px-4 py-2 bg-zinc-900 text-[10px] font-bold text-zinc-500 uppercase flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="ml-2">main.py</span>
                        </div>
                        <pre className="p-6 text-xs text-indigo-300 font-mono overflow-x-auto leading-relaxed">
{`from aether import Studio

# Initialize
studio = Studio(api_key="YOUR_KEY")

# Remote execute notebook
run = studio.notebooks.run(
    "training_v2.ipynb", 
    instance="gpu-a100", 
    datasets=["imagenet-1k"]
)

# Wait for results
print(f"Accuracy: {run.metrics.accuracy}")`}
                        </pre>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* AI Assistant Sidebar (Overlay-ish) */}
        {isAiPanelOpen && (
          <div className="absolute top-16 right-0 bottom-0 w-[400px] bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col z-20">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
                <div className="flex items-center space-x-2">
                     <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                    <span className="font-bold text-sm">Aether Assistant</span>
                </div>
                <button 
                    onClick={() => setIsAiPanelOpen(false)}
                    className="text-zinc-500 hover:text-zinc-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {assistantChat.length === 0 && (
                    <div className="text-center py-10 px-4">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
                             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        </div>
                        <h4 className="font-semibold mb-2">How can I help?</h4>
                        <p className="text-xs text-zinc-500">Ask about model architectures, dataset mounting, or debugging your current notebook cells.</p>
                    </div>
                )}
                {assistantChat.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                            msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-200'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>
            <div className="p-4 border-t border-zinc-800 bg-zinc-950">
                <div className="relative">
                    <input 
                        type="text" 
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
                        placeholder="Type your question..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 pr-10"
                    />
                    <button 
                        onClick={handleAiAsk}
                        className="absolute right-2 top-1.5 p-1 text-indigo-400 hover:text-indigo-300"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* Footer Bar */}
        <footer className="h-8 border-t border-zinc-800 bg-zinc-950 px-4 flex items-center justify-between text-[10px] text-zinc-500 font-medium">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              <span>Kernel: Python 3.11 (PyTorch 2.4)</span>
            </span>
            <span>RAM: 64.2GB / 128.0GB</span>
          </div>
          <div className="flex items-center space-x-4">
             <span>Ln 42, Col 12</span>
             <span>UTF-8</span>
             <span className="text-indigo-400">Aether Studio v0.8.4-beta</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default App;

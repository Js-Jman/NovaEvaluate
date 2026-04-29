'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import NovaLoader from '@/components/NovaLoader';
import NovaSelect from '@/components/NovaSelect';
import { useToast } from '@/components/ToastProvider';
import PageTransition, { AnimatedItem } from '@/components/PageTransition';

const ALL_MODELS = [
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini', vision: true },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini', vision: true },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini', vision: true },
  { id: 'llama-3.3-70b', label: 'Llama 3.3 70B', provider: 'groq', vision: false },
  { id: 'llama-3.2-vision', label: 'Llama 3.2 Vision', provider: 'groq', vision: true },
  { id: 'mixtral-8x7b', label: 'Mixtral 8x7B', provider: 'groq', vision: false },
  { id: 'openrouter-auto', label: 'OpenRouter Auto', provider: 'openrouter', vision: true },
  { id: 'command-r-plus', label: 'Cohere Command R+', provider: 'cohere', vision: false },
  { id: 'mistral-large', label: 'Mistral Large', provider: 'mistral', vision: false },
];

const PROVIDERS = ['gemini', 'groq', 'openrouter', 'cohere', 'mistral'];

const PROVIDER_ICONS: Record<string, string> = {
  gemini: '✦', groq: '⚡', openrouter: '🔀', cohere: '◎', mistral: '🌀',
};

const ALL_OCR_PROVIDERS = [
  { id: 'gemini-vision', label: 'Gemini Vision', icon: '✦', desc: 'AI-powered, best for handwriting', color: 'from-[#8b5cf6] to-[#6366f1]' },
  { id: 'groq-vision', label: 'Groq Vision', icon: '⚡', desc: 'Fast AI OCR, free tier', color: 'from-[#f97316] to-[#ef4444]' },
  { id: 'openrouter-vision', label: 'OpenRouter (Vision)', icon: '🔄', desc: 'Fallbacks to multiple free models', color: 'from-[#0ea5e9] to-[#0369a1]' }
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [ocrChain, setOcrChain] = useState<string[]>(['gemini-vision', 'groq-vision', 'openrouter-vision']);
  const [activeModel, setActiveModel] = useState('gemini-1.5-flash');
  const [fallbackChain, setFallbackChain] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'testing' | null>>({});
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [autoPublish, setAutoPublish] = useState(false);

  useEffect(() => {
    toast.info('Loading settings...');
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setOcrChain(Array.isArray(data.ocrStrategy) ? data.ocrStrategy : [data.ocrStrategy]);
        setActiveModel(data.activeModel);
        setFallbackChain(data.fallbackChain || []);
        setConfiguredProviders(data.providers || []);
        setAutoPublish(data.autoPublish || false);
        setLoading(false);
        toast.success('Settings loaded');
      })
      .catch(() => { setLoading(false); toast.error('Failed to load settings'); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    toast.info('Saving settings...');
    try {
      const body: Record<string, unknown> = { activeModel, ocrStrategy: ocrChain, fallbackChain, autoPublish };
      const keysToSave: Record<string, string> = {};
      for (const [p, k] of Object.entries(apiKeys)) {
        if (k.trim()) keysToSave[p] = k.trim();
      }
      if (Object.keys(keysToSave).length > 0) body.apiKeys = keysToSave;

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) toast.success('Settings saved!');
      else toast.error('Failed to save');
    } catch { toast.error('Network error'); }
    finally { setSaving(false); }
  };

  const handleTestKey = async (provider: string) => {
    const key = apiKeys[provider];
    if (!key) {
      if (configuredProviders.includes(provider)) {
        toast.warning(`Enter a new API key to test it. Masked keys cannot be tested.`);
      } else {
        toast.error(`Enter an API key for ${provider} first`);
      }
      return;
    }

    setTestResults((prev) => ({ ...prev, [provider]: 'testing' }));
    toast.info(`Validating ${provider} API key...`);

    try {
      const validateRes = await fetch('/api/settings/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, key }),
      });

      const validateData = await validateRes.json();

      if (!validateRes.ok || !validateData.success) {
        setTestResults((prev) => ({ ...prev, [provider]: 'error' }));
        toast.error(`Validation Failed: ${validateData.error || 'Invalid key'}`);
        return;
      }

      const saveRes = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKeys: { [provider]: key } }),
      });
      
      if (!saveRes.ok) throw new Error('Failed to save configuration');

      setTestResults((prev) => ({ ...prev, [provider]: 'success' }));
      setConfiguredProviders((prev) => Array.from(new Set([...prev, provider])));
      toast.success(`${provider} key is valid and saved ✓`);
    } catch (err: any) {
      setTestResults((prev) => ({ ...prev, [provider]: 'error' }));
      toast.error(err.message || `${provider} key test failed`);
    }
  };

  const addToChain = (modelId: string) => {
    if (!modelId) return;
    if (!fallbackChain.includes(modelId)) {
      const modelLabel = ALL_MODELS.find((m) => m.id === modelId)?.label || modelId;
      setFallbackChain([...fallbackChain, modelId]);
      toast.success(`Added "${modelLabel}" to fallback chain`);
    } else {
      toast.warning('Model already in chain');
    }
  };

  const removeFromChain = (modelId: string) => {
    const modelLabel = ALL_MODELS.find((m) => m.id === modelId)?.label || modelId;
    setFallbackChain(fallbackChain.filter((m) => m !== modelId));
    toast.info(`Removed "${modelLabel}" from fallback chain`);
  };

  const removeFromOcrChain = (id: string) => {
    if (ocrChain.length <= 1) { toast.warning('At least one OCR provider is required'); return; }
    const label = ALL_OCR_PROVIDERS.find((p) => p.id === id)?.label || id;
    setOcrChain(ocrChain.filter((p) => p !== id));
    toast.info(`Removed "${label}" from OCR chain`);
  };

  const addToOcrChain = (id: string) => {
    if (!id || ocrChain.includes(id)) return;
    const label = ALL_OCR_PROVIDERS.find((p) => p.id === id)?.label || id;
    setOcrChain([...ocrChain, id]);
    toast.success(`Added "${label}" to OCR chain`);
  };

  const availableOcrProviders = ALL_OCR_PROVIDERS
    .filter((p) => !ocrChain.includes(p.id))
    .map((p) => ({ value: p.id, label: p.label, subtitle: p.desc }));

  if (loading) return <div className="flex flex-1 items-center justify-center"><NovaLoader size="xl" text="Loading settings..." /></div>;

  const chainOptions = ALL_MODELS
    .filter((m) => !fallbackChain.includes(m.id) && m.id !== activeModel)
    .map((m) => ({ value: m.id, label: m.label, subtitle: m.provider }));

  return (
    <PageTransition>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <AnimatedItem className="mb-6 sm:mb-8">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">AI Switchboard</h1>
            <p className="text-sm text-[#94a3b8]">Configure OCR, grading models, and API keys</p>
          </div>
        </AnimatedItem>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
          {/* Left Column */}
          <div className="flex flex-col space-y-6 sm:space-y-8">
            {/* ─── OCR Fallback Chain ─── */}
            <AnimatedItem className="relative z-[50]">
              <div className="nova-card p-5 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                  <div>
                    <h2 className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-wider">OCR Fallback Chain</h2>
                    <p className="text-xs text-[#94a3b8] mt-1">Drag to reorder. If #1 fails, #2 is tried, and so on.</p>
                  </div>
                  <span className="text-xs font-mono text-[#94a3b8] bg-[#f8fafc] px-2.5 py-1 rounded-lg border border-black/[0.04] self-start">
                    {ocrChain.length} provider{ocrChain.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Reorderable OCR Chain */}
                <Reorder.Group
                  axis="y"
                  values={ocrChain}
                  onReorder={(newOrder) => {
                    setOcrChain(newOrder);
                    toast.info('OCR chain reordered');
                  }}
                  className="space-y-3"
                >
                  <AnimatePresence>
                    {ocrChain.map((providerId, idx) => {
                      const provider = ALL_OCR_PROVIDERS.find((p) => p.id === providerId);
                      if (!provider) return null;
                      return (
                        <Reorder.Item key={providerId} value={providerId}>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95, height: 0 }}
                            whileHover={{ scale: 1.01 }}
                            className={`relative flex items-center gap-3 sm:gap-4 rounded-2xl bg-white border px-4 py-3.5 cursor-grab active:cursor-grabbing transition-all overflow-hidden ${
                              idx === 0
                                ? 'border-transparent shadow-lg shadow-violet-500/10 ring-2 ring-[#8b5cf6]/20'
                                : 'border-black/[0.06] hover:shadow-md'
                            }`}
                          >
                            {/* Active gradient bar for #1 */}
                            {idx === 0 && (
                              <motion.div layoutId="ocr-chain-active" className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6]" />
                            )}

                            {/* Priority badge */}
                            <span className={`flex items-center justify-center w-8 h-8 rounded-xl text-xs font-bold shrink-0 ${
                              idx === 0
                                ? 'bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] text-white shadow-sm'
                                : 'bg-[#f1f5f9] text-[#64748b]'
                            }`}>
                              {idx + 1}
                            </span>

                            {/* Icon */}
                            <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${provider.color} text-white text-lg shrink-0 shadow-sm`}>
                              {provider.icon}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-[#0f172a] truncate">{provider.label}</p>
                              <p className="text-[11px] text-[#94a3b8] mt-0.5 truncate">{provider.desc}</p>
                            </div>

                            {/* Drag handle */}
                            <span className="text-[#cbd5e1] text-sm select-none hidden sm:block">⠿</span>

                            {/* Remove button */}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => removeFromOcrChain(providerId)}
                              className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#fef2f2] text-[#ef4444] text-xs hover:bg-[#fee2e2] transition-colors shrink-0"
                            >
                              ✕
                            </motion.button>
                          </motion.div>
                        </Reorder.Item>
                      );
                    })}
                  </AnimatePresence>
                </Reorder.Group>

                {/* Add provider */}
                <div className="mt-4">
                  <NovaSelect
                    options={availableOcrProviders}
                    value=""
                    onChange={addToOcrChain}
                    placeholder="+ Add OCR provider..."
                  />
                </div>
              </div>
            </AnimatedItem>



            {/* ─── API Keys ─── */}
            <AnimatedItem className="relative z-[20]">
              <div className="nova-card p-5 sm:p-7">
                <h2 className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-wider mb-5">API Keys</h2>
                <div className="space-y-3">
                  {PROVIDERS.map((provider) => (
                    <motion.div key={provider} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-xl bg-[#f8fafc] border border-black/[0.04]"
                    >
                      <div className="flex items-center gap-2 sm:w-28 shrink-0">
                        <span className="text-base">{PROVIDER_ICONS[provider]}</span>
                        <span className="text-sm font-semibold text-[#334155] capitalize">{provider}</span>
                      </div>
                      <input
                        type="password"
                        value={apiKeys[provider] || ''}
                        onChange={(e) => setApiKeys((prev) => ({ ...prev, [provider]: e.target.value }))}
                        placeholder={configuredProviders.includes(provider) ? '••••••••••••' : 'Not configured'}
                        className="nova-input flex-1 py-2.5 text-sm"
                      />
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handleTestKey(provider)}
                        className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all min-w-[70px] text-center ${
                          testResults[provider] === 'success'
                            ? 'bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]'
                            : testResults[provider] === 'error'
                              ? 'bg-[#fef2f2] text-[#ef4444] border border-[#fecaca]'
                              : 'bg-white text-[#8b5cf6] border border-[#e2e8f0] hover:border-[#c4b5fd] hover:shadow-sm'
                        }`}>
                        {testResults[provider] === 'testing' ? <NovaLoader size="sm" /> :
                          testResults[provider] === 'success' ? '✅ Valid' :
                            testResults[provider] === 'error' ? '❌ Fail' : 'Test'}
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </AnimatedItem>
          </div>

          {/* Right Column */}
          <div className="flex flex-col space-y-6 sm:space-y-8">
            {/* ─── Active Model ─── */}
            <AnimatedItem className="relative z-[40]">
              <div className="nova-card p-5 sm:p-7">
                <NovaSelect
                  label="Active Grading Model"
                  value={activeModel}
                  onChange={(v) => { 
                    setActiveModel(v); 
                    if (fallbackChain.includes(v)) {
                      setFallbackChain(prev => prev.filter(m => m !== v));
                    }
                    toast.info(`Model: ${ALL_MODELS.find((m) => m.id === v)?.label}`); 
                  }}
                  options={ALL_MODELS.map((m) => ({ value: m.id, label: m.label, subtitle: `${m.provider} ${m.vision ? '• vision' : ''}` }))}
                  placeholder="Choose a model..."
                />
              </div>
            </AnimatedItem>

            {/* ─── Auto Publish ─── */}
            <AnimatedItem className="relative z-[35]">
              <div className="nova-card p-5 sm:p-7">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-[#0f172a]">Auto Publish Results</h2>
                    <p className="text-xs text-[#94a3b8]">Automatically email results to students immediately after grading</p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setAutoPublish(!autoPublish)}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 shadow-inner ${
                      autoPublish ? 'bg-gradient-to-r from-[#8b5cf6] to-[#d946ef]' : 'bg-[#e2e8f0]'
                    }`}
                  >
                    <motion.div
                      animate={{ x: autoPublish ? 28 : 4 }}
                      className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md"
                    />
                  </motion.button>
                </div>
              </div>
            </AnimatedItem>

            {/* ─── Fallback Chain ─── */}
            <AnimatedItem className="relative z-[30]">
              <div className="nova-card p-5 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                  <div>
                    <h2 className="text-xs font-semibold text-[#8b5cf6] uppercase tracking-wider">Fallback Chain</h2>
                    <p className="text-xs text-[#94a3b8] mt-1">Drag to reorder priority. If #1 fails, #2 is tried, and so on.</p>
                  </div>
                  <span className="text-xs font-mono text-[#94a3b8] bg-[#f8fafc] px-2.5 py-1 rounded-lg border border-black/[0.04] self-start">
                    {fallbackChain.length} model{fallbackChain.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Chain Items */}
                {fallbackChain.length === 0 ? (
                  <div className="text-center py-8 rounded-2xl border border-dashed border-black/[0.08] bg-[#fafbff]">
                    <p className="text-sm text-[#94a3b8]">No fallback models configured</p>
                    <p className="text-xs text-[#c4b5fd] mt-1">Add models below to create a chain</p>
                  </div>
                ) : (
                  <Reorder.Group
                    axis="y"
                    values={fallbackChain}
                    onReorder={(newOrder) => {
                      setFallbackChain(newOrder);
                      toast.info('Fallback chain reordered');
                    }}
                    className="space-y-2 mb-4"
                  >
                    <AnimatePresence>
                      {fallbackChain.map((modelId, idx) => {
                        const model = ALL_MODELS.find((m) => m.id === modelId);
                        return (
                          <Reorder.Item key={modelId} value={modelId}>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95, height: 0 }}
                              whileHover={{ scale: 1.01 }}
                              className="flex items-center gap-3 rounded-xl bg-white border border-black/[0.06] px-4 py-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
                            >
                              {/* Priority badge */}
                              <span className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shrink-0 ${
                                idx === 0
                                  ? 'bg-gradient-to-br from-[#ec4899] to-[#8b5cf6] text-white shadow-sm'
                                  : 'bg-[#f1f5f9] text-[#64748b]'
                              }`}>
                                {idx + 1}
                              </span>

                              {/* Model info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#0f172a] truncate">{model?.label || modelId}</p>
                                <p className="text-[10px] text-[#94a3b8] uppercase tracking-wider">{model?.provider}</p>
                              </div>

                              {/* Drag handle */}
                              <span className="text-[#cbd5e1] text-sm select-none mr-1">⠿</span>

                              {/* Remove button */}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeFromChain(modelId)}
                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#fef2f2] text-[#ef4444] text-xs hover:bg-[#fee2e2] transition-colors shrink-0"
                              >
                                ✕
                              </motion.button>
                            </motion.div>
                          </Reorder.Item>
                        );
                      })}
                    </AnimatePresence>
                  </Reorder.Group>
                )}

                {/* Add to chain */}
                <div className="mt-4">
                  <NovaSelect
                    options={chainOptions}
                    value=""
                    onChange={addToChain}
                    placeholder="+ Add model to fallback chain..."
                  />
                </div>
              </div>
            </AnimatedItem>
          </div>
        </div>

        {/* ─── Sticky Save Button ─── */}
        <motion.div
          className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 z-[100]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            onClick={handleSave}
            disabled={saving}
            className="flex items-center justify-center gap-2 h-14 min-w-[3.5rem] rounded-full bg-gradient-to-r from-[#ec4899] via-[#8b5cf6] to-[#3b82f6] text-white shadow-xl shadow-violet-500/30 px-4 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <NovaLoader size="sm" /> : <span className="text-xl">💾</span>}
            <AnimatePresence>
              {(hovered || saving) && (
                <motion.span
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 'auto', opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  className="overflow-hidden whitespace-nowrap text-sm font-semibold pr-2"
                >
                  {saving ? 'Saving...' : 'Save'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </motion.div>
      </div>
    </PageTransition>
  );
}

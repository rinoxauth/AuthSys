'use client';

import { useEffect, useState } from 'react';
import adminApi from '@/lib/admin-api';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui/confirm-dialog';

type ProviderConfig = {
  id: number;
  provider: string;
  model_name: string;
  is_active: boolean;
  priority: number;
  api_endpoint: string;
  settings: any;
  created_at: string;
  updated_at: string;
  api_key?: string;
  api_key_encrypted?: string;
};

export default function AIControlPage() {
  const confirm = useConfirm();
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ProviderConfig | null>(null);

  const [newProvider, setNewProvider] = useState('groq');
  const [newApiKey, setNewApiKey] = useState('');
  const [newModel, setNewModel] = useState('llama-3.3-70b-versatile');
  const [newPriority, setNewPriority] = useState(0);
  const [newEndpoint, setNewEndpoint] = useState('');
  const [newSettings, setNewSettings] = useState('');

  const loadConfigs = async () => {
    try {
      const res = await adminApi.get<{ providers: ProviderConfig[] }>('/admin/ai/providers');
      setConfigs(res.data.providers || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to load provider configs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleAdd = async () => {
    try {
      const settings = newSettings ? JSON.parse(newSettings) : {};
      await adminApi.post('/admin/ai/providers', {
        provider: newProvider,
        api_key: newApiKey,
        model_name: newModel,
        api_endpoint: newEndpoint || undefined,
        is_active: true,
        priority: newPriority,
        settings
      });
      toast.success('Provider configuration added');
      setShowAddModal(false);
      setNewApiKey('');
      setNewEndpoint('');
      setNewSettings('');
      loadConfigs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to add provider config');
    }
  };

  const handleUpdate = async () => {
    if (!editingConfig) return;
    try {
      const settings = newSettings ? JSON.parse(newSettings) : editingConfig.settings;
      await adminApi.put(`/admin/ai/providers/${editingConfig.id}`, {
        api_key: newApiKey || undefined,
        model_name: newModel,
        api_endpoint: newEndpoint || editingConfig.api_endpoint || undefined,
        is_active: editingConfig.is_active,
        priority: newPriority,
        settings
      });
      toast.success('Provider configuration updated');
      setEditingConfig(null);
      setNewApiKey('');
      setNewEndpoint('');
      setNewSettings('');
      loadConfigs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update provider config');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: 'Delete provider?',
      message: 'This provider configuration will be permanently removed.',
      confirmLabel: 'Yes, delete',
      cancelLabel: 'No, cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await adminApi.delete(`/admin/ai/providers/${id}`);
      toast.success('Provider configuration deleted');
      loadConfigs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete provider config');
    }
  };

  const handleToggleActive = async (config: ProviderConfig) => {
    try {
      await adminApi.put(`/admin/ai/providers/${config.id}`, {
        is_active: !config.is_active
      });
      toast.success(`Provider ${!config.is_active ? 'enabled' : 'disabled'}`);
      loadConfigs();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to toggle provider');
    }
  };

  const openEditModal = (config: ProviderConfig) => {
    setEditingConfig(config);
    setNewProvider(config.provider);
    setNewModel(config.model_name);
    setNewPriority(config.priority);
    setNewEndpoint(config.api_endpoint || '');
    setNewSettings(config.settings ? JSON.stringify(config.settings, null, 2) : '');
    setShowAddModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-12 h-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">AI Provider Configurations</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Manage AI provider API keys and models for the AI assistant
          </p>
        </div>
        <button
          onClick={() => {
            setEditingConfig(null);
            setNewProvider('groq');
            setNewModel('llama-3.3-70b-versatile');
            setNewPriority(0);
            setNewApiKey('');
            setNewEndpoint('');
            setNewSettings('');
            setShowAddModal(true);
          }}
          className="px-6 py-3 rounded-xl bg-[var(--primary)] text-[#131313] font-bold text-xs uppercase tracking-widest"
        >
          Add Provider
        </button>
      </div>

      <div className="grid gap-4">
        {configs.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 border border-white/5 text-center">
            <p className="text-[var(--muted-foreground)]">No provider configurations found. Add one to get started.</p>
          </div>
        ) : (
          configs.map((config) => (
            <div key={config.id} className="glass-card rounded-2xl p-6 border border-white/5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest bg-[var(--primary)]/20 text-[var(--primary)]">
                      {config.provider}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                      config.is_active
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {config.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">Priority: {config.priority}</span>
                  </div>
                  <p className="text-sm font-bold text-[var(--foreground)]">{config.model_name}</p>
                  {config.api_endpoint && (
                    <p className="text-xs text-[var(--muted-foreground)] font-mono mt-1 truncate max-w-md">
                      Endpoint: {config.api_endpoint}
                    </p>
                  )}
                  {config.api_key && (
                    <p className="text-xs text-[var(--muted-foreground)] font-mono mt-1">
                      Key: {config.api_key.length > 8
                        ? `${config.api_key.slice(0, 4)}...${config.api_key.slice(-4)}`
                        : '••••••••'}
                    </p>
                  )}
                  {config.settings && Object.keys(config.settings).length > 0 && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      Settings: {JSON.stringify(config.settings)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(config)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-[var(--foreground)] hover:bg-white/10"
                  >
                    {config.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => openEditModal(config)}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-[var(--foreground)] hover:bg-white/10"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[100]">
          <div className="glass-card rounded-2xl p-8 border border-white/10 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">
              {editingConfig ? 'Edit Provider' : 'Add New Provider'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-2">
                  Provider
                </label>
                <select
                  value={newProvider}
                  onChange={(e) => {
                    const p = e.target.value;
                    setNewProvider(p);
                    // Pre-fill a sensible default model when switching providers.
                    const defaults: Record<string, string> = {
                      google: 'gemini-2.0-flash',
                      openai: 'gpt-4o-mini',
                      anthropic: 'claude-3-5-sonnet-latest',
                      groq: 'llama-3.3-70b-versatile',
                      openrouter: 'google/gemini-2.0-flash-exp:free',
                      custom: 'gpt-4o-mini',
                    };
                    setNewModel(defaults[p] ?? '');
                  }}
                  disabled={!!editingConfig}
                  className="w-full bg-[var(--card)]/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-[var(--foreground)]"
                >
                  <option value="google">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="custom">Custom (OpenAI-compatible)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder={editingConfig ? 'Leave empty to keep current' : 'Enter API key'}
                  className="w-full bg-[var(--card)]/50 border border-white/10 rounded-xl py-3 px-4 text-sm font-mono text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-2">
                  Model Name
                </label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="e.g., gpt-4o, gemini-pro, claude-3-opus-20240229"
                  className="w-full bg-[var(--card)]/50 border border-white/10 rounded-xl py-3 px-4 text-sm font-mono text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-2">
                  API Endpoint URL
                </label>
                <input
                  type="url"
                  value={newEndpoint}
                  onChange={(e) => setNewEndpoint(e.target.value)}
                  placeholder={
                    newProvider === 'google'
                      ? 'https://generativelanguage.googleapis.com/v1'
                      : newProvider === 'openai'
                        ? 'https://api.openai.com/v1'
                        : newProvider === 'anthropic'
                          ? 'https://api.anthropic.com/v1'
                          : newProvider === 'groq'
                            ? 'https://api.groq.com/openai/v1'
                            : newProvider === 'openrouter'
                              ? 'https://openrouter.ai/api/v1'
                              : 'https://your-custom-api.com/v1'
                  }
                  className="w-full bg-[var(--card)]/50 border border-white/10 rounded-xl py-3 px-4 text-sm font-mono text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-2">
                  Priority (lower = higher priority)
                </label>
                <input
                  type="number"
                  value={newPriority}
                  onChange={(e) => setNewPriority(parseInt(e.target.value))}
                  className="w-full bg-[var(--card)]/50 border border-white/10 rounded-xl py-3 px-4 text-sm text-[var(--foreground)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-2">
                  Settings (JSON, optional)
                </label>
                <textarea
                  value={newSettings}
                  onChange={(e) => setNewSettings(e.target.value)}
                  placeholder='{"temperature": 0.7, "max_tokens": 2000}'
                  rows={3}
                  className="w-full bg-[var(--card)]/50 border border-white/10 rounded-xl py-3 px-4 text-sm font-mono text-[var(--foreground)]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={editingConfig ? handleUpdate : handleAdd}
                className="flex-1 px-6 py-3 rounded-xl bg-[var(--primary)] text-[#131313] font-bold text-xs uppercase tracking-widest"
              >
                {editingConfig ? 'Update' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingConfig(null);
                  setNewApiKey('');
                  setNewEndpoint('');
                  setNewSettings('');
                }}
                className="flex-1 px-6 py-3 rounded-xl bg-white/5 border border-white/10 font-bold text-xs uppercase tracking-widest text-[var(--foreground)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

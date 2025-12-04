import { useState, useEffect } from 'react';
import { Trash2, Plus, Save } from 'lucide-react';

interface Presets {
    [name: string]: string[];
}

export function PresetsPage() {
    const [presets, setPresets] = useState<Presets>({});
    const [isCreating, setIsCreating] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [newPresetUrls, setNewPresetUrls] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPresets();
    }, []);

    const fetchPresets = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/presets');
            const data = await res.json();
            setPresets(data);
        } catch (err) {
            console.error('Failed to fetch presets', err);
        }
    };

    const handleSave = async () => {
        if (!newPresetName.trim()) {
            setError('Preset name is required');
            return;
        }
        const urls = newPresetUrls.split('\n').map(u => u.trim()).filter(u => u);
        if (urls.length === 0) {
            setError('At least one URL is required');
            return;
        }

        try {
            const res = await fetch('http://localhost:3000/api/presets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newPresetName, urls })
            });
            if (res.ok) {
                const data = await res.json();
                setPresets(data.presets);
                setIsCreating(false);
                setNewPresetName('');
                setNewPresetUrls('');
                setError('');
            } else {
                setError('Failed to save preset');
            }
        } catch (err) {
            setError('Error saving preset');
        }
    };

    const handleDelete = async (name: string) => {
        if (!confirm(`Delete preset "${name}"?`)) return;
        try {
            const res = await fetch(`http://localhost:3000/api/presets/${encodeURIComponent(name)}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const data = await res.json();
                setPresets(data.presets);
            }
        } catch (err) {
            console.error('Failed to delete preset', err);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-on-surface">URL Presets</h1>
                    <p className="text-on-surface-variant">Manage your custom search lists</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} />
                    Create Preset
                </button>
            </div>

            {isCreating && (
                <div className="bg-surface p-6 rounded-3xl border border-outline/20 shadow-lg mb-8 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-xl font-semibold mb-4 text-on-surface">New Preset</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-1">Preset Name</label>
                            <input
                                type="text"
                                value={newPresetName}
                                onChange={(e) => setNewPresetName(e.target.value)}
                                className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary outline-none"
                                placeholder="e.g., Remote Python Internships"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-1">URLs (one per line)</label>
                            <textarea
                                value={newPresetUrls}
                                onChange={(e) => setNewPresetUrls(e.target.value)}
                                className="w-full h-32 bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary outline-none font-mono text-sm"
                                placeholder="https://internshala.com/..."
                            />
                        </div>
                        {error && <p className="text-error text-sm">{error}</p>}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant/20 rounded-full transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2 rounded-full hover:bg-primary/90 transition-colors"
                            >
                                <Save size={18} />
                                Save Preset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {Object.entries(presets).map(([name, urls]) => (
                    <div key={name} className="bg-surface p-6 rounded-3xl border border-outline/20 flex justify-between items-start group hover:border-primary/30 transition-colors">
                        <div>
                            <h3 className="text-xl font-semibold text-on-surface mb-2">{name}</h3>
                            <div className="space-y-1">
                                {urls.map((url, i) => (
                                    <p key={i} className="text-sm text-on-surface-variant truncate max-w-2xl font-mono opacity-80">
                                        {url}
                                    </p>
                                ))}
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(name)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete Preset"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>
                ))}
                {Object.keys(presets).length === 0 && !isCreating && (
                    <div className="text-center py-12 text-on-surface-variant opacity-60">
                        No presets found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}

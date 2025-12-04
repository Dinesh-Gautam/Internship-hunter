import { Loader2, Search, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface RunButtonProps {
    onRun: (presetName?: string) => void;
    isRunning: boolean;
}

export function RunButton({ onRun, isRunning }: RunButtonProps) {
    const [presets, setPresets] = useState<string[]>([]);
    const [selectedPreset, setSelectedPreset] = useState<string>('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchPresets();

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchPresets = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/presets');
            const data = await res.json();
            setPresets(Object.keys(data));
        } catch (err) {
            console.error('Failed to fetch presets', err);
        }
    };

    const handleRunClick = () => {
        onRun(selectedPreset || undefined);
    };

    return (
        <div className="flex items-center bg-primary rounded-full shadow-md hover:shadow-lg transition-shadow" ref={dropdownRef}>
            <button
                onClick={handleRunClick}
                disabled={isRunning}
                className={`pl-6 pr-4 py-3 font-medium text-on-primary transition-all flex items-center gap-2 rounded-l-full
                    ${isRunning ? 'cursor-not-allowed opacity-80' : 'hover:bg-primary/90'}`}
            >
                {isRunning ? (
                    <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>{selectedPreset ? `Running: ${selectedPreset}` : 'Scraping...'}</span>
                    </>
                ) : (
                    <>
                        <Search size={20} />
                        <span>{selectedPreset || 'Find Internships'}</span>
                    </>
                )}
            </button>
            <div className="h-6 w-px bg-on-primary/20"></div>
            <button
                disabled={isRunning}
                onClick={() => setShowDropdown(!showDropdown)}
                className={`px-3 py-3 text-on-primary hover:bg-primary/90 rounded-r-full transition-colors ${isRunning ? 'cursor-not-allowed opacity-80' : ''}`}
            >
                <ChevronDown size={20} />
            </button>

            {showDropdown && !isRunning && (
                <div className="absolute top-full mt-2 right-0 w-56 bg-surface rounded-2xl border border-outline/20 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="py-2">
                        <button
                            onClick={() => { setSelectedPreset(''); setShowDropdown(false); }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-variant/30 transition-colors ${selectedPreset === '' ? 'text-primary font-medium bg-primary/5' : 'text-on-surface'}`}
                        >
                            Default (All Sources)
                        </button>
                        {presets.map(preset => (
                            <button
                                key={preset}
                                onClick={() => { setSelectedPreset(preset); setShowDropdown(false); }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-variant/30 transition-colors ${selectedPreset === preset ? 'text-primary font-medium bg-primary/5' : 'text-on-surface'}`}
                            >
                                {preset}
                            </button>
                        ))}
                        {presets.length === 0 && (
                            <div className="px-4 py-2 text-xs text-on-surface-variant opacity-60 italic">
                                No presets found. Create one in Settings.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

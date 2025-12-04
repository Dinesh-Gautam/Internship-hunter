import { useState } from 'react';
import { useGlobalState } from '../store/global';
import { InternshipCard, type Internship } from "./InternshipCard";
import { InternshipAnalysis } from "./InternshipAnalysis";
import { Sparkles } from 'lucide-react';
interface InternshipListProps {
    internships: Internship[];
    onUpdate: () => void;
}

export function InternshipList({ internships, onUpdate }: InternshipListProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { filter, setFilter } = useGlobalState();

    const selectedInternship = internships.find(i => i.id === selectedId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-start">
            <div className="grid gap-6 content-start h-[calc(100vh-2rem)] overflow-y-auto">
                <div className="flex gap-2 mb-2 sticky top-0 bg-background z-10 py-2">
                    {(['all', 'unseen', 'seen'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border border-outline/10 ${filter === f
                                ? 'bg-secondary-container text-on-secondary-container'
                                : 'bg-surface text-on-surface-variant hover:bg-surface-variant/50'
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                {internships.length > 0 ? internships.map((internship) => (
                    <InternshipCard
                        key={internship.id}
                        internship={internship}
                        onUpdate={onUpdate}
                        isSelected={selectedId === internship.id}
                        onSelect={() => setSelectedId(selectedId === internship.id ? null : internship.id)}
                    />
                )) : <div className="text-center py-20 bg-surface rounded-3xl border border-outline/20 shadow-sm">
                    <p className="text-on-surface-variant text-lg">No internships found yet. Click "Find Internships" to start.</p>
                </div>}
            </div>

            <div className="hidden lg:block h-[calc(100vh-2rem)]">
                {selectedInternship ? (
                    <InternshipAnalysis internship={selectedInternship} />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-on-surface-variant p-8 text-center bg-surface rounded-3xl border border-surface-variant">
                        <Sparkles size={48} className="mb-4 opacity-20" />
                        <p>Select an internship to view AI analysis</p>
                    </div>
                )}
            </div>
        </div >
    );
}

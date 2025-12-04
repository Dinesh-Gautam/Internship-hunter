import { useState } from 'react';
import { InternshipCard, type Internship } from "./InternshipCard";
import { InternshipAnalysis } from "./InternshipAnalysis";
import { Sparkles } from 'lucide-react';
import { Header } from '../App';

interface InternshipListProps {
    internships: Internship[];
    onUpdate: () => void;
}

export function InternshipList({ internships, onUpdate }: InternshipListProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    if (internships.length === 0) {
        return (
            <div className="text-center py-20 bg-surface rounded-3xl border border-outline/20 shadow-sm">
                <p className="text-on-surface-variant text-lg">No internships found yet. Click "Find Internships" to start.</p>
            </div>
        );
    }

    const selectedInternship = internships.find(i => i.id === selectedId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-start">
            <div className="grid gap-6 content-start h-[calc(100vh-2rem)] overflow-y-auto">
                <Header />
                {internships.map((internship) => (
                    <InternshipCard
                        key={internship.id}
                        internship={internship}
                        onUpdate={onUpdate}
                        isSelected={selectedId === internship.id}
                        onSelect={() => setSelectedId(selectedId === internship.id ? null : internship.id)}
                    />
                ))}
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
        </div>
    );
}

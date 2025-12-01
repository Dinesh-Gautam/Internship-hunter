import { InternshipCard } from "./InternshipCard";

interface Internship {
    id: string;
    title: string;
    company: string;
    location: string;
    link: string;
    stipend: string;
    duration: string;
    source: string;
    description: string;
    skills: string[];
    aiAnalysis?: string;
}

interface InternshipListProps {
    internships: Internship[];
    onUpdate: () => void;
}

export function InternshipList({ internships, onUpdate }: InternshipListProps) {
    if (internships.length === 0) {
        return (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-gray-500 text-lg">No internships found yet. Click "Find Internships" to start.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-6">
            {internships.map((internship) => (
                <InternshipCard key={internship.id} internship={internship} onUpdate={onUpdate} />
            ))}
        </div>
    );
}

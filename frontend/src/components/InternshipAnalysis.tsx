import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
    FileText, CheckCircle, AlertCircle, Building2,
    Sparkles
} from 'lucide-react';
import { type Internship } from './InternshipCard';

interface InternshipAnalysisProps {
    internship: Internship;
}

export function InternshipAnalysis({ internship }: InternshipAnalysisProps) {
    const matchScore = internship.matchAnalysis?.score || 0;

    // Determine color based on match score
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-100 border-green-200';
        if (score >= 50) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
        return 'text-red-600 bg-red-100 border-red-200';
    };

    if (!internship.matchAnalysis && !internship.companyAnalysis && !internship.companyDetails) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant p-8 text-center bg-surface rounded-3xl border border-surface-variant">
                <Sparkles size={48} className="mb-4 opacity-20" />
                <p>Select an internship to view AI analysis</p>
            </div>
        );
    }

    return (
        <div className="bg-surface rounded-3xl border border-surface-variant p-6 h-full overflow-y-auto custom-scrollbar ">
            <div className="space-y-6">
                {internship.matchAnalysis && (
                    <div className="bg-tertiary-container/20 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <div className="font-semibold flex items-center gap-2 text-tertiary">
                                <FileText size={18} /> Resume Match
                            </div>
                            <span className={`font-bold px-3 py-1 rounded-full text-sm ${getScoreColor(matchScore)}`}>
                                {internship.matchAnalysis.verdict}
                            </span>
                        </div>

                        <p className="mb-4 text-on-surface-variant text-sm italic border-l-2 border-tertiary/30 pl-3">
                            "{internship.matchAnalysis.summary}"
                        </p>

                        <div className="grid gap-4 text-sm">
                            <div>
                                <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1.5"><CheckCircle size={14} /> Pros</h4>
                                <ul className="space-y-1.5">
                                    {internship.matchAnalysis.pros.map((pro, i) => (
                                        <li key={i} className="flex items-start gap-2 text-on-surface-variant">
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-green-500 shrink-0"></span>
                                            <ReactMarkdown>{pro}</ReactMarkdown>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-red-700 mb-2 flex items-center gap-1.5"><AlertCircle size={14} /> Cons</h4>
                                <ul className="space-y-1.5">
                                    {internship.matchAnalysis.cons.map((con, i) => (
                                        <li key={i} className="flex items-start gap-2 text-on-surface-variant">
                                            <span className="mt-1.5 w-1 h-1 rounded-full bg-red-500 shrink-0"></span>
                                            <ReactMarkdown>{con}</ReactMarkdown>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Company Details & Analysis */}
                {(internship.companyDetails || internship.companyAnalysis) && (
                    <div className="bg-secondary-container/20 rounded-2xl p-5 border border-secondary-container/30">
                        <div className="font-semibold flex items-center gap-2 text-secondary mb-4">
                            <Building2 size={18} /> Company Insights
                        </div>

                        {internship.companyDetails && (
                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                {internship.companyDetails.industry && (
                                    <div className="bg-surface p-2 rounded border border-outline/10">
                                        <span className="block text-xs text-on-surface-variant/70">Industry</span>
                                        <span className="font-medium text-on-surface">{internship.companyDetails.industry}</span>
                                    </div>
                                )}
                                {internship.companyDetails.hiringSince && (
                                    <div className="bg-surface p-2 rounded border border-outline/10">
                                        <span className="block text-xs text-on-surface-variant/70">Hiring Since</span>
                                        <span className="font-medium text-on-surface">{internship.companyDetails.hiringSince}</span>
                                    </div>
                                )}
                                {internship.companyDetails.opportunitiesPosted && (
                                    <div className="bg-surface p-2 rounded border border-outline/10">
                                        <span className="block text-xs text-on-surface-variant/70">Posted</span>
                                        <span className="font-medium text-on-surface">{internship.companyDetails.opportunitiesPosted}</span>
                                    </div>
                                )}
                                {internship.companyDetails.candidatesHired && (
                                    <div className="bg-surface p-2 rounded border border-outline/10">
                                        <span className="block text-xs text-on-surface-variant/70">Hired</span>
                                        <span className="font-medium text-on-surface">{internship.companyDetails.candidatesHired}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {internship.companyAnalysis && (
                            <div className="prose prose-sm prose-p:text-on-surface-variant prose-headings:text-on-surface max-w-none bg-surface/50 p-4 rounded-xl border border-outline/10">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{internship.companyAnalysis}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

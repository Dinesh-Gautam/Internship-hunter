import { useState, useEffect } from 'react';
import { Building2, MapPin, Globe, ShieldAlert, ShieldCheck, Sparkles, Plus, Search, ChevronDown, ChevronUp, Loader2, ArrowUpDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { type Internship } from './InternshipCard';

interface CompanyDetails {
    name: string;
    about: string;
    location: string;
    industry?: string;
    size?: string;
    websiteLink?: string;
    opportunitiesPosted?: string;
    candidatesHired?: string;
    hiringSince?: string;
}

interface Company {
    name: string;
    details?: CompanyDetails;
    analysis?: string;
    isBlacklisted: boolean;
    internships?: Internship[];
    savedOn?: string;
}

export function CompaniesPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [filter, setFilter] = useState<'all' | 'blacklisted' | 'whitelisted'>('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);

    // Loading States
    const [analyzingCompany, setAnalyzingCompany] = useState<string | null>(null);
    const [isAddingCompany, setIsAddingCompany] = useState(false);

    // Form State
    const [newName, setNewName] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [newAbout, setNewAbout] = useState('');

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/companies');
            const data = await res.json();
            setCompanies(data);
        } catch (err) {
            console.error('Failed to fetch companies', err);
        }
    };

    const handleAddCompany = async () => {
        if (!newName.trim()) return;
        setIsAddingCompany(true);
        try {
            const res = await fetch('http://localhost:3000/api/companies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, location: newLocation, about: newAbout })
            });
            if (res.ok) {
                await fetchCompanies();
                setIsAdding(false);
                setNewName('');
                setNewLocation('');
                setNewAbout('');
            }
        } catch (err) {
            console.error('Failed to add company', err);
        } finally {
            setIsAddingCompany(false);
        }
    };

    const toggleBlacklist = async (name: string) => {
        try {
            const res = await fetch(`http://localhost:3000/api/companies/${encodeURIComponent(name)}/blacklist`, {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                setCompanies(prev => prev.map(c => c.name === name ? { ...c, isBlacklisted: data.isBlacklisted } : c));
            }
        } catch (err) {
            console.error('Failed to toggle blacklist', err);
        }
    };

    const runAnalysis = async (name: string) => {
        setAnalyzingCompany(name);
        try {
            const res = await fetch(`http://localhost:3000/api/companies/${encodeURIComponent(name)}/analysis`, {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                setCompanies(prev => prev.map(c => c.name === name ? { ...c, analysis: data.analysis } : c));
            }
        } catch (err) {
            console.error('Failed to run analysis', err);
        } finally {
            setAnalyzingCompany(null);
        }
    };

    const filteredCompanies = companies
        .filter(c => {
            const matchesFilter =
                filter === 'all' ? true :
                    filter === 'blacklisted' ? c.isBlacklisted :
                        !c.isBlacklisted;
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesFilter && matchesSearch;
        })
        .sort((a, b) => {
            const dateA = a.savedOn ? new Date(a.savedOn).getTime() : 0;
            const dateB = b.savedOn ? new Date(b.savedOn).getTime() : 0;

            if (sortOrder === 'newest') {
                return dateB - dateA;
            } else {
                return dateA - dateB;
            }
        });

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-on-surface">Company Management</h1>
                    <p className="text-on-surface-variant">Track, analyze, and manage companies</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} />
                    Add Company
                </button>
            </div>

            {isAdding && (
                <div className="bg-surface p-6 rounded-3xl border border-outline/20 shadow-lg mb-8 animate-in fade-in slide-in-from-top-4">
                    <h2 className="text-xl font-semibold mb-4 text-on-surface">Add New Company</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-1">Company Name *</label>
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-on-surface-variant mb-1">Location</label>
                            <input
                                type="text"
                                value={newLocation}
                                onChange={(e) => setNewLocation(e.target.value)}
                                className="w-full bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-on-surface-variant mb-1">About / Description</label>
                            <textarea
                                value={newAbout}
                                onChange={(e) => setNewAbout(e.target.value)}
                                className="w-full h-24 bg-surface-variant/30 border border-outline/20 rounded-xl px-4 py-2 text-on-surface focus:ring-2 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsAdding(false)}
                            disabled={isAddingCompany}
                            className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant/20 rounded-full transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddCompany}
                            disabled={isAddingCompany}
                            className="bg-primary text-on-primary px-6 py-2 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-70 flex items-center gap-2"
                        >
                            {isAddingCompany && <Loader2 className="animate-spin" size={18} />}
                            {isAddingCompany ? 'Adding...' : 'Add Company'}
                        </button>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={20} />
                    <input
                        type="text"
                        placeholder="Search companies..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-surface border border-outline/20 rounded-full text-on-surface focus:ring-2 focus:ring-primary outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                        className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline/20 rounded-full text-on-surface hover:bg-surface-variant/50 transition-colors"
                    >
                        <ArrowUpDown size={18} />
                        {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                    </button>
                    <div className="flex bg-surface rounded-full p-1 border border-outline/20">
                        {(['all', 'whitelisted', 'blacklisted'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f
                                    ? 'bg-primary-container text-on-primary-container'
                                    : 'text-on-surface-variant hover:bg-surface-variant/50'
                                    }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {filteredCompanies.map((company) => (
                    <div key={company.name} className={`bg-surface rounded-3xl border transition-all ${company.isBlacklisted ? 'border-error/30 bg-error/5' : 'border-outline/20 hover:border-primary/30'
                        }`}>
                        <div className="p-6 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center cursor-pointer"
                            onClick={() => setExpandedCompany(expandedCompany === company.name ? null : company.name)}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl ${company.isBlacklisted ? 'bg-error/20 text-error' : 'bg-primary-container text-on-primary-container'}`}>
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                                        {company.name}
                                        {company.isBlacklisted && <span className="text-xs bg-error text-on-error px-2 py-0.5 rounded-full">Blacklisted</span>}
                                    </h3>
                                    <div className="flex items-center gap-4 text-sm text-on-surface-variant mt-1">
                                        {company.details?.location && (
                                            <span className="flex items-center gap-1"><MapPin size={14} /> {company.details.location}</span>
                                        )}
                                        {company.details?.websiteLink && (
                                            <a href={company.details.websiteLink} target="_blank" rel="noopener noreferrer"
                                                className="flex items-center gap-1 hover:text-primary" onClick={e => e.stopPropagation()}>
                                                <Globe size={14} /> Website
                                            </a>
                                        )}
                                        {company.internships && company.internships.length > 0 && (
                                            <span className="flex items-center gap-1 bg-secondary-container/50 px-2 py-0.5 rounded-md text-xs font-medium text-on-secondary-container">
                                                {company.internships.length} Internships
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={(e) => { e.stopPropagation(); toggleBlacklist(company.name); }}
                                    className={`p-2 rounded-full transition-colors ${company.isBlacklisted
                                        ? 'text-on-surface-variant hover:bg-surface-variant/20'
                                        : 'text-error hover:bg-error/10'
                                        }`}
                                    title={company.isBlacklisted ? "Remove from Blacklist" : "Add to Blacklist"}
                                >
                                    {company.isBlacklisted ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                                </button>
                                {expandedCompany === company.name ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                        </div>

                        {expandedCompany === company.name && (
                            <div className="px-6 pb-6 border-t border-outline/10 pt-4 animate-in slide-in-from-top-2">
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="font-semibold text-on-surface mb-2">About</h4>
                                        <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                                            {company.details?.about || "No description available."}
                                        </p>

                                        {company.details && (
                                            <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
                                                {company.details.industry && (
                                                    <div><span className="text-on-surface-variant">Industry:</span> <span className="text-on-surface font-medium">{company.details.industry}</span></div>
                                                )}
                                                {company.details.size && (
                                                    <div><span className="text-on-surface-variant">Size:</span> <span className="text-on-surface font-medium">{company.details.size}</span></div>
                                                )}
                                                {company.details.hiringSince && (
                                                    <div><span className="text-on-surface-variant">Hiring Since:</span> <span className="text-on-surface font-medium">{company.details.hiringSince}</span></div>
                                                )}
                                            </div>
                                        )}

                                        {company.internships && company.internships.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-on-surface mb-2">Internships</h4>
                                                <div className="space-y-2">
                                                    {company.internships.map(internship => (
                                                        <a
                                                            key={internship.id}
                                                            href={internship.link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block p-3 bg-surface-variant/20 rounded-xl hover:bg-surface-variant/40 transition-colors border border-outline/10"
                                                        >
                                                            <div className="font-medium text-on-surface">{internship.title}</div>
                                                            <div className="text-xs text-on-surface-variant flex gap-2 mt-1">
                                                                <span>{internship.location}</span>
                                                                <span>•</span>
                                                                <span>{internship.stipend}</span>
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-surface-variant/30 rounded-2xl p-4 h-fit">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-semibold text-on-surface flex items-center gap-2">
                                                <Sparkles size={16} className="text-primary" />
                                                AI Analysis
                                            </h4>
                                            <button
                                                onClick={() => runAnalysis(company.name)}
                                                disabled={analyzingCompany === company.name}
                                                className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full hover:bg-primary/20 transition-colors disabled:opacity-50 flex items-center gap-1"
                                            >
                                                {analyzingCompany === company.name && <Loader2 className="animate-spin" size={12} />}
                                                {company.analysis ? 'Regenerate' : 'Generate'}
                                            </button>
                                        </div>
                                        {company.analysis ? (
                                            <div className="prose prose-sm prose-invert max-w-none text-on-surface-variant">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{company.analysis}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-on-surface-variant opacity-60 text-sm">
                                                No analysis generated yet.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {filteredCompanies.length === 0 && (
                    <div className="text-center py-12 text-on-surface-variant opacity-60">
                        No companies found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}

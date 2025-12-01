import { Loader2, Search } from 'lucide-react';

interface RunButtonProps {
    onRun: () => void;
    isRunning: boolean;
}

export function RunButton({ onRun, isRunning }: RunButtonProps) {
    return (
        <button
            onClick={onRun}
            disabled={isRunning}
            className={`px-6 py-3 rounded-full font-medium text-on-primary transition-all flex items-center gap-2
                ${isRunning
                    ? 'bg-primary/70 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg'
                }`}
        >
            {isRunning ? (
                <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Scraping...</span>
                </>
            ) : (
                <>
                    <Search size={20} />
                    <span>Find Internships</span>
                </>
            )}
        </button>
    );
}

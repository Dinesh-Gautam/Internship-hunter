
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ResumeEditor } from './ResumeEditor';

export function ResumeTailorPage() {
    const { internshipId } = useParams();
    const navigate = useNavigate();
    const [internship, setInternship] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!internshipId) return;
        fetch(`http://localhost:3000/api/internships/${internshipId}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setInternship(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [internshipId]);

    if (loading) return (
        <div className="min-h-screen bg-background flex items-center justify-center text-on-surface">
            <div className="animate-pulse">Loading Internship Details...</div>
        </div>
    );

    if (!internship) return (
        <div className="min-h-screen bg-background flex items-center justify-center text-on-surface text-red-500">
            Internship not found or failed to load.
        </div>
    );

    return (
        <div className="min-h-screen bg-background relative">
            {/* Back Button Overlay - optional since Editor has close btn */}
            {/* But providing it just in case */}

            <ResumeEditor
                internshipId={internship.id}
                company={internship.company}
                title={internship.title}
                onClose={() => navigate('/')}
                onSave={(path) => console.log('Saved to', path)}
            />
        </div>
    );
}

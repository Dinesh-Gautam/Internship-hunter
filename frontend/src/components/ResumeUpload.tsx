import { useState, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export function ResumeUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file.');
            return;
        }

        setIsUploading(true);
        setUploadStatus('idle');

        const formData = new FormData();
        formData.append('resume', file);

        try {
            const res = await fetch('http://localhost:3000/api/upload-resume', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                setUploadStatus('success');
                setTimeout(() => setUploadStatus('idle'), 3000);
            } else {
                setUploadStatus('error');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadStatus('error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="relative">
            <input
                type="file"
                accept=".pdf"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
            />

            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={`
          flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all
          ${uploadStatus === 'success'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : uploadStatus === 'error'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80'}
        `}
            >
                {isUploading ? (
                    <Loader2 size={18} className="animate-spin" />
                ) : uploadStatus === 'success' ? (
                    <CheckCircle size={18} />
                ) : uploadStatus === 'error' ? (
                    <AlertCircle size={18} />
                ) : (
                    <Upload size={18} />
                )}

                <span>
                    {isUploading ? 'Uploading...' :
                        uploadStatus === 'success' ? 'Resume Uploaded' :
                            uploadStatus === 'error' ? 'Upload Failed' :
                                'Upload Resume'}
                </span>
            </button>
        </div>
    );
}

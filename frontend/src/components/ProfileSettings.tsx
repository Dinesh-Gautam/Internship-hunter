import { useState, useEffect } from "react";
import { X, Save, User, Github, Linkedin, Globe } from "lucide-react";

interface Profile {
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  globalResumeInstructions?: string;
}

interface ProfileSettingsProps {
  onClose: () => void;
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("http://localhost:3000/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("http://localhost:3000/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-60 flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-md rounded-2xl shadow-2xl flex flex-col border border-outline/10 p-6 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <User size={24} />
            Profile Settings
          </h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-on-surface-variant mb-4">
            This information will be used to auto-fill your resume. Sensitive
            data (Email, Phone, Links) will NOT be sent to the AI.
          </p>

          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">
            Basic Info
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">Email</label>
            <input
              type="email"
              className="w-full bg-surface-variant/30 border border-outline/10 rounded-lg p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="you@example.com"
              value={profile.email || ""}
              onChange={(e) =>
                setProfile({ ...profile, email: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">Phone</label>
            <input
              type="tel"
              className="w-full bg-surface-variant/30 border border-outline/10 rounded-lg p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="+1 234 567 890"
              value={profile.phone || ""}
              onChange={(e) =>
                setProfile({ ...profile, phone: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface">
              Location
            </label>
            <input
              type="text"
              className="w-full bg-surface-variant/30 border border-outline/10 rounded-lg p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="City, Country"
              value={profile.location || ""}
              onChange={(e) =>
                setProfile({ ...profile, location: e.target.value })
              }
            />
          </div>

          <div className="h-px bg-outline/10 my-4" />

          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">
            Global Instructions
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface flex items-center gap-2">
              Instructions for every resume
            </label>
            <p className="text-xs text-on-surface-variant">
              These instructions will be appended to the AI prompt for every
              resume you generate.
            </p>
            <textarea
              className="w-full bg-surface-variant/30 border border-outline/10 rounded-lg p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px]"
              placeholder="e.g. Always include my 'StockAlgo' project: github.com/user/stockalgo..."
              value={profile.globalResumeInstructions || ""}
              onChange={(e) =>
                setProfile({
                  ...profile,
                  globalResumeInstructions: e.target.value,
                })
              }
            />
          </div>

          <div className="h-px bg-outline/10 my-4" />

          <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">
            Social Links
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface flex items-center gap-2">
              <Linkedin size={16} /> LinkedIn URL
            </label>
            <input
              type="text"
              className="w-full bg-surface-variant/30 border border-outline/10 rounded-lg p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://linkedin.com/in/..."
              value={profile.linkedin || ""}
              onChange={(e) =>
                setProfile({ ...profile, linkedin: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface flex items-center gap-2">
              <Github size={16} /> GitHub URL
            </label>
            <input
              type="text"
              className="w-full bg-surface-variant/30 border border-outline/10 rounded-lg p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://github.com/..."
              value={profile.github || ""}
              onChange={(e) =>
                setProfile({ ...profile, github: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-on-surface flex items-center gap-2">
              <Globe size={16} /> Portfolio URL
            </label>
            <input
              type="text"
              className="w-full bg-surface-variant/30 border border-outline/10 rounded-lg p-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://mywebsite.com"
              value={profile.portfolio || ""}
              onChange={(e) =>
                setProfile({ ...profile, portfolio: e.target.value })
              }
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant/50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-primary text-on-primary px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

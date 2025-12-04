import { createContext, useContext, useEffect, useState } from "react";
import type { Internship } from "../components/InternshipCard";

type GlobalState = {
    internships: Internship[];
    fetchInternships: () => Promise<void>;
    setInternships: React.Dispatch<React.SetStateAction<Internship[]>>;
}

const globalStateContext = createContext<GlobalState | null>(null);

export const useGlobalState = () => {
    const context = useContext(globalStateContext);
    if (!context) {
        throw new Error("useGlobalState must be used within a GlobalStateProvider");
    }
    return context;
}

export function GlobalStateProvider({ children }: { children: React.ReactNode }) {
    const [internships, setInternships] = useState<Internship[]>([]);

    const fetchInternships = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/internships');
            const data = await res.json();
            setInternships(data);
        } catch (error) {
            console.error('Failed to fetch internships:', error);
        }
    };

    useEffect(() => {
        fetchInternships();
    }, []);



    return (
        <globalStateContext.Provider value={{ internships, fetchInternships, setInternships }}>
            {children}
        </globalStateContext.Provider>
    );
}
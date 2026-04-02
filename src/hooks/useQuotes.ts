import { useState, useCallback } from "react";
import type { Quote } from "@/types/quote";

const STORAGE_KEY = "insurance-quotes";

const loadQuotes = (): Quote[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getSampleQuotes();
  } catch {
    return getSampleQuotes();
  }
};

const saveQuotes = (quotes: Quote[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
};

function getSampleQuotes(): Quote[] {
  return [
    {
      id: "1",
      clientName: "María García López",
      clientEmail: "maria.garcia@email.com",
      clientPhone: "+52 55 1234 5678",
      insuranceType: "Auto",
      insurer: "GNP Seguros",
      premium: 12500,
      coverage: "Cobertura amplia con deducible 5%",
      status: "pendiente",
      createdAt: "2026-03-28",
      notes: "Cliente interesada en incluir conductor menor de 25 años",
    },
    {
      id: "2",
      clientName: "Carlos Rodríguez",
      clientEmail: "carlos.r@email.com",
      clientPhone: "+52 33 9876 5432",
      insuranceType: "Vida",
      insurer: "MetLife",
      premium: 8900,
      coverage: "Suma asegurada $2,000,000 MXN",
      status: "aprobada",
      createdAt: "2026-03-25",
      notes: "",
    },
    {
      id: "3",
      clientName: "Ana Martínez Soto",
      clientEmail: "ana.mtz@email.com",
      clientPhone: "+52 81 5555 1234",
      insuranceType: "Hogar",
      insurer: "AXA Seguros",
      premium: 6750,
      coverage: "Contenidos + Estructura + RC",
      status: "rechazada",
      createdAt: "2026-03-20",
      notes: "El cliente prefirió otra aseguradora",
    },
    {
      id: "4",
      clientName: "Roberto Hernández",
      clientEmail: "roberto.h@email.com",
      clientPhone: "+52 55 4321 8765",
      insuranceType: "Salud",
      insurer: "Seguros Monterrey",
      premium: 15200,
      coverage: "Plan familiar, tabulador alto",
      status: "pendiente",
      createdAt: "2026-04-01",
      notes: "Espera comparar con otra cotización",
    },
  ];
}

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>(loadQuotes);

  const addQuote = useCallback((quote: Omit<Quote, "id" | "createdAt">) => {
    setQuotes((prev) => {
      const newQuotes = [
        {
          ...quote,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString().split("T")[0],
        },
        ...prev,
      ];
      saveQuotes(newQuotes);
      return newQuotes;
    });
  }, []);

  const updateQuote = useCallback((id: string, updates: Partial<Quote>) => {
    setQuotes((prev) => {
      const newQuotes = prev.map((q) => (q.id === id ? { ...q, ...updates } : q));
      saveQuotes(newQuotes);
      return newQuotes;
    });
  }, []);

  const deleteQuote = useCallback((id: string) => {
    setQuotes((prev) => {
      const newQuotes = prev.filter((q) => q.id !== id);
      saveQuotes(newQuotes);
      return newQuotes;
    });
  }, []);

  return { quotes, addQuote, updateQuote, deleteQuote };
}

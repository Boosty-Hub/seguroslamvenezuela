import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Quote, InsuranceType, QuoteStatus } from "@/types/quote";

interface DbRow {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  insurance_type: string;
  insurer: string;
  premium: number;
  coverage: string;
  status: string;
  notes: string;
  created_at: string;
}

const toQuote = (row: DbRow): Quote => ({
  id: row.id,
  clientName: row.client_name,
  clientEmail: row.client_email,
  clientPhone: row.client_phone,
  insuranceType: row.insurance_type as InsuranceType,
  insurer: row.insurer,
  premium: Number(row.premium),
  coverage: row.coverage,
  status: row.status as QuoteStatus,
  createdAt: row.created_at,
  notes: row.notes,
});

export function useQuotes() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = useCallback(async () => {
    const { data, error } = await supabase
      .from("cotizaciones")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setQuotes((data as unknown as DbRow[]).map(toQuote));
    setLoading(false);
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const addQuote = useCallback(async (quote: Omit<Quote, "id" | "createdAt">) => {
    const { error } = await supabase.from("cotizaciones").insert({
      client_name: quote.clientName,
      client_email: quote.clientEmail,
      client_phone: quote.clientPhone,
      insurance_type: quote.insuranceType,
      insurer: quote.insurer,
      premium: quote.premium,
      coverage: quote.coverage,
      status: quote.status,
      notes: quote.notes,
    });
    if (!error) await fetchQuotes();
  }, [fetchQuotes]);

  const updateQuote = useCallback(async (id: string, updates: Partial<Quote>) => {
    const mapped: Record<string, unknown> = {};
    if (updates.clientName !== undefined) mapped.client_name = updates.clientName;
    if (updates.clientEmail !== undefined) mapped.client_email = updates.clientEmail;
    if (updates.clientPhone !== undefined) mapped.client_phone = updates.clientPhone;
    if (updates.insuranceType !== undefined) mapped.insurance_type = updates.insuranceType;
    if (updates.insurer !== undefined) mapped.insurer = updates.insurer;
    if (updates.premium !== undefined) mapped.premium = updates.premium;
    if (updates.coverage !== undefined) mapped.coverage = updates.coverage;
    if (updates.status !== undefined) mapped.status = updates.status;
    if (updates.notes !== undefined) mapped.notes = updates.notes;

    const { error } = await supabase.from("cotizaciones").update(mapped).eq("id", id);
    if (!error) await fetchQuotes();
  }, [fetchQuotes]);

  const deleteQuote = useCallback(async (id: string) => {
    const { error } = await supabase.from("cotizaciones").delete().eq("id", id);
    if (!error) await fetchQuotes();
  }, [fetchQuotes]);

  return { quotes, loading, addQuote, updateQuote, deleteQuote };
}

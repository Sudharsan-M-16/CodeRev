"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ProblemFilters,
  defaultFilters,
  type ProblemFiltersState,
} from "@/components/problems/ProblemFilters";
import { ProblemList } from "@/components/problems/ProblemList";
import type { PaginatedProblems } from "@/types";

function buildQuery(filters: ProblemFiltersState, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  filters.platforms.forEach((id) => params.append("platforms", id));
  filters.qualityLabels.forEach((label) => params.append("qualityLabels", label));
  if (filters.minDiff) params.set("minDiff", filters.minDiff);
  if (filters.maxDiff) params.set("maxDiff", filters.maxDiff);
  filters.tagIds.forEach((id) => params.append("tagIds", id));
  params.set("tagMatch", filters.tagMatch);
  params.set("drillStatus", filters.drillStatus);
  params.set("sortBy", filters.sortBy);
  params.set("sortOrder", filters.sortOrder);
  params.set("page", String(page));
  return params.toString();
}

export function ProblemsDashboard() {
  const [filters, setFilters] = useState<ProblemFiltersState>(defaultFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaginatedProblems | null>(null);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => buildQuery(filters, page), [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/problems?${query}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  return (
    <div className="space-y-6">
      <ProblemFilters value={filters} onChange={setFilters} />
      {loading ? (
        <p className="text-zinc-500">Loading problems...</p>
      ) : (
        <>
          <ProblemList problems={data?.items ?? []} />
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-zinc-500">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total}{" "}
                total)
              </span>
              <button
                type="button"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border px-3 py-1 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

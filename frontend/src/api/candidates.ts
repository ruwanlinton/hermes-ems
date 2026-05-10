import { apiClient } from "./client";

export interface Candidate {
  id: string;
  registration_number: string;
  name: string;
  date_of_birth: string | null;
  address: string | null;
  mobile: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Candidate[];
}

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  imported: number;
  updated: number;
  errors: ImportError[];
}

export interface CandidateCreate {
  registration_number: string;
  name: string;
  date_of_birth?: string;
  address?: string;
  mobile?: string;
}

export const candidatesApi = {
  list: (params?: { search?: string; page?: number; page_size?: number }) =>
    apiClient.get<CandidateListResponse>("/candidates", { params }),

  get: (id: string) => apiClient.get<Candidate>(`/candidates/${id}`),

  create: (data: CandidateCreate) => apiClient.post<Candidate>("/candidates", data),

  update: (id: string, data: Partial<CandidateCreate>) =>
    apiClient.patch<Candidate>(`/candidates/${id}`, data),

  delete: (id: string) => apiClient.delete(`/candidates/${id}`),

  import: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<ImportResult>("/candidates/import", form, {
      headers: { "Content-Type": undefined },
    });
  },

  export: (format: "csv" | "xlsx" = "csv", search?: string) => {
    const params = new URLSearchParams({ format });
    if (search) params.set("search", search);
    return apiClient.get(`/candidates/export?${params}`, { responseType: "blob" });
  },
};

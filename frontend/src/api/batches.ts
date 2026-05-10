import { apiClient } from "./client";

export interface Batch {
  id: string;
  examination_id: string;
  name: string;
  member_count: number;
  created_at: string;
}

export interface Member {
  id: string;
  batch_id: string;
  candidate_id: string;
  index_number: string;
  candidate_name: string;
  candidate_registration_number: string;
}

export interface MemberListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Member[];
}

export interface MemberImportError {
  row: number;
  message: string;
}

export interface MemberImportResult {
  enrolled: number;
  errors: MemberImportError[];
}

export const batchesApi = {
  list: (eid: string) =>
    apiClient.get<Batch[]>(`/examinations/${eid}/batches`),

  get: (eid: string, bid: string) =>
    apiClient.get<Batch>(`/examinations/${eid}/batches/${bid}`),

  create: (eid: string, name: string) =>
    apiClient.post<Batch>(`/examinations/${eid}/batches`, { name }),

  update: (eid: string, bid: string, name: string) =>
    apiClient.patch<Batch>(`/examinations/${eid}/batches/${bid}`, { name }),

  delete: (eid: string, bid: string) =>
    apiClient.delete(`/examinations/${eid}/batches/${bid}`),

  listMembers: (eid: string, bid: string, params?: { search?: string; page?: number; page_size?: number }) =>
    apiClient.get<MemberListResponse>(`/examinations/${eid}/batches/${bid}/members`, { params }),

  enroll: (eid: string, bid: string, candidate_id: string, index_number: string) =>
    apiClient.post<Member>(`/examinations/${eid}/batches/${bid}/members`, { candidate_id, index_number }),

  importMembers: (eid: string, bid: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<MemberImportResult>(
      `/examinations/${eid}/batches/${bid}/members/import`,
      form,
      { headers: { "Content-Type": undefined } },
    );
  },

  unenroll: (eid: string, bid: string, mid: string) =>
    apiClient.delete(`/examinations/${eid}/batches/${bid}/members/${mid}`),

  exportMembers: (eid: string, bid: string, format: "csv" | "xlsx" = "csv") =>
    apiClient.get(`/examinations/${eid}/batches/${bid}/members/export?format=${format}`, {
      responseType: "blob",
    }),
};

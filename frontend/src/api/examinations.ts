import { apiClient } from "./client";
import type { Exam } from "./exams";

export interface Examination {
  id: string;
  title: string;
  description: string | null;
  exam_date: string | null;
  status: "draft" | "active" | "closed";
  created_at: string;
  updated_at: string;
}

export interface SubjectOut {
  id: string;
  examination_id: string;
  name: string;
  display_order: number;
}

export interface SubjectWithPapers extends SubjectOut {
  papers: Exam[];
}

export interface ExaminationDetail extends Examination {
  subjects: SubjectWithPapers[];
  subject_count: number;
  paper_count: number;
}

export interface ExaminationCreate {
  title: string;
  description?: string;
  exam_date?: string;
  status?: string;
}

export interface SubjectCreate {
  name: string;
  display_order?: number;
}

export const examinationsApi = {
  list: () => apiClient.get<Examination[]>("/examinations"),

  get: (eid: string) => apiClient.get<ExaminationDetail>(`/examinations/${eid}`),

  create: (data: ExaminationCreate) =>
    apiClient.post<Examination>("/examinations", data),

  update: (eid: string, data: Partial<ExaminationCreate>) =>
    apiClient.patch<Examination>(`/examinations/${eid}`, data),

  delete: (eid: string) => apiClient.delete(`/examinations/${eid}`),

  transition: (eid: string, target_status: "active" | "closed") =>
    apiClient.post<Examination>(`/examinations/${eid}/transition`, { target_status }),

  listSubjects: (eid: string) =>
    apiClient.get<SubjectOut[]>(`/examinations/${eid}/subjects`),

  addSubject: (eid: string, data: SubjectCreate) =>
    apiClient.post<SubjectOut>(`/examinations/${eid}/subjects`, data),

  updateSubject: (eid: string, sid: string, data: Partial<SubjectCreate>) =>
    apiClient.patch<SubjectOut>(`/examinations/${eid}/subjects/${sid}`, data),

  deleteSubject: (eid: string, sid: string) =>
    apiClient.delete(`/examinations/${eid}/subjects/${sid}`),

  listPapers: (eid: string, sid: string) =>
    apiClient.get<Exam[]>(`/examinations/${eid}/subjects/${sid}/papers`),

  linkCandidates: (eid: string) =>
    apiClient.post<{
      linked: number;
      skipped: { paper: string; index_number: string; reason: string }[];
    }>(`/examinations/${eid}/results/link-candidates`),
};

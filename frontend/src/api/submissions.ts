import { apiClient } from "./client";

export interface Submission {
  id: string;
  exam_id: string;
  index_number: string | null;
  status: string;
  raw_answers: Record<string, unknown> | null;
  error_stage: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface BatchResult {
  filename: string;
  submission_id?: string;
  status: string;
  index_number?: string;
  error_stage?: string;
  error_message?: string;
}

export const submissionsApi = {
  upload: (examId: string, file: File, digitCount: number = 8, digitOrientation: string = "vertical") => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<Submission>(
      `/exams/${examId}/submissions?digit_count=${digitCount}&digit_orientation=${digitOrientation}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },

  batchUpload: (examId: string, files: File[], digitCount: number = 8, digitOrientation: string = "vertical") => {
    const form = new FormData();
    for (const f of files) form.append("files", f);
    return apiClient.post<{ results: BatchResult[] }>(
      `/exams/${examId}/submissions/batch?digit_count=${digitCount}&digit_orientation=${digitOrientation}`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
  },

  list: (examId: string) =>
    apiClient.get<Submission[]>(`/exams/${examId}/submissions`),

  get: (examId: string, submissionId: string) =>
    apiClient.get<Submission>(`/exams/${examId}/submissions/${submissionId}`),

  reprocess: (examId: string, submissionId: string) =>
    apiClient.post<Submission>(
      `/exams/${examId}/submissions/${submissionId}/reprocess`
    ),

  downloadImage: (examId: string, submissionId: string) =>
    apiClient.get(`/exams/${examId}/submissions/${submissionId}/image`, { responseType: "blob" }),
};

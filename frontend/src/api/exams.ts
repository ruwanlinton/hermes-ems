import { apiClient } from "./client";

export interface Exam {
  id: string;
  title: string;
  name: string | null;
  question_type: string | null;
  exam_date: string | null;
  total_questions: number;
  status: string;
  pass_mark: number;
  subject_id: string | null;
  // Populated only by GET /exams/{id}
  subject_name: string | null;
  examination_id: string | null;
  examination_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  question_number: number;
  question_type: "type1" | "type2";
  text: string | null;
}

export interface AnswerKey {
  id: string;
  question_id: string;
  correct_option: string | null;
  sub_options: Record<string, boolean> | null;
}

export interface ExamCreate {
  title: string;
  name: string;
  exam_date?: string;
  total_questions?: number;
  status?: string;
  pass_mark?: number;
  subject_id?: string;
}

export interface QuestionCreate {
  question_number: number;
  question_type: "type1" | "type2";
  text?: string;
}

export const examsApi = {
  list: () => apiClient.get<Exam[]>("/exams"),
  get: (id: string) => apiClient.get<Exam>(`/exams/${id}`),
  create: (data: ExamCreate) => apiClient.post<Exam>("/exams", data),
  update: (id: string, data: Partial<ExamCreate>) =>
    apiClient.patch<Exam>(`/exams/${id}`, data),
  delete: (id: string) => apiClient.delete(`/exams/${id}`),

  listQuestions: (examId: string) =>
    apiClient.get<Question[]>(`/exams/${examId}/questions`),
  bulkCreateQuestions: (examId: string, questions: QuestionCreate[]) =>
    apiClient.post<Question[]>(`/exams/${examId}/questions/bulk`, { questions }),

  getAnswerKey: (examId: string) =>
    apiClient.get<AnswerKey[]>(`/exams/${examId}/answer-key`),
  upsertAnswerKey: (
    examId: string,
    answers: { question_id: string; correct_option?: string; sub_options?: Record<string, boolean> }[]
  ) => apiClient.post<AnswerKey[]>(`/exams/${examId}/answer-key`, { answers }),

  generateSheets: (
    examId: string,
    idMode: string,
    csvFile?: File,
    digitCount: number = 8,
    digitOrientation: string = "vertical",
    includeSubject: boolean = true,
    includeDate: boolean = true,
    includeRegNo: boolean = true,
    batchId?: string,
  ) => {
    const params = new URLSearchParams({
      id_mode: idMode,
      digit_count: String(digitCount),
      digit_orientation: digitOrientation,
      include_subject: String(includeSubject),
      include_date: String(includeDate),
      include_reg_no: String(includeRegNo),
    });
    if (batchId) params.set("batch_id", batchId);
    if (csvFile) {
      const form = new FormData();
      form.append("csv_file", csvFile);
      return apiClient.post(`/exams/${examId}/sheets/generate?${params}`, form, {
        headers: { "Content-Type": undefined },
        responseType: "blob",
      });
    }
    return apiClient.post(`/exams/${examId}/sheets/generate?${params}`, null, {
      responseType: "blob",
    });
  },
};

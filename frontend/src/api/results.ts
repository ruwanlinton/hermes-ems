import { apiClient } from "./client";

export interface Result {
  id: string;
  exam_id: string;
  index_number: string;
  score: number;
  percentage: number;
  question_scores: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionDetail {
  question_number: number;
  question_type: "type1" | "type2";
  marked: string | Record<string, boolean> | null;
  correct: string | Record<string, boolean> | null;
  score: number;
}

export interface ResultDetail {
  index_number: string;
  score: number;
  percentage: number;
  questions: QuestionDetail[];
}

export interface ResultSummary {
  exam_id: string;
  total_candidates: number;
  mean_score: number;
  mean_percentage: number;
  highest_score: number;
  lowest_score: number;
  pass_count: number;
  fail_count: number;
  pass_percentage: number;
  distribution: { range: string; count: number }[];
}

export const resultsApi = {
  list: (examId: string) =>
    apiClient.get<Result[]>(`/exams/${examId}/results`),

  summary: (examId: string, passMark = 50) =>
    apiClient.get<ResultSummary>(`/exams/${examId}/results/summary`, {
      params: { pass_mark: passMark },
    }),

  detail: (examId: string, indexNumber: string) =>
    apiClient.get<ResultDetail>(`/exams/${examId}/results/${encodeURIComponent(indexNumber)}/detail`),

  export: (examId: string, format: "csv" | "xlsx") =>
    apiClient.get(`/exams/${examId}/results/export`, {
      params: { format },
      responseType: "blob",
    }),
};

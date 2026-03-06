import { apiClient } from "./client";
import { API_BASE_URL } from "../auth/authConfig";

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

  exportUrl: (examId: string, format: "csv" | "xlsx") =>
    `${API_BASE_URL}/api/v1/exams/${examId}/results/export?format=${format}`,
};

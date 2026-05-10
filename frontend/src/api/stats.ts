import { apiClient } from "./client";

export interface QuestionStat {
  question_number: number;
  question_type: string;
  total_responses: number;
  correct: number;
  wrong: number;
  multiple: number;
  unanswered: number;
  correct_rate: number;
}

export interface PaperStat {
  paper_id: string;
  title: string;
  total_candidates: number;
  pass_count: number;
  pass_rate: number;
  mean_percentage: number;
}

export interface SubjectStat {
  subject_id: string;
  subject_name: string;
  papers: PaperStat[];
}

export interface ExaminationStats {
  examination_id: string;
  title: string;
  status: string;
  total_enrolled_candidates: number;
  subjects: SubjectStat[];
}

export interface SubjectStats {
  subject_id: string;
  subject_name: string;
  examination_id: string;
  papers: PaperStat[];
}

export interface CandidateInfo {
  id: string;
  registration_number: string;
  name: string;
}

export interface CandidatePaperResult {
  paper_id: string;
  title: string;
  score: number;
  percentage: number;
  passed: boolean;
  pass_mark: number;
}

export interface CandidateExaminationResult {
  examination_id: string;
  title: string;
  papers: CandidatePaperResult[];
  overall_percentage: number;
}

export interface CandidatePerformance {
  candidate: CandidateInfo;
  examinations: CandidateExaminationResult[];
}

export const statsApi = {
  questionStats: (examId: string) =>
    apiClient.get<QuestionStat[]>(`/exams/${examId}/results/question-stats`),

  subjectStats: (eid: string, sid: string) =>
    apiClient.get<SubjectStats>(`/examinations/${eid}/subjects/${sid}/stats`),

  examinationStats: (eid: string) =>
    apiClient.get<ExaminationStats>(`/examinations/${eid}/stats`),

  candidatePerformance: (candidateId: string) =>
    apiClient.get<CandidatePerformance>(`/candidates/${candidateId}/performance`),
};

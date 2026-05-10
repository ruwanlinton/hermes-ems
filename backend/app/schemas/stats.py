from pydantic import BaseModel


class QuestionStat(BaseModel):
    question_number: int
    question_type: str
    total_responses: int
    correct: int
    wrong: int
    multiple: int
    unanswered: int
    correct_rate: float


class PaperStat(BaseModel):
    paper_id: str
    title: str
    total_candidates: int
    pass_count: int
    pass_rate: float
    mean_percentage: float


class SubjectStat(BaseModel):
    subject_id: str
    subject_name: str
    papers: list[PaperStat]


class ExaminationStats(BaseModel):
    examination_id: str
    title: str
    status: str
    total_enrolled_candidates: int
    subjects: list[SubjectStat]


class SubjectStats(BaseModel):
    subject_id: str
    subject_name: str
    examination_id: str
    papers: list[PaperStat]


class CandidateInfo(BaseModel):
    id: str
    registration_number: str
    name: str


class CandidatePaperResult(BaseModel):
    paper_id: str
    title: str
    score: float
    percentage: float
    passed: bool
    pass_mark: float


class CandidateExaminationResult(BaseModel):
    examination_id: str
    title: str
    papers: list[CandidatePaperResult]
    overall_percentage: float


class CandidatePerformance(BaseModel):
    candidate: CandidateInfo
    examinations: list[CandidateExaminationResult]

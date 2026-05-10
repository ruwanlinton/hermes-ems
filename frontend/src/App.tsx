import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthGuard } from "./auth/AuthGuard";

import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ExamsPage } from "./pages/ExamsPage";
import { ExamCreatePage } from "./pages/ExamCreatePage";
import { ExamDetailPage } from "./pages/ExamDetailPage";
import { SheetGeneratorPage } from "./pages/SheetGeneratorPage";
import { UploadPage } from "./pages/UploadPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { ResultsPage } from "./pages/ResultsPage";
import { ResultDetailPage } from "./pages/ResultDetailPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { CandidatesPage } from "./pages/CandidatesPage";
import { CandidateDetailPage } from "./pages/CandidateDetailPage";
import { CandidateCreatePage } from "./pages/CandidateCreatePage";
import { ExaminationsPage } from "./pages/ExaminationsPage";
import { ExaminationCreatePage } from "./pages/ExaminationCreatePage";
import { ExaminationDetailPage } from "./pages/ExaminationDetailPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/exams" element={<AuthGuard><ExamsPage /></AuthGuard>} />
        <Route path="/exams/new" element={<AuthGuard><ExamCreatePage /></AuthGuard>} />
        <Route path="/exams/:id" element={<AuthGuard><ExamDetailPage /></AuthGuard>} />
        <Route path="/exams/:id/sheets" element={<AuthGuard><SheetGeneratorPage /></AuthGuard>} />
        <Route path="/exams/:id/upload" element={<AuthGuard><UploadPage /></AuthGuard>} />
        <Route path="/exams/:id/submissions" element={<AuthGuard><SubmissionsPage /></AuthGuard>} />
        <Route path="/exams/:id/results" element={<AuthGuard><ResultsPage /></AuthGuard>} />
        <Route path="/exams/:id/results/:indexNumber" element={<AuthGuard><ResultDetailPage /></AuthGuard>} />
        <Route path="/examinations" element={<AuthGuard><ExaminationsPage /></AuthGuard>} />
        <Route path="/examinations/new" element={<AuthGuard><ExaminationCreatePage /></AuthGuard>} />
        <Route path="/examinations/:eid" element={<AuthGuard><ExaminationDetailPage /></AuthGuard>} />
        <Route path="/candidates" element={<AuthGuard><CandidatesPage /></AuthGuard>} />
        <Route path="/candidates/new" element={<AuthGuard><CandidateCreatePage /></AuthGuard>} />
        <Route path="/candidates/:id" element={<AuthGuard><CandidateDetailPage /></AuthGuard>} />
        <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path="/profile" element={<AuthGuard><ProfilePage /></AuthGuard>} />
        <Route path="/admin/users" element={<AuthGuard><UserManagementPage /></AuthGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

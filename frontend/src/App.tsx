import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthContext } from "@asgardeo/auth-react";

import { setupAuthInterceptor } from "./api/client";
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
import { SettingsPage } from "./pages/SettingsPage";

export function App() {
  const { getAccessToken } = useAuthContext();

  useEffect(() => {
    setupAuthInterceptor(getAccessToken);
  }, [getAccessToken]);

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
        <Route path="/settings" element={<AuthGuard><SettingsPage /></AuthGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

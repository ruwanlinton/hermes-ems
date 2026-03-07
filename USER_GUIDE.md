# SLMC OMR System — User Guide

Sri Lanka Medical Council Optical Mark Recognition (OMR) Examination Management System

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started — Login](#getting-started--login)
3. [Dashboard](#dashboard)
4. [Creating an Exam](#creating-an-exam)
5. [Managing Answer Keys](#managing-answer-keys)
6. [Generating OMR Answer Sheets](#generating-omr-answer-sheets)
7. [Uploading Scanned Sheets](#uploading-scanned-sheets)
8. [Viewing Submissions](#viewing-submissions)
9. [Viewing Results](#viewing-results)
10. [OMR Answer Sheet Layout](#omr-answer-sheet-layout)
11. [Filling in the OMR Sheet (Candidate Instructions)](#filling-in-the-omr-sheet-candidate-instructions)

---

## Overview

The SLMC OMR System digitises the examination marking process for Sri Lanka Medical Council exams. Examiners create exams, generate personalised bubble-sheet answer sheets (one per candidate), scan the completed sheets after the exam, and obtain automated grading with per-candidate results and statistics.

**Two question types are supported:**

| Type | Format | Marking |
|------|--------|---------|
| Type 1 — Single Best Answer | Candidate circles **one** option (A–E) per question | 1 mark for correct answer |
| Type 2 — Extended True/False | Candidate marks **T or F** for each sub-option (A–E) per question | Marked per sub-option |

---

## Getting Started — Login

1. Open the application URL in your browser (default: `http://localhost:5173`).
2. You will be shown the SLMC login page.
3. Click **Sign in with Asgardeo** to authenticate via the SLMC identity provider.
4. After successful authentication you are redirected to the Dashboard.

> Only users who have been provisioned in the SLMC Asgardeo organisation can log in.

---

## Dashboard

The Dashboard provides a summary of all exams and quick navigation.

- **Stat cards** at the top show counts by exam status: Draft, Active, Closed, Archived.
- **Exam list** below shows all exams with their status, question type, and question count.
- Click any exam card to open the Exam Detail page.
- Click **Create New Exam** (top right) to start a new exam.

---

## Creating an Exam

Click **Create New Exam** from the Dashboard. Exam creation is a three-step wizard.

### Step 1 — Basic Information

| Field | Description |
|-------|-------------|
| Exam Title | Full name of the examination (e.g., "SLMC Licensing Examination 2025 — Part I") |
| Exam Date | Date the examination will be held |
| Description | Optional notes visible to administrators only |

Click **Next** to proceed.

### Step 2 — Questions

| Field | Description |
|-------|-------------|
| Question Type | Select **Type 1 (Single Best Answer)** or **Type 2 (Extended True/False)** — an exam uses one type only |
| Number of Questions | Total number of questions in the exam |

Click **Next** to proceed.

### Step 3 — Review & Submit

Review all details. Click **Create Exam** to save. The exam is created in **Draft** status.

After creation you are taken to the Exam Detail page.

---

## Managing Answer Keys

Before sheets can be graded, the correct answers must be entered.

1. Open the Exam Detail page.
2. Click **Manage Answer Key**.
3. For each question enter the correct answer:
   - **Type 1**: Select A, B, C, D, or E.
   - **Type 2**: For each sub-option (A–E) select T (True) or F (False).
4. Click **Save Answer Key**.

> The answer key can be updated at any time before grading. Re-uploading sheets after an answer key change will re-grade submissions automatically.

---

## Generating OMR Answer Sheets

Each candidate receives a personalised answer sheet with their index number encoded in a QR code.

1. Open the Exam Detail page.
2. Click **Generate Sheets**.
3. Upload a CSV file containing candidate index numbers. The CSV must have one index number per row (no header required):

   ```
   2025/MED/001
   2025/MED/002
   2025/MED/003
   ```

4. Click **Generate PDF**. The system produces a multi-page PDF — one page per candidate.
5. Download and print the PDF. Each page is A4.

> Print at 100% scale (do not scale to fit). Use a printer that produces sharp, high-contrast output.

---

## Uploading Scanned Sheets

After the examination, collect completed answer sheets and scan them.

**Scanning requirements:**

- Resolution: **300 DPI minimum** (600 DPI recommended)
- Colour: Greyscale or black-and-white
- Format: PDF or image files (PNG, JPG)
- Ensure all four alignment marks (corner squares) are visible and not cropped

**Upload steps:**

1. Open the Exam Detail page.
2. Click **Upload Sheets**.
3. Drag and drop scanned files onto the upload area, or click to browse.
4. Multiple files can be uploaded in one batch.
5. Click **Process**. The system will:
   - Detect alignment marks and correct perspective
   - Read the QR code to identify the candidate and exam
   - Detect filled bubbles
   - Grade against the saved answer key
6. Progress is shown per file. Completed sheets appear in the Submissions list.

---

## Viewing Submissions

1. Open the Exam Detail page.
2. Click **Submissions** (or scroll to the submissions section).
3. Each row shows: index number, score, total marks, percentage, and processing status.
4. Submissions with status **Error** could not be processed (QR unreadable, sheet damaged, etc.). Click the row for details.
5. Use **Reprocess** on an individual submission to re-run detection (useful after correcting an answer key or adjusting the fill threshold).

---

## Viewing Results

1. Open the Exam Detail page.
2. Click **Results**.
3. The results page shows:
   - Score distribution chart
   - Pass/fail breakdown
   - Per-candidate table (index number, score, percentage, pass/fail)
4. Use the **Pass Mark** slider to adjust the passing threshold and see the breakdown update in real time.
5. Click **Export CSV** to download the full results table for reporting.

---

## OMR Answer Sheet Layout

### Header Area (top of page)

- SLMC logo and exam title
- Candidate index number and exam date
- QR code (top-left corner) — do not cover, fold, or damage

### Alignment Marks

Four solid black squares in the corners of the page. These are used by the scanning software to correct sheet orientation and perspective. Do not mark over them.

### Section A — Type 1 Questions (Single Best Answer)

Questions are arranged in **three columns** across the page.

- Column headers show **A B C D E** above each column.
- Each row shows the question number (zero-padded, e.g. 01, 02 … 60) followed by five bubbles.
- Candidate fills **one** bubble per row.

### Section B — Type 2 Questions (Extended True/False)

Questions are arranged in **four columns** across the page, with up to **15 questions per column**.

- Column headers show **A B C D E** above each column.
- Each question occupies a block of two rows: **T** (True) and **F** (False).
- Candidate fills one bubble in the T row and one in the F row for each sub-option.

### Footer

Instructions for candidates are printed at the bottom of the sheet.

---

## Filling in the OMR Sheet (Candidate Instructions)

> The following section is intended to be communicated to examination candidates.

1. **Use a black or dark blue ballpoint pen.** Do not use pencil or felt-tip markers.
2. **Fill bubbles completely and darkly.** The entire circle must be filled — partially filled bubbles may not be detected.
3. **One bubble per question (Section A).** If you change your answer, cross out the old bubble completely and fill the new one.
4. **Two bubbles per sub-option (Section B)** — one in the T row and one in the F row for each letter A–E.
5. **Do not make stray marks** anywhere on the sheet, especially near the bubbles, QR code, or corner alignment marks.
6. **Do not fold, crease, or damage the sheet.** Damaged sheets may not be processable.
7. Write your index number in the header area only if requested by the invigilator — it is already encoded in the QR code.

---

*For technical support, contact the SLMC ICT division.*

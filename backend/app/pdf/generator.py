"""
ReportLab-based OMR answer sheet generator.
Produces A4 PDF with alignment marks, QR code, header, bubble grids.
"""
import io
import json
from typing import Optional
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas
import qrcode
from PIL import Image

from .layout_constants import (
    ALIGN_MARK_SIZE_MM, ALIGN_MARKS_MM,
    QR_SIZE_MM, QR_TOP_MM, QR_LEFT_MM,
    HEADER_TOP_MM, HEADER_LEFT_MM, HEADER_RIGHT_MM,
    BUBBLE_DIAMETER_MM, BUBBLE_SPACING_MM,
    SECTION_A_TOP_MM, SECTION_A_LEFT_MM, SECTION_A_COL2_LEFT_MM, SECTION_A_COL3_LEFT_MM, SECTION_A_ROW_HEIGHT_MM,
    SECTION_B_LEFT_MM, SECTION_B_COL2_LEFT_MM, SECTION_B_BLOCK_HEIGHT_MM,
    SECTION_B_ROW_LABELS, OPTIONS_TYPE1, OPTIONS_TYPE2,
    PAGE_H_MM,
)

PAGE_WIDTH, PAGE_HEIGHT = A4  # in points


def _mm_to_pt(mm_val: float) -> float:
    return mm_val * mm


def _y(y_mm: float) -> float:
    """Convert top-based mm coordinate to ReportLab bottom-based pt coordinate."""
    return PAGE_HEIGHT - _mm_to_pt(y_mm)


def _generate_qr_image(data: dict) -> Image.Image:
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=0,
    )
    qr.add_data(json.dumps(data, separators=(",", ":")))
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").get_image()


def _draw_alignment_marks(c: canvas.Canvas) -> None:
    c.setFillColor(colors.black)
    for key, (x_mm, y_mm) in ALIGN_MARKS_MM.items():
        x_pt = _mm_to_pt(x_mm)
        y_pt = _y(y_mm + ALIGN_MARK_SIZE_MM)
        w_pt = _mm_to_pt(ALIGN_MARK_SIZE_MM)
        h_pt = _mm_to_pt(ALIGN_MARK_SIZE_MM)
        c.rect(x_pt, y_pt, w_pt, h_pt, stroke=0, fill=1)


def _draw_qr(c: canvas.Canvas, exam_id: str, index_number: str) -> None:
    data = {"exam_id": exam_id, "index_number": index_number}
    img = _generate_qr_image(data)

    # Save QR to buffer
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    x_pt = _mm_to_pt(QR_LEFT_MM)
    y_pt = _y(QR_TOP_MM + QR_SIZE_MM)
    size_pt = _mm_to_pt(QR_SIZE_MM)
    c.drawImage(
        ImageReader(buf),
        x_pt, y_pt, width=size_pt, height=size_pt,
        preserveAspectRatio=True,
    )


def _draw_header(c: canvas.Canvas, exam_title: str, index_number: str, exam_date: str) -> None:
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(
        PAGE_WIDTH / 2,
        _y(HEADER_TOP_MM),
        "SRI LANKA MEDICAL COUNCIL",
    )
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(PAGE_WIDTH / 2, _y(HEADER_TOP_MM + 7), exam_title)

    c.setFont("Helvetica", 10)
    y_detail = _y(HEADER_TOP_MM + 14)
    c.drawString(_mm_to_pt(HEADER_LEFT_MM), y_detail, f"Index No: {index_number}")
    c.drawString(_mm_to_pt(120), y_detail, f"Date: {exam_date}")

    # Horizontal separator
    c.setLineWidth(0.5)
    c.line(
        _mm_to_pt(HEADER_LEFT_MM), _y(HEADER_TOP_MM + 20),
        _mm_to_pt(HEADER_RIGHT_MM), _y(HEADER_TOP_MM + 20),
    )


def _draw_bubble(c: canvas.Canvas, cx_mm: float, cy_mm: float, filled: bool = False) -> None:
    """Draw a circle bubble at center (cx_mm, cy_mm) in mm coords."""
    r_pt = _mm_to_pt(BUBBLE_DIAMETER_MM / 2)
    cx_pt = _mm_to_pt(cx_mm)
    cy_pt = _y(cy_mm)
    if filled:
        c.setFillColor(colors.black)
        c.circle(cx_pt, cy_pt, r_pt, stroke=1, fill=1)
    else:
        c.setFillColor(colors.white)
        c.setStrokeColor(colors.black)
        c.setLineWidth(0.5)
        c.circle(cx_pt, cy_pt, r_pt, stroke=1, fill=0)


def _draw_section_a(
    c: canvas.Canvas,
    type1_questions: list[dict],
) -> float:
    """Draw Type 1 bubble grid in 3 columns. Returns the y_mm below the last row."""
    import math

    c.setFont("Helvetica-Bold", 10)
    c.drawString(
        _mm_to_pt(SECTION_A_LEFT_MM),
        _y(SECTION_A_TOP_MM - 6),
        "SECTION A — Single Best Answer (circle ONE option per question)",
    )

    if not type1_questions:
        return SECTION_A_TOP_MM + 10

    questions_per_col = math.ceil(len(type1_questions) / 3)
    col_starts = [SECTION_A_LEFT_MM, SECTION_A_COL2_LEFT_MM, SECTION_A_COL3_LEFT_MM]
    row_h = SECTION_A_ROW_HEIGHT_MM
    bubble_r = BUBBLE_DIAMETER_MM / 2
    options = OPTIONS_TYPE1

    # Draw A-E column headers once per column
    header_y_mm = SECTION_A_TOP_MM + 3
    for col_x in col_starts:
        for j, opt in enumerate(options):
            cx = col_x + 10 + j * BUBBLE_SPACING_MM
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(_mm_to_pt(cx), _y(header_y_mm), opt)

    max_y_mm = SECTION_A_TOP_MM

    for i, q in enumerate(type1_questions):
        col = min(i // questions_per_col, 2)
        row = i % questions_per_col

        x_start = col_starts[col]
        y_center = SECTION_A_TOP_MM + 8 + row * row_h

        if y_center > max_y_mm:
            max_y_mm = y_center

        # Question number label
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(
            _mm_to_pt(x_start + 6),
            _y(y_center + 1.5),
            f"{int(q['question_number']):02d}.",
        )

        # Bubbles A-E
        for j in range(len(options)):
            cx = x_start + 10 + j * BUBBLE_SPACING_MM
            _draw_bubble(c, cx, y_center)

    return max_y_mm + row_h + 5


def _draw_section_b(
    c: canvas.Canvas,
    type2_questions: list[dict],
    start_y_mm: float,
    questions_per_col: int = 15,
) -> float:
    """Draw Type 2 True/False grid. Returns y_mm below last block."""
    c.setFont("Helvetica-Bold", 10)
    c.drawString(
        _mm_to_pt(SECTION_B_LEFT_MM),
        _y(start_y_mm - 6),
        "SECTION B — Extended True/False (mark T or F for each sub-option)",
    )

    col_starts = [SECTION_B_LEFT_MM, SECTION_B_COL2_LEFT_MM]
    block_h = SECTION_B_BLOCK_HEIGHT_MM
    bubble_r = BUBBLE_DIAMETER_MM / 2

    max_y_mm = start_y_mm

    for i, q in enumerate(type2_questions):
        col = 0 if i < questions_per_col else 1
        row = i if i < questions_per_col else i - questions_per_col

        x_start = col_starts[col]
        y_top = start_y_mm + 5 + row * block_h

        if y_top + block_h > max_y_mm:
            max_y_mm = y_top + block_h

        # Question number label
        c.setFont("Helvetica-Bold", 8)
        c.drawString(_mm_to_pt(x_start), _y(y_top + 4), f"Q{q['question_number']}")

        # Draw 2 rows (T, F) × 5 cols (A-E)
        for ri, label in enumerate(SECTION_B_ROW_LABELS):
            y_center = y_top + 6 + ri * 10

            # Row label
            c.setFont("Helvetica", 8)
            c.drawRightString(_mm_to_pt(x_start + 7), _y(y_center + bubble_r), label)

            for j, opt in enumerate(OPTIONS_TYPE2):
                cx = x_start + 10 + j * BUBBLE_SPACING_MM
                _draw_bubble(c, cx, y_center)
                if ri == 0:
                    # Option label above T row only
                    c.setFont("Helvetica", 6)
                    c.drawCentredString(_mm_to_pt(cx), _y(y_top + 1), opt)

    return max_y_mm + 5


def _draw_footer(c: canvas.Canvas) -> None:
    c.setFont("Helvetica", 7)
    instructions = (
        "INSTRUCTIONS: Use a black or dark blue ballpoint pen. Fill bubbles completely and darkly. "
        "Do not make stray marks. Do not fold or damage this sheet."
    )
    c.drawCentredString(
        PAGE_WIDTH / 2,
        _mm_to_pt(10),
        instructions,
    )


def generate_sheet(
    exam_id: str,
    exam_title: str,
    index_number: str,
    exam_date: str,
    type1_questions: list[dict],
    type2_questions: list[dict],
) -> bytes:
    """Generate a single OMR answer sheet PDF and return as bytes."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    _draw_alignment_marks(c)
    _draw_qr(c, exam_id, index_number)
    _draw_header(c, exam_title, index_number, exam_date)

    y_after_a = _draw_section_a(c, type1_questions)

    if type2_questions:
        _draw_section_b(c, type2_questions, y_after_a)

    _draw_footer(c)
    c.save()

    buf.seek(0)
    return buf.read()


def generate_batch_pdf(
    exam_id: str,
    exam_title: str,
    exam_date: str,
    index_numbers: list[str],
    type1_questions: list[dict],
    type2_questions: list[dict],
) -> bytes:
    """Generate a multi-page PDF with one sheet per index number."""
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    for idx, index_number in enumerate(index_numbers):
        if idx > 0:
            c.showPage()

        _draw_alignment_marks(c)
        _draw_qr(c, exam_id, index_number)
        _draw_header(c, exam_title, index_number, exam_date)

        y_after_a = _draw_section_a(c, type1_questions)
        if type2_questions:
            _draw_section_b(c, type2_questions, y_after_a)

        _draw_footer(c)

    c.save()
    buf.seek(0)
    return buf.read()

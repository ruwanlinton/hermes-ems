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
    SECTION_B_LEFT_MM, SECTION_B_COL2_LEFT_MM, SECTION_B_COL3_LEFT_MM, SECTION_B_COL4_LEFT_MM, SECTION_B_BLOCK_HEIGHT_MM,
    SECTION_B_BUBBLE_DIAMETER_MM, SECTION_B_BUBBLE_SPACING_MM,
    SECTION_B_ROW_LABELS, OPTIONS_TYPE1, OPTIONS_TYPE2,
    PAGE_H_MM,
    ID_GRID_DIGIT_COUNT, ID_GRID_BUBBLE_DIAMETER_MM, ID_GRID_CELL_H_MM, ID_GRID_CELL_W_MM,
    ID_GRID_LABEL_W_MM, ID_GRID_LABEL_GAP_MM, ID_GRID_HEADER_H_MM, ID_GRID_HEADER_GAP_MM,
    ID_GRID_TOP_MM, ID_GRID_LEFT_MM,
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

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    c.drawImage(
        ImageReader(buf),
        _mm_to_pt(QR_LEFT_MM), _y(QR_TOP_MM + QR_SIZE_MM),
        width=_mm_to_pt(QR_SIZE_MM), height=_mm_to_pt(QR_SIZE_MM),
        preserveAspectRatio=True,
    )


def _draw_id_digit_grid(
    c: canvas.Canvas,
    n_digits: int = ID_GRID_DIGIT_COUNT,
    orientation: str = "vertical",
) -> None:
    """Draw a digit bubble grid for manual index number entry (right side of header).

    orientation="vertical"   – columns = digit positions, rows = digit values 0-9 (default)
    orientation="horizontal" – rows = digit positions, columns = digit values 0-9
    """
    x0 = ID_GRID_LEFT_MM
    y0 = ID_GRID_TOP_MM
    n = min(max(n_digits, 1), 10)
    r_pt = _mm_to_pt(ID_GRID_BUBBLE_DIAMETER_MM / 2)

    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 7.9)
    c.drawString(_mm_to_pt(x0), _y(y0 - 6), "INDEX NUMBER")

    # Instruction text
    c.setFont("Helvetica", 6.0)
    if orientation == "horizontal":
        c.drawString(_mm_to_pt(x0), _y(y0 - 4), "Write each digit in the box to the left.")
        c.drawString(_mm_to_pt(x0), _y(y0 - 2.2), "Fill the matching bubble in the same row.")
    else:
        c.drawString(_mm_to_pt(x0), _y(y0 - 4), "Write each digit in the box above its column.")
        c.drawString(_mm_to_pt(x0), _y(y0 - 2.2), "Fill the matching bubble in the same column.")

    # Writing box dimensions
    box_w_v_mm = ID_GRID_CELL_W_MM - 1.0   # vertical: box width per column
    box_h_v_mm = ID_GRID_HEADER_H_MM - 1.0  # vertical: box height in header row
    box_w_h_mm = ID_GRID_LABEL_W_MM - 1.5   # horizontal: box width in label column
    box_h_h_mm = ID_GRID_CELL_H_MM - 1.0    # horizontal: box height per row

    if orientation == "horizontal":
        # Rows = digit positions (1..n), Columns = digit values (0..9)
        # Column headers: 0–9
        for col in range(10):
            cx_mm = x0 + ID_GRID_LABEL_W_MM + ID_GRID_LABEL_GAP_MM + col * ID_GRID_CELL_W_MM
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 7.9)
            c.drawCentredString(_mm_to_pt(cx_mm), _y(y0 + ID_GRID_HEADER_H_MM - 1), str(col))

        for row in range(n):
            cy_mm = y0 + ID_GRID_HEADER_H_MM + ID_GRID_HEADER_GAP_MM + row * ID_GRID_CELL_H_MM

            # Writing box on the left replacing the position number
            box_top_mm = cy_mm - box_h_h_mm / 2
            c.setFillColor(colors.white)
            c.setStrokeColor(colors.black)
            c.setLineWidth(0.5)
            c.rect(
                _mm_to_pt(x0 + 0.5),
                _y(box_top_mm + box_h_h_mm),
                _mm_to_pt(box_w_h_mm),
                _mm_to_pt(box_h_h_mm),
                stroke=1, fill=1,
            )

            # Bubbles for each digit value 0–9
            for col in range(10):
                cx_mm = x0 + ID_GRID_LABEL_W_MM + ID_GRID_LABEL_GAP_MM + col * ID_GRID_CELL_W_MM
                c.setFillColor(colors.white)
                c.setStrokeColor(colors.black)
                c.setLineWidth(0.4)
                c.circle(_mm_to_pt(cx_mm), _y(cy_mm), r_pt, stroke=1, fill=0)
    else:
        # Vertical (default): columns = digit positions, rows = digit values 0–9
        # Writing boxes at top of each column, replacing position number
        box_top_mm = y0 + 0.5
        for col in range(n):
            cx_mm = x0 + ID_GRID_LABEL_W_MM + ID_GRID_LABEL_GAP_MM + col * ID_GRID_CELL_W_MM
            box_left_mm = cx_mm - box_w_v_mm / 2
            c.setFillColor(colors.white)
            c.setStrokeColor(colors.black)
            c.setLineWidth(0.5)
            c.rect(
                _mm_to_pt(box_left_mm),
                _y(box_top_mm + box_h_v_mm),
                _mm_to_pt(box_w_v_mm),
                _mm_to_pt(box_h_v_mm),
                stroke=1, fill=1,
            )

        # Rows 0–9
        for row in range(10):
            cy_mm = y0 + ID_GRID_HEADER_H_MM + ID_GRID_HEADER_GAP_MM + row * ID_GRID_CELL_H_MM

            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 7.9)
            c.drawRightString(_mm_to_pt(x0 + ID_GRID_LABEL_W_MM - 1), _y(cy_mm + 0.8), str(row))

            for col in range(n):
                cx_mm = x0 + ID_GRID_LABEL_W_MM + ID_GRID_LABEL_GAP_MM + col * ID_GRID_CELL_W_MM
                c.setFillColor(colors.white)
                c.setStrokeColor(colors.black)
                c.setLineWidth(0.4)
                c.circle(_mm_to_pt(cx_mm), _y(cy_mm), r_pt, stroke=1, fill=0)


def _wrap_text(text: str, max_chars: int = 50) -> list[str]:
    """Break text into lines of at most max_chars, splitting at word boundaries."""
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}" if current else word
        if len(candidate) <= max_chars:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [text]


def _draw_fillable_fields(
    c: canvas.Canvas,
    x_left_mm: float,
    x_right_mm: float,
    y_start_mm: float,
    include_subject: bool = True,
    include_date: bool = True,
    include_reg_no: bool = True,
) -> float:
    """Draw optional Subject / Date / Reg. No fillable lines.
    Returns the y_mm position below the last drawn field."""
    label_font_size = 8
    line_w = 0.4
    row_gap = 6.5  # mm between field rows

    def _draw_field(label: str, lx: float, rx: float, fy: float) -> None:
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", label_font_size)
        c.drawString(_mm_to_pt(lx), _y(fy + 1.0), label)
        label_w_pt = c.stringWidth(label, "Helvetica-Bold", label_font_size)
        line_x0 = _mm_to_pt(lx) + label_w_pt + _mm_to_pt(1.5)
        line_x1 = _mm_to_pt(rx)
        line_y = _y(fy + 1.0) - 1.5
        c.setLineWidth(line_w)
        c.setStrokeColor(colors.black)
        c.line(line_x0, line_y, line_x1, line_y)

    y = y_start_mm
    if include_subject:
        _draw_field("Subject:", x_left_mm, x_right_mm, y)
        y += row_gap

    if include_date and include_reg_no:
        mid = x_left_mm + (x_right_mm - x_left_mm) * 0.45
        _draw_field("Date:", x_left_mm, mid, y)
        _draw_field("Reg. No:", x_left_mm + (x_right_mm - x_left_mm) * 0.52, x_right_mm, y)
        y += row_gap
    elif include_date:
        _draw_field("Date:", x_left_mm, x_right_mm, y)
        y += row_gap
    elif include_reg_no:
        _draw_field("Reg. No:", x_left_mm, x_right_mm, y)
        y += row_gap

    return y


def _draw_header(
    c: canvas.Canvas,
    exam_title: str,
    index_number: str,
    exam_date: str,
    grid_mode: bool = False,
    include_subject: bool = True,
    include_date: bool = True,
    include_reg_no: bool = True,
) -> None:
    c.setFillColor(colors.black)

    title_lines = _wrap_text(exam_title)
    title_line_h_mm = 5.0  # vertical spacing between wrapped title lines

    if grid_mode:
        center_x = _mm_to_pt(75)  # centre of left pane (25–125mm)
        top_y = ID_GRID_TOP_MM

        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(center_x, _y(top_y - 4), "SRI LANKA MEDICAL COUNCIL")

        c.setFont("Helvetica-Bold", 9)
        for i, line in enumerate(title_lines):
            c.drawCentredString(center_x, _y(top_y + 4 + i * title_line_h_mm), line)
        extra = (len(title_lines) - 1) * title_line_h_mm

        fields_end_y = _draw_fillable_fields(
            c, HEADER_LEFT_MM, 120.0, top_y + 12 + extra,
            include_subject=include_subject, include_date=include_date, include_reg_no=include_reg_no,
        )
    else:
        # Left-pane layout mirroring grid_mode — QR occupies the right pane
        center_x = _mm_to_pt(75)  # centre of left pane (25–125mm)
        top_y = QR_TOP_MM  # align with QR top

        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(center_x, _y(top_y - 4), "SRI LANKA MEDICAL COUNCIL")

        c.setFont("Helvetica-Bold", 9)
        for i, line in enumerate(title_lines):
            c.drawCentredString(center_x, _y(top_y + 4 + i * title_line_h_mm), line)
        extra = (len(title_lines) - 1) * title_line_h_mm

        # Pre-printed index number (personalised sheet)
        if index_number:
            c.setFont("Helvetica-Oblique", 8)
            c.drawCentredString(center_x, _y(top_y + 11 + extra), f"Index No: {index_number}")
            fields_start_y = top_y + 17 + extra
        else:
            fields_start_y = top_y + 12 + extra

        fields_end_y = _draw_fillable_fields(
            c, HEADER_LEFT_MM, 120.0, fields_start_y,
            include_subject=include_subject, include_date=include_date, include_reg_no=include_reg_no,
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

    if not type1_questions:
        return SECTION_A_TOP_MM

    c.setFont("Helvetica-Bold", 8)
    c.drawString(
        _mm_to_pt(SECTION_A_LEFT_MM),
        _y(SECTION_A_TOP_MM - 6),
        "Single Best Answer (circle ONE option per question)",
    )

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
) -> float:
    """Draw Type 2 True/False grid in 3 columns. Returns y_mm below last block."""
    import math

    c.setFont("Helvetica-Bold", 8)
    c.drawString(
        _mm_to_pt(SECTION_B_LEFT_MM),
        _y(start_y_mm - 6),
        "Extended True/False (mark T or F for each sub-option)",
    )

    if not type2_questions:
        return start_y_mm + 10

    questions_per_col = min(math.ceil(len(type2_questions) / 4), 15)
    col_starts = [SECTION_B_LEFT_MM, SECTION_B_COL2_LEFT_MM, SECTION_B_COL3_LEFT_MM, SECTION_B_COL4_LEFT_MM]
    block_h = SECTION_B_BLOCK_HEIGHT_MM
    bubble_r = BUBBLE_DIAMETER_MM / 2

    b_r = SECTION_B_BUBBLE_DIAMETER_MM / 2
    b_sp = SECTION_B_BUBBLE_SPACING_MM

    # Draw A-E column headers once per column
    header_y_mm = start_y_mm + 3
    for col_x in col_starts:
        for j, opt in enumerate(OPTIONS_TYPE2):
            cx = col_x + 10 + j * b_sp
            c.setFillColor(colors.black)
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(_mm_to_pt(cx), _y(header_y_mm), opt)

    max_y_mm = start_y_mm

    for i, q in enumerate(type2_questions):
        col = min(i // questions_per_col, 3)
        row = i % questions_per_col

        x_start = col_starts[col]
        y_top = start_y_mm + 8 + row * block_h

        if y_top + block_h > max_y_mm:
            max_y_mm = y_top + block_h

        # Question number label
        c.setFillColor(colors.black)
        c.setFont("Helvetica-Bold", 7)
        c.drawString(_mm_to_pt(x_start), _y(y_top + 2), f"{int(q['question_number']):02d}.")

        # Draw T and F rows (T at +2.5mm, F at +6.5mm within block)
        for ri, label in enumerate(SECTION_B_ROW_LABELS):
            y_center = y_top + 2.5 + ri * 5.0

            # Row label (T or F)
            c.setFillColor(colors.black)
            c.setFont("Helvetica", 6)
            c.drawRightString(_mm_to_pt(x_start + 6), _y(y_center + 1.0), label)

            r_pt = _mm_to_pt(b_r)
            for j in range(len(OPTIONS_TYPE2)):
                cx_mm = x_start + 10 + j * b_sp
                cx_pt = _mm_to_pt(cx_mm)
                cy_pt = _y(y_center)
                c.setFillColor(colors.white)
                c.setStrokeColor(colors.black)
                c.setLineWidth(0.4)
                c.circle(cx_pt, cy_pt, r_pt, stroke=1, fill=0)

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
    id_mode: str = "qr",
    digit_count: int = ID_GRID_DIGIT_COUNT,
    digit_orientation: str = "vertical",
    include_subject: bool = True,
    include_date: bool = True,
    include_reg_no: bool = True,
) -> bytes:
    """Generate a single OMR answer sheet PDF and return as bytes.

    id_mode:
      "qr"          – QR code only (default, personalised per candidate)
      "bubble_grid" – digit bubble grid only (blank template, candidate fills index number)
      "both"        – QR shifted left + digit bubble grid on the right
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    _draw_alignment_marks(c)

    if id_mode == "qr":
        _draw_qr(c, exam_id, index_number)
    elif id_mode == "both":
        _draw_qr(c, exam_id, index_number)
        _draw_id_digit_grid(c, digit_count, digit_orientation)
    elif id_mode == "bubble_grid":
        _draw_id_digit_grid(c, digit_count, digit_orientation)

    header_index = index_number if id_mode != "bubble_grid" else ""
    _draw_header(c, exam_title, header_index, exam_date, grid_mode=(id_mode == "bubble_grid"),
                 include_subject=include_subject, include_date=include_date, include_reg_no=include_reg_no)

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
    id_mode: str = "qr",
    digit_count: int = ID_GRID_DIGIT_COUNT,
    digit_orientation: str = "vertical",
    include_subject: bool = True,
    include_date: bool = True,
    include_reg_no: bool = True,
) -> bytes:
    """Generate a multi-page PDF with one sheet per index number.

    When id_mode=="bubble_grid", a single blank template page is generated
    regardless of index_numbers (all sheets are identical).
    """
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    pages = [""] if id_mode == "bubble_grid" else index_numbers

    for idx, index_number in enumerate(pages):
        if idx > 0:
            c.showPage()

        _draw_alignment_marks(c)

        if id_mode == "qr":
            _draw_qr(c, exam_id, index_number)
        elif id_mode == "both":
            _draw_qr(c, exam_id, index_number)
            _draw_id_digit_grid(c, digit_count, digit_orientation)
        elif id_mode == "bubble_grid":
            _draw_id_digit_grid(c, digit_count, digit_orientation)

        header_index = index_number if id_mode != "bubble_grid" else ""
        _draw_header(c, exam_title, header_index, exam_date, grid_mode=(id_mode == "bubble_grid"),
                     include_subject=include_subject, include_date=include_date, include_reg_no=include_reg_no)

        y_after_a = _draw_section_a(c, type1_questions)
        if type2_questions:
            _draw_section_b(c, type2_questions, y_after_a)

        _draw_footer(c)

    c.save()
    buf.seek(0)
    return buf.read()

"""Stage 4: Bubble Detection — extract fill ratios for each bubble cell."""
import numpy as np
import cv2
from typing import Optional

from app.pdf.layout_constants import (
    BUBBLE_DIAMETER_MM, BUBBLE_SPACING_MM,
    SECTION_A_TOP_MM, SECTION_A_LEFT_MM, SECTION_A_COL2_LEFT_MM, SECTION_A_COL3_LEFT_MM, SECTION_A_ROW_HEIGHT_MM,
    SECTION_B_LEFT_MM, SECTION_B_COL2_LEFT_MM, SECTION_B_COL3_LEFT_MM, SECTION_B_COL4_LEFT_MM, SECTION_B_BLOCK_HEIGHT_MM,
    SECTION_B_BUBBLE_DIAMETER_MM, SECTION_B_BUBBLE_SPACING_MM,
    OPTIONS_TYPE1, OPTIONS_TYPE2, SECTION_B_ROW_LABELS,
    ID_GRID_DIGIT_COUNT, ID_GRID_BUBBLE_DIAMETER_MM, ID_GRID_CELL_H_MM, ID_GRID_CELL_W_MM,
    ID_GRID_LABEL_W_MM, ID_GRID_LABEL_GAP_MM, ID_GRID_HEADER_H_MM, ID_GRID_HEADER_GAP_MM,
    ID_GRID_TOP_MM, ID_GRID_LEFT_MM,
    mm_to_px,
)


def _extract_bubble_region(img_gray: np.ndarray, cx_px: int, cy_px: int, r_px: int) -> np.ndarray:
    """Extract a square region around bubble center and create circular mask."""
    x0 = max(0, cx_px - r_px)
    y0 = max(0, cy_px - r_px)
    x1 = min(img_gray.shape[1], cx_px + r_px)
    y1 = min(img_gray.shape[0], cy_px + r_px)
    return img_gray[y0:y1, x0:x1]


def _fill_ratio(img_gray: np.ndarray, cx_px: int, cy_px: int, r_px: int) -> float:
    """Compute the fraction of dark pixels within the bubble circle."""
    patch = _extract_bubble_region(img_gray, cx_px, cy_px, r_px)
    if patch.size == 0:
        return 0.0
    _, binary = cv2.threshold(patch, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    dark_pixels = np.sum(binary > 0)
    total_pixels = patch.size
    return dark_pixels / total_pixels


def _mm_cx(x_start_mm: float, option_idx: int) -> int:
    """Compute pixel x-center for option bubble."""
    cx_mm = x_start_mm + 10 + option_idx * BUBBLE_SPACING_MM
    return mm_to_px(cx_mm)


def detect_type1_answers(
    img_gray: np.ndarray,
    type1_questions: list[dict],
    fill_threshold: float = 0.50,
) -> dict[str, Optional[str]]:
    """
    Detect filled bubbles for Type 1 questions (3-column layout).
    Returns {question_number_str: selected_option or None}.
    """
    import math

    if not type1_questions:
        return {}

    r_px = mm_to_px(BUBBLE_DIAMETER_MM / 2)
    questions_per_col = math.ceil(len(type1_questions) / 3)
    col_starts = [SECTION_A_LEFT_MM, SECTION_A_COL2_LEFT_MM, SECTION_A_COL3_LEFT_MM]
    answers = {}

    for i, q in enumerate(type1_questions):
        col = min(i // questions_per_col, 2)
        row = i % questions_per_col

        x_start = col_starts[col]
        cy_mm = SECTION_A_TOP_MM + 8 + row * SECTION_A_ROW_HEIGHT_MM
        cy_px = mm_to_px(cy_mm)

        filled = []
        for j, opt in enumerate(OPTIONS_TYPE1):
            cx_px = _mm_cx(x_start, j)
            ratio = _fill_ratio(img_gray, cx_px, cy_px, r_px)
            if ratio >= fill_threshold:
                filled.append(opt)

        q_num = str(q["question_number"])
        if len(filled) == 1:
            answers[q_num] = filled[0]
        elif len(filled) > 1:
            # Multiple filled — take the one with highest fill ratio
            ratios = [
                _fill_ratio(img_gray, _mm_cx(x_start, j), cy_px, r_px)
                for j, opt in enumerate(OPTIONS_TYPE1)
            ]
            answers[q_num] = OPTIONS_TYPE1[int(np.argmax(ratios))]
        else:
            answers[q_num] = None

    return answers


def detect_type2_answers(
    img_gray: np.ndarray,
    type2_questions: list[dict],
    fill_threshold: float = 0.50,
    section_b_top_mm: float = 185.0,
) -> dict[str, dict[str, bool]]:
    """
    Detect filled T/F bubbles for Type 2 questions (3-column layout).
    Returns {question_number_str: {A: bool, B: bool, C: bool, D: bool, E: bool}}.
    """
    import math

    if not type2_questions:
        return {}

    r_px = mm_to_px(SECTION_B_BUBBLE_DIAMETER_MM / 2)
    questions_per_col = min(math.ceil(len(type2_questions) / 4), 15)
    col_starts = [SECTION_B_LEFT_MM, SECTION_B_COL2_LEFT_MM, SECTION_B_COL3_LEFT_MM, SECTION_B_COL4_LEFT_MM]
    answers = {}

    for i, q in enumerate(type2_questions):
        col = min(i // questions_per_col, 3)
        row = i % questions_per_col

        x_start = col_starts[col]
        y_top = section_b_top_mm + 8 + row * SECTION_B_BLOCK_HEIGHT_MM

        q_answers = {}
        for j, opt in enumerate(OPTIONS_TYPE2):
            cx_px = mm_to_px(x_start + 10 + j * SECTION_B_BUBBLE_SPACING_MM)
            # T row at y_top + 2.5, F row at y_top + 6.5
            t_cy_px = mm_to_px(y_top + 2.5)
            t_ratio = _fill_ratio(img_gray, cx_px, t_cy_px, r_px)
            f_cy_px = mm_to_px(y_top + 6.5)
            f_ratio = _fill_ratio(img_gray, cx_px, f_cy_px, r_px)

            t_filled = t_ratio >= fill_threshold
            f_filled = f_ratio >= fill_threshold

            if t_filled and not f_filled:
                q_answers[opt] = True
            elif f_filled and not t_filled:
                q_answers[opt] = False
            elif t_filled and f_filled:
                q_answers[opt] = t_ratio >= f_ratio
            else:
                q_answers[opt] = False

        answers[str(q["question_number"])] = q_answers

    return answers


def detect_digit_grid(
    img_gray: np.ndarray,
    fill_threshold: float = 0.50,
) -> Optional[str]:
    """
    Detect filled bubbles in the ID digit bubble grid.
    Returns a zero-padded numeric string (e.g. "00012345") or None if
    any column has no filled bubble (ambiguous / unreadable).
    """
    r_px = mm_to_px(ID_GRID_BUBBLE_DIAMETER_MM / 2)
    digits = []

    for col in range(ID_GRID_DIGIT_COUNT):
        cx_mm = ID_GRID_LEFT_MM + ID_GRID_LABEL_W_MM + ID_GRID_LABEL_GAP_MM + col * ID_GRID_CELL_W_MM
        cx_px = mm_to_px(cx_mm)

        best_digit = None
        best_ratio = fill_threshold  # must exceed threshold to count

        for row in range(10):
            cy_mm = ID_GRID_TOP_MM + ID_GRID_HEADER_H_MM + ID_GRID_HEADER_GAP_MM + row * ID_GRID_CELL_H_MM
            cy_px = mm_to_px(cy_mm)
            ratio = _fill_ratio(img_gray, cx_px, cy_px, r_px)
            if ratio > best_ratio:
                best_ratio = ratio
                best_digit = row

        if best_digit is None:
            return None
        digits.append(str(best_digit))

    return "".join(digits)


def detect_all_answers(
    img: np.ndarray,
    type1_questions: list[dict],
    type2_questions: list[dict],
    fill_threshold: float = 0.50,
    section_b_top_mm: float = 185.0,
) -> dict:
    """
    Run bubble detection for all questions.
    Returns {
        "type1": {q_num: option or None},
        "type2": {q_num: {A: bool, ...}}
    }
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # Slight blur to reduce noise
    gray = cv2.GaussianBlur(gray, (3, 3), 0)

    type1_answers = detect_type1_answers(gray, type1_questions, fill_threshold)
    type2_answers = detect_type2_answers(gray, type2_questions, fill_threshold, section_b_top_mm)

    return {"type1": type1_answers, "type2": type2_answers}

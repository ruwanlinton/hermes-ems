"""
OMR Answer Sheet Layout Constants (A4 @ 300 DPI canonical space)

All measurements in millimeters unless noted.
A4: 210mm x 297mm  →  at 300 DPI: 2480px x 3508px

The PDF uses ReportLab points (1pt = 1/72 inch).
A4 in points: 595pt x 842pt

These constants define positions in millimeters from top-left of the page.
The OMR pipeline uses the same constants mapped to the canonical 2480x3508 pixel space.
"""

# --- Page dimensions ---
PAGE_W_MM = 210.0
PAGE_H_MM = 297.0

# --- Alignment marks (solid black squares 12x12mm at corners) ---
ALIGN_MARK_SIZE_MM = 12.0
ALIGN_MARK_INSET_MM = 10.0  # distance from page edge to mark corner

# Positions of alignment mark top-left corners (x, y from top-left)
ALIGN_MARKS_MM = {
    "top_left":     (ALIGN_MARK_INSET_MM, ALIGN_MARK_INSET_MM),
    "top_right":    (PAGE_W_MM - ALIGN_MARK_INSET_MM - ALIGN_MARK_SIZE_MM, ALIGN_MARK_INSET_MM),
    "bottom_left":  (ALIGN_MARK_INSET_MM, PAGE_H_MM - ALIGN_MARK_INSET_MM - ALIGN_MARK_SIZE_MM),
    "bottom_right": (PAGE_W_MM - ALIGN_MARK_INSET_MM - ALIGN_MARK_SIZE_MM,
                     PAGE_H_MM - ALIGN_MARK_INSET_MM - ALIGN_MARK_SIZE_MM),
}

# --- QR Code (30x30mm centered at top) ---
QR_SIZE_MM = 30.0
QR_TOP_MM = 25.0  # top edge of QR code from page top
QR_LEFT_MM = (PAGE_W_MM - QR_SIZE_MM) / 2.0  # centered

# --- Header section ---
HEADER_TOP_MM = 60.0    # top of header block
HEADER_LEFT_MM = 25.0
HEADER_RIGHT_MM = PAGE_W_MM - 25.0

# --- Bubble grid parameters ---
BUBBLE_DIAMETER_MM = 7.0
BUBBLE_SPACING_MM = 10.0   # center-to-center spacing

# Section A (Type 1: single best answer A-E)
SECTION_A_TOP_MM = 90.0
SECTION_A_LEFT_MM = 25.0
SECTION_A_COL2_LEFT_MM = 115.0  # x start of second column
SECTION_A_ROW_HEIGHT_MM = 10.0
OPTIONS_TYPE1 = ["A", "B", "C", "D", "E"]

# Section B (Type 2: True/False per sub-option A-E)
SECTION_B_TOP_MM = None  # computed dynamically based on number of type1 questions
SECTION_B_LEFT_MM = 25.0
SECTION_B_COL2_LEFT_MM = 115.0
SECTION_B_BLOCK_HEIGHT_MM = 22.0  # height of one Type2 question block (2 rows T/F)
SECTION_B_ROW_LABELS = ["T", "F"]
OPTIONS_TYPE2 = ["A", "B", "C", "D", "E"]

# --- Footer ---
FOOTER_BOTTOM_MM = 10.0  # distance from bottom of page

# --- Canonical pixel dimensions (300 DPI A4) ---
CANONICAL_W_PX = 2480
CANONICAL_H_PX = 3508
MM_TO_PX = CANONICAL_W_PX / PAGE_W_MM  # ~11.81 px/mm


def mm_to_px(mm: float) -> int:
    """Convert millimeters to pixels in canonical 300 DPI space."""
    return round(mm * MM_TO_PX)


def px_to_mm(px: float) -> float:
    """Convert pixels to millimeters from canonical space."""
    return px / MM_TO_PX

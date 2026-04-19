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

# --- QR Code (30x30mm, right side of header — same column as digit grid) ---
QR_SIZE_MM = 30.0
QR_TOP_MM = 20.0    # top edge of QR code (aligned with ID_GRID_TOP_MM)
QR_LEFT_MM = 138.0  # left edge of QR code (right pane, same area as digit grid)

# --- ID Digit Bubble Grid ---
# A 10-row (digits 0-9) × N-column (digit positions) bubble grid.
# Always placed on the right side of the header area.
ID_GRID_DIGIT_COUNT = 8       # number of digit columns (supports up to 99 999 999)
ID_GRID_BUBBLE_DIAMETER_MM = 3.306   # 2.5 * 1.15^2
ID_GRID_CELL_H_MM = 4.629     # 3.5 * 1.15^2 — row center-to-center spacing
ID_GRID_CELL_W_MM = 5.29      # 4.0 * 1.15^2 — column center-to-center spacing
ID_GRID_LABEL_W_MM = 7.935    # 6.0 * 1.15^2 — width of the "0"–"9" label column on the left
ID_GRID_LABEL_GAP_MM = 1.984  # 1.5 * 1.15^2 — horizontal gap between digit label and first bubble column
ID_GRID_HEADER_H_MM = 6.613   # 5.0 * 1.15^2 — height of the writing-box header row
ID_GRID_HEADER_GAP_MM = 1.984 # 1.5 * 1.15^2 — vertical gap between header and first bubble row
ID_GRID_TOP_MM = 20.0         # y of grid top from page top
ID_GRID_LEFT_MM = 135.0       # x of grid left edge (right side, all grid modes)

# --- Header section ---
HEADER_TOP_MM = 60.0    # top of header block
HEADER_LEFT_MM = 25.0
HEADER_RIGHT_MM = PAGE_W_MM - 25.0

# --- Bubble grid parameters ---
BUBBLE_DIAMETER_MM = 4.5
BUBBLE_SPACING_MM = 7.0   # center-to-center spacing

# Section B-specific bubble sizing (smaller to fit 60 questions on one page)
SECTION_B_BUBBLE_DIAMETER_MM = 3.8
SECTION_B_BUBBLE_SPACING_MM = 5.4

# Section A (Type 1: single best answer A-E)
SECTION_A_TOP_MM = 68.0
SECTION_A_LEFT_MM = 25.0
SECTION_A_COL2_LEFT_MM = 78.0   # x start of second column
SECTION_A_COL3_LEFT_MM = 131.0  # x start of third column
SECTION_A_ROW_HEIGHT_MM = 10.0
OPTIONS_TYPE1 = ["A", "B", "C", "D", "E"]

# Section B (Type 2: True/False per sub-option A-E)
SECTION_B_TOP_MM = None  # computed dynamically based on number of type1 questions
SECTION_B_LEFT_MM = 25.0
SECTION_B_COL2_LEFT_MM = 68.0
SECTION_B_COL3_LEFT_MM = 111.0
SECTION_B_COL4_LEFT_MM = 154.0
SECTION_B_BLOCK_HEIGHT_MM = 14.0   # height of one Type2 question block (2 rows T/F)
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

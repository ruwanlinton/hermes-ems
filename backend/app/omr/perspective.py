"""Stage 3: Perspective Correction — warp image to canonical A4 @ 300 DPI."""
import numpy as np
import cv2
from typing import Optional

from app.pdf.layout_constants import (
    CANONICAL_W_PX, CANONICAL_H_PX,
    ALIGN_MARK_SIZE_MM, ALIGN_MARK_INSET_MM,
    mm_to_px,
)

# Expected alignment mark area bounds in canonical space
ALIGN_MARK_PX = mm_to_px(ALIGN_MARK_SIZE_MM)
ALIGN_INSET_PX = mm_to_px(ALIGN_MARK_INSET_MM)

# Contour area bounds for alignment mark detection
MARK_AREA_MIN = 200
MARK_AREA_MAX = 30000  # allow for scale variation


class PerspectiveError(Exception):
    pass


def _is_square_ish(contour: np.ndarray, tolerance: float = 0.4) -> bool:
    """Check if contour is roughly square."""
    x, y, w, h = cv2.boundingRect(contour)
    if h == 0:
        return False
    ratio = w / h
    return (1 - tolerance) <= ratio <= (1 + tolerance)


def _find_alignment_marks(img: np.ndarray) -> Optional[np.ndarray]:
    """
    Detect 4 alignment mark centers in the image.
    Returns array of 4 points sorted as [TL, TR, BL, BR] or None.
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates = []
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if MARK_AREA_MIN <= area <= MARK_AREA_MAX and _is_square_ish(cnt):
            M = cv2.moments(cnt)
            if M["m00"] > 0:
                cx = int(M["m10"] / M["m00"])
                cy = int(M["m01"] / M["m00"])
                candidates.append((cx, cy, area))

    if len(candidates) < 4:
        return None

    # Sort by area descending and take largest 4 (most likely alignment marks)
    candidates.sort(key=lambda x: x[2], reverse=True)
    candidates = candidates[:4]

    points = np.array([(c[0], c[1]) for c in candidates], dtype=np.float32)

    # Sort into [TL, TR, BL, BR] based on coordinates
    centroid = points.mean(axis=0)
    tl = tr = bl = br = None
    for p in points:
        if p[0] < centroid[0] and p[1] < centroid[1]:
            tl = p
        elif p[0] >= centroid[0] and p[1] < centroid[1]:
            tr = p
        elif p[0] < centroid[0] and p[1] >= centroid[1]:
            bl = p
        else:
            br = p

    if any(x is None for x in [tl, tr, bl, br]):
        return None

    return np.array([tl, tr, bl, br], dtype=np.float32)


def correct_perspective(img: np.ndarray) -> np.ndarray:
    """
    Detect alignment marks and warp the image to canonical A4 @ 300 DPI.
    Falls back to simple resize if alignment marks not found.
    """
    src_points = _find_alignment_marks(img)

    if src_points is None:
        # Fallback: just resize to canonical dimensions
        return cv2.resize(img, (CANONICAL_W_PX, CANONICAL_H_PX))

    # Expected destination points in canonical space
    # Alignment marks centers in canonical space
    mark_center_offset = ALIGN_INSET_PX + ALIGN_MARK_PX // 2
    dst_points = np.array([
        [mark_center_offset, mark_center_offset],                                   # TL
        [CANONICAL_W_PX - mark_center_offset, mark_center_offset],                  # TR
        [mark_center_offset, CANONICAL_H_PX - mark_center_offset],                  # BL
        [CANONICAL_W_PX - mark_center_offset, CANONICAL_H_PX - mark_center_offset], # BR
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(src_points, dst_points)
    warped = cv2.warpPerspective(img, M, (CANONICAL_W_PX, CANONICAL_H_PX))
    return warped

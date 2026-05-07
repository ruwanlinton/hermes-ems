"""Stage 2: QR Decode — extract exam_id and index_number from QR code."""
import json
import numpy as np
import cv2


class QRDecodeError(Exception):
    pass


def _parse_qr_data(raw: str) -> dict:
    """Parse JSON from QR code data."""
    try:
        data = json.loads(raw)
        if "exam_id" not in data or "index_number" not in data:
            raise QRDecodeError(f"QR data missing required fields: {raw}")
        return data
    except json.JSONDecodeError:
        raise QRDecodeError(f"QR data is not valid JSON: {raw}")


def decode_qr(img: np.ndarray) -> dict:
    """
    Decode QR code from image using OpenCV's built-in QR detector.
    Returns dict with exam_id and index_number.
    """
    detector = cv2.QRCodeDetector()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # First pass: direct grayscale
    retval, decoded_info, _, _ = detector.detectAndDecodeMulti(gray)
    if retval and decoded_info:
        for info in decoded_info:
            if info:
                return _parse_qr_data(info)

    # Second pass: Otsu binarisation to improve contrast on scanned sheets
    gray_blur = cv2.GaussianBlur(gray, (3, 3), 0)
    _, binary = cv2.threshold(gray_blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    retval, decoded_info, _, _ = detector.detectAndDecodeMulti(binary)
    if retval and decoded_info:
        for info in decoded_info:
            if info:
                return _parse_qr_data(info)

    raise QRDecodeError(
        "No QR code detected. Ensure the image is clear, well-lit, and not rotated more than 45°."
    )

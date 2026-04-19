"""Stage 1: Ingest — decode image bytes, validate dimensions."""
import numpy as np
import cv2

MIN_WIDTH = 800
MIN_HEIGHT = 1000


class IngestError(Exception):
    pass


def is_pdf(data: bytes) -> bool:
    """Return True if the bytes look like a PDF file."""
    return data[:4] == b"%PDF"


def pdf_to_images(pdf_bytes: bytes, dpi: int = 300) -> list[bytes]:
    """
    Convert each page of a PDF to a JPEG image (bytes).
    Raises IngestError if the PDF cannot be opened or has no pages.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise IngestError("PDF support requires PyMuPDF. Install it with: pip install pymupdf")

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as e:
        raise IngestError(f"Failed to open PDF: {e}")

    if doc.page_count == 0:
        raise IngestError("PDF has no pages.")

    images = []
    zoom = dpi / 72  # 72 is PyMuPDF's base DPI
    mat = fitz.Matrix(zoom, zoom)

    for page in doc:
        pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
        images.append(pix.tobytes("jpeg"))

    doc.close()
    return images


def ingest_image(image_bytes: bytes) -> np.ndarray:
    """Decode image bytes to BGR numpy array and validate minimum dimensions."""
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise IngestError("Failed to decode image. Ensure it is a valid JPEG or PNG.")

    h, w = img.shape[:2]
    if w < MIN_WIDTH or h < MIN_HEIGHT:
        raise IngestError(
            f"Image too small ({w}x{h}). Minimum required: {MIN_WIDTH}x{MIN_HEIGHT}."
        )

    return img

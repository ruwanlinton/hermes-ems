"""Stage 1: Ingest — decode image bytes, validate dimensions."""
import numpy as np
import cv2

MIN_WIDTH = 800
MIN_HEIGHT = 1000


class IngestError(Exception):
    pass


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

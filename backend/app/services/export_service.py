"""Export service: CSV and XLSX generation for results."""
import csv
import io
from typing import List

from app.db.models import Result


def results_to_csv(results: List[Result]) -> bytes:
    """Convert results list to CSV bytes."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["index_number", "score", "percentage"])
    for r in results:
        writer.writerow([r.index_number, r.score, r.percentage])
    return buf.getvalue().encode("utf-8")


def results_to_xlsx(results: List[Result]) -> bytes:
    """Convert results list to XLSX bytes."""
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Results"
    ws.append(["Index Number", "Score", "Percentage"])
    for r in results:
        ws.append([r.index_number, r.score, r.percentage])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()

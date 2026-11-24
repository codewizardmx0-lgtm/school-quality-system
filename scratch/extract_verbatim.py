import os
from pypdf import PdfReader

pdf_path = r"docs/‏‏‏‏‏‏النسخة النهائية كامل 5.pdf"
reader = PdfReader(pdf_path)

pages_to_extract = [33, 43, 73, 84]

for p in pages_to_extract:
    print(f"\n==================== FULL TEXT OF PAGE {p} ====================")
    text = reader.pages[p - 1].extract_text() or ""
    print(text)

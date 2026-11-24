import os
from pypdf import PdfReader

pdf_path = r"docs/‏‏‏‏‏‏النسخة النهائية كامل 5.pdf"
reader = PdfReader(pdf_path)

page43 = reader.pages[42].extract_text()
for line in page43.split("\n"):
    if "FR-SUP-18" in line or "مقارنة" in line or "تعاقبة" in line or "تجميعي" in line or "اتجاه" in line:
        print("43:", line)

page44 = reader.pages[43].extract_text()
for line in page44.split("\n")[:10]:
    print("44:", line)

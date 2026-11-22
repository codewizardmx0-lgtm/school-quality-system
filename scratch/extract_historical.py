import os
import re
from pypdf import PdfReader

pdf_path = r"docs/‏‏‏‏‏‏النسخة النهائية كامل 5.pdf"
if not os.path.exists(pdf_path):
    pdf_path = r"docs/graduation_doc.pdf"

print(f"Reading: {pdf_path}")
reader = PdfReader(pdf_path)
print(f"Total pages: {len(reader.pages)}")

keywords = [
    "UC-SUP-07",
    "FR-SUP-18",
    "BR-GEN-05",
    "BR-MIN-03",
    "مقارنة نتائج",
    "المقارنة التاريخية",
    "مقارنة تاريخية",
    "تراكمية",
    "المقارنة التراكمية"
]

results = {kw: [] for kw in keywords}

for idx, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    for kw in keywords:
        if kw in text:
            results[kw].append(idx + 1)

print("\n--- Match Summary ---")
for kw, pages in results.items():
    print(f"{kw}: {len(pages)} matches -> pages {pages}")

target_pages = set()
for kw in ["UC-SUP-07", "FR-SUP-18", "BR-GEN-05", "المقارنة التاريخية"]:
    target_pages.update(results[kw])

for p in sorted(target_pages):
    print(f"\n==================== PAGE {p} ====================")
    text = reader.pages[p - 1].extract_text() or ""
    # Print relevant sections
    lines = text.split("\n")
    for line in lines:
        if any(k in line for k in ["UC-SUP-07", "FR-SUP-18", "BR-GEN-05", "BR-MIN-03", "مقارنة", "تاريخ", "تراكم", "دورات"]):
            print("  *", line.strip())

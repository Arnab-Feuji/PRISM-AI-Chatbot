from fpdf import FPDF
import io

try:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=12)
    pdf.cell(w=0, h=10, text="Test PDF", align='C', new_x="LMARGIN", new_y="NEXT")
    pdf.multi_cell(w=0, h=8, text="This is a test of fpdf2 with text parameter and new_x/new_y.")
    output = pdf.output()
    print(f"Output type: {type(output)}")
    print(f"Output length: {len(output)}")
    pdf_bytes = bytes(output)
    print("Successfully generated PDF bytes")
except Exception as e:
    print(f"Error: {e}")

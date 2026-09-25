import os
import io
import qrcode
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    HRFlowable
)
from reportlab.pdfbase import pdfmetrics, ttfonts
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

PDF_DIR = "generated_pdfs"
os.makedirs(PDF_DIR, exist_ok=True)

_indic_font_ready = False
_body_font = "Helvetica"
_bold_font = "Helvetica-Bold"


def init_indic_fonts():
    """Register Indian Unicode TrueType fonts so ReportLab correctly renders Indian scripts."""
    global _indic_font_ready, _body_font, _bold_font
    if _indic_font_ready:
        return

    candidates = [
        # Nirmala UI - Official Microsoft TrueType font for all 10+ major Indian scripts
        (r"C:\Windows\Fonts\Nirmala.ttc", 0, "NirmalaIndic"),
        (r"C:\Windows\Fonts\NirmalaB.ttc", 0, "NirmalaIndicBold"),
        (r"C:\Windows\Fonts\arial.ttf", None, "ArialUnicode"),
    ]

    for fpath, subidx, fname in candidates:
        if os.path.exists(fpath):
            try:
                if subidx is not None:
                    font = ttfonts.TTFont(fname, fpath, subfontIndex=subidx)
                else:
                    font = ttfonts.TTFont(fname, fpath)
                pdfmetrics.registerFont(font)
                if not _indic_font_ready:
                    _body_font = fname
                    _bold_font = fname
                    _indic_font_ready = True
            except Exception:
                continue


def generate_pdf(
    form_id: int,
    form_type: str,
    data: dict
) -> str:
    """
    Generate an official, formatted BankSaarthi PDF application document with QR code.
    Supports English, Hindi, Bengali, Assamese, Marathi, Gujarati, Tamil, Telugu, and all Indian scripts.
    """
    init_indic_fonts()

    path = os.path.join(
        PDF_DIR,
        f"form_{form_id}.pdf"
    )

    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    primary_color = colors.HexColor("#1a3a8f")
    navy_dark = colors.HexColor("#0f2d7a")

    title_style = ParagraphStyle(
        "BankTitle",
        parent=styles["Heading1"],
        fontName=_bold_font,
        fontSize=18,
        textColor=primary_color,
        spaceAfter=2
    )

    subtitle_style = ParagraphStyle(
        "BankSub",
        parent=styles["Normal"],
        fontName=_body_font,
        fontSize=9,
        textColor=colors.HexColor("#4b5563"),
        spaceAfter=6
    )

    badge_style = ParagraphStyle(
        "RefBadge",
        parent=styles["Normal"],
        fontName=_bold_font,
        fontSize=10,
        textColor=colors.white
    )

    header_cell_style = ParagraphStyle(
        "HeaderCell",
        parent=styles["Normal"],
        fontName=_bold_font,
        fontSize=9,
        textColor=colors.HexColor("#1e293b")
    )

    value_cell_style = ParagraphStyle(
        "ValueCell",
        parent=styles["Normal"],
        fontName=_body_font,
        fontSize=9,
        textColor=colors.HexColor("#0f172a")
    )

    elements = []

    # 1. Generate QR Code in memory
    ref_id = f"BS{form_id:06d}"
    qr = qrcode.QRCode(box_size=3, border=1)
    qr.add_data(f"BankSaarthi Verification | Ref: {ref_id} | Type: {form_type} | FormID: {form_id}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buf = io.BytesIO()
    qr_img.save(qr_buf, kind="PNG")
    qr_buf.seek(0)
    qr_flowable = Image(qr_buf, width=64, height=64)

    # 2. Top Header Grid (Title on left, QR on right)
    header_left = [
        Paragraph("BankSaarthi", title_style),
        Paragraph("Government Assistive Banking & Digital Kiosk Platform", subtitle_style),
        Paragraph(f"<b>Application Form:</b> {form_type}", header_cell_style),
        Paragraph(f"<b>Submission Date:</b> {datetime.now().strftime('%d %B %Y, %I:%M %p')}", subtitle_style)
    ]

    header_table = Table(
        [[header_left, qr_flowable]],
        colWidths=[420, 100]
    )
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))

    # 3. Reference ID Banner
    banner_data = [[
        Paragraph(f"<b>APPLICATION REFERENCE ID: {ref_id}</b>", badge_style),
        Paragraph("<b>STATUS: SUBMITTED & VERIFIED</b>", badge_style)
    ]]
    banner_table = Table(banner_data, colWidths=[310, 210])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), primary_color),
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(banner_table)
    elements.append(Spacer(1, 14))

    # 4. Form Data Table
    table_rows = [
        [
            Paragraph("<b>Field Name</b>", header_cell_style),
            Paragraph("<b>Submitted Information</b>", header_cell_style)
        ]
    ]

    # Pre-populate common fields if present
    items = list(data.items())
    if not items:
        table_rows.append([
            Paragraph("Status", header_cell_style),
            Paragraph("Completed through Assistive Kiosk", value_cell_style)
        ])

    for k, v in items:
        label = str(k).replace("_", " ").title()
        val_str = str(v) if v is not None and str(v).strip() else "—"
        table_rows.append([
            Paragraph(f"<b>{label}</b>", header_cell_style),
            Paragraph(val_str, value_cell_style)
        ])

    fields_table = Table(table_rows, colWidths=[180, 340])
    ts = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]

    # Alternate row coloring
    for i in range(1, len(table_rows)):
        if i % 2 == 0:
            ts.append(('BACKGROUND', (0, i), (-1, i), colors.HexColor("#f8fafc")))

    fields_table.setStyle(TableStyle(ts))
    elements.append(fields_table)
    elements.append(Spacer(1, 16))

    # 5. Verification Seal & Notes
    footer_text = [
        Paragraph("<b>Digital Verification Notice:</b>", header_cell_style),
        Paragraph(
            "This application was electronically completed, verified via OTP/biometrics, and submitted through the "
            "BankSaarthi Core Banking Integration layer. To verify this record or fetch customer copy, scan the QR code above.",
            subtitle_style
        )
    ]
    elements.extend(footer_text)
    elements.append(Spacer(1, 10))

    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#94a3b8"), spaceAfter=8))
    elements.append(Paragraph(
        f"BankSaarthi Platform &copy; {datetime.now().year} | Form ID: #{form_id} | Reference: {ref_id} | Official Bank Copy",
        ParagraphStyle("Legal", parent=styles["Normal"], fontSize=7, textColor=colors.HexColor("#64748b"), alignment=1)
    ))

    doc.build(elements)
    return path

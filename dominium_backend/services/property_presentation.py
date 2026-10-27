from io import BytesIO
from pathlib import Path

from django.conf import settings
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.ttfonts import TTFError
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from PIL import Image as PillowImage


FONT_NAME = "FixelPresentation"


def _register_font():
    if FONT_NAME in pdfmetrics.getRegisteredFontNames():
        return FONT_NAME
    candidates = (
        Path(settings.BASE_DIR) / "static/base/assets/fonts/FixelText/FixelText-Regular.ttf",
        Path(settings.BASE_DIR) / "static/base/assets/fonts/FixelText/FixelText-Regular.otf",
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
        Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
    )
    for candidate in candidates:
        if candidate.exists():
            try:
                pdfmetrics.registerFont(TTFont(FONT_NAME, str(candidate)))
                return FONT_NAME
            except TTFError:
                continue
    return "Helvetica"


def _image_flowable(image_field, *, width, height):
    try:
        path = image_field.path
    except (AttributeError, NotImplementedError, ValueError):
        return None
    if not Path(path).exists():
        return None
    try:
        source = PillowImage.open(path).convert("RGB")
        source.thumbnail((1400, 1000), PillowImage.Resampling.LANCZOS)
        prepared = BytesIO()
        source.save(prepared, format="JPEG", quality=76, optimize=True)
        prepared.seek(0)
    except (OSError, ValueError):
        return None
    image = Image(prepared, width=width, height=height, kind="proportional")
    image._prepared_source = prepared
    image.hAlign = "CENTER"
    return image


def build_property_presentation_pdf(property_obj, *, description=""):
    font = _register_font()
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=14 * mm,
        leftMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
        title=f"{property_obj.title} — DOMINIUM",
        author="DOMINIUM",
    )
    styles = getSampleStyleSheet()
    brand = ParagraphStyle("Brand", parent=styles["Normal"], fontName=font, fontSize=13, textColor=colors.HexColor("#123f43"), alignment=TA_CENTER, spaceAfter=8)
    title = ParagraphStyle("Title", parent=styles["Title"], fontName=font, fontSize=25, leading=30, textColor=colors.HexColor("#123f43"), alignment=TA_CENTER, spaceAfter=10)
    body = ParagraphStyle("Body", parent=styles["BodyText"], fontName=font, fontSize=10, leading=15, textColor=colors.HexColor("#234b4e"), spaceAfter=8)
    fact = ParagraphStyle("Fact", parent=body, alignment=TA_CENTER, fontSize=11, leading=14)

    story = [Paragraph("DOMINIUM · REALTY AGENCY", brand), Paragraph(property_obj.title, title)]
    if property_obj.address:
        story.append(Paragraph(property_obj.address, ParagraphStyle("Address", parent=body, alignment=TA_CENTER)))
    main_image = property_obj.main_image
    if main_image:
        flowable = _image_flowable(main_image.image, width=178 * mm, height=100 * mm)
        if flowable:
            story.extend([Spacer(1, 4 * mm), flowable, Spacer(1, 5 * mm)])

    price = f"{property_obj.price:,.0f} {property_obj.price_currency}".replace(",", " ")
    facts = Table(
        [[Paragraph(f"<b>{price}</b><br/>Ціна", fact), Paragraph(f"<b>{property_obj.area} м²</b><br/>Площа", fact), Paragraph(f"<b>{property_obj.rooms}</b><br/>Кімнат", fact)]],
        colWidths=[59 * mm] * 3,
    )
    facts.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#edf3f1")), ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#b9ccca")), ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#b9ccca")), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
    story.extend([facts, Spacer(1, 6 * mm)])

    for paragraph in description.split("\n"):
        if paragraph.strip():
            story.append(Paragraph(paragraph.strip(), body))

    gallery = [image for image in property_obj.images.all() if not main_image or image.pk != main_image.pk]
    if gallery:
        story.append(PageBreak())
        story.append(Paragraph("Фотографії об’єкта", title))
        rows = []
        for index in range(0, len(gallery), 2):
            cells = []
            for item in gallery[index:index + 2]:
                cells.append(_image_flowable(item.image, width=84 * mm, height=62 * mm) or "")
            while len(cells) < 2:
                cells.append("")
            rows.append(cells)
        gallery_table = Table(rows, colWidths=[88 * mm, 88 * mm], rowHeights=[66 * mm] * len(rows))
        gallery_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("LEFTPADDING", (0, 0), (-1, -1), 2), ("RIGHTPADDING", (0, 0), (-1, -1), 2)]))
        story.append(gallery_table)

    document.build(story)
    return buffer.getvalue()

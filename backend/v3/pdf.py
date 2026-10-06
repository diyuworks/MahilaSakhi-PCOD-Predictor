"""
Server-side 1-page Visit-Prep PDF Generator using ReportLab.
Outputs a clean, professional, high-contrast, one-page clinical consultation summary.
"""
import io
from datetime import datetime
from typing import Any, Dict, List, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

DOMAIN_LABELS = {
    "androgen": "Hormonal & Androgen Symptoms",
    "menstrual": "Menstrual Cycle & Ovulation",
    "metabolic": "Metabolic & Cardiometabolic Health",
    "fertility": "Reproductive & Fertility Goals",
    "mental": "Emotional & Mental Wellbeing",
    "sleep": "Sleep Architecture & Rest",
    "menopause_bone_cv": "Menopause, Bone & Cardiovascular",
}

TIER_LABELS = {
    "focus_now": "Focus Now",
    "monitor": "Keep an Eye On",
    "maintain": "Maintain",
}


def generate_visit_prep_pdf(result: Dict[str, Any], profile: Optional[Dict[str, Any]] = None) -> bytes:
    """
    Generates a strictly single-page Visit-Prep PDF report.
    """
    buffer = io.BytesIO()
    profile = profile or {}

    # Letter dimensions: 612 x 792 points. Margins: 28pt (top/bottom/left/right) -> Printable area: 556 x 736 pt.
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=28,
        rightMargin=28,
        topMargin=26,
        bottomMargin=26,
    )

    styles = getSampleStyleSheet()

    # Brand Colors
    BRAND_DARK_PINK = colors.HexColor("#A61E4D")
    BRAND_SOFT_PINK = colors.HexColor("#FFF0F6")
    TEXT_DARK = colors.HexColor("#2B2D42")
    TEXT_MUTED = colors.HexColor("#495057")
    RED_FLAG_BG = colors.HexColor("#FFF5F5")
    RED_FLAG_TEXT = colors.HexColor("#C92A2A")
    BORDER_COLOR = colors.HexColor("#E9ECEF")

    # Custom Typography Styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=BRAND_DARK_PINK,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=TEXT_MUTED,
    )
    section_heading = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9,
        leading=11,
        textColor=BRAND_DARK_PINK,
        spaceBefore=3,
        spaceAfter=2,
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9.5,
        textColor=TEXT_DARK,
    )
    bold_style = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=TEXT_DARK,
    )
    bullet_style = ParagraphStyle(
        "BulletItem",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        leading=8.5,
        textColor=TEXT_DARK,
        leftIndent=8,
        spaceAfter=1.5,
    )
    disclaimer_style = ParagraphStyle(
        "DisclaimerText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=6.5,
        leading=8,
        textColor=TEXT_MUTED,
        alignment=TA_CENTER,
    )

    story = []

    # 1. Header Row (Brand Title + Generated Date)
    gen_date = datetime.now().strftime("%d %b %Y")
    header_table = Table(
        [
            [
                Paragraph("<b>MahilaSakhi</b> — PCOS Care Navigation Visit-Prep", title_style),
                Paragraph(f"<b>Date:</b> {gen_date}<br/><font color='#6c757d'>Confidential Health Prep</font>", ParagraphStyle("DateRight", parent=subtitle_style, alignment=TA_RIGHT)),
            ]
        ],
        colWidths=[400, 156],
    )
    header_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_DARK_PINK, spaceBefore=0, spaceAfter=4))

    # 2. Patient Profile & Context Summary Card
    ctx = result.get("context", {})
    age_str = f"{profile.get('age')} years" if profile.get("age") else "Not specified"
    uterus_str = ctx.get("uterus", "Presumed yes").capitalize()
    ovary_str = ctx.get("ovarian_status", "Presumed present").capitalize()
    meno_str = ctx.get("effective_menopause", "None").capitalize()
    cycle_str = ctx.get("cycle_tracking", "Applicable").replace("_", " ").capitalize()
    
    # BMI & Metabolic info
    metabolic = profile.get("metabolic", {})
    bmi = metabolic.get("bmi")
    bmi_str = f"{bmi} kg/m²" if bmi else "Not provided"
    waist = metabolic.get("waist_cm")
    waist_str = f"{waist} cm" if waist else "Not provided"
    chief_concern = profile.get("main_concern", "General review").replace("_", " ").capitalize()

    profile_data = [
        [
            Paragraph(f"<b>Age:</b> {age_str}", body_style),
            Paragraph(f"<b>Uterus:</b> {uterus_str}", body_style),
            Paragraph(f"<b>Ovary Status:</b> {ovary_str}", body_style),
            Paragraph(f"<b>Menopause:</b> {meno_str}", body_style),
        ],
        [
            Paragraph(f"<b>Cycle Signal:</b> {cycle_str}", body_style),
            Paragraph(f"<b>BMI:</b> {bmi_str}", body_style),
            Paragraph(f"<b>Waist:</b> {waist_str}", body_style),
            Paragraph(f"<b>Primary Focus:</b> {chief_concern}", body_style),
        ]
    ]
    prof_table = Table(profile_data, colWidths=[139, 139, 139, 139])
    prof_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_SOFT_PINK),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#F8B4D9")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#FDE2EC")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(prof_table)
    story.append(Spacer(1, 4))

    # Context Notes if any (e.g. Hysterectomy / Hormone contraception note)
    notes = ctx.get("notes", [])
    if notes:
        note_text = " | ".join(notes)
        note_p = Paragraph(f"<b>Context Notice:</b> {note_text}", ParagraphStyle("NoteP", parent=body_style, fontSize=7, leading=8.5, textColor=BRAND_DARK_PINK))
        story.append(note_p)
        story.append(Spacer(1, 3))

    # 3. Red Flags Banner (if present)
    flags = result.get("red_flags", [])
    if flags:
        flag_rows = []
        for f in flags:
            urgency_txt = f.get("urgency", "Review").replace("_", " ").upper()
            flag_rows.append([
                Paragraph(f"<b>⚠️ [{urgency_txt}]</b>", ParagraphStyle("FlagUrg", parent=bold_style, textColor=RED_FLAG_TEXT)),
                Paragraph(f.get("message", ""), ParagraphStyle("FlagMsg", parent=body_style, textColor=RED_FLAG_TEXT)),
            ])
        flag_table = Table(flag_rows, colWidths=[90, 466])
        flag_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), RED_FLAG_BG),
            ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#FFA8A8")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#FFC9C9")),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(flag_table)
        story.append(Spacer(1, 4))

    # 4. Domain Priority & Severity Summary
    story.append(Paragraph("PRIORITISED HEALTH DOMAINS & ACTION TIERS", section_heading))
    ranked = result.get("priority", {}).get("ranked_domains", [])
    top3 = ranked[:3]

    domain_summary_rows = [
        [
            Paragraph("<b>Domain</b>", bold_style),
            Paragraph("<b>Action Tier</b>", bold_style),
            Paragraph("<b>Severity</b>", bold_style),
            Paragraph("<b>Daily Impact</b>", bold_style),
            Paragraph("<b>Recommended Specialists</b>", bold_style),
        ]
    ]

    for d in ranked:
        d_name = DOMAIN_LABELS.get(d["domain"], d["domain"].capitalize())
        tier = TIER_LABELS.get(d.get("tier"), d.get("tier", "Monitor"))
        sev = f"Level {d.get('severity', 0)}/4"
        imp = f"Level {d.get('impact', 0)}/3"
        specialists = ", ".join(result.get("pathway", {}).get(d["domain"], {}).get("clinicians", [])) or "Primary Care"
        domain_summary_rows.append([
            Paragraph(f"<b>{d_name}</b>", body_style),
            Paragraph(tier, body_style),
            Paragraph(sev, body_style),
            Paragraph(imp, body_style),
            Paragraph(specialists, body_style),
        ])

    dom_table = Table(domain_summary_rows, colWidths=[150, 80, 66, 70, 190])
    dom_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F3F5")),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(dom_table)
    story.append(Spacer(1, 5))

    # 5. Top 3 Focus Areas: Questions for Doctor & Tests to Discuss
    story.append(Paragraph("TOP 3 CLINICAL DISCUSSION AREAS", section_heading))

    col_questions = []
    col_tests = []
    col_monitor = []

    for d in top3:
        p_info = result.get("pathway", {}).get(d["domain"], {})
        d_title = DOMAIN_LABELS.get(d["domain"], d["domain"])

        for q in p_info.get("questions_for_doctor", [])[:2]:
            col_questions.append(f"• <b>[{d_title[:12]}]</b> {q}")
        for t in p_info.get("tests_to_ask_about", [])[:2]:
            col_tests.append(f"• <b>[{d_title[:12]}]</b> {t}")
        for m in p_info.get("monitor", [])[:1]:
            col_monitor.append(f"• <b>[{d_title[:12]}]</b> {m}")

    q_para_list = [Paragraph("<b>Questions for Doctor:</b>", bold_style)] + [Paragraph(q, bullet_style) for q in col_questions[:5]]
    t_para_list = [Paragraph("<b>Diagnostic Tests to Discuss:</b>", bold_style)] + [Paragraph(t, bullet_style) for t in col_tests[:4]]
    m_para_list = [Paragraph("<b>What to Monitor at Home:</b>", bold_style)] + [Paragraph(m, bullet_style) for m in col_monitor[:3]]

    action_table = Table(
        [
            [q_para_list, [t_para_list, Spacer(1, 3), m_para_list]]
        ],
        colWidths=[278, 278],
    )
    action_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8F9FA")),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(action_table)
    story.append(Spacer(1, 6))

    # 6. Safety Notice & Tele-MANAS
    safety_table = Table(
        [
            [
                Paragraph("<b>Crisis / Emotional Distress Support:</b> If you feel overwhelmed, in India dial <b>Tele-MANAS (14416)</b> 24x7 toll-free national mental health helpline.", ParagraphStyle("SafP", parent=body_style, fontSize=7, leading=8.5, textColor=BRAND_DARK_PINK)),
            ]
        ],
        colWidths=[556],
    )
    safety_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BRAND_SOFT_PINK),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#F8B4D9")),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(safety_table)
    story.append(Spacer(1, 4))

    # 7. Regulatory & DPDP Disclaimer
    disclaimer_text = (
        "<b>Educational Guidance Notice:</b> MahilaSakhi is an evidence-informed care navigation tool designed to prepare you for a doctor visit. "
        "It does NOT provide medical diagnoses, treatment decisions, or drug prescriptions. Compliant with India DPDP Act 2023."
    )
    story.append(Paragraph(disclaimer_text, disclaimer_style))

    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

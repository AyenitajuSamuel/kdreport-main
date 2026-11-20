"""PDF generation and parent email delivery for published class reports."""

import logging
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.utils.text import slugify
from django.utils import timezone
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from academics.models import StudentEnrollment
from .models import StudentFeedback

logger = logging.getLogger(__name__)


def _paragraph_text(value):
    """Escape user-provided text before passing it to ReportLab's markup parser."""
    return escape(str(value or "")).replace("\n", "<br/>")


def _format_datetime(value):
    if value is None:
        return ""
    local_value = timezone.localtime(value)
    return f"{local_value.strftime('%B')} {local_value.day}, {local_value.year}"


def _send_pdf(recipient, subject, message, filename, pdf_content, html_message=None):
    email = EmailMultiAlternatives(
        subject=subject,
        body=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
    if html_message:
        email.attach_alternative(html_message, "text/html")
    email.attach(filename, pdf_content, "application/pdf")
    try:
        sent_count = email.send(fail_silently=False)
    except Exception:
        # The report is already saved. Log delivery trouble without
        # turning a successful write into a failed API response.
        logger.exception("Could not email a class report PDF to a parent")
        return False
    if sent_count != 1:
        logger.error("Email backend did not send a class report PDF to a parent")
        return False
    return True


def send_class_report_to_parents(report):
    """Send a distinct, personalized PDF to each enrolled student's parent."""
    enrollments = StudentEnrollment.objects.filter(classroom=report.classroom).select_related("student__user")
    feedback_by_enrollment = {
        row.enrollment_id: row
        for row in report.student_feedback.select_related("enrollment__student__user").all()
    }
    summary = {"sent": 0, "failed": 0, "skipped": 0, "already_sent": 0, "attempted": 0}
    for enrollment in enrollments:
        recipient = enrollment.student.parent_email.strip()
        feedback = feedback_by_enrollment.get(enrollment.pk)
        if feedback is None:
            logger.error("Published report %s has no feedback for enrollment %s", report.pk, enrollment.pk)
            continue
        if feedback.email_status == StudentFeedback.EmailStatus.SENT:
            summary["already_sent"] += 1
            continue
        if not recipient:
            logger.info("Enrollment %s has no parent email; skipping report delivery", enrollment.pk)
            feedback.email_status = StudentFeedback.EmailStatus.SKIPPED
            feedback.email_error = "No parent email address is configured."
            feedback.save(update_fields=["email_status", "email_error"])
            summary["skipped"] += 1
            continue

        summary["attempted"] += 1
        feedback.email_attempts += 1
        try:
            pdf_content, filename = build_parent_report_pdf(report, feedback)
            sent = _send_pdf(
                recipient,
                "KiddiesDroid Report",
                "Dear Parent/Guardian,\n\n"
                "Please find your child’s report attached as a PDF. We hope it gives you a helpful update on their progress.\n\n"
                "Please do not reply to this email. If you have any questions or need assistance, please email us at info@kiddiesdroid.org.\n\n"
                "Thank you for choosing KiddiesDroid.\n\n"
                "Warm regards,\n"
                "KiddiesDroid",
                filename,
                pdf_content,
                html_message=(
                    "<p>Dear Parent/Guardian,</p>"
                    "<p>Please find your child’s report attached as a PDF. We hope it gives you a helpful update on their progress.</p>"
                    "<p>Please do not reply to this email. If you have any questions or need assistance, please email us at "
                    '<a href="mailto:info@kiddiesdroid.org">info@kiddiesdroid.org</a>.</p>'
                    "<p>Thank you for choosing KiddiesDroid.</p>"
                    "<p>Warm regards,<br>KiddiesDroid</p>"
                ),
            )
        except Exception:
            logger.exception("Could not generate a class report PDF for enrollment %s", enrollment.pk)
            sent = False

        if sent:
            feedback.email_status = StudentFeedback.EmailStatus.SENT
            feedback.email_sent_on = timezone.now()
            feedback.email_error = ""
            summary["sent"] += 1
        else:
            feedback.email_status = StudentFeedback.EmailStatus.FAILED
            feedback.email_error = "Email delivery failed. Retry from the class reports page."
            summary["failed"] += 1
        feedback.save(update_fields=["email_status", "email_attempts", "email_sent_on", "email_error"])
    return summary


def build_parent_report_pdf(report, feedback):
    student_name = feedback.enrollment.student.user.get_full_name() or feedback.enrollment.student.user.username
    title = report.title or "KiddiesDroid Report"
    details = [
        ("Student", student_name),
        ("Reporting period", report.reporting_period),
        ("Program", report.classroom.program.name),
        ("Class", report.classroom.name),
        ("Instructor", report.author.user.get_full_name() or report.author.user.username),
        ("Published", _format_datetime(report.published_on)),
    ]
    pdf_content = _build_report_pdf(title, details, feedback.personalized_report)
    filename_slug = slugify(report.title or "progress-report") or "progress-report"
    report_date = report.published_on or report.written_on
    date_slug = report_date.date().isoformat() if report_date else "report"
    return pdf_content, f"kiddiesdroid-report-{filename_slug[:80]}-{date_slug}.pdf"


def _build_report_pdf(title, details, report_text):
    from pypdf import PdfReader, PdfWriter

    template_path = Path(__file__).with_name("parent_report.pdf")
    if not template_path.is_file():
        raise FileNotFoundError(f"Parent report PDF template not found: {template_path}")

    template_bytes = template_path.read_bytes()
    template_reader = PdfReader(BytesIO(template_bytes))
    if not template_reader.pages:
        raise ValueError(f"Parent report PDF template has no pages: {template_path}")
    template_page = template_reader.pages[0]
    page_width = float(template_page.mediabox.width)
    page_height = float(template_page.mediabox.height)

    overlay_buffer = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=HexColor("#10284b"),
        spaceAfter=7 * mm,
    ))
    styles.add(ParagraphStyle(
        name="ReportMeta",
        parent=styles["BodyText"],
        fontSize=10,
        leading=14,
        textColor=HexColor("#26384d"),
        spaceAfter=2.5 * mm,
    ))
    styles.add(ParagraphStyle(
        name="ReportBody",
        parent=styles["BodyText"],
        fontSize=11,
        leading=16,
        textColor=HexColor("#202d3b"),
        spaceAfter=4 * mm,
    ))
    document = SimpleDocTemplate(
        overlay_buffer,
        pagesize=(page_width, page_height),
        leftMargin=45,
        rightMargin=45,
        topMargin=145,
        bottomMargin=34,
        title=title,
        author="Kiddies Droid Portal",
    )
    story = [Paragraph(_paragraph_text(title), styles["ReportTitle"])]
    for label, value in details:
        if value:
            story.append(Paragraph(f"<b>{_paragraph_text(label)}:</b> {_paragraph_text(value)}", styles["ReportMeta"]))
    story.append(Spacer(1, 5 * mm))
    paragraphs = [paragraph.strip() for paragraph in (report_text or "").split("\n\n") if paragraph.strip()]
    for paragraph in paragraphs:
        story.append(Paragraph(_paragraph_text(paragraph), styles["ReportBody"]))
    document.build(story)

    overlay_reader = PdfReader(BytesIO(overlay_buffer.getvalue()))
    writer = PdfWriter()
    for overlay_page in overlay_reader.pages:
        page = writer.add_blank_page(width=page_width, height=page_height)
        page.merge_page(template_page, over=False)
        page.merge_page(overlay_page)
    output = BytesIO()
    writer.write(output)
    return output.getvalue()

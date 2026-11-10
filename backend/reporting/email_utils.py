"""PDF generation and parent email delivery for published class reports."""

import logging
from io import BytesIO
from xml.sax.saxutils import escape

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from academics.models import StudentEnrollment

logger = logging.getLogger(__name__)


def _paragraph_text(value):
    """Escape user-provided text before passing it to ReportLab's markup parser."""
    return escape(str(value or "")).replace("\n", "<br/>")


def _build_pdf(title, details, body_label, body):
    buffer = BytesIO()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="PortalHeading", parent=styles["Title"], alignment=TA_CENTER))
    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title=title,
        author="Kiddies Droid Portal",
    )

    story = [
        Paragraph("Kiddies Droid Portal", styles["Heading2"]),
        Paragraph(_paragraph_text(title), styles["PortalHeading"]),
        Spacer(1, 8 * mm),
    ]
    for label, value in details:
        story.append(Paragraph(f"<b>{_paragraph_text(label)}:</b> {_paragraph_text(value)}", styles["BodyText"]))
        story.append(Spacer(1, 2 * mm))

    story.extend(
        [
            Spacer(1, 5 * mm),
            Paragraph(_paragraph_text(body_label), styles["Heading3"]),
            Paragraph(_paragraph_text(body), styles["BodyText"]),
        ]
    )
    document.build(story)
    return buffer.getvalue()


def _format_datetime(value):
    if value is None:
        return ""
    local_value = timezone.localtime(value)
    return f"{local_value.strftime('%B')} {local_value.day}, {local_value.year}"


def _send_pdf(recipient, subject, message, filename, pdf_content):
    email = EmailMessage(
        subject=subject,
        body=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[recipient],
    )
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
    """Email a published class report PDF separately to each enrolled student's parent."""
    pdf_content = _build_pdf(
        report.title,
        [
            ("Program", report.classroom.program.name),
            ("Class", report.classroom.name),
            ("Instructor", report.author.user.get_full_name() or report.author.user.username),
            ("Published", _format_datetime(report.published_on)),
        ],
        "Report",
        report.body,
    )
    recipients = {}
    enrollments = StudentEnrollment.objects.filter(classroom=report.classroom).select_related("student")
    for enrollment in enrollments:
        address = enrollment.student.parent_email.strip()
        if address:
            recipients.setdefault(address.casefold(), address)

    if not recipients:
        logger.info("Published report %s has no parent email recipients", report.pk)
        return

    message = (
        f"A class report for {report.classroom.name} in {report.classroom.program.name} "
        "is attached as a PDF. For feedback specific to your child, please have them "
        "check the Private Feedback tab in the student portal."
    )
    for recipient in recipients.values():
        _send_pdf(
            recipient,
            f"Class report: {report.title}",
            message,
            f"class-report-{report.pk}.pdf",
            pdf_content,
        )

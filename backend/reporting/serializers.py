from django.db import transaction
from rest_framework import serializers
from collections import Counter

from academics.models import StudentEnrollment
from .models import ClassReport, StudentFeedback

DEFAULT_PRIVATE_FEEDBACK_ANSWERS = {
    "attendance_status": "not_assessed",
    "participation": "not_assessed",
    "understanding": "not_assessed",
    "practical_work": "not_assessed",
    "assignment_status": "not_assessed",
    "collaboration": "not_assessed",
}


class PrivateFeedbackAnswersSerializer(serializers.Serializer):
    attendance_status = serializers.ChoiceField(choices=["not_assessed", "on_time", "late", "absent_with_notice", "absent_without_notice"])
    participation = serializers.ChoiceField(choices=["independent_contribution", "when_prompted", "limited_observed", "not_assessed"])
    understanding = serializers.ChoiceField(choices=["demonstrated", "developing", "needs_practice", "not_assessed"])
    practical_work = serializers.ChoiceField(choices=["not_assessed", "completed_independently", "completed_with_support", "partially_completed", "not_attempted", "not_applicable"])
    assignment_status = serializers.ChoiceField(choices=["not_assessed", "completed", "partially_completed", "not_submitted", "not_yet_due", "no_assignment"])
    collaboration = serializers.ChoiceField(choices=["worked_well", "some_support", "needed_reminders", "not_assessed"])


class PrivateFeedbackInputSerializer(serializers.Serializer):
    enrollment = serializers.IntegerField(min_value=1)
    answers = PrivateFeedbackAnswersSerializer()
    note = serializers.CharField(max_length=500, allow_blank=True, required=False, default="")


class PrivateFeedbackEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentFeedback
        fields = ["enrollment", "answers", "note"]
        read_only_fields = fields


class ClassReportSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.user.get_full_name", read_only=True)
    class_name = serializers.CharField(source="classroom.name", read_only=True)
    student_feedback = PrivateFeedbackInputSerializer(many=True, write_only=True, required=False)
    feedback_entries = PrivateFeedbackEntrySerializer(source="student_feedback", many=True, read_only=True)
    display_title = serializers.SerializerMethodField()
    email_delivery = serializers.SerializerMethodField()

    class Meta:
        model = ClassReport
        fields = ["id", "author", "author_name", "classroom", "class_name", "title", "display_title", "reporting_period", "body", "topic_taught", "learning_goals", "key_concepts", "activities", "practical_works", "assignment", "assignment_due_date", "next_lesson", "materials", "student_feedback", "feedback_entries", "email_delivery", "status", "written_on", "published_on"]
        read_only_fields = ["id", "author", "classroom", "status", "written_on", "published_on"]

    def get_display_title(self, report):
        return report.title or report.topic_taught or "Class learning report"

    def get_email_delivery(self, report):
        counts = Counter(report.student_feedback.values_list("email_status", flat=True))
        return {
            "sent": counts[StudentFeedback.EmailStatus.SENT],
            "failed": counts[StudentFeedback.EmailStatus.FAILED],
            "pending": counts[StudentFeedback.EmailStatus.PENDING],
            "skipped": counts[StudentFeedback.EmailStatus.SKIPPED],
            "total": sum(counts.values()),
        }

    def validate(self, attrs):
        creating = self.instance is None
        if creating or "title" in attrs:
            if not str(attrs.get("title", "")).strip():
                raise serializers.ValidationError({"title": "Enter a report title."})
        required_fields = {
            "topic_taught": "Enter the topic taught.",
            "learning_goals": "Enter the learning goals.",
            "key_concepts": "Enter the key concepts and skills.",
            "activities": "Enter the class activities.",
        }
        for field, message in required_fields.items():
            if (creating or field in attrs) and not str(attrs.get(field, "")).strip():
                raise serializers.ValidationError({field: message})

        entries = attrs.pop("student_feedback", None)
        if entries is None and not creating:
            return attrs
        if entries is None:
            entries = []

        if creating:
            classroom_id = self.context.get("view").kwargs.get("class_pk") if self.context.get("view") else None
        else:
            classroom_id = self.instance.classroom_id
        if not classroom_id:
            attrs["_student_feedback"] = entries
            return attrs

        roster = list(StudentEnrollment.objects.filter(classroom_id=classroom_id).values_list("id", flat=True))
        submitted = [entry.get("enrollment") for entry in entries]
        if len(submitted) != len(set(submitted)):
            raise serializers.ValidationError({"student_feedback": "Each student can appear only once."})
        if not set(submitted).issubset(set(roster)):
            raise serializers.ValidationError({"student_feedback": "Private feedback can only be added for students enrolled in this class."})
        for entry in entries:
            if len(str(entry.get("note") or "")) > 500:
                raise serializers.ValidationError({"student_feedback": "Private notes must be 500 characters or fewer."})
        entries_by_enrollment = {entry["enrollment"]: entry for entry in entries}
        attrs["_student_feedback"] = [
            entries_by_enrollment.get(enrollment_id, {
                "enrollment": enrollment_id,
                "answers": DEFAULT_PRIVATE_FEEDBACK_ANSWERS.copy(),
                "note": "",
            })
            for enrollment_id in roster
        ]
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        entries = validated_data.pop("_student_feedback", [])
        report = super().create(validated_data)
        StudentFeedback.objects.bulk_create([
            StudentFeedback(
                author=report.author,
                report=report,
                enrollment_id=entry["enrollment"],
                answers=entry["answers"],
                note=entry.get("note", ""),
            )
            for entry in entries
        ])
        return report

    @transaction.atomic
    def update(self, instance, validated_data):
        entries = validated_data.pop("_student_feedback", None)
        report = super().update(instance, validated_data)
        if entries is not None:
            for entry in entries:
                feedback, _ = report.student_feedback.get_or_create(
                    enrollment_id=entry["enrollment"],
                    defaults={"author": report.author},
                )
                feedback.answers = entry["answers"]
                feedback.note = entry.get("note", "")
                feedback.personalized_report = ""
                feedback.save(update_fields=["answers", "note", "personalized_report"])
        elif validated_data:
            report.student_feedback.update(personalized_report="")
        return report


class StudentFeedbackSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.user.get_full_name", read_only=True)
    student_name = serializers.CharField(source="enrollment.student.user.get_full_name", read_only=True)

    class Meta:
        model = StudentFeedback
        fields = ["id", "author", "author_name", "enrollment", "student_name", "report", "answers", "note", "feedback", "personalized_report", "written_on"]
        read_only_fields = ["id", "author", "enrollment", "report", "personalized_report", "written_on"]

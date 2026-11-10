from django.contrib.auth import get_user_model
from django.utils.crypto import get_random_string
from rest_framework import serializers

from .models import InstructorProfile, StudentProfile

User = get_user_model()


class StudentProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = StudentProfile
        fields = ["id", "username", "first_name", "last_name", "parent_email"]
        read_only_fields = ["id", "username"]

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        # Usernames are created from names; an admin can change them later.
        base = f"{user_data['first_name']}.{user_data['last_name']}".strip(".").lower()
        candidate = base or "student"
        suffix = 1
        while User.objects.filter(username__iexact=candidate).exists():
            candidate = f"{base or 'student'}.{suffix}"
            suffix += 1

        user = User(
            username=candidate,
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            role=User.Role.STUDENT,
        )
        temporary_password = get_random_string(14)
        user.set_password(temporary_password)
        user.save()
        profile = StudentProfile.objects.create(user=user, **validated_data)
        profile._temporary_password = temporary_password
        return profile

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        for field in ("first_name", "last_name"):
            if field in user_data:
                setattr(instance.user, field, user_data[field])
        if user_data:
            instance.user.save()
        return super().update(instance, validated_data)


class ClassRosterStudentSerializer(serializers.ModelSerializer):
    """Student details needed by assigned instructors, without parent contact data."""
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = StudentProfile
        fields = ["id", "username", "first_name", "last_name"]


class InstructorProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    email = serializers.EmailField(source="user.email")
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = InstructorProfile
        fields = ["id", "username", "first_name", "last_name", "email"]
        read_only_fields = ["id", "username"]

    def create(self, validated_data):
        user_data = validated_data.pop("user")
        username = user_data["email"].split("@")[0]
        base = username
        suffix = 1
        while User.objects.filter(username__iexact=username).exists():
            username = f"{base}.{suffix}"
            suffix += 1
        user = User(
            username=username,
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            email=user_data["email"],
            role=User.Role.INSTRUCTOR,
        )
        temporary_password = get_random_string(14)
        user.set_password(temporary_password)
        user.save()
        profile = InstructorProfile.objects.create(user=user, **validated_data)
        profile._temporary_password = temporary_password
        return profile

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        for field in ("first_name", "last_name", "email"):
            if field in user_data:
                setattr(instance.user, field, user_data[field])
        if user_data:
            instance.user.save()
        return instance


class StudentSelfProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username")
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)

    class Meta:
        model = StudentProfile
        fields = ["username", "first_name", "last_name"]
        read_only_fields = ["first_name", "last_name"]

    def validate(self, attrs):
        username = attrs.get("user", {}).get("username")
        if username and User.objects.filter(username__iexact=username).exclude(pk=self.instance.user_id).exists():
            raise serializers.ValidationError({"username": "This username is already in use."})
        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if "username" in user_data:
            instance.user.username = user_data["username"]
            instance.user.save(update_fields=["username"])
        return instance

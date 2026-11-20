import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create the initial portal administrator from one-time environment variables."

    def handle(self, *args, **options):
        username = os.environ.get("BOOTSTRAP_ADMIN_USERNAME", "").strip()
        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
        email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip()

        if not username or not password:
            self.stdout.write("No bootstrap admin credentials configured; skipping.")
            return

        User = get_user_model()
        user = User.objects.filter(username=username).first()
        if user:
            if not user.is_superuser:
                raise CommandError(
                    f"User {username!r} already exists without superuser access; refusing to promote it."
                )
            self.stdout.write(f"Bootstrap admin {username!r} already exists; leaving it unchanged.")
            return

        user = User(
            username=username,
            email=email,
            role=User.Role.ADMIN,
            is_staff=True,
            is_superuser=True,
        )
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Created bootstrap admin {username!r}."))

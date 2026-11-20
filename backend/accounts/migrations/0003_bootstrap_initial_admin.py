import os

from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_initial_admin(apps, schema_editor):
    username = os.environ.get("BOOTSTRAP_ADMIN_USERNAME", "").strip()
    password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
    email = os.environ.get("BOOTSTRAP_ADMIN_EMAIL", "").strip()
    if not username or not password:
        return

    User = apps.get_model("accounts", "User")
    if User.objects.filter(username=username).exists():
        return

    user = User(
        username=username,
        email=email,
        password=make_password(password),
        role="admin",
        is_staff=True,
        is_superuser=True,
    )
    user.save()


class Migration(migrations.Migration):
    dependencies = [("accounts", "0002_rename_uupdated_at_user_updated_at_instructorprofile_and_more")]

    operations = [migrations.RunPython(create_initial_admin, migrations.RunPython.noop)]

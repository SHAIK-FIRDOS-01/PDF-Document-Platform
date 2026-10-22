"""Management command to seed the default demo user for local testing and review."""
from django.core.management.base import BaseCommand
from apps.authentication.models import User, UserRole


class Command(BaseCommand):
    help = "Seeds the default demo auditor account (demo@example.com / Password123!)"

    def handle(self, *args, **options):
        email = "demo@example.com"
        password = "Password123!"

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": "Demo",
                "last_name": "Auditor",
                "role": UserRole.AUDITOR,
                "is_active": True,
            },
        )

        user.set_password(password)
        user.first_name = "Demo"
        user.last_name = "Auditor"
        user.role = UserRole.AUDITOR
        user.is_active = True
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Successfully created demo user '{email}'"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Successfully updated credentials for existing demo user '{email}'"))

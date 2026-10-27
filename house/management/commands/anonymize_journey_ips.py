import ipaddress

from django.core.management.base import BaseCommand
from django.utils import timezone

from house.models import JourneySession


def anonymize_ip(value):
    address = ipaddress.ip_address(value)
    prefix = 24 if address.version == 4 else 48
    return str(ipaddress.ip_network(f"{address}/{prefix}", strict=False).network_address)


class Command(BaseCommand):
    help = "Anonymize raw journey IP addresses older than the retention window."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=30)

    def handle(self, *args, **options):
        cutoff = timezone.now() - timezone.timedelta(days=max(1, options["days"]))
        updated = 0
        for session in JourneySession.objects.filter(last_seen_at__lt=cutoff).exclude(ip_address__isnull=True):
            masked = anonymize_ip(session.ip_address)
            if str(session.ip_address) != masked:
                session.ip_address = masked
                session.save(update_fields=["ip_address"])
                updated += 1
        self.stdout.write(self.style.SUCCESS(f"Anonymized {updated} journey IP addresses."))

from django.contrib import admin
from django.contrib.sites.admin import SiteAdmin as BaseSiteAdmin
from django.contrib.sites.models import Site


class SiteAdmin(BaseSiteAdmin):
    list_display = ("id", "domain", "name")
    list_display_links = ("id", "domain")


admin.site.unregister(Site)
admin.site.register(Site, SiteAdmin)

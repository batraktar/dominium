from __future__ import annotations

import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.test import SimpleTestCase

from dominium_backend.settings.env import load_env_file


class EnvironmentLoaderTest(SimpleTestCase):
    def test_env_file_supplies_missing_hosting_values_without_overriding_process(self) -> None:
        with TemporaryDirectory() as directory:
            env_file = Path(directory) / ".env"
            env_file.write_text(
                'DJANGO_ENV="prod"\nREALTSOFT_API_KEY=file-key\n',
                encoding="utf-8",
            )

            with patch.dict(
                os.environ,
                {"REALTSOFT_API_KEY": "hosting-key"},
                clear=True,
            ):
                load_env_file(env_file)

                self.assertEqual(os.environ["DJANGO_ENV"], "prod")
                self.assertEqual(os.environ["REALTSOFT_API_KEY"], "hosting-key")

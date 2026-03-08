from __future__ import annotations

import json
import logging


class JSONFormatter(logging.Formatter):
    """Formatter that outputs structured JSON per log line."""

    def format(self, record: logging.LogRecord) -> str:
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        for attr in ("request_id", "user"):
            if hasattr(record, attr):
                log_record[attr] = getattr(record, attr)
        return json.dumps(log_record, ensure_ascii=False)

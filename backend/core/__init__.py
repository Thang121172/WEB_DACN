# backend/core/__init__.py
# Đảm bảo Celery auto-discover tasks khi Django load project.

from .app import app as celery_app  # noqa: F401

__all__ = ("app",)

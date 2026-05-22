"""Backward-compatible wrapper for the old Claude service module name."""

from app.services.openai_report import generate_conservation_report

__all__ = ["generate_conservation_report"]

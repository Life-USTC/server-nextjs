#!/usr/bin/env python3
"""
Submit data from Life-USTC/static repository to the webhook API.
This script reads JSON files from the static cache and submits them via webhook.
"""

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests


class WebhookSubmitter:
    """Submit course and schedule data via webhook API."""

    def __init__(
        self,
        webhook_url: str,
        webhook_secret: str,
        cache_root: str = "./cache",
    ):
        """
        Initialize the webhook submitter.

        Args:
            webhook_url: URL of the webhook endpoint
            webhook_secret: Authentication secret for the webhook
            cache_root: Root directory of the static cache
        """
        self.webhook_url = webhook_url
        self.webhook_secret = webhook_secret
        self.cache_root = Path(cache_root)
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {webhook_secret}",
            }
        )

    def submit_data(
        self,
        data_type: str,
        data: Any,
        semester_jw_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Submit data to the webhook endpoint.

        Args:
            data_type: Type of data ('semesters', 'sections', or 'schedules')
            data: The data payload to submit
            semester_jw_id: Optional semester jwId (required for sections and schedules)

        Returns:
            Response from the webhook API

        Raises:
            requests.HTTPError: If the request fails
        """
        payload: Dict[str, Any] = {
            "type": data_type,
            "data": data,
        }

        if semester_jw_id is not None:
            payload["semesterJwId"] = semester_jw_id

        print(f"Submitting {data_type} data...")

        try:
            response = self.session.post(self.webhook_url, json=payload)
            response.raise_for_status()
            result = response.json()
            print(f"✓ Success: {result.get('message', 'Data submitted')}")
            return result
        except requests.HTTPError as e:
            print(f"✗ Error: {e}")
            try:
                error_detail = response.json()
                print(f"  Details: {json.dumps(error_detail, indent=2)}")
            except Exception:
                print(f"  Response: {response.text}")
            raise

    def load_semesters(self) -> List[Dict[str, Any]]:
        """Load semester data from cache."""
        file_path = (
            self.cache_root
            / "catalog"
            / "api"
            / "teach"
            / "semester"
            / "list.json"
        )

        if not file_path.exists():
            raise FileNotFoundError(f"Semesters file not found: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def submit_semesters(self) -> Dict[str, Any]:
        """Load and submit semester data."""
        semesters = self.load_semesters()
        print(f"Found {len(semesters)} semesters")
        return self.submit_data("semesters", semesters)

    def load_sections(self, semester_jw_id: int) -> List[Dict[str, Any]]:
        """Load section data for a specific semester."""
        file_path = (
            self.cache_root
            / "catalog"
            / "api"
            / "teach"
            / "lesson"
            / "list-for-teach"
            / f"{semester_jw_id}.json"
        )

        if not file_path.exists():
            print(f"  ⚠ Sections file not found: {file_path}")
            return []

        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def submit_sections(
        self,
        semester_jw_id: int,
    ) -> Dict[str, Any]:
        """Load and submit section data for a semester."""
        sections = self.load_sections(semester_jw_id)
        if not sections:
            print(f"  No sections found for semester {semester_jw_id}")
            return {"success": True, "message": "No sections to load", "count": 0}

        print(f"  Found {len(sections)} sections")
        return self.submit_data("sections", sections, semester_jw_id)

    def load_schedules(self, section_jw_ids: List[int]) -> Dict[str, Any]:
        """Load schedule data for multiple sections."""
        schedules_dir = self.cache_root / "jw" / "api" / "schedule-table" / "datum"

        schedules_data = {}
        for section_jw_id in section_jw_ids:
            file_path = schedules_dir / f"{section_jw_id}.json"

            if not file_path.exists():
                continue

            with open(file_path, "r", encoding="utf-8") as f:
                schedules_data[str(section_jw_id)] = json.load(f)

        return schedules_data

    def submit_schedules(
        self,
        semester_jw_id: int,
        section_jw_ids: List[int],
    ) -> Dict[str, Any]:
        """Load and submit schedule data for sections in a semester."""
        schedules = self.load_schedules(section_jw_ids)
        if not schedules:
            print(f"  No schedules found")
            return {"success": True, "message": "No schedules to load", "count": 0}

        print(f"  Found schedules for {len(schedules)} sections")
        return self.submit_data("schedules", schedules, semester_jw_id)

    def submit_all(self) -> None:
        """
        Load and submit all data (semesters, sections, schedules).
        
        The API automatically handles semester lookup by jwId, so no mapping is needed.
        """
        # Submit semesters first
        print("\n=== Submitting Semesters ===")
        semester_result = self.submit_semesters()

        # Submit sections and schedules for each semester
        semesters = self.load_semesters()
        for semester in semesters:
            semester_jw_id = semester["id"]

            print(
                f"\n=== Processing Semester: {semester['nameZh']} "
                f"(jwId={semester_jw_id}) ==="
            )

            # Submit sections
            print("Submitting sections...")
            sections_result = self.submit_sections(semester_jw_id)

            # Load section JW IDs for schedule submission
            sections = self.load_sections(semester_jw_id)
            section_jw_ids = [s["id"] for s in sections]

            # Submit schedules
            if section_jw_ids:
                print("Submitting schedules...")
                self.submit_schedules(semester_jw_id, section_jw_ids)

        print("\n=== All data submitted successfully! ===")


def main():
    """Main entry point."""
    # Get configuration from environment variables
    webhook_url = os.getenv(
        "WEBHOOK_URL",
        "http://localhost:3000/api/webhooks/load-data",
    )
    webhook_secret = os.getenv("WEBHOOK_SECRET")
    cache_root = os.getenv("CACHE_ROOT", "./cache")

    if not webhook_secret:
        print("Error: WEBHOOK_SECRET environment variable is required")
        print("\nUsage:")
        print("  export WEBHOOK_SECRET=your_secret_token")
        print("  export WEBHOOK_URL=http://localhost:3000/api/webhooks/load-data")
        print("  export CACHE_ROOT=./cache")
        print("  python submit-via-webhook.py")
        sys.exit(1)

    # Create submitter
    submitter = WebhookSubmitter(webhook_url, webhook_secret, cache_root)

    # Submit all data - no mapping needed!
    submitter.submit_all()


if __name__ == "__main__":
    main()

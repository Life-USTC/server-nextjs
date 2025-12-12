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
        semester_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Submit data to the webhook endpoint.

        Args:
            data_type: Type of data ('semesters', 'sections', or 'schedules')
            data: The data payload to submit
            semester_id: Optional semester ID (required for sections and schedules)

        Returns:
            Response from the webhook API

        Raises:
            requests.HTTPError: If the request fails
        """
        payload: Dict[str, Any] = {
            "type": data_type,
            "data": data,
        }

        if semester_id is not None:
            payload["semesterId"] = semester_id

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
        semester_id: int,
        semester_jw_id: int,
    ) -> Dict[str, Any]:
        """Load and submit section data for a semester."""
        sections = self.load_sections(semester_jw_id)
        if not sections:
            print(f"  No sections found for semester {semester_jw_id}")
            return {"success": True, "message": "No sections to load", "count": 0}

        print(f"  Found {len(sections)} sections")
        return self.submit_data("sections", sections, semester_id)

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
        semester_id: int,
        section_jw_ids: List[int],
    ) -> Dict[str, Any]:
        """Load and submit schedule data for sections in a semester."""
        schedules = self.load_schedules(section_jw_ids)
        if not schedules:
            print(f"  No schedules found")
            return {"success": True, "message": "No schedules to load", "count": 0}

        print(f"  Found schedules for {len(schedules)} sections")
        return self.submit_data("schedules", schedules, semester_id)

    def submit_all(
        self,
        semester_id_mapping: Optional[Dict[int, int]] = None,
    ) -> None:
        """
        Load and submit all data (semesters, sections, schedules).

        Args:
            semester_id_mapping: Optional mapping of semester jwId to database ID.
                                If None, will need to query the database or API.
        """
        # Submit semesters first
        print("\n=== Submitting Semesters ===")
        semester_result = self.submit_semesters()

        # If we don't have a mapping, we need to get it
        if semester_id_mapping is None:
            print(
                "\nNote: Semester ID mapping not provided. "
                "You'll need to manually map jwId to database IDs."
            )
            print(
                "Example: {123: 1, 124: 2} where 123 is jwId and 1 is database ID"
            )
            return

        # Submit sections and schedules for each semester
        semesters = self.load_semesters()
        for semester in semesters:
            semester_jw_id = semester["id"]
            semester_db_id = semester_id_mapping.get(semester_jw_id)

            if semester_db_id is None:
                print(
                    f"\n⚠ Skipping semester {semester_jw_id} "
                    f"({semester['nameZh']}): No database ID mapping"
                )
                continue

            print(
                f"\n=== Processing Semester: {semester['nameZh']} "
                f"(jwId={semester_jw_id}, dbId={semester_db_id}) ==="
            )

            # Submit sections
            print("Submitting sections...")
            sections_result = self.submit_sections(semester_db_id, semester_jw_id)

            # Load section JW IDs for schedule submission
            sections = self.load_sections(semester_jw_id)
            section_jw_ids = [s["id"] for s in sections]

            # Submit schedules
            if section_jw_ids:
                print("Submitting schedules...")
                self.submit_schedules(semester_db_id, section_jw_ids)

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

    # Check for semester mapping argument
    if len(sys.argv) > 1 and sys.argv[1] == "--with-mapping":
        # Example mapping - you would need to provide actual mappings
        print(
            "Note: Using example mapping. "
            "Edit this script to provide actual semester ID mappings."
        )
        semester_mapping = {
            # jwId: database_id
            # Example: 123: 1,
        }
        submitter.submit_all(semester_mapping)
    else:
        # Just submit semesters
        submitter.submit_all()


if __name__ == "__main__":
    main()

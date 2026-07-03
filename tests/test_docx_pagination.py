from __future__ import annotations

import tempfile
import unittest
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from scripts.docx_pagination import (
    W,
    apply_pagination_to_xml,
    improve_docx,
    parse_paragraph_selector,
)


DOCUMENT_XML = b"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
  mc:Ignorable="w14">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Heading</w:t></w:r></w:p>
    <w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:t>Body</w:t></w:r></w:p>
    <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Bullet</w:t></w:r></w:p>
    <w:p><w:pPr><w:pStyle w:val="ResumeRole"/></w:pPr><w:r><w:t>Role</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>
"""


class ParagraphSelectorTests(unittest.TestCase):
    def test_ranges_and_individual_indexes(self) -> None:
        self.assertEqual(parse_paragraph_selector("0,2-4", 6), {0, 2, 3, 4})

    def test_all(self) -> None:
        self.assertEqual(parse_paragraph_selector("all", 3), {0, 1, 2})

    def test_out_of_range_is_rejected(self) -> None:
        with self.assertRaises(ValueError):
            parse_paragraph_selector("3", 3)


class XmlPaginationTests(unittest.TestCase):
    def test_style_and_explicit_rules_are_applied(self) -> None:
        updated, stats = apply_pagination_to_xml(
            DOCUMENT_XML,
            keep_with_next="3",
            keep_together="1",
        )
        root = ET.fromstring(updated)
        body = root.find(f"{W}body")
        self.assertIsNotNone(body)
        paragraphs = list(body.iter(f"{W}p"))

        self.assertIsNotNone(paragraphs[0].find(f"{W}pPr/{W}keepNext"))
        self.assertIsNotNone(paragraphs[3].find(f"{W}pPr/{W}keepNext"))
        self.assertIsNotNone(paragraphs[1].find(f"{W}pPr/{W}keepLines"))
        self.assertIsNotNone(paragraphs[2].find(f"{W}pPr/{W}keepLines"))
        self.assertTrue(
            all(
                paragraph.find(f"{W}pPr/{W}widowControl") is not None
                for paragraph in paragraphs
            )
        )
        self.assertIsNotNone(paragraphs[1].find(f"{W}pPr/{W}pageBreakBefore"))
        paragraph_one_properties = list(paragraphs[1].find(f"{W}pPr"))
        paragraph_two_properties = list(paragraphs[2].find(f"{W}pPr"))
        self.assertLess(
            paragraph_one_properties.index(paragraphs[1].find(f"{W}pPr/{W}keepLines")),
            paragraph_one_properties.index(paragraphs[1].find(f"{W}pPr/{W}pageBreakBefore")),
        )
        self.assertLess(
            paragraph_two_properties.index(paragraphs[2].find(f"{W}pPr/{W}keepLines")),
            paragraph_two_properties.index(paragraphs[2].find(f"{W}pPr/{W}numPr")),
        )
        self.assertIn(b'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"', updated)
        self.assertIn(b'mc:Ignorable="w14"', updated)
        self.assertEqual(
            stats,
            {
                "paragraphs": 4,
                "keep_with_next": 2,
                "keep_together": 2,
                "widow_control": 4,
            },
        )

    def test_file_round_trip_preserves_unrelated_parts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "source.docx"
            output = root / "output.docx"
            with zipfile.ZipFile(source, "w") as archive:
                archive.writestr("word/document.xml", DOCUMENT_XML)
                archive.writestr("word/unchanged.xml", b"unchanged")

            stats = improve_docx(source, output)

            self.assertEqual(stats["paragraphs"], 4)
            with zipfile.ZipFile(output, "r") as archive:
                self.assertEqual(archive.read("word/unchanged.xml"), b"unchanged")
                self.assertIn(b"keepNext", archive.read("word/document.xml"))


if __name__ == "__main__":
    unittest.main()

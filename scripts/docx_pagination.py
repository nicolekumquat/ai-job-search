"""Apply conservative pagination safeguards to generated DOCX documents.

The utility edits only paragraph pagination properties in ``word/document.xml``.
It uses the Python standard library and does not inspect or export document text.
"""

from __future__ import annotations

import argparse
import html
import io
import json
import os
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{WORD_NS}}}"
ET.register_namespace("w", WORD_NS)

DEFAULT_HEADING_PREFIXES = ("heading", "title", "subtitle")
DEFAULT_LIST_PREFIXES = ("list", "bullet")

# WordprocessingML paragraph properties have a defined sequence. Word is often
# forgiving, but inserting new elements in schema order avoids repair prompts
# in stricter Office versions and third-party renderers.
PARAGRAPH_PROPERTY_ORDER = {
    name: index
    for index, name in enumerate(
        (
            "pStyle",
            "keepNext",
            "keepLines",
            "pageBreakBefore",
            "framePr",
            "widowControl",
            "numPr",
            "suppressLineNumbers",
            "pBdr",
            "shd",
            "tabs",
            "suppressAutoHyphens",
            "kinsoku",
            "wordWrap",
            "overflowPunct",
            "topLinePunct",
            "autoSpaceDE",
            "autoSpaceDN",
            "bidi",
            "adjustRightInd",
            "snapToGrid",
            "spacing",
            "ind",
            "contextualSpacing",
            "mirrorIndents",
            "suppressOverlap",
            "jc",
            "textDirection",
            "textAlignment",
            "textboxTightWrap",
            "outlineLvl",
            "divId",
            "cnfStyle",
            "rPr",
            "sectPr",
            "pPrChange",
        )
    )
}


def parse_paragraph_selector(selector: str, paragraph_count: int) -> set[int]:
    """Parse a zero-based selector such as ``0,2-4`` or ``all``."""

    selector = selector.strip().lower()
    if not selector:
        return set()
    if selector == "all":
        return set(range(paragraph_count))

    selected: set[int] = set()
    for token in selector.split(","):
        token = token.strip()
        if not token:
            continue
        if "-" in token:
            start_text, end_text = token.split("-", 1)
            start = int(start_text)
            end = int(end_text)
            if start > end:
                raise ValueError(f"Invalid descending range: {token!r}")
            selected.update(range(start, end + 1))
        else:
            selected.add(int(token))

    invalid = sorted(index for index in selected if index < 0 or index >= paragraph_count)
    if invalid:
        raise ValueError(
            f"Paragraph indexes outside 0-{paragraph_count - 1}: {invalid}"
        )
    return selected


def _paragraph_properties(paragraph: ET.Element) -> ET.Element:
    properties = paragraph.find(f"{W}pPr")
    if properties is None:
        properties = ET.Element(f"{W}pPr")
        paragraph.insert(0, properties)
    return properties


def _paragraph_style(properties: ET.Element) -> str:
    style = properties.find(f"{W}pStyle")
    if style is None:
        return ""
    return style.get(f"{W}val", "")


def _style_matches(style: str, prefixes: tuple[str, ...]) -> bool:
    normalized = style.replace(" ", "").replace("_", "").casefold()
    return any(
        normalized.startswith(prefix.replace(" ", "").replace("_", "").casefold())
        for prefix in prefixes
    )


def _is_list_paragraph(properties: ET.Element, style: str) -> bool:
    return (
        properties.find(f"{W}numPr") is not None
        or _style_matches(style, DEFAULT_LIST_PREFIXES)
    )


def _enable_property(properties: ET.Element, property_name: str) -> None:
    element = properties.find(f"{W}{property_name}")
    if element is None:
        element = ET.Element(f"{W}{property_name}")
        desired_order = PARAGRAPH_PROPERTY_ORDER[property_name]
        for position, child in enumerate(properties):
            local_name = child.tag.rsplit("}", 1)[-1]
            child_order = PARAGRAPH_PROPERTY_ORDER.get(local_name, len(PARAGRAPH_PROPERTY_ORDER))
            if child_order > desired_order:
                properties.insert(position, element)
                break
        else:
            properties.append(element)
    element.attrib.pop(f"{W}val", None)


def _register_namespaces(document_xml: bytes) -> dict[str, str]:
    """Preserve source prefixes referenced by attributes such as mc:Ignorable."""

    namespaces: dict[str, str] = {}
    for _event, namespace in ET.iterparse(
        io.BytesIO(document_xml), events=("start-ns",)
    ):
        prefix, uri = namespace
        namespaces.setdefault(prefix, uri)
        if prefix != "xml":
            try:
                ET.register_namespace(prefix, uri)
            except ValueError:
                # ElementTree reserves prefixes such as ns0. They are restored
                # on the serialized root element below when otherwise unused.
                pass
    return namespaces


def _restore_namespace_declarations(
    serialized_xml: bytes, namespaces: dict[str, str]
) -> bytes:
    """Restore unused source declarations that ElementTree would otherwise drop."""

    text = serialized_xml.decode("utf-8")
    declaration_end = text.find("?>")
    root_start = text.find("<", declaration_end + 2 if declaration_end >= 0 else 0)
    root_end = text.find(">", root_start)
    if root_start < 0 or root_end < 0:
        raise ValueError("Unable to locate the document root element")

    root_opening = text[root_start:root_end]
    additions: list[str] = []
    for prefix, uri in namespaces.items():
        if not prefix or prefix == "xml":
            continue
        marker = f"xmlns:{prefix}="
        if marker not in root_opening:
            additions.append(f' xmlns:{prefix}="{html.escape(uri, quote=True)}"')

    if additions:
        text = text[:root_end] + "".join(additions) + text[root_end:]
    return text.encode("utf-8")


def apply_pagination_to_xml(
    document_xml: bytes,
    *,
    keep_with_next: str = "",
    keep_together: str = "",
    detect_styles: bool = True,
    widow_control: bool = True,
    heading_prefixes: tuple[str, ...] = DEFAULT_HEADING_PREFIXES,
) -> tuple[bytes, dict[str, int]]:
    """Return updated WordprocessingML and anonymized application counts."""

    namespaces = _register_namespaces(document_xml)
    root = ET.fromstring(document_xml)
    body = root.find(f"{W}body")
    if body is None:
        raise ValueError("DOCX document.xml does not contain a Word document body")

    paragraphs = list(body.iter(f"{W}p"))
    explicit_keep_next = parse_paragraph_selector(keep_with_next, len(paragraphs))
    explicit_keep_together = parse_paragraph_selector(
        keep_together, len(paragraphs)
    )

    keep_next_count = 0
    keep_together_count = 0
    widow_count = 0

    for index, paragraph in enumerate(paragraphs):
        properties = _paragraph_properties(paragraph)
        style = _paragraph_style(properties)

        should_keep_next = index in explicit_keep_next or (
            detect_styles and _style_matches(style, heading_prefixes)
        )
        should_keep_together = index in explicit_keep_together or (
            detect_styles and _is_list_paragraph(properties, style)
        )

        if should_keep_next:
            _enable_property(properties, "keepNext")
            keep_next_count += 1
        if should_keep_together:
            _enable_property(properties, "keepLines")
            keep_together_count += 1
        if widow_control:
            _enable_property(properties, "widowControl")
            widow_count += 1

    updated = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    updated = _restore_namespace_declarations(updated, namespaces)
    return updated, {
        "paragraphs": len(paragraphs),
        "keep_with_next": keep_next_count,
        "keep_together": keep_together_count,
        "widow_control": widow_count,
    }


def improve_docx(
    source: Path,
    destination: Path,
    *,
    keep_with_next: str = "",
    keep_together: str = "",
    detect_styles: bool = True,
    widow_control: bool = True,
) -> dict[str, int]:
    """Copy a DOCX while applying pagination safeguards to its body XML."""

    source = source.resolve()
    destination = destination.resolve()
    if source.suffix.lower() != ".docx" or destination.suffix.lower() != ".docx":
        raise ValueError("Both input and output must use the .docx extension")
    if not source.is_file() or not zipfile.is_zipfile(source):
        raise ValueError(f"Input is not a valid DOCX archive: {source}")

    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = tempfile.NamedTemporaryFile(
        prefix=f".{destination.stem}-",
        suffix=".docx",
        dir=destination.parent,
        delete=False,
    )
    temporary_path = Path(temporary.name)
    temporary.close()

    try:
        stats: dict[str, int] | None = None
        with zipfile.ZipFile(source, "r") as input_archive, zipfile.ZipFile(
            temporary_path, "w"
        ) as output_archive:
            output_archive.comment = input_archive.comment
            names = set(input_archive.namelist())
            if "word/document.xml" not in names:
                raise ValueError("DOCX archive is missing word/document.xml")

            for item in input_archive.infolist():
                data = input_archive.read(item.filename)
                if item.filename == "word/document.xml":
                    data, stats = apply_pagination_to_xml(
                        data,
                        keep_with_next=keep_with_next,
                        keep_together=keep_together,
                        detect_styles=detect_styles,
                        widow_control=widow_control,
                    )
                output_archive.writestr(item, data)

        if stats is None:
            raise ValueError("DOCX body XML was not processed")
        os.replace(temporary_path, destination)
        return stats
    finally:
        temporary_path.unlink(missing_ok=True)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply conservative pagination safeguards to a DOCX file."
    )
    parser.add_argument("--input", type=Path, required=True, help="Source DOCX")
    parser.add_argument("--output", type=Path, required=True, help="Output DOCX")
    parser.add_argument(
        "--keep-with-next",
        default="",
        help="Zero-based paragraph indexes/ranges, for example 0,2-4 or all",
    )
    parser.add_argument(
        "--keep-together",
        default="",
        help="Zero-based paragraph indexes/ranges, for example 5-12 or all",
    )
    parser.add_argument(
        "--no-style-detection",
        action="store_true",
        help="Do not automatically protect heading and list styles",
    )
    parser.add_argument(
        "--no-widow-control",
        action="store_true",
        help="Do not enable widow/orphan control on body paragraphs",
    )
    args = parser.parse_args()

    stats = improve_docx(
        args.input,
        args.output,
        keep_with_next=args.keep_with_next,
        keep_together=args.keep_together,
        detect_styles=not args.no_style_detection,
        widow_control=not args.no_widow_control,
    )
    print(json.dumps({"output": str(args.output), **stats}, indent=2))


if __name__ == "__main__":
    main()

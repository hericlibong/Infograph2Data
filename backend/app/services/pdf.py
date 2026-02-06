"""PDF processing service."""

from io import BytesIO
from pathlib import Path

import fitz  # PyMuPDF

from backend.app.schemas.extraction import PageInfo


def get_page_count(pdf_path: Path) -> int:
    """Get the number of pages in a PDF."""
    with fitz.open(pdf_path) as doc:
        return len(doc)


def get_pages_info(pdf_path: Path) -> list[PageInfo]:
    """Get information about all pages in a PDF."""
    pages = []
    with fitz.open(pdf_path) as doc:
        for i, page in enumerate(doc):
            text = page.get_text().strip()
            pages.append(
                PageInfo(
                    page=i + 1,
                    width=page.rect.width,
                    height=page.rect.height,
                    has_text=len(text) > 0,
                )
            )
    return pages


def render_page(
    pdf_path: Path,
    page_num: int,
    scale: float = 1.5,
    format: str = "png",
) -> tuple[bytes, str]:
    """
    Render a PDF page as an image.

    Args:
        pdf_path: Path to PDF file
        page_num: Page number (1-indexed)
        scale: Render scale (1.0 = 72 DPI)
        format: Output format ("png" or "jpeg")

    Returns:
        Tuple of (image bytes, content type)
    """
    with fitz.open(pdf_path) as doc:
        if page_num < 1 or page_num > len(doc):
            raise ValueError(f"Page {page_num} out of range (1-{len(doc)})")

        page = doc[page_num - 1]
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat)

        if format == "jpeg":
            img_bytes = pix.tobytes("jpeg")
            content_type = "image/jpeg"
        else:
            img_bytes = pix.tobytes("png")
            content_type = "image/png"

        return img_bytes, content_type


def extract_text_blocks(
    pdf_path: Path,
    page_num: int,
    bbox: list[float] | None = None,
) -> list[dict]:
    """
    Extract text blocks from a PDF page.

    Args:
        pdf_path: Path to PDF file
        page_num: Page number (1-indexed)
        bbox: Optional bounding box [x1, y1, x2, y2]

    Returns:
        List of text blocks with position and content
    """
    with fitz.open(pdf_path) as doc:
        if page_num < 1 or page_num > len(doc):
            raise ValueError(f"Page {page_num} out of range (1-{len(doc)})")

        page = doc[page_num - 1]

        # Get text blocks: (x0, y0, x1, y1, "text", block_no, block_type)
        blocks = page.get_text("blocks")

        result = []
        for block in blocks:
            x0, y0, x1, y1, text, block_no, block_type = block

            # Filter by bbox if provided
            if bbox:
                bx1, by1, bx2, by2 = bbox
                # Skip blocks outside bbox
                if x1 < bx1 or x0 > bx2 or y1 < by1 or y0 > by2:
                    continue

            # Only include text blocks (type 0)
            if block_type == 0 and text.strip():
                result.append(
                    {
                        "x0": x0,
                        "y0": y0,
                        "x1": x1,
                        "y1": y1,
                        "text": text.strip(),
                        "block_no": block_no,
                    }
                )

        return result


def extract_page_text(
    pdf_path: Path,
    page_num: int,
    bbox: list[float] | None = None,
) -> str:
    """
    Extract all text from a PDF page.

    Args:
        pdf_path: Path to PDF file
        page_num: Page number (1-indexed)
        bbox: Optional bounding box [x1, y1, x2, y2]

    Returns:
        Extracted text as string
    """
    with fitz.open(pdf_path) as doc:
        if page_num < 1 or page_num > len(doc):
            raise ValueError(f"Page {page_num} out of range (1-{len(doc)})")

        page = doc[page_num - 1]

        if bbox:
            rect = fitz.Rect(bbox)
            text = page.get_text(clip=rect)
        else:
            text = page.get_text()

        return text.strip()


def page_has_text(pdf_path: Path, page_num: int) -> bool:
    """Check if a PDF page has extractable text."""
    text = extract_page_text(pdf_path, page_num)
    return len(text) > 10  # Minimum threshold for "usable" text

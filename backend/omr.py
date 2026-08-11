"""Optical music recognition: PDF/image -> MusicXML, via the homr engine."""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Callable

import fitz  # PyMuPDF

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".bmp", ".tif", ".tiff", ".webp", ".gif"}
XML_SUFFIXES = {".musicxml", ".xml", ".mxl"}
PDF_RENDER_DPI = 300
MAX_PAGES = 20

_HOMR = str(Path(sys.executable).with_name("homr"))

_STAFF_COUNT = re.compile(r"Found (\d+) staffs")
_STAFF_RUN = re.compile(r"Running TrOmr inference on staff image (\d+)")


class OmrError(RuntimeError):
    pass


def pdf_to_images(pdf_path: Path, out_dir: Path) -> list[Path]:
    doc = fitz.open(pdf_path)
    pages = []
    zoom = PDF_RENDER_DPI / 72
    for i, page in enumerate(doc):
        if i >= MAX_PAGES:
            break
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), colorspace=fitz.csGRAY)
        path = out_dir / f"page-{i + 1:03d}.png"
        pix.save(path)
        pages.append(path)
    doc.close()
    if not pages:
        raise OmrError("The PDF has no pages.")
    return pages


def prepare_pages(source: Path, work_dir: Path) -> tuple[str, list[Path]]:
    """Return ('pdf'|'image'|'musicxml', page image paths)."""
    suffix = source.suffix.lower()
    if suffix == ".pdf":
        return "pdf", pdf_to_images(source, work_dir)
    if suffix in XML_SUFFIXES:
        return "musicxml", []
    if suffix in IMAGE_SUFFIXES:
        target = work_dir / f"page-001{suffix}"
        shutil.copyfile(source, target)
        return "image", [target]
    raise OmrError(
        f"Unsupported file type '{suffix}'. Upload a PDF, an image "
        "(PNG/JPG/TIFF/WEBP), or a MusicXML file."
    )


def run_homr(
    image: Path,
    on_progress: Callable[[str, float | None], None] | None = None,
) -> tuple[Path, Path | None]:
    """Run the OMR engine on one page image.

    Returns the MusicXML path and, when the engine produced one, the annotated
    "teaser" image showing which staves it found.
    """
    expected = image.with_suffix(".musicxml")
    teaser = image.with_name(f"{image.stem}_teaser.png")
    if expected.exists():
        expected.unlink()

    env = dict(os.environ, PYTHONWARNINGS="ignore", PYTHONUNBUFFERED="1")
    process = subprocess.Popen(
        [_HOMR, str(image)],
        cwd=str(image.parent),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env=env,
        text=True,
        bufsize=1,
    )

    tail: list[str] = []
    total_staves = 0
    assert process.stdout is not None
    for line in process.stdout:
        line = line.rstrip()
        if not line:
            continue
        tail.append(line)
        del tail[:-40]
        if not on_progress:
            continue
        if m := _STAFF_COUNT.search(line):
            total_staves = int(m.group(1))
            on_progress(f"Found {total_staves} staff lines", None)
        elif m := _STAFF_RUN.search(line):
            done = int(m.group(1))
            fraction = (done / total_staves) if total_staves else None
            on_progress(f"Reading staff {done + 1}"
                        + (f" of {total_staves}" if total_staves else ""), fraction)
        elif "Dewarping" in line and "done" not in line:
            on_progress("Straightening staff lines", None)

    process.wait()
    if not expected.exists():
        detail = "\n".join(tail[-8:])
        raise OmrError(
            "The engine could not find any music on this page. Make sure the image "
            "is a clear, upright scan of printed sheet music.\n\n" + detail
        )
    return expected, (teaser if teaser.exists() else None)

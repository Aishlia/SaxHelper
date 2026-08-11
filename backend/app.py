"""Sax Sheet Reader — upload sheet music, get note-by-note saxophone fingerings."""

from __future__ import annotations

import json
import shutil
import threading
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import fingerings
import omr
import score as score_lib
import warmups

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
SAMPLES = ROOT / "samples"
JOBS_DIR = ROOT / ".jobs"
JOBS_DIR.mkdir(exist_ok=True)

MAX_UPLOAD_BYTES = 40 * 1024 * 1024
JOB_TTL_SECONDS = 24 * 3600


def _sweep_old_jobs() -> None:
    """Uploads and rendered pages are scratch data; don't let them pile up."""
    cutoff = time.time() - JOB_TTL_SECONDS
    for path in JOBS_DIR.iterdir():
        if path.is_dir() and path.stat().st_mtime < cutoff:
            shutil.rmtree(path, ignore_errors=True)


_sweep_old_jobs()

app = FastAPI(title="Sax Sheet Reader")

_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _update(job_id: str, **fields) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is not None:
            job.update(fields)


def _transcribe(job_id: str, source: Path) -> None:
    work_dir = JOBS_DIR / job_id
    try:
        _update(job_id, status="running", message="Preparing file", progress=0.02)
        kind, pages = omr.prepare_pages(source, work_dir)

        page_files: list[str] = []
        if kind == "musicxml":
            _update(job_id, message="Reading MusicXML", progress=0.5)
            result = score_lib.parse_musicxml(str(source))
        else:
            page_scores = []
            total = len(pages)
            for i, page in enumerate(pages):
                base = i / total

                def on_progress(message: str, fraction: float | None, base=base, i=i) -> None:
                    span = (1 / total) * 0.9
                    prefix = f"Page {i + 1}/{total}: " if total > 1 else ""
                    _update(job_id, message=prefix + message,
                            progress=round(0.05 + 0.9 * (base + span * (fraction or 0.15)), 3))

                on_progress("Looking for staves", 0.02)
                musicxml, teaser = omr.run_homr(page, on_progress)
                page_scores.append(score_lib.parse_musicxml(str(musicxml)))
                # The teaser marks the staves the engine locked onto, which is
                # the most useful thing to eyeball against the transcription.
                page_files.append((teaser or page).name)
            result = score_lib.merge_scores(page_scores)

        if not result["notes"]:
            raise omr.OmrError(
                "No notes were recognised. Try a higher-resolution scan, or crop the "
                "image to just the staves."
            )

        result["source"] = {
            "filename": _jobs.get(job_id, {}).get("filename", source.name),
            "kind": kind,
            "pageUrls": [f"/api/jobs/{job_id}/pages/{name}" for name in page_files],
        }
        _update(job_id, status="done", progress=1.0, message="Done", result=result,
                finishedAt=time.time())
    except Exception as exc:  # surfaced to the user in the UI
        _update(job_id, status="error", message=str(exc), progress=1.0,
                finishedAt=time.time())


def _start_job(source: Path) -> str:
    job_id = uuid.uuid4().hex[:12]
    (JOBS_DIR / job_id).mkdir(parents=True, exist_ok=True)
    with _jobs_lock:
        _jobs[job_id] = {"id": job_id, "status": "queued", "progress": 0.0,
                         "message": "Queued", "createdAt": time.time(),
                         "filename": source.name}
    threading.Thread(target=_transcribe, args=(job_id, source), daemon=True).start()
    return job_id


@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)) -> JSONResponse:
    name = Path(file.filename or "upload").name
    suffix = Path(name).suffix.lower()
    if suffix not in {".pdf", *omr.IMAGE_SUFFIXES, *omr.XML_SUFFIXES}:
        raise HTTPException(400, f"Unsupported file type '{suffix or name}'. "
                                 "Upload a PDF, an image, or MusicXML.")

    job_id = uuid.uuid4().hex[:12]
    work_dir = JOBS_DIR / job_id
    work_dir.mkdir(parents=True, exist_ok=True)
    source = work_dir / f"source{suffix}"

    size = 0
    with source.open("wb") as out:
        while chunk := await file.read(1 << 20):
            size += len(chunk)
            if size > MAX_UPLOAD_BYTES:
                out.close()
                shutil.rmtree(work_dir, ignore_errors=True)
                raise HTTPException(413, "File is larger than 40 MB.")
            out.write(chunk)
    if size == 0:
        shutil.rmtree(work_dir, ignore_errors=True)
        raise HTTPException(400, "The uploaded file is empty.")

    with _jobs_lock:
        _jobs[job_id] = {"id": job_id, "status": "queued", "progress": 0.0,
                         "message": "Queued", "createdAt": time.time(), "filename": name}
    threading.Thread(target=_transcribe, args=(job_id, source), daemon=True).start()
    return JSONResponse({"jobId": job_id})


@app.post("/api/sample")
def sample() -> JSONResponse:
    sample_file = SAMPLES / "careless_whisper.png"
    if not sample_file.exists():
        raise HTTPException(404, "Sample sheet music is missing.")

    cache = SAMPLES / "careless_whisper.cache.json"
    if cache.exists():
        result = json.loads(cache.read_text())
        result.setdefault("source", {})
        detected = SAMPLES / "careless_whisper_teaser.png"
        page = detected if detected.exists() else sample_file
        result["source"]["pageUrls"] = [f"/samples/{page.name}"]
        result["source"]["filename"] = "Careless Whisper (sample)"
        job_id = uuid.uuid4().hex[:12]
        with _jobs_lock:
            _jobs[job_id] = {
                "id": job_id, "status": "done", "progress": 1.0, "message": "Done",
                "createdAt": time.time(), "filename": sample_file.name, "result": result,
            }
        return JSONResponse({"jobId": job_id})
    return JSONResponse({"jobId": _start_job(sample_file)})


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str) -> JSONResponse:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is None:
            raise HTTPException(404, "Unknown job.")
        return JSONResponse(dict(job))


@app.get("/api/jobs/{job_id}/pages/{name}")
def job_page(job_id: str, name: str) -> FileResponse:
    path = (JOBS_DIR / job_id / Path(name).name)
    if not path.exists():
        raise HTTPException(404, "Unknown page.")
    return FileResponse(path)


@app.get("/api/fingerings")
def all_fingerings() -> JSONResponse:
    return JSONResponse({
        "diagram": fingerings.DIAGRAM,
        "instruments": fingerings.INSTRUMENTS,
        "range": {"lowest": fingerings.LOWEST, "highest": fingerings.HIGHEST},
        "chart": fingerings.chart(),
    })


@app.get("/api/fingerings/{midi}")
def one_fingering(midi: int) -> JSONResponse:
    return JSONResponse({"midi": midi, "name": fingerings.note_name(midi),
                         **fingerings.fingerings_for(midi)})


@app.get("/api/warmups")
def practice_drills() -> JSONResponse:
    return JSONResponse({"groups": warmups.catalog()})


@app.get("/api/health")
def health() -> JSONResponse:
    return JSONResponse({"ok": True, "engine": "homr"})


app.mount("/samples", StaticFiles(directory=str(SAMPLES)), name="samples")
app.mount("/", StaticFiles(directory=str(FRONTEND), html=True), name="frontend")

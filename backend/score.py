"""Turn MusicXML into a flat, monophonic note sequence for the player."""

from __future__ import annotations

import xml.etree.ElementTree as ET

from fingerings import note_name

STEP_TO_SEMITONE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}

TYPE_TO_VEX = {
    "breve": "1/2", "whole": "w", "half": "h", "quarter": "q", "eighth": "8",
    "16th": "16", "32nd": "32", "64th": "64", "128th": "128",
}

# Fallback when <type> is missing: quarter-note fractions -> vexflow duration.
QUARTERS_TO_VEX = [(4.0, "w"), (2.0, "h"), (1.0, "q"), (0.5, "8"),
                   (0.25, "16"), (0.125, "32")]


def _strip_ns(root: ET.Element) -> ET.Element:
    for el in root.iter():
        if isinstance(el.tag, str) and "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]
    return root


def _vex_duration(type_text: str | None, quarters: float) -> str:
    if type_text and type_text in TYPE_TO_VEX:
        return TYPE_TO_VEX[type_text]
    for q, vex in QUARTERS_TO_VEX:
        if quarters >= q - 1e-6:
            return vex
    return "16"


def parse_musicxml(path: str) -> dict:
    root = _strip_ns(ET.parse(path).getroot())

    title = None
    for tag in ("work-title", "movement-title"):
        el = root.find(f".//{tag}")
        if el is not None and (el.text or "").strip():
            title = el.text.strip()
            break

    part = root.find(".//part")
    if part is None:
        return {"title": title, "notes": [], "measures": [], "tempo": 90,
                "keyFifths": 0, "timeSignature": "4/4"}

    divisions = 4
    fifths = 0
    beats, beat_type = 4, 4
    tempo = None

    notes: list[dict] = []
    measures: list[dict] = []
    position = 0.0  # in quarter notes from the start of the piece

    for m_index, measure in enumerate(part.findall("measure")):
        measure_number = measure.get("number") or str(m_index + 1)
        measure_start = position
        first_note_index = len(notes)

        for attributes in measure.findall("attributes"):
            if (d := attributes.find("divisions")) is not None and d.text:
                divisions = int(float(d.text))
            if (k := attributes.find("key/fifths")) is not None and k.text:
                fifths = int(k.text)
            if (t := attributes.find("time")) is not None:
                if (b := t.find("beats")) is not None and b.text:
                    beats = int(b.text)
                if (bt := t.find("beat-type")) is not None and bt.text:
                    beat_type = int(bt.text)

        for sound in measure.findall(".//sound"):
            if sound.get("tempo"):
                tempo = tempo or float(sound.get("tempo"))
        for per_minute in measure.findall(".//metronome/per-minute"):
            if per_minute.text:
                try:
                    tempo = tempo or float(per_minute.text)
                except ValueError:
                    pass

        for child in measure:
            if child.tag == "backup":
                dur = child.find("duration")
                if dur is not None and dur.text:
                    position -= float(dur.text) / divisions
                continue
            if child.tag == "forward":
                dur = child.find("duration")
                if dur is not None and dur.text:
                    position += float(dur.text) / divisions
                continue
            if child.tag != "note":
                continue

            note = child
            is_grace = note.find("grace") is not None
            is_chord = note.find("chord") is not None
            is_rest = note.find("rest") is not None
            dur_el = note.find("duration")
            quarters = (float(dur_el.text) / divisions
                        if dur_el is not None and dur_el.text else 0.0)
            type_el = note.find("type")
            type_text = type_el.text if type_el is not None else None
            dots = len(note.findall("dot"))

            if is_grace:
                # Grace notes carry no rhythmic weight; keep the melody clean.
                continue

            midi = None
            if not is_rest:
                pitch = note.find("pitch")
                if pitch is None:
                    continue
                step = (pitch.findtext("step") or "C").strip().upper()
                octave = int(float(pitch.findtext("octave") or 4))
                alter = int(float(pitch.findtext("alter") or 0))
                midi = 12 * (octave + 1) + STEP_TO_SEMITONE.get(step, 0) + alter

            if is_chord:
                # Saxophone is monophonic: keep the highest note of the chord.
                if notes and midi is not None and not notes[-1]["rest"]:
                    if midi > notes[-1]["midi"]:
                        notes[-1]["midi"] = midi
                        notes[-1]["name"] = note_name(midi)
                continue

            tie_start = any(t.get("type") == "start" for t in note.findall("tie"))
            tie_stop = any(t.get("type") == "stop" for t in note.findall("tie"))

            entry = {
                "index": len(notes),
                "measure": measure_number,
                "measureIndex": m_index,
                "rest": is_rest,
                "midi": midi,
                "name": note_name(midi) if midi is not None else None,
                "duration": _vex_duration(type_text, quarters),
                "dots": dots,
                "quarters": quarters,
                "start": position,
                "tieStart": tie_start,
                "tieStop": tie_stop,
                "articulations": [a.tag for a in note.findall("notations/articulations/*")],
            }
            notes.append(entry)
            position += quarters

        measures.append({
            "number": measure_number,
            "index": m_index,
            "start": measure_start,
            "quarters": position - measure_start,
            "firstNote": first_note_index,
            "noteCount": len(notes) - first_note_index,
        })

    # Sounding length of tied groups, so playback holds them properly.
    for i, n in enumerate(notes):
        total = n["quarters"]
        j = i
        while notes[j]["tieStart"] and j + 1 < len(notes) and notes[j + 1]["tieStop"]:
            j += 1
            total += notes[j]["quarters"]
        n["soundingQuarters"] = total

    return _finalize({
        "title": title,
        "notes": notes,
        "measures": measures,
        "tempo": tempo or 90,
        "keyFifths": fifths,
        "timeSignature": f"{beats}/{beat_type}",
    })


def _finalize(score: dict) -> dict:
    notes, measures = score["notes"], score["measures"]
    for i, note in enumerate(notes):
        note["index"] = i
    playable = [n for n in notes if not n["rest"]]
    score["stats"] = {
        "noteCount": len(playable),
        "restCount": len(notes) - len(playable),
        "measureCount": len(measures),
        "lowest": min((n["midi"] for n in playable), default=None),
        "highest": max((n["midi"] for n in playable), default=None),
    }
    return score


def merge_scores(scores: list[dict]) -> dict:
    """Concatenate per-page scores into one continuous piece."""
    scores = [s for s in scores if s["notes"]]
    if not scores:
        return _finalize({"title": None, "notes": [], "measures": [], "tempo": 90,
                          "keyFifths": 0, "timeSignature": "4/4"})
    if len(scores) == 1:
        return scores[0]

    merged = {
        "title": next((s["title"] for s in scores if s["title"]), None),
        "notes": [],
        "measures": [],
        "tempo": scores[0]["tempo"],
        "keyFifths": scores[0]["keyFifths"],
        "timeSignature": scores[0]["timeSignature"],
    }
    time_offset = 0.0
    measure_offset = 0
    for page, score in enumerate(scores, start=1):
        note_offset = len(merged["notes"])
        for note in score["notes"]:
            note = dict(note)
            note["start"] += time_offset
            note["measureIndex"] += measure_offset
            note["page"] = page
            merged["notes"].append(note)
        for measure in score["measures"]:
            measure = dict(measure)
            measure["start"] += time_offset
            measure["index"] += measure_offset
            measure["firstNote"] += note_offset
            measure["page"] = page
            merged["measures"].append(measure)
        last = merged["measures"][-1]
        time_offset = last["start"] + last["quarters"]
        measure_offset += len(score["measures"])
    for i, measure in enumerate(merged["measures"]):
        measure["number"] = str(i + 1)
    return _finalize(merged)

"""Practice drills: warm-ups, scales, arpeggios and patterns.

A drill is just an ordered list of written MIDI pitches, which is all the
practice page needs to lay out one fingering diagram per note. Every pitch here
stays inside the standard written range (low Bb3 to F#6), so no drill ever falls
back to a substitute fingering.
"""

from __future__ import annotations

import fingerings

# Scale degrees in semitones above the tonic.
_MAJOR = [0, 2, 4, 5, 7, 9, 11, 12]
_MAJOR_2 = _MAJOR + [14, 16, 17, 19, 21, 23, 24]
_MINOR = [0, 2, 3, 5, 7, 8, 10, 12]
_TRIAD = [0, 4, 7, 12]
_DOM7 = [0, 4, 7, 10, 12]
_PENTATONIC = [0, 2, 4, 7, 9, 12]
_BLUES = [0, 3, 5, 6, 7, 10, 12]
_THIRDS = [0, 4, 2, 5, 4, 7, 5, 9, 7, 11, 9, 12]

# Written key, the tonic that puts the scale in a comfortable place, and the
# key signature to spell it with. These are the keys band music actually asks
# for: written G is concert Bb, written C is concert Eb, and so on.
_MAJOR_KEYS = [
    ("G", 67, 1), ("C", 60, 0), ("D", 62, 2), ("F", 65, -1),
    ("B♭", 58, -2), ("A", 69, 3), ("E♭", 63, -3),
]
_ARPEGGIO_KEYS = _MAJOR_KEYS[:5]
_MINOR_KEYS = [("A", 69, 0), ("E", 64, 1), ("D", 62, -1)]

_SCALE_HINT = ("One octave, up and down. Slow enough that every note speaks, "
               "then push the tempo.")


def _up_down(tonic: int, pattern: list[int]) -> list[int]:
    up = [tonic + step for step in pattern]
    return up + up[-2::-1]


def _drill(drill_id: str, name: str, notes: list[int], hint: str,
           fifths: int = 0, tonic: int | None = None,
           quality: str | None = None) -> dict:
    return {
        "id": drill_id,
        "name": name,
        "notes": notes,
        "hint": hint,
        "fifths": fifths,
        "tonic": tonic,
        "quality": quality,
    }


def _warm_up() -> list[dict]:
    return [
        # Flat spelling: the bottom note of the horn is always called low Bb.
        _drill("long-tones", "Long tones",
               [74, 71, 67, 64, 60, 58],
               "One long breath per note, six slow counts each. Listen for a tone "
               "that starts cleanly and does not sag in the middle.", -1),
        _drill("octave-slurs", "Octave slurs",
               [62, 74, 64, 76, 65, 77, 67, 79, 69, 81, 71, 83, 72, 84],
               "Slur each pair without re-tonguing. Only the octave key moves — "
               "every other finger stays exactly where it is."),
        _drill("low-register", "Low register",
               list(range(58, 66)),
               "The bottom of the horn wants a relaxed throat and firm, quiet "
               "fingers. Keep the little finger loose as it walks across the table.",
               -1),
        _drill("chromatic-octave", "Chromatic octave",
               _up_down(60, list(range(13))),
               "Every semitone in one octave. Watch the bis B♭ and the side C: "
               "those are the two that trip most people up."),
    ]


def _major_scales() -> list[dict]:
    drills = []
    for key, tonic, fifths in _MAJOR_KEYS:
        hint = _SCALE_HINT
        if key == "B♭":
            hint = ("One octave from the lowest note on the horn. Take the low B♭ "
                    "gently — it needs air more than pressure.")
        drills.append(_drill(f"major-{key[0].lower()}{'b' if '♭' in key else ''}",
                             f"{key} major", _up_down(tonic, _MAJOR), hint,
                             fifths, tonic, "major"))
    drills.append(_drill(
        "major-c-2oct", "C major, two octaves", _up_down(60, _MAJOR_2),
        "Two octaves. The turn at the top is where the octave key has to be "
        "exactly in time with the fingers.", 0, 60, "major"))
    return drills


def _arpeggios() -> list[dict]:
    drills = [
        _drill(f"arp-{key[0].lower()}{'b' if '♭' in key else ''}",
               f"{key} major arpeggio", _up_down(tonic, _TRIAD),
               "Root, third, fifth, octave and back down. Listen hard to the "
               "third: it is the note that decides whether the chord sounds in tune.",
               fifths, tonic, "major")
        for key, tonic, fifths in _ARPEGGIO_KEYS
    ]
    drills.append(_drill(
        "dom7-c", "C dominant 7th", _up_down(60, _DOM7),
        "The chord that always wants to resolve. You will meet it in every "
        "blues and every standard.", 0, 60, "dominant 7th"))
    return drills


def _minor_scales() -> list[dict]:
    return [
        _drill(f"minor-{key.lower()}", f"{key} natural minor",
               _up_down(tonic, _MINOR),
               "Natural minor, one octave up and down. It shares a key signature "
               "with its relative major, so the fingerings are already familiar.",
               fifths, tonic, "minor")
        for key, tonic, fifths in _MINOR_KEYS
    ]


def _patterns() -> list[dict]:
    return [
        _drill("thirds-c", "C major in thirds", [60 + s for s in _THIRDS],
               "Up in thirds: 1-3, 2-4, 3-5, and on. Awkward on purpose — it is "
               "the quickest way to smooth out clumsy finger changes.", 0, 60, "major"),
        _drill("pentatonic-c", "C major pentatonic", _up_down(60, _PENTATONIC),
               "Five notes and no wrong turns. A good first vocabulary for "
               "making something up.", 0, 60, "major pentatonic"),
        _drill("blues-c", "C blues scale", _up_down(60, _BLUES),
               "The minor blues scale, flat five and all. Lean on that flat five "
               "and bend into it a little.", 0, 60, "blues"),
    ]


def catalog() -> list[dict]:
    return [
        {"name": "Warm up", "drills": _warm_up()},
        {"name": "Major scales", "drills": _major_scales()},
        {"name": "Arpeggios", "drills": _arpeggios()},
        {"name": "Minor scales", "drills": _minor_scales()},
        {"name": "Patterns", "drills": _patterns()},
    ]


def out_of_range() -> list[tuple[str, int]]:
    """Drill notes with no real fingering. Should always be empty."""
    return [
        (drill["id"], note)
        for group in catalog() for drill in group["drills"] for note in drill["notes"]
        if not (fingerings.LOWEST <= note <= fingerings.HIGHEST)
    ]

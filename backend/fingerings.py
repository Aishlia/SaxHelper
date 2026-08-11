"""Saxophone key layout and fingering table.

All fingerings are expressed in *written* pitch, which is what appears on a
transposed saxophone part. The fingerings are identical for every member of the
saxophone family; only the resulting concert pitch differs, which is handled by
INSTRUMENTS.
"""

from __future__ import annotations

# --- Key geometry -----------------------------------------------------------
# A printed-chart style layout: each key is drawn roughly as its real shape and
# in its real place on the horn, so the diagram can be read straight onto the
# instrument. Coordinates live in a 220 x 500 SVG user space.
#
# "anchor" is where the key name is written and "side" which way it runs;
# side "in" puts the letter inside the key, which only the big pearls have room
# for. Rotations are in degrees about the shape's own centre.

KEYS: list[dict] = [
    # ── left hand: front F and the palm keys ──────────────────────────────
    {"id": "FF", "label": "front F", "hand": "L", "finger": "index (roll up)",
     "shape": "path", "anchor": [164, 46], "side": "right",
     "d": ("M 126 22 C 147 15 163 31 157 49 C 151 67 133 83 121 77 "
           "C 111 72 117 60 125 55 C 133 50 127 42 121 39 C 114 35 117 26 126 22 Z")},
    {"id": "PF", "label": "palm F", "hand": "L", "finger": "palm",
     "shape": "ellipse", "cx": 54, "cy": 74, "rx": 14, "ry": 24, "rotate": 20,
     "anchor": [32, 68], "side": "left"},
    {"id": "PEB", "label": "palm Eb", "hand": "L", "finger": "palm",
     "shape": "ellipse", "cx": 32, "cy": 122, "rx": 13, "ry": 24, "rotate": 12,
     "anchor": [12, 122], "side": "left"},
    {"id": "PD", "label": "palm D", "hand": "L", "finger": "palm",
     "shape": "ellipse", "cx": 71, "cy": 148, "rx": 13, "ry": 24, "rotate": 18,
     "anchor": [49, 158], "side": "left"},

    # ── left hand: thumb octave key ───────────────────────────────────────
    {"id": "OCT", "label": "octave", "hand": "L", "finger": "thumb",
     "shape": "path", "anchor": [204, 112], "side": "right",
     "d": ("M 176 90 C 192 84 202 96 198 112 C 194 128 185 138 179 135 "
           "C 173 132 177 123 179 117 C 181 111 174 109 172 104 C 170 97 172 92 176 90 Z")},

    # ── left hand: the three pearls plus the bis key ──────────────────────
    {"id": "B1", "label": "B", "hand": "L", "finger": "1st (index)",
     "shape": "circle", "cx": 132, "cy": 112, "r": 19, "anchor": [132, 112], "side": "in"},
    {"id": "BIS", "label": "bis Bb", "hand": "L", "finger": "1st (index)",
     "shape": "circle", "cx": 124, "cy": 146, "r": 11, "anchor": [138, 148], "side": "right"},
    {"id": "B2", "label": "A", "hand": "L", "finger": "2nd (middle)",
     "shape": "circle", "cx": 136, "cy": 181, "r": 19, "anchor": [136, 181], "side": "in"},
    {"id": "B3", "label": "G", "hand": "L", "finger": "3rd (ring)",
     "shape": "circle", "cx": 113, "cy": 215, "r": 19, "anchor": [113, 215], "side": "in"},

    # ── left hand: the little-finger table ────────────────────────────────
    {"id": "GS", "label": "G#", "hand": "L", "finger": "4th (pinky)",
     "shape": "ellipse", "cx": 70, "cy": 248, "rx": 29, "ry": 11, "rotate": -10,
     "anchor": [33, 244], "side": "left"},
    {"id": "CS", "label": "low C#", "hand": "L", "finger": "4th (pinky)",
     "shape": "rect", "x": 40, "y": 262, "w": 24, "h": 24, "rx": 4, "rotate": -10,
     "anchor": [31, 278], "side": "left"},
    {"id": "LB", "label": "low B", "hand": "L", "finger": "4th (pinky)",
     "shape": "rect", "x": 66, "y": 264, "w": 24, "h": 24, "rx": 4, "rotate": -10,
     "anchor": [97, 270], "side": "right"},
    {"id": "LBB", "label": "low Bb", "hand": "L", "finger": "4th (pinky)",
     "shape": "path", "anchor": [30, 306], "side": "left",
     "transform": "translate(61 292) rotate(-8)",
     "d": "M -25 0 A 25 25 0 0 0 25 0 Z"},

    # ── right hand: side keys ─────────────────────────────────────────────
    {"id": "SE", "label": "side E", "hand": "R", "finger": "1st (index, side)",
     "shape": "rect", "x": 184, "y": 222, "w": 16, "h": 30, "rx": 8, "rotate": 4,
     "anchor": [204, 240], "side": "right"},
    {"id": "SC", "label": "side C", "hand": "R", "finger": "1st (index, side)",
     "shape": "rect", "x": 185, "y": 256, "w": 16, "h": 26, "rx": 8, "rotate": 4,
     "anchor": [205, 272], "side": "right"},
    {"id": "SBB", "label": "side Bb", "hand": "R", "finger": "1st (index, side)",
     "shape": "rect", "x": 186, "y": 286, "w": 16, "h": 32, "rx": 8, "rotate": 4,
     "anchor": [206, 305], "side": "right"},

    # ── right hand: the three pearls and the alternate F# ─────────────────
    {"id": "R1", "label": "F", "hand": "R", "finger": "1st (index)",
     "shape": "circle", "cx": 113, "cy": 320, "r": 18, "anchor": [113, 320], "side": "in"},
    {"id": "R2", "label": "E", "hand": "R", "finger": "2nd (middle)",
     "shape": "circle", "cx": 110, "cy": 366, "r": 18, "anchor": [110, 366], "side": "in"},
    {"id": "FS", "label": "alt F#", "hand": "R", "finger": "3rd (ring, side)",
     "shape": "ellipse", "cx": 153, "cy": 376, "rx": 11, "ry": 20, "rotate": 28,
     "anchor": [168, 380], "side": "right"},
    {"id": "R3", "label": "D", "hand": "R", "finger": "3rd (ring)",
     "shape": "circle", "cx": 128, "cy": 418, "r": 18, "anchor": [128, 418], "side": "in"},

    # ── right hand: the little-finger spatulas ────────────────────────────
    {"id": "REB", "label": "low Eb", "hand": "R", "finger": "4th (pinky)",
     "shape": "path", "anchor": [202, 436], "side": "right",
     "transform": "translate(176 452) rotate(-20)",
     "d": "M -23 -3 A 23 23 0 0 1 23 -3 Z"},
    {"id": "RC", "label": "low C", "hand": "R", "finger": "4th (pinky)",
     "shape": "path", "anchor": [204, 474], "side": "right",
     "transform": "translate(176 452) rotate(-20)",
     "d": "M -23 3 A 23 23 0 0 0 23 3 Z"},
]

DIAGRAM = {"width": 220, "height": 500, "keys": KEYS}

# --- Fingering table --------------------------------------------------------
# Written pitch (MIDI number) -> list of fingerings, best/most common first.
# Each fingering is (name, keys).

_LOW: dict[int, list[tuple[str, list[str]]]] = {
    58: [("standard", ["B1", "B2", "B3", "R1", "R2", "R3", "LBB"])],                 # Bb3
    59: [("standard", ["B1", "B2", "B3", "R1", "R2", "R3", "LB"])],                  # B3
    60: [("standard", ["B1", "B2", "B3", "R1", "R2", "R3", "RC"])],                  # C4
    61: [("standard", ["B1", "B2", "B3", "R1", "R2", "R3", "CS"])],                  # C#4
    62: [("standard", ["B1", "B2", "B3", "R1", "R2", "R3"])],                        # D4
    63: [("standard", ["B1", "B2", "B3", "R1", "R2", "R3", "REB"])],                 # Eb4
    64: [("standard", ["B1", "B2", "B3", "R1", "R2"])],                              # E4
    65: [("standard", ["B1", "B2", "B3", "R1"])],                                    # F4
    66: [("standard", ["B1", "B2", "B3", "R2"]),
         ("alternate F#", ["B1", "B2", "B3", "R1", "FS"])],                          # F#4
    67: [("standard", ["B1", "B2", "B3"])],                                          # G4
    68: [("standard", ["B1", "B2", "B3", "GS"])],                                    # G#4
    69: [("standard", ["B1", "B2"])],                                                # A4
    70: [("bis key", ["B1", "BIS"]),
         ("side Bb", ["B1", "SBB"])],                                                # Bb4
    71: [("standard", ["B1"])],                                                      # B4
    72: [("standard", ["B1", "SC"])],                                                # C5
    73: [("open", [])],                                                              # C#5
}

_PALM: dict[int, list[tuple[str, list[str]]]] = {
    85: [("octave key only", ["OCT"])],                                              # C#6
    86: [("standard", ["OCT", "PD"])],                                               # D6
    87: [("standard", ["OCT", "PD", "PEB"])],                                        # Eb6
    88: [("standard", ["OCT", "PD", "PEB", "SE"])],                                  # E6
    89: [("standard", ["OCT", "PD", "PEB", "PF"]),
         ("front F", ["OCT", "FF", "B2", "B3"])],                                    # F6
    90: [("standard", ["OCT", "PD", "PEB", "PF", "FS"]),
         ("front F#", ["OCT", "FF", "B2", "B3", "FS"])],                             # F#6
}


def _build_table() -> dict[int, list[tuple[str, list[str]]]]:
    table = dict(_LOW)
    # D5..C6 repeat the low register with the octave key added.
    for midi in range(74, 85):
        table[midi] = [(name, ["OCT"] + keys) for name, keys in _LOW[midi - 12]]
    table.update(_PALM)
    return table


TABLE = _build_table()

LOWEST, HIGHEST = min(TABLE), max(TABLE)

# --- Pitch naming and transposition ----------------------------------------

SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]

INSTRUMENTS = {
    # semitones from written pitch down to sounding (concert) pitch
    "soprano": {"label": "Soprano (Bb)", "transpose": -2},
    "alto": {"label": "Alto (Eb)", "transpose": -9},
    "tenor": {"label": "Tenor (Bb)", "transpose": -14},
    "baritone": {"label": "Baritone (Eb)", "transpose": -21},
}


def note_name(midi: int, prefer_flats: bool = False) -> str:
    names = FLAT_NAMES if prefer_flats else SHARP_NAMES
    return f"{names[midi % 12]}{midi // 12 - 1}"


def _octaves(semitones: int) -> str:
    count = semitones // 12
    return f"{count} octave" if count == 1 else f"{count} octaves"


def fingerings_for(midi: int) -> dict:
    """Return the fingering options for a written MIDI pitch."""
    if midi in TABLE:
        return {
            "inRange": True,
            "options": [{"name": n, "keys": k} for n, k in TABLE[midi]],
            "note": None,
        }

    if midi > HIGHEST:
        shift = 12 * ((midi - HIGHEST + 11) // 12)
        return {
            "inRange": False,
            "options": [{"name": f"{note_name(midi - shift)} fingering", "keys": k}
                        for n, k in TABLE[midi - shift]][:1],
            "note": ("Altissimo: above written F#6 there is no standard fingering "
                     f"— fingerings vary by player and horn. Showing "
                     f"{note_name(midi - shift)}, {_octaves(shift)} lower."),
        }

    shift = 12 * ((LOWEST - midi + 11) // 12)
    return {
        "inRange": False,
        "options": [{"name": f"{note_name(midi + shift)} fingering", "keys": k}
                    for n, k in TABLE[midi + shift]][:1],
        "note": (f"Below the range of the saxophone (written low Bb3). Showing "
                 f"{note_name(midi + shift)}, {_octaves(shift)} up."),
    }


def chart() -> list[dict]:
    """Every note in the standard written range, for the reference chart."""
    return [
        {
            "midi": m,
            "name": note_name(m),
            "flatName": note_name(m, prefer_flats=True),
            **fingerings_for(m),
        }
        for m in range(LOWEST, HIGHEST + 1)
    ]

#!/usr/bin/env python3
"""Generate the Malsori favicon (mal glyph + sound icon)."""

from __future__ import annotations

import argparse
from pathlib import Path
import xml.etree.ElementTree as ET


WHITE = "#ffffff"
DEFAULT_BG_COLOR = "#1f6f64"

# SVG path for the "mal" glyph sourced from Nanum Gothic Bold.
MAL_GLYPH_PATH = (
    "M535 453Q535 415 519.5 399.5Q504 384 466 384H166Q131 384 114.0 399.5Q97"
    " 415 97 453V742Q97 780 112.5 795.0Q128 810 166 810H466Q504 810 519.5"
    " 794.5Q535 779 535 741ZM423 703Q423 711 420.5 713.5Q418 716 410 716H222"
    "Q214 716 211.5 714.0Q209 712 209 704V491Q209 482 211.5 480.0Q214 478"
    " 222 478H410Q418 478 420.5 480.0Q423 482 423 491ZM932 561Q932 556 927.5"
    " 552.0Q923 548 918 548H782V353Q782 348 778.0 343.5Q774 339 769 339H680"
    "Q675 339 671.0 343.5Q667 348 667 354V829Q667 842 680 842H769Q782 842"
    " 782 829V643H918Q923 643 927.5 639.5Q932 636 932 631ZM808 -91Q808 -96"
    " 803.5 -100.5Q799 -105 794 -105H261Q222 -105 208.0 -90.0Q194 -75 194"
    " -43V78Q194 110 207.5 124.0Q221 138 260 138H658Q666 138 668.0 141.0Q670"
    " 144 670 153V186Q670 197 668.0 199.5Q666 202 657 202H206Q201 202 196.5"
    " 205.5Q192 209 192 214V280Q192 285 196.5 289.5Q201 294 206 294H714Q755"
    " 294 768.5 280.0Q782 266 782 232V114Q782 79 768.5 66.0Q755 53 714 53H319"
    "Q311 53 309.0 50.5Q307 48 307 40V-1Q307 -10 309.0 -11.5Q311 -13 320"
    " -13H793Q799 -13 803.5 -17.0Q808 -21 808 -27Z"
)

MAL_GLYPH_BOUNDS = (97.0, -105.0, 932.0, 842.0)


def fmt(value: float) -> str:
    """Format floats for SVG output without trailing zeros."""
    return f"{value:.3f}".rstrip("0").rstrip(".")


def wave_path(origin_x: float, center_y: float, radius: float) -> str:
    bulge = radius * 0.9
    return (
        f"M {fmt(origin_x)} {fmt(center_y - radius)} "
        f"Q {fmt(origin_x + bulge)} {fmt(center_y)} {fmt(origin_x)} {fmt(center_y + radius)}"
    )


def build_icon(output: Path, *, size: float, bg_color: str) -> None:
    center = size / 2.0
    radius = size * 0.47

    svg = ET.Element(
        "svg",
        attrib={
            "xmlns": "http://www.w3.org/2000/svg",
            "viewBox": f"0 0 {fmt(size)} {fmt(size)}",
            "width": fmt(size),
            "height": fmt(size),
            "role": "img",
            "aria-label": "Malsori mal and sound icon",
        },
    )
    svg.append(ET.Element("title"))
    svg[-1].text = "Malsori mal and sound icon"

    ET.SubElement(
        svg,
        "circle",
        attrib={
            "cx": fmt(center),
            "cy": fmt(center),
            "r": fmt(radius),
            "fill": bg_color,
        },
    )

    min_x, min_y, max_x, max_y = MAL_GLYPH_BOUNDS
    glyph_width = max_x - min_x
    glyph_height = max_y - min_y
    glyph_box_width = size * 0.54
    glyph_box_height = size * 0.64
    glyph_box_x = size * 0.02
    glyph_box_y = center - (glyph_box_height / 2.0)
    scale = min(glyph_box_width / glyph_width, glyph_box_height / glyph_height)
    glyph_transform = (
        f"translate({fmt(glyph_box_x)} {fmt(glyph_box_y)}) "
        f"scale({fmt(scale)} {fmt(-scale)}) "
        f"translate({fmt(-min_x)} {fmt(-max_y)})"
    )

    ET.SubElement(
        svg,
        "path",
        attrib={
            "d": MAL_GLYPH_PATH,
            "fill": WHITE,
            "transform": glyph_transform,
        },
    )

    speaker_back_width = size * 0.085
    speaker_back_height = size * 0.20
    speaker_back_x = size * 0.64
    speaker_back_y = center - (speaker_back_height / 2.0)
    speaker_corner = size * 0.017

    ET.SubElement(
        svg,
        "rect",
        attrib={
            "x": fmt(speaker_back_x),
            "y": fmt(speaker_back_y),
            "width": fmt(speaker_back_width),
            "height": fmt(speaker_back_height),
            "rx": fmt(speaker_corner),
            "fill": WHITE,
        },
    )

    cone_width = size * 0.15
    cone_height = size * 0.30
    cone_left = speaker_back_x + speaker_back_width
    cone_right = cone_left + cone_width
    cone_tip_offset = cone_height * 0.30
    cone_top = center - (cone_height / 2.0)
    cone_bottom = center + (cone_height / 2.0)
    cone_left_top = center - cone_tip_offset
    cone_left_bottom = center + cone_tip_offset
    cone_path = (
        f"M {fmt(cone_left)} {fmt(cone_left_top)} "
        f"L {fmt(cone_right)} {fmt(cone_top)} "
        f"L {fmt(cone_right)} {fmt(cone_bottom)} "
        f"L {fmt(cone_left)} {fmt(cone_left_bottom)} Z"
    )

    ET.SubElement(
        svg,
        "path",
        attrib={
            "d": cone_path,
            "fill": WHITE,
        },
    )

    wave_group = ET.SubElement(
        svg,
        "g",
        attrib={
            "fill": "none",
            "stroke": WHITE,
            "stroke-width": fmt(size * 0.032),
            "stroke-linecap": "round",
        },
    )
    wave_origin = cone_right + (size * 0.02)
    wave_origin_outer = wave_origin + (size * 0.025)
    wave_inner_radius = size * 0.06
    wave_outer_radius = size * 0.09

    ET.SubElement(wave_group, "path", attrib={"d": wave_path(wave_origin, center, wave_inner_radius)})
    ET.SubElement(
        wave_group,
        "path",
        attrib={"d": wave_path(wave_origin_outer, center, wave_outer_radius)},
    )

    tree = ET.ElementTree(svg)
    ET.indent(tree, space="  ")
    output.parent.mkdir(parents=True, exist_ok=True)
    tree.write(output, encoding="utf-8", xml_declaration=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the Malsori favicon SVG.")
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("webapp/public/malsori-favicon.svg"),
        help="Destination SVG path.",
    )
    parser.add_argument(
        "--size",
        "-s",
        type=float,
        default=512.0,
        help="Target favicon size (width/height) in CSS pixels (e.g. 16, 32, 64, 512).",
    )
    parser.add_argument(
        "--bg-color",
        default=DEFAULT_BG_COLOR,
        help="Background circle color.",
    )
    args = parser.parse_args()
    build_icon(args.output, size=args.size, bg_color=args.bg_color)


if __name__ == "__main__":
    main()

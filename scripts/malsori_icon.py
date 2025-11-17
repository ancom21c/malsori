#!/usr/bin/env python3
"""Draw the redesigned Malsori icon as an SVG without external dependencies."""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Iterable, List, Sequence, Tuple
import xml.etree.ElementTree as ET


Point = Tuple[float, float]

CRIMSON = "#dc143c"
WHITE = "#ffffff"


def fmt(value: float) -> str:
    """Format floats for SVG output without trailing zeros."""
    return f"{value:.3f}".rstrip("0").rstrip(".")


def arc_points(
    center: Point,
    radius: float,
    start_deg: float,
    end_deg: float,
    *,
    segments: int = 72,
) -> List[Point]:
    """Sample equally spaced points along an arc."""
    points: List[Point] = []
    step = (end_deg - start_deg) / max(1, segments)
    for idx in range(segments + 1):
        angle = math.radians(start_deg + step * idx)
        x = center[0] + radius * math.cos(angle)
        y = center[1] - radius * math.sin(angle)
        points.append((x, y))
    return points


def path_from_points(points: Sequence[Point]) -> str:
    commands = [f"M {fmt(points[0][0])} {fmt(points[0][1])}"]
    commands.extend(f"L {fmt(x)} {fmt(y)}" for (x, y) in points[1:])
    return " ".join(commands)


def compute_wave_width(
    radius: float,
    arc_length: float,
    factors: Iterable[float],
    gap: float,
) -> float:
    """Sum the chord widths for the wave arcs, including gaps between them."""
    widths: List[float] = []
    for factor in factors:
        span = (arc_length * factor) / radius
        widths.append(2.0 * radius * math.sin(span / 2.0))
    if not widths:
        return 0.0
    return sum(widths) + gap * (len(widths) - 1)


def polar_point(center: Point, radius: float, angle_deg: float) -> Point:
    angle = math.radians(angle_deg)
    return center[0] + radius * math.cos(angle), center[1] - radius * math.sin(angle)


def build_icon(output: Path, size: float = 64.0) -> None:
    # --- original geometry (large internal coordinate system) ---
    # circle_radius = 150.0
    circle_radius = size * 0.5 * 0.95
    arc1_span_deg = 30.0
    inner_radius = circle_radius * 1
    arc1_start, arc1_end = 195.0, 165.0
    outer_arc_radius = circle_radius * 0.9

    outer_arc_length = outer_arc_radius * math.radians(arc1_span_deg)

    wave_factors = (5.0 / 5.0, 5.5 / 4.0, 2, 1.0)
    wave_gap = circle_radius * 0.12
    wave_radius = inner_radius
    wave_width = compute_wave_width(wave_radius, outer_arc_length, wave_factors, wave_gap)

    margin_left = circle_radius * 0.4
    margin_right = circle_radius * 0.4
    gap_between = circle_radius * 0.12
    vertical_margin = circle_radius * 0.4

    horizontal_extent = (
        margin_left + (2.0 * circle_radius) + gap_between + wave_width + margin_right
    )
    vertical_extent = (2.0 * circle_radius) + (2.0 * vertical_margin)
    canvas_size = max(horizontal_extent, vertical_extent)

    offset_x = (canvas_size - horizontal_extent) / 2.0
    offset_y = (canvas_size - vertical_extent) / 2.0

    circle_center: Point = (
        offset_x + margin_left + circle_radius,
        offset_y + vertical_margin + circle_radius,
    )

    print(circle_center, canvas_size)

    # favicon target size (e.g. 16, 32, 64) -> scale down whole drawing
    scale = size / canvas_size

    svg = ET.Element(
        "svg",
        attrib={
            "xmlns": "http://www.w3.org/2000/svg",
            "viewBox": f"0 0 {fmt(size)} {fmt(size)}",
            "width": fmt(size),
            "height": fmt(size),
            "role": "img",
            "aria-label": "Redesigned Malsori icon",
        },
    )
    svg.append(ET.Element("title"))
    svg[-1].text = "Redesigned Malsori icon"

    # Wrap all drawing in a scaled group so it fits the favicon box.
    root_group = ET.SubElement(
        svg,
        "g",
        attrib={"transform": f"scale({fmt(scale)})"},
    )

    # Red circle background
    ET.SubElement(
        root_group,
        "circle",
        attrib={
            "cx": fmt(circle_center[0]),
            "cy": fmt(circle_center[1]),
            "r": fmt(circle_radius),
            "fill": CRIMSON,
        },
    )

    stroke_group = ET.SubElement(
        root_group,
        "g",
        attrib={
            "fill": "none",
            "stroke": WHITE,
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
        },
    )

    outer_stroke = circle_radius * 0.14
    inner_stroke = circle_radius * 0.11

    # outer ear-like arc
    outer_arc_path = path_from_points(
        arc_points(circle_center, outer_arc_radius, arc1_start, arc1_end)
    )
    ET.SubElement(
        stroke_group,
        "path",
        attrib={
            "d": outer_arc_path,
            "stroke-width": fmt(outer_stroke),
        },
    )

    # inner "speech bubble" side
    inner_arc_angle = math.degrees(outer_arc_length / inner_radius)
    inner_start = -22.5
    inner_end = 22.5
    inner_arc_center: Point = (
        circle_center[0] - circle_radius * 1.6,
        circle_center[1],
    )
    inner_arc_path = path_from_points(
        arc_points(inner_arc_center, inner_radius, inner_start, inner_end)
    )
    ET.SubElement(
        stroke_group,
        "path",
        attrib={
            "d": inner_arc_path,
            "stroke-width": fmt(inner_stroke),
            "stroke-opacity": "0.95",
        },
    )

    # Connect arc endpoints with straight lines.
    line_paths = [
        (
            polar_point(circle_center, outer_arc_radius, arc1_start),
            polar_point(inner_arc_center, inner_radius, inner_start),
        ),
        (
            polar_point(circle_center, outer_arc_radius, arc1_end),
            polar_point(inner_arc_center, inner_radius, inner_end),
        ),
    ]
    for start_pt, end_pt in line_paths:
        ET.SubElement(
            stroke_group,
            "path",
            attrib={
                "d": f"M {fmt(start_pt[0])} {fmt(start_pt[1])} "
                     f"L {fmt(end_pt[0])} {fmt(end_pt[1])}",
                "stroke-width": fmt(inner_stroke),
            },
        )

    # Wave arcs to the right of the circle.
    cursor_x = circle_center[0] - circle_radius * 1.6 + gap_between
    for factor in wave_factors:
        length = outer_arc_length * factor
        span = length / wave_radius
        span_deg = math.degrees(span)
        theta_start = -span_deg / 2.0
        theta_end = span_deg / 2.0
        center_x = cursor_x

        arc_path = path_from_points(
            arc_points(
                (center_x, circle_center[1]),
                wave_radius,
                theta_start,
                theta_end,
                segments=80,
            )
        )
        ET.SubElement(
            stroke_group,
            "path",
            attrib={
                "d": arc_path,
                "stroke-width": fmt(inner_stroke),
                "stroke-opacity": "0.85",
            },
        )
        cursor_x += wave_gap

    # Decor arcs (mun_1 ~ mun_4)
    mun_1_center = circle_center
    mun_1_radius = circle_radius * 0.9
    mun_1_span_deg = 15.0
    mun_1_start = 45.0 - mun_1_span_deg / 2.0
    mun_1_end = 45.0 + mun_1_span_deg / 2
    mun_1_path = path_from_points(
        arc_points(mun_1_center, mun_1_radius, mun_1_start, mun_1_end, segments=24)
    )
    ET.SubElement(
        stroke_group,
        "path",
        attrib={
            "d": mun_1_path,
            "stroke-width": fmt(inner_stroke),
            "stroke-opacity": "0.9",
        },
    )

    mun_2_center: Point = (
        circle_center[0] - circle_radius * 0.3,
        circle_center[1] + circle_radius * 0.4,
    )
    mun_2_radius = circle_radius * 1.2
    mun_2_span_deg = 80.0
    mun_2_start = 45.0 - mun_2_span_deg / 2
    mun_2_end = 45.0 + mun_2_span_deg / 2
    mun_2_path = path_from_points(
        arc_points(mun_2_center, mun_2_radius, mun_2_start, mun_2_end, segments=48)
    )
    ET.SubElement(
        stroke_group,
        "path",
        attrib={
            "d": mun_2_path,
            "stroke-width": fmt(inner_stroke),
            "stroke-opacity": "0.9",
        },
    )

    mun_3_center: Point = (
        circle_center[0] + circle_radius * 2,
        circle_center[1] - circle_radius * 0.9,
    )
    mun_3_radius = circle_radius * 2
    mun_3_span_deg = 36.0
    mun_3_start = 210.0 - mun_3_span_deg / 2
    mun_3_end = 210.0 + mun_3_span_deg / 2
    mun_3_path = path_from_points(
        arc_points(mun_3_center, mun_3_radius, mun_3_start, mun_3_end, segments=36)
    )
    ET.SubElement(
        stroke_group,
        "path",
        attrib={
            "d": mun_3_path,
            "stroke-width": fmt(inner_stroke),
            "stroke-opacity": "0.9",
        },
    )

    mun_4_center: Point = (
        circle_center[0] - circle_radius * 1.2,
        circle_center[1] - circle_radius * 1.0,
    )
    mun_4_radius = circle_radius * 2
    mun_4_span_deg = 40.0
    mun_4_start = -45.0 - mun_4_span_deg / 2
    mun_4_end = -45.0 + mun_4_span_deg / 2
    mun_4_path = path_from_points(
        arc_points(mun_4_center, mun_4_radius, mun_4_start, mun_4_end, segments=48)
    )
    ET.SubElement(
        stroke_group,
        "path",
        attrib={
            "d": mun_4_path,
            "stroke-width": fmt(inner_stroke),
            "stroke-opacity": "0.9",
        },
    )

    tree = ET.ElementTree(svg)
    ET.indent(tree, space="  ")
    output.parent.mkdir(parents=True, exist_ok=True)
    tree.write(output, encoding="utf-8", xml_declaration=False)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate the redesigned Malsori icon.")
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
        default=64.0,
        help="Target favicon size (width/height) in CSS pixels (e.g. 16, 32, 64).",
    )
    args = parser.parse_args()
    build_icon(args.output, size=args.size)


if __name__ == "__main__":
    main()

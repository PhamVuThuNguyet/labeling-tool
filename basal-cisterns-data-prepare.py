import csv
import plistlib
import re
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

# Source and destination base paths
SRC_ROOT = Path(r"Z:/PhD-Nguyet/datasets/cq500")
DEST_ROOT = Path("data/cisterns-data")
LABELED_DEST_ROOT = Path("data/cisterns-data-with-labels")
FILENAME = "cisterns-segment.jpg"
GROUND_TRUTH_CSV = DEST_ROOT / "ground-truth.csv"

FOLDER_PATTERN = "CQ500-CT-"


def copy_cisterns_images(start: int | None = None, end: int | None = None) -> None:
    """Copy cistern images from each CQ500 subfolder into numbered destinations.

    Args:
        start: Minimum folder number to include (inclusive).
        end: Maximum folder number to include (inclusive).
    """
    if not SRC_ROOT.exists():
        raise FileNotFoundError(f"Source root does not exist: {SRC_ROOT}")

    for num in range(start, end + 1):
        entry = SRC_ROOT / f"{FOLDER_PATTERN}{num}"
        if not entry.is_dir():
            continue

        src_file = entry / FILENAME
        if not src_file.is_file():
            # Skip folders without the expected image
            continue

        dest_dir = DEST_ROOT / num
        dest_dir.mkdir(parents=True, exist_ok=True)
        dest_file = dest_dir / FILENAME

        shutil.copy2(src_file, dest_file)
        print(f"Copied {src_file} -> {dest_file}")


def _parse_area_cm2(xml_path: Path) -> float | None:
    """Return AreaCM2 from the plist XML, or None on failure."""
    try:
        with xml_path.open("rb") as fp:
            data = plistlib.load(fp)
        return float(data["DataSummary"]["AreaCM2"])
    except Exception:
        return None


def build_ground_truth_csv(
    start: int | None = None, end: int | None = None
) -> None:
    """Create a CSV summary of horn areas for the requested folder range.

    Writes rows: id,right-horn,left-horn
    Values: "absent" if XML missing, "compressed" if AreaCM2 < 3, else AreaCM2 value.
    """
    if not SRC_ROOT.exists():
        raise FileNotFoundError(f"Source root does not exist: {SRC_ROOT}")

    DEST_ROOT.mkdir(parents=True, exist_ok=True)

    if not GROUND_TRUTH_CSV.exists():
        with open(GROUND_TRUTH_CSV, "w+", newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["id", "right-horn", "left-horn"])

    for num in range(start, end + 1):
        entry = SRC_ROOT / f"{FOLDER_PATTERN}{num}"
        if not entry.is_dir():
            continue
        
        right_path = entry / "right-horn.xml"
        left_path = entry / "left-horn.xml" 

        def classify(path: Path) -> str:
            if not path.is_file():
                return "absent"
            area = _parse_area_cm2(path)
            if area is None:
                return "absent"
            return "compressed" if area < 3 else "normal"

        right_val = classify(right_path)
        left_val = classify(left_path)

        with open(GROUND_TRUTH_CSV, "a", newline='') as f:
            writer = csv.writer(f)
            writer.writerow([num, right_val, left_val])
    
        print(f"Wrote: {num},{right_val},{left_val}")


def add_labels_to_images(
    start: int | None = None, end: int | None = None
) -> None:
    """Overlay right/left horn labels onto copied images and save into labeled folder."""
    if not SRC_ROOT.exists():
        raise FileNotFoundError(f"Source root does not exist: {SRC_ROOT}")

    LABELED_DEST_ROOT.mkdir(parents=True, exist_ok=True)

    # Use a larger basic font; fallback to default if truetype not available
    try:
        font = ImageFont.truetype("arial.ttf", 42)
    except Exception:
        font = ImageFont.load_default()

    for num in range(start, end + 1):
        entry = SRC_ROOT / f"{FOLDER_PATTERN}{num}"
        if not entry.is_dir():
            continue

        src_img = DEST_ROOT / num / FILENAME
        if not src_img.is_file():
            # Skip if the copied image is missing
            continue

        right_path = entry / "right-horn.xml"
        left_path = entry / "left-horn.xml"

        def classify(path: Path) -> str:
            if not path.is_file():
                return "absent"
            area = _parse_area_cm2(path)
            if area is None:
                return "absent"
            return "compressed" if area < 3 else "normal"

        right_val = classify(right_path)
        left_val = classify(left_path)

        # Draw labels
        with Image.open(src_img) as im:
            # Work in RGBA to allow transparent overlay even if source is RGB
            base = im.convert("RGBA")
            overlay = Image.new("RGBA", base.size)
            draw = ImageDraw.Draw(overlay)

            padding = 16
            spacing = 10

            text = f"right-horn: {right_val}\nleft-horn: {left_val}"
            bbox = draw.multiline_textbbox((0, 0), text, font=font, spacing=spacing)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]

            rect_w = text_w + padding * 2
            rect_h = text_h + padding * 2

            # Center rectangle and text
            rect_x = (base.width - rect_w) / 2
            rect_y = (base.height - rect_h) / 2

            draw.rectangle(
                [(rect_x, rect_y), (rect_x + rect_w, rect_y + rect_h)],
                fill=(0, 0, 0, 140),
            )

            text_x = rect_x + padding
            text_y = rect_y + padding
            draw.multiline_text(
                (text_x, text_y),
                text,
                font=font,
                fill=(255, 255, 0, 255),
                spacing=spacing,
            )

            # Merge overlay and save
            combined = Image.alpha_composite(base, overlay).convert("RGB")

            dest_dir = LABELED_DEST_ROOT / num
            dest_dir.mkdir(parents=True, exist_ok=True)
            out_path = dest_dir / FILENAME
            combined.save(out_path)
            print(f"Labeled image saved: {out_path}")


if __name__ == "__main__":
    copy_cisterns_images(start=0, end=20)
    build_ground_truth_csv(start=0, end=20)
    add_labels_to_images(start=0, end=20)

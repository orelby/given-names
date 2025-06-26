"""
Load Excel file of given names and convert it to CSV.
The expected format is the one of the cumulative 1948-2023 file (2024-12-09).
"""

import os
import pandas as pd
from typing import Mapping

DATA_DIR = r"../data/2024-12-09"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SRC_MARKER_MISSING_VALUE = "-"
SRC_MARKER_UNDER_THRESHOLD = ".."  # less than 5 yearly occurences
OUT_MARKER_UNDER_THRESHOLD = "1"  # less than 5 yearly occurences

GENDER_KEYWORDS = {"גברים": "Men", "נשים": "Women"}
DEMOGRAPHIC_KEYWORDS = {
    "יהודי": "Jewish",
    "נוצרי": "Christian",
    "מוסלמי": "Muslim",
    "דרוזי": "Druze",
}


def extract_keyword(sheet_name: str, keyword_map: Mapping[str, str]):
    """
    Extract keyword from sheet name.
    """
    for src, out in keyword_map.items():
        if src in sheet_name:
            return out
    return None


def process_file(file_path: str):
    """
    Load all sheets from the Excel into a data frame,
    grouped by gender and demographic group.

    Reading the Excel file may take some time (less than a minute).
    """
    xls = pd.ExcelFile(file_path)
    all_dfs = []

    for sheet_name in xls.sheet_names:
        sheet_name = str(sheet_name)
        gender = extract_keyword(sheet_name, GENDER_KEYWORDS)
        demographic = extract_keyword(sheet_name, DEMOGRAPHIC_KEYWORDS)
        if not gender or not demographic:
            raise ValueError(f"Unrecognized sheet name format: '{sheet_name}'")

        df = xls.parse(sheet_name, skiprows=6)

        df.columns = df.columns.map(str)

        df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

        if df.columns[0] != "prati1":
            raise ValueError(
                f"Unrecognized sheet format: "
                f"missing given name 'prati1' field (sheet name: '{sheet_name}')"
            )

        if "-" not in df.columns[1]:
            raise ValueError(
                f"Unrecognized sheet format: "
                f"missing total count field (sheet name: '{sheet_name}')"
            )

        df = df.rename(columns={df.columns[0]: "name", df.columns[1]: "total"})

        total_count = len(df)
        df = df.dropna()
        total_count, missing_count = len(df), total_count - len(df)

        df = df.replace(
            {
                SRC_MARKER_MISSING_VALUE: 0,
                SRC_MARKER_UNDER_THRESHOLD: OUT_MARKER_UNDER_THRESHOLD,
            }
        )

        # Accumulate data frames
        df.insert(0, "demographic", demographic)
        df.insert(0, "gender", gender)
        all_dfs.append(df)

        print(
            f"- Loaded {total_count} {demographic} {gender} name records"
            f"{'' if missing_count == 0 else f' (dropped {missing_count} with missing values)'}"
        )

    full_df = pd.concat(all_dfs, ignore_index=True)

    print(f"Loaded {len(full_df)} name records")

    return full_df


def data_path(filename: str = ""):
    return os.path.abspath(os.path.join(BASE_DIR, DATA_DIR, filename))


if __name__ == "__main__":
    input_path = data_path(r"given-names.xlsx")
    output_path = data_path(r"given-names.csv")

    print(f"Loading XLS file at {input_path}...")

    df: pd.DataFrame

    try:
        df = process_file(input_path)
    except FileNotFoundError:
        exit("File not found. Make sure data path is correct (or change DATA_DIR).")


    print(f"Saving CSV file at {output_path}...")

    # utf-8 was not enough for Excel, so using utf-8-sig
    df.to_csv(output_path, index=False, encoding="utf-8-sig")

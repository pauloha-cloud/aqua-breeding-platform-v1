import pandas as pd
from pathlib import Path
import os
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

def prepare_genetic_input(input_file_path: str, output_dir: str) -> Tuple[str, str]:
    """
    Reads an Excel or CSV file containing genetic data and validates the required columns.
    Generates phenotype.csv and pedigree.csv, and returns their paths.
    """
    input_path = Path(input_file_path)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_file_path}")
    
    if input_path.suffix.lower() in ['.xlsx', '.xls']:
        try:
            df = pd.read_excel(input_path)
        except Exception as e:
            raise ValueError(f"Failed to read Excel file: {str(e)}")
    elif input_path.suffix.lower() == '.csv':
        try:
            df = pd.read_csv(input_path)
        except Exception as e:
            raise ValueError(f"Failed to read CSV file: {str(e)}")
    else:
        raise ValueError("Invalid file extension. Please provide an .xlsx, .xls, or .csv file.")
    
    if df.empty:
        raise ValueError("The provided file is empty.")
    
    # Normalize column names: lowercase and remove leading/trailing spaces
    df.columns = [str(c).strip().lower() for c in df.columns]
    
    required_cols = {'a', 's', 'd', 'sex', 'wwg'}
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise ValueError(f"Missing required columns: {', '.join(missing_cols)}")
    
    # generate phenotype.csv (columns: a, wwg)
    phenotype_df = df[['a', 'wwg']].copy()
    phenotype_path = out_dir / "phenotype.csv"
    phenotype_df.to_csv(phenotype_path, index=False)
    
    # generate pedigree.csv (columns: a, s, d)
    pedigree_df = df[['a', 's', 'd']].copy()
    pedigree_path = out_dir / "pedigree.csv"
    pedigree_df.to_csv(pedigree_path, index=False)
    
    logger.info(f"Generated {phenotype_path} and {pedigree_path}")
    return str(phenotype_path), str(pedigree_path)

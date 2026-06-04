import pytest
import pandas as pd
from pathlib import Path
from app.data_prep import prepare_genetic_input

def test_prepare_genetic_input_success(tmp_path):
    df = pd.DataFrame({
        'a': [1, 2],
        's': [0, 1],
        'd': [0, 0],
        'sex': ['M', 'F'],
        'wwg': [10.5, 12.1]
    })
    input_file = tmp_path / "data.xlsx"
    df.to_excel(input_file, index=False)
    
    out_dir = tmp_path / "output"
    pheno_path, ped_path = prepare_genetic_input(str(input_file), str(out_dir))
    
    assert Path(pheno_path).exists()
    assert Path(ped_path).exists()
    
    pheno_df = pd.read_csv(pheno_path)
    assert list(pheno_df.columns) == ['a', 'wwg']
    
    ped_df = pd.read_csv(ped_path)
    assert list(ped_df.columns) == ['a', 's', 'd']

def test_prepare_genetic_input_missing_cols(tmp_path):
    df = pd.DataFrame({
        'a': [1, 2],
        'sex': ['M', 'F']
    })
    input_file = tmp_path / "data.csv"
    df.to_csv(input_file, index=False)
    
    with pytest.raises(ValueError, match="Missing required columns"):
        prepare_genetic_input(str(input_file), str(tmp_path))

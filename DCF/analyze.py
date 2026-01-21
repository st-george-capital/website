import pandas as pd
import numpy as np

def load_data(balance_sheet_file, cash_flow_file, income_statement_file):
    """Load financial data from Excel files."""
    balance_sheet = pd.read_excel(balance_sheet_file, skiprows=6)
    cash_flow = pd.read_excel(cash_flow_file, skiprows=6)
    income_statement = pd.read_excel(income_statement_file, skiprows=6)
    return balance_sheet, cash_flow, income_statement

def get_row_by_label(df, label):
    """Safely get a row by its label."""
    row = df[df.iloc[:, 0].str.contains(label, na=False, case=False)]
    if row.empty:
        raise ValueError(f"Label '{label}' not found in the data. Available labels: {df.iloc[:, 0].dropna().unique()}")
    return row.iloc[0, 1:].astype(float)

def calculate_historical_metrics(balance_sheet, cash_flow, income_statement):
    """Extract historical metrics for DCF projections."""
    # Revenue and EBIT
    revenue = get_row_by_label(income_statement, 'Sales')
    ebit = get_row_by_label(income_statement, 'EBIT')

    # Depreciation and CapEx
    depreciation = get_row_by_label(income_statement, 'Depreciation')
    capex = get_row_by_label(cash_flow, 'Capital Expenditures')

    # Working Capital
    current_assets = get_row_by_label(balance_sheet, 'Total Current Assets')
    current_liabilities = get_row_by_label(balance_sheet, 'Total Current Liabilities')
    working_capital = current_assets - current_liabilities

    return revenue, ebit, depreciation, capex, working_capital

def project_cash_flows(revenue, ebit, depreciation, capex, working_capital, growth_rate, years, tax_rate):
    """Project Free Cash Flows based on assumptions."""
    projections = []
    for year in range(years):
        # Revenue projection
        projected_revenue = revenue.iloc[-1] * (1 + growth_rate) ** (year + 1)

        # EBIT and NOPAT
        projected_ebit = projected_revenue * (ebit.iloc[-1] / revenue.iloc[-1])
        nopat = projected_ebit * (1 - tax_rate)

        # Depreciation, CapEx, and Working Capital
        projected_depreciation = depreciation.iloc[-1] * (1 + growth_rate) ** (year + 1)
        projected_capex = capex.iloc[-1] * (1 + growth_rate) ** (year + 1)
        change_in_working_capital = working_capital.iloc[-1] * (1 + growth_rate) ** (year + 1)

        # Free Cash Flow
        fcf = nopat + projected_depreciation - projected_capex - change_in_working_capital
        projections.append(fcf)

    return np.array(projections)

def calculate_dcf(fcf_projections, discount_rate, terminal_growth_rate):
    """Calculate DCF valuation."""
    discount_factors = [(1 / (1 + discount_rate)) ** (i + 1) for i in range(len(fcf_projections))]
    discounted_fcf = np.sum(fcf_projections * discount_factors)

    # Terminal Value
    terminal_value = fcf_projections[-1] * (1 + terminal_growth_rate) / (discount_rate - terminal_growth_rate)
    terminal_value_discounted = terminal_value / ((1 + discount_rate) ** len(fcf_projections))

    # Enterprise Value
    enterprise_value = discounted_fcf + terminal_value_discounted
    return enterprise_value

def main():
    # Load data
    balance_sheet_file = "J_Balance Sheet.xlsx"
    cash_flow_file = "J_Cash Flow.xlsx"
    income_statement_file = "J_Income Statement.xlsx"

    balance_sheet, cash_flow, income_statement = load_data(balance_sheet_file, cash_flow_file, income_statement_file)

    # Historical metrics
    revenue, ebit, depreciation, capex, working_capital = calculate_historical_metrics(balance_sheet, cash_flow, income_statement)

    # Projection assumptions
    growth_rate = 0.04  # 5% revenue growth
    tax_rate = 0.21  # 21% tax rate
    discount_rate = 0.079  # 10% WACC
    terminal_growth_rate = 0.03  # 2% terminal growth
    projection_years = 5

    # Project cash flows
    fcf_projections = project_cash_flows(revenue, ebit, depreciation, capex, working_capital, growth_rate, projection_years, tax_rate)

    # Calculate DCF
    enterprise_value = calculate_dcf(fcf_projections, discount_rate, terminal_growth_rate)

    print("Enterprise Value:", enterprise_value)

if __name__ == "__main__":
    main()

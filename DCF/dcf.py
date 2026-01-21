import pandas as pd

# Load the financial data from the provided Excel files
cash_flow_data_cleaned = pd.read_excel('Cash Flow.xlsx', skiprows=10)
income_statement_data_cleaned = pd.read_excel('Income Statement.xlsx', skiprows=10)
balance_sheet_data_cleaned = pd.read_excel('Balance Sheet.xlsx', skiprows=10)

# Extracting Net Income from the Income Statement
net_income = income_statement_data_cleaned.loc[income_statement_data_cleaned['Cost of Goods Sold (COGS) incl. D&A'] == 'Gross Income', income_statement_data_cleaned.columns[1]].values[0]

# Extracting Depreciation from the Cash Flow Statement
depreciation = cash_flow_data_cleaned.loc[cash_flow_data_cleaned['Net Income / Starting Line'] == 'Depreciation, Depletion & Amortization', cash_flow_data_cleaned.columns[1]].values[0]

# Extracting Capital Expenditures (CapEx) from the Cash Flow Statement
capex = cash_flow_data_cleaned.loc[cash_flow_data_cleaned['Net Income / Starting Line'] == 'Capital Expenditures', cash_flow_data_cleaned.columns[1]].values[0]

# Calculating Change in Working Capital using the Balance Sheet data
# Working Capital = Current Assets - Current Liabilities
current_assets_start = balance_sheet_data_cleaned.loc[balance_sheet_data_cleaned['Cash Only'] == 'Total Short Term Investments', balance_sheet_data_cleaned.columns[1]].values[0]
current_liabilities_start = balance_sheet_data_cleaned.loc[balance_sheet_data_cleaned['Cash Only'] == 'Accounts Receivables, Net', balance_sheet_data_cleaned.columns[1]].values[0]

current_assets_end = balance_sheet_data_cleaned.loc[balance_sheet_data_cleaned['Cash Only'] == 'Total Short Term Investments', balance_sheet_data_cleaned.columns[2]].values[0]
current_liabilities_end = balance_sheet_data_cleaned.loc[balance_sheet_data_cleaned['Cash Only'] == 'Accounts Receivables, Net', balance_sheet_data_cleaned.columns[2]].values[0]

working_capital_start = current_assets_start - current_liabilities_start
working_capital_end = current_assets_end - current_liabilities_end

change_in_working_capital = working_capital_end - working_capital_start

# DCF Parameters
growth_rate = 0.05  # 5% growth rate for simplicity
discount_rate = 0.1  # 10% discount rate (WACC)
years = 5  # 5-year projection

# Function to calculate Free Cash Flow (FCF)
def calculate_free_cash_flow(net_income, depreciation, capex, change_in_working_capital):
    return net_income + depreciation - capex - change_in_working_capital

# Calculate Free Cash Flow (FCF) for the first year
fcf = calculate_free_cash_flow(net_income, depreciation, capex, change_in_working_capital)

# Project Free Cash Flow for the next 5 years with a 5% growth rate
projected_fcfs = [fcf * (1 + growth_rate)**i for i in range(1, years + 1)]

# Discount the projected FCFs to present value using the discount rate (WACC)
discounted_fcfs = [proj_fcf / (1 + discount_rate)**i for i, proj_fcf in enumerate(projected_fcfs, start=1)]

# Sum the discounted cash flows to get the total present value
total_dcf_value = sum(discounted_fcfs)

# Output the results
print(f"Total Discounted Cash Flow (DCF) Value: {total_dcf_value}")
print(f"Projected Free Cash Flows: {projected_fcfs}")
print(f"Discounted Free Cash Flows: {discounted_fcfs}")

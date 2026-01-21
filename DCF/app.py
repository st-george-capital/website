import streamlit as st
import pandas as pd

st.set_page_config(page_title="DCF Valuation App", layout="wide")
st.title("📊 Discounted Cash Flow (DCF) Valuation Tool")

st.markdown("Upload your **Cash Flow**, **Income Statement**, and **Balance Sheet** Excel files.")

# Upload files
cash_file = st.file_uploader("Upload Cash Flow Statement", type=["xlsx"])
income_file = st.file_uploader("Upload Income Statement", type=["xlsx"])
balance_file = st.file_uploader("Upload Balance Sheet", type=["xlsx"])

if cash_file and income_file and balance_file:
    # Load Excel sheets using skiprows=10
    cash_df = pd.read_excel(cash_file, skiprows=10)
    income_df = pd.read_excel(income_file, skiprows=10)
    balance_df = pd.read_excel(balance_file, skiprows=10)

    try:
        # Use correct label columns based on your files
        net_income = income_df.loc[
            income_df['Sales'] == 'Gross Income',
            income_df.columns[1]
        ].values[0]

        depreciation = cash_df.loc[
            cash_df['Operating Activities'] == 'Depreciation, Depletion & Amortization',
            cash_df.columns[1]
        ].values[0]

        capex = cash_df.loc[
            cash_df['Operating Activities'] == 'Capital Expenditures',
            cash_df.columns[1]
        ].values[0]

        current_assets_start = balance_df.loc[
            balance_df['Cash & Short-Term Investments'] == 'Total Short Term Investments',
            balance_df.columns[1]
        ].values[0]

        current_liabilities_start = balance_df.loc[
            balance_df['Cash & Short-Term Investments'] == 'Accounts Receivables, Net',
            balance_df.columns[1]
        ].values[0]

        current_assets_end = balance_df.loc[
            balance_df['Cash & Short-Term Investments'] == 'Total Short Term Investments',
            balance_df.columns[2]
        ].values[0]

        current_liabilities_end = balance_df.loc[
            balance_df['Cash & Short-Term Investments'] == 'Accounts Receivables, Net',
            balance_df.columns[2]
        ].values[0]

    except Exception as e:
        st.error(f"❌ Error extracting financial values: {e}")
        st.stop()

    # Calculate change in working capital
    wc_start = current_assets_start - current_liabilities_start
    wc_end = current_assets_end - current_liabilities_end
    change_in_wc = wc_end - wc_start

    # Input DCF parameters
    st.subheader("📈 DCF Assumptions")
    col1, col2, col3 = st.columns(3)
    with col1:
        growth_rate = st.number_input("Growth Rate (g)", value=0.05, step=0.01)
    with col2:
        discount_rate = st.number_input("Discount Rate (WACC)", value=0.10, step=0.01)
    with col3:
        years = st.slider("Projection Years", min_value=1, max_value=10, value=5)

    # Compute Free Cash Flow
    fcf = net_income + depreciation - capex - change_in_wc

    # Project and discount FCFs
    projected_fcfs = [fcf * (1 + growth_rate)**i for i in range(1, years + 1)]
    discounted_fcfs = [fcf_ / (1 + discount_rate)**i for i, fcf_ in enumerate(projected_fcfs, start=1)]

    # Terminal value
    terminal_value = projected_fcfs[-1] * (1 + growth_rate) / (discount_rate - growth_rate)
    discounted_terminal_value = terminal_value / (1 + discount_rate)**years
    total_dcf_value = sum(discounted_fcfs) + discounted_terminal_value

    # Output results
    st.subheader("💰 Valuation Results")
    st.metric("Total DCF Value", f"${total_dcf_value:,.2f}")
    st.write(f"**Terminal Value:** ${terminal_value:,.2f} → Discounted: ${discounted_terminal_value:,.2f}")

    # Show detailed table
    result_df = pd.DataFrame({
        "Year": [f"Year {i}" for i in range(1, years + 1)] + ["Terminal"],
        "Projected FCF": projected_fcfs + [terminal_value],
        "Discounted FCF": discounted_fcfs + [discounted_terminal_value],
    })

    st.dataframe(result_df.style.format({"Projected FCF": "${:,.2f}", "Discounted FCF": "${:,.2f}"}))

else:
    st.info("⬆️ Upload all three files to start the analysis.")

"""
WUBI Financial Model - Excel Generator
Generates a complete financial model in Excel with all dynamic formulas
"""

import io

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import CellIsRule
from openpyxl.utils import get_column_letter
from openpyxl.chart import LineChart, BarChart, Reference
from openpyxl.workbook.defined_name import DefinedName

# Default assumptions used when no custom params are provided
DEFAULT_PARAMS = {
    "price_pro": 149,
    "price_proplus": 249,
    "price_family": 399,
    "margin_pro": 0.84,
    "margin_proplus": 0.86,
    "margin_family": 0.88,
    "cac_pro": 300,
    "cac_proplus": 350,
    "cac_family": 400,
    "churn_pro": 0.04,
    "churn_proplus": 0.03,
    "churn_family": 0.02,
    "fixed_cost_1_6": 6000,
    "fixed_cost_7_12": 8000,
    "fixed_cost_13_24": 20000,
    "new_pro_1_6": 25,
    "new_pro_7_12": 50,
    "new_pro_13_24": 100,
    "new_proplus_1_6": 5,
    "new_proplus_7_12": 15,
    "new_proplus_13_24": 30,
    "new_family_1_6": 2,
    "new_family_7_12": 5,
    "new_family_13_24": 20,
}


def create_wubi_model(params=None):
    """Creates complete WUBI financial model.

    Args:
        params: dict of assumption overrides (see DEFAULT_PARAMS for keys).
                If None, defaults are used. Values are injected into the
                Assumptions sheet so all formulas recalculate automatically.

    Returns:
        filename (str) when called from CLI, or BytesIO when called from web.
    """
    p = {**DEFAULT_PARAMS, **(params or {})}

    wb = Workbook()

    # Remove default sheet
    if 'Sheet' in wb.sheetnames:
        wb.remove(wb['Sheet'])

    # Create sheets
    ws_assumptions = wb.create_sheet("Assumptions", 0)
    ws_user_growth = wb.create_sheet("User Growth", 1)
    ws_pl = wb.create_sheet("P&L Projection", 2)
    ws_unit_econ = wb.create_sheet("Unit Economics", 3)
    ws_dashboard = wb.create_sheet("Dashboard", 4)
    ws_scenarios = wb.create_sheet("Scenarios", 5)
    ws_sensitivity = wb.create_sheet("Sensitivity", 6)

    # Styles
    header_fill = PatternFill(start_color="1F4E78", end_color="1F4E78", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=12)
    input_fill = PatternFill(start_color="D6E4F5", end_color="D6E4F5", fill_type="solid")
    input_font = Font(bold=True, color="002060")
    section_fill = PatternFill(start_color="E7E6E6", end_color="E7E6E6", fill_type="solid")
    section_font = Font(bold=True, size=11)

    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )

    # ============================================
    # SHEET 1: ASSUMPTIONS
    # ============================================
    ws = ws_assumptions
    ws.column_dimensions['A'].width = 30
    ws.column_dimensions['B'].width = 15
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 15

    # Title
    ws['A1'] = "WUBI - ASSUMPTIONS"
    ws['A1'].font = Font(bold=True, size=16, color="1F4E78")
    ws.merge_cells('A1:D1')

    # PRICING
    ws['A3'] = "PRICING (MXN/month)"
    ws['A3'].fill = section_fill
    ws['A3'].font = section_font
    ws['B3'] = "Value"
    ws['B3'].fill = section_fill
    ws['B3'].font = section_font

    ws['A4'] = "Plan Free"
    ws['B4'] = 0
    ws['A5'] = "Plan Pro"
    ws['B5'] = p["price_pro"]
    ws['A6'] = "Plan Pro+"
    ws['B6'] = p["price_proplus"]
    ws['A7'] = "Plan Family"
    ws['B7'] = p["price_family"]

    # MARGINS
    ws['A9'] = "GROSS MARGIN (%)"
    ws['A9'].fill = section_fill
    ws['A9'].font = section_font
    ws['B9'].fill = section_fill

    ws['A10'] = "Margin Pro"
    ws['B10'] = p["margin_pro"]
    ws['B10'].number_format = '0%'
    ws['A11'] = "Margin Pro+"
    ws['B11'] = p["margin_proplus"]
    ws['B11'].number_format = '0%'
    ws['A12'] = "Margin Family"
    ws['B12'] = p["margin_family"]
    ws['B12'].number_format = '0%'

    # CAC
    ws['A14'] = "CAC PER PLAN (MXN)"
    ws['A14'].fill = section_fill
    ws['A14'].font = section_font
    ws['B14'].fill = section_fill

    ws['A15'] = "CAC Free"
    ws['B15'] = 0
    ws['A16'] = "CAC Pro"
    ws['B16'] = p["cac_pro"]
    ws['A17'] = "CAC Pro+"
    ws['B17'] = p["cac_proplus"]
    ws['A18'] = "CAC Family"
    ws['B18'] = p["cac_family"]

    # CHURN
    ws['A20'] = "MONTHLY CHURN (%)"
    ws['A20'].fill = section_fill
    ws['A20'].font = section_font
    ws['B20'].fill = section_fill

    ws['A21'] = "Churn Pro"
    ws['B21'] = p["churn_pro"]
    ws['B21'].number_format = '0%'
    ws['A22'] = "Churn Pro+"
    ws['B22'] = p["churn_proplus"]
    ws['B22'].number_format = '0%'
    ws['A23'] = "Churn Family"
    ws['B23'] = p["churn_family"]
    ws['B23'].number_format = '0%'

    # FIXED COSTS
    ws['A25'] = "MONTHLY FIXED COSTS (MXN)"
    ws['A25'].fill = section_fill
    ws['A25'].font = section_font
    ws['B25'].fill = section_fill

    ws['A26'] = "Month 1-6"
    ws['B26'] = p["fixed_cost_1_6"]
    ws['A27'] = "Month 7-12"
    ws['B27'] = p["fixed_cost_7_12"]
    ws['A28'] = "Month 13-24"
    ws['B28'] = p["fixed_cost_13_24"]

    # NEW USERS
    ws['A30'] = "NEW USERS PER MONTH"
    ws['A30'].fill = section_fill
    ws['A30'].font = section_font
    ws['B30'] = "Pro"
    ws['B30'].fill = section_fill
    ws['B30'].font = section_font
    ws['C30'] = "Pro+"
    ws['C30'].fill = section_fill
    ws['C30'].font = section_font
    ws['D30'] = "Family"
    ws['D30'].fill = section_fill
    ws['D30'].font = section_font

    ws['A31'] = "Month 1-6"
    ws['B31'] = p["new_pro_1_6"]
    ws['C31'] = p["new_proplus_1_6"]
    ws['D31'] = p["new_family_1_6"]

    ws['A32'] = "Month 7-12"
    ws['B32'] = p["new_pro_7_12"]
    ws['C32'] = p["new_proplus_7_12"]
    ws['D32'] = p["new_family_7_12"]

    ws['A33'] = "Month 13-24"
    ws['B33'] = p["new_pro_13_24"]
    ws['C33'] = p["new_proplus_13_24"]
    ws['D33'] = p["new_family_13_24"]

    # Apply input formatting
    for row in [4, 5, 6, 7, 10, 11, 12, 15, 16, 17, 18, 21, 22, 23, 26, 27, 28, 31, 32, 33]:
        for col in ['B', 'C', 'D']:
            if ws[f'{col}{row}'].value is not None:
                ws[f'{col}{row}'].fill = input_fill
                ws[f'{col}{row}'].font = input_font
                ws[f'{col}{row}'].border = border

    # Define Named Ranges
    named_ranges = {
        'PrecioPro': "Assumptions!$B$5",
        'PrecioProPlus': "Assumptions!$B$6",
        'PrecioFamily': "Assumptions!$B$7",
        'MarginPro': "Assumptions!$B$10",
        'MarginProPlus': "Assumptions!$B$11",
        'MarginFamily': "Assumptions!$B$12",
        'CACPro': "Assumptions!$B$16",
        'CACProPlus': "Assumptions!$B$17",
        'CACFamily': "Assumptions!$B$18",
        'ChurnPro': "Assumptions!$B$21",
        'ChurnProPlus': "Assumptions!$B$22",
        'ChurnFamily': "Assumptions!$B$23",
    }
    for name, ref in named_ranges.items():
        defn = DefinedName(name, attr_text=ref)
        wb.defined_names.add(defn)

    # ============================================
    # SHEET 2: USER GROWTH
    # ============================================
    ws = ws_user_growth
    ws.column_dimensions['A'].width = 8
    for col in ['B', 'C', 'D', 'E', 'F', 'G', 'H']:
        ws.column_dimensions[col].width = 14

    # Headers
    headers = ['Month', 'New Pro', 'Active Pro', 'New Pro+', 'Active Pro+',
               'New Family', 'Active Family', 'Total Active']
    for idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=idx)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')

    # Data and formulas for 24 months
    for month in range(1, 25):
        row = month + 1

        # Column A: Month
        ws[f'A{row}'] = month

        # Column B: New Pro
        ws[f'B{row}'] = (
            f'=IF(A{row}<=6, Assumptions!$B$31,'
            f' IF(A{row}<=12, Assumptions!$B$32, Assumptions!$B$33))'
        )

        # Column C: Active Pro
        if month == 1:
            ws[f'C{row}'] = f'=B{row}'
        else:
            ws[f'C{row}'] = f'=C{row-1}*(1-ChurnPro)+B{row}'

        # Column D: New Pro+
        ws[f'D{row}'] = (
            f'=IF(A{row}<=6, Assumptions!$C$31,'
            f' IF(A{row}<=12, Assumptions!$C$32, Assumptions!$C$33))'
        )

        # Column E: Active Pro+
        if month == 1:
            ws[f'E{row}'] = f'=D{row}'
        else:
            ws[f'E{row}'] = f'=E{row-1}*(1-ChurnProPlus)+D{row}'

        # Column F: New Family
        ws[f'F{row}'] = (
            f'=IF(A{row}<=6, Assumptions!$D$31,'
            f' IF(A{row}<=12, Assumptions!$D$32, Assumptions!$D$33))'
        )

        # Column G: Active Family
        if month == 1:
            ws[f'G{row}'] = f'=F{row}'
        else:
            ws[f'G{row}'] = f'=G{row-1}*(1-ChurnFamily)+F{row}'

        # Column H: Total
        ws[f'H{row}'] = f'=C{row}+E{row}+G{row}'

        # Number formatting
        for col in ['C', 'E', 'G', 'H']:
            ws[f'{col}{row}'].number_format = '#,##0'

    # --- User Growth Chart ---
    chart = LineChart()
    chart.title = "Total Active Users"
    chart.y_axis.title = "Users"
    chart.x_axis.title = "Month"
    chart.style = 10
    chart.width = 20
    chart.height = 12

    months_ref = Reference(ws, min_col=1, min_row=2, max_row=25)
    total_ref = Reference(ws, min_col=8, min_row=1, max_row=25)
    chart.add_data(total_ref, titles_from_data=True)
    chart.set_categories(months_ref)
    chart.series[0].graphicalProperties.line.width = 25000

    ws.add_chart(chart, "J2")

    # ============================================
    # SHEET 3: P&L PROJECTION
    # ============================================
    ws = ws_pl
    ws.column_dimensions['A'].width = 8
    for col in ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']:
        ws.column_dimensions[col].width = 14

    # Headers
    headers = ['Month', 'MRR Pro', 'MRR Pro+', 'MRR Family', 'MRR Total',
               'Gross Margin', 'Fixed Costs', 'Net Profit', 'Margin %']
    for idx, header in enumerate(headers, start=1):
        cell = ws.cell(row=1, column=idx)
        cell.value = header
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')

    # Data and formulas
    for month in range(1, 25):
        row = month + 1

        ws[f'A{row}'] = month

        # MRR per plan
        ws[f'B{row}'] = f"='User Growth'!C{row}*PrecioPro"
        ws[f'C{row}'] = f"='User Growth'!E{row}*PrecioProPlus"
        ws[f'D{row}'] = f"='User Growth'!G{row}*PrecioFamily"

        # Total MRR
        ws[f'E{row}'] = f'=B{row}+C{row}+D{row}'

        # Gross Margin
        ws[f'F{row}'] = f'=B{row}*MarginPro+C{row}*MarginProPlus+D{row}*MarginFamily'

        # Fixed Costs
        ws[f'G{row}'] = (
            f'=IF(A{row}<=6,Assumptions!$B$26,'
            f'IF(A{row}<=12,Assumptions!$B$27,Assumptions!$B$28))'
        )

        # Net Profit
        ws[f'H{row}'] = f'=F{row}-G{row}'

        # Margin %
        ws[f'I{row}'] = f'=IF(E{row}>0,H{row}/E{row},0)'

        # Formatting
        for col in ['B', 'C', 'D', 'E', 'F', 'G', 'H']:
            ws[f'{col}{row}'].number_format = '$#,##0'
        ws[f'I{row}'].number_format = '0.0%'

    # Conditional formatting for Net Profit
    green_fill = PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")
    red_fill = PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")

    ws.conditional_formatting.add(
        'H2:H25',
        CellIsRule(operator='greaterThan', formula=['0'], fill=green_fill))
    ws.conditional_formatting.add(
        'H2:H25',
        CellIsRule(operator='lessThan', formula=['0'], fill=red_fill))

    # --- P&L Chart: MRR and Net Profit ---
    chart = BarChart()
    chart.type = "col"
    chart.title = "MRR vs Net Profit"
    chart.y_axis.title = "MXN"
    chart.x_axis.title = "Month"
    chart.style = 10
    chart.width = 20
    chart.height = 12

    months_ref = Reference(ws, min_col=1, min_row=2, max_row=25)
    mrr_ref = Reference(ws, min_col=5, min_row=1, max_row=25)
    profit_ref = Reference(ws, min_col=8, min_row=1, max_row=25)
    chart.add_data(mrr_ref, titles_from_data=True)
    chart.add_data(profit_ref, titles_from_data=True)
    chart.set_categories(months_ref)

    ws.add_chart(chart, "K2")

    # ============================================
    # SHEET 4: UNIT ECONOMICS
    # ============================================
    ws = ws_unit_econ
    ws.column_dimensions['A'].width = 25
    for col in ['B', 'C', 'D']:
        ws.column_dimensions[col].width = 15

    # Title
    ws['A1'] = "UNIT ECONOMICS"
    ws['A1'].font = Font(bold=True, size=14)
    ws.merge_cells('A1:D1')

    # Headers
    ws['B3'] = "Pro"
    ws['C3'] = "Pro+"
    ws['D3'] = "Family"
    for col in ['B', 'C', 'D']:
        ws[f'{col}3'].fill = header_fill
        ws[f'{col}3'].font = header_font
        ws[f'{col}3'].alignment = Alignment(horizontal='center')

    # Metrics
    metrics = [
        ('Price (MXN/month)', '=PrecioPro', '=PrecioProPlus', '=PrecioFamily', '$#,##0'),
        ('Margin %', '=MarginPro', '=MarginProPlus', '=MarginFamily', '0%'),
        ('Monthly Churn %', '=ChurnPro', '=ChurnProPlus', '=ChurnFamily', '0%'),
        ('', '', '', '', ''),
        ('LTV (MXN)', '=B4*B5/B6', '=C4*C5/C6', '=D4*D5/D6', '$#,##0'),
        ('CAC (MXN)', '=CACPro', '=CACProPlus', '=CACFamily', '$#,##0'),
        ('LTV/CAC Ratio', '=IF(B9>0,B8/B9,0)', '=IF(C9>0,C8/C9,0)', '=IF(D9>0,D8/D9,0)', '0.0"x"'),
        ('', '', '', '', ''),
        ('Payback (months)', '=IF(B4*B5>0,B9/(B4*B5),0)', '=IF(C4*C5>0,C9/(C4*C5),0)', '=IF(D4*D5>0,D9/(D4*D5),0)', '0.0'),
        ('Margin/User (MXN)', '=B4*B5', '=C4*C5', '=D4*D5', '$#,##0'),
    ]

    for idx, (label, formula_b, formula_c, formula_d, num_format) in enumerate(metrics, start=4):
        ws[f'A{idx}'] = label
        ws[f'A{idx}'].font = Font(bold=True)

        if formula_b:
            ws[f'B{idx}'] = formula_b
            ws[f'C{idx}'] = formula_c
            ws[f'D{idx}'] = formula_d

            for col in ['B', 'C', 'D']:
                ws[f'{col}{idx}'].number_format = num_format
                ws[f'{col}{idx}'].alignment = Alignment(horizontal='right')

    # Conditional formatting for LTV/CAC (row 10)
    green_font = Font(color="006100", bold=True)
    red_font = Font(color="9C0006", bold=True)

    ws.conditional_formatting.add(
        'B10:D10',
        CellIsRule(operator='greaterThanOrEqual', formula=['3'], font=green_font))
    ws.conditional_formatting.add(
        'B10:D10',
        CellIsRule(operator='lessThan', formula=['3'], font=red_font))

    # ============================================
    # SHEET 5: DASHBOARD
    # ============================================
    ws = ws_dashboard
    ws.column_dimensions['A'].width = 25
    for col in ['B', 'C', 'D']:
        ws.column_dimensions[col].width = 18

    # Title
    ws['A1'] = "WUBI - FINANCIAL DASHBOARD"
    ws['A1'].font = Font(bold=True, size=16, color="1F4E78")
    ws.merge_cells('A1:D1')

    # Column headers
    ws['B3'] = "6 Months"
    ws['C3'] = "12 Months"
    ws['D3'] = "24 Months"
    for col in ['B', 'C', 'D']:
        ws[f'{col}3'].fill = header_fill
        ws[f'{col}3'].font = header_font
        ws[f'{col}3'].alignment = Alignment(horizontal='center')

    # USERS
    ws['A5'] = "USERS"
    ws['A5'].fill = section_fill
    ws['A5'].font = section_font

    ws['A6'] = "Total Users"
    ws['B6'] = "='User Growth'!H7"
    ws['C6'] = "='User Growth'!H13"
    ws['D6'] = "='User Growth'!H25"

    ws['A7'] = "  - Plan Pro"
    ws['B7'] = "='User Growth'!C7"
    ws['C7'] = "='User Growth'!C13"
    ws['D7'] = "='User Growth'!C25"

    ws['A8'] = "  - Plan Pro+"
    ws['B8'] = "='User Growth'!E7"
    ws['C8'] = "='User Growth'!E13"
    ws['D8'] = "='User Growth'!E25"

    ws['A9'] = "  - Plan Family"
    ws['B9'] = "='User Growth'!G7"
    ws['C9'] = "='User Growth'!G13"
    ws['D9'] = "='User Growth'!G25"

    # REVENUE
    ws['A11'] = "REVENUE"
    ws['A11'].fill = section_fill
    ws['A11'].font = section_font

    ws['A12'] = "MRR"
    ws['B12'] = "='P&L Projection'!E7"
    ws['C12'] = "='P&L Projection'!E13"
    ws['D12'] = "='P&L Projection'!E25"

    ws['A13'] = "ARR"
    ws['B13'] = "=B12*12"
    ws['C13'] = "=C12*12"
    ws['D13'] = "=D12*12"

    # PROFITABILITY
    ws['A15'] = "PROFITABILITY"
    ws['A15'].fill = section_fill
    ws['A15'].font = section_font

    ws['A16'] = "Gross Margin"
    ws['B16'] = "='P&L Projection'!F7"
    ws['C16'] = "='P&L Projection'!F13"
    ws['D16'] = "='P&L Projection'!F25"

    ws['A17'] = "Fixed Costs"
    ws['B17'] = "='P&L Projection'!G7"
    ws['C17'] = "='P&L Projection'!G13"
    ws['D17'] = "='P&L Projection'!G25"

    ws['A18'] = "Net Profit"
    ws['B18'] = "='P&L Projection'!H7"
    ws['C18'] = "='P&L Projection'!H13"
    ws['D18'] = "='P&L Projection'!H25"

    ws['A19'] = "Margin %"
    ws['B19'] = "='P&L Projection'!I7"
    ws['C19'] = "='P&L Projection'!I13"
    ws['D19'] = "='P&L Projection'!I25"

    # CUMULATIVE
    ws['A21'] = "CUMULATIVE"
    ws['A21'].fill = section_fill
    ws['A21'].font = section_font

    ws['A22'] = "Cumul. Revenue"
    ws['B22'] = "=SUM('P&L Projection'!E2:E7)"
    ws['C22'] = "=SUM('P&L Projection'!E2:E13)"
    ws['D22'] = "=SUM('P&L Projection'!E2:E25)"

    ws['A23'] = "Cumul. Profit"
    ws['B23'] = "=SUM('P&L Projection'!H2:H7)"
    ws['C23'] = "=SUM('P&L Projection'!H2:H13)"
    ws['D23'] = "=SUM('P&L Projection'!H2:H25)"

    # UNIT ECONOMICS
    ws['A25'] = "UNIT ECONOMICS"
    ws['A25'].fill = section_fill
    ws['A25'].font = section_font

    ws['A26'] = "LTV/CAC Pro"
    ws['B26'] = "='Unit Economics'!B10"
    ws['C26'] = "='Unit Economics'!B10"
    ws['D26'] = "='Unit Economics'!B10"

    ws['A27'] = "Payback Pro (months)"
    ws['B27'] = "='Unit Economics'!B12"
    ws['C27'] = "='Unit Economics'!B12"
    ws['D27'] = "='Unit Economics'!B12"

    # Number formatting
    for row in range(6, 10):
        for col in ['B', 'C', 'D']:
            ws[f'{col}{row}'].number_format = '#,##0'

    for row in [12, 13, 16, 17, 18, 22, 23]:
        for col in ['B', 'C', 'D']:
            ws[f'{col}{row}'].number_format = '$#,##0'

    for row in [19]:
        for col in ['B', 'C', 'D']:
            ws[f'{col}{row}'].number_format = '0.0%'

    for row in [26]:
        for col in ['B', 'C', 'D']:
            ws[f'{col}{row}'].number_format = '0.0"x"'

    for row in [27]:
        for col in ['B', 'C', 'D']:
            ws[f'{col}{row}'].number_format = '0.0'

    # ============================================
    # SHEET 6: SCENARIOS
    # ============================================
    ws = ws_scenarios
    ws.column_dimensions['A'].width = 25
    for col in ['B', 'C', 'D']:
        ws.column_dimensions[col].width = 18

    ws['A1'] = "SCENARIO ANALYSIS (24 MONTHS)"
    ws['A1'].font = Font(bold=True, size=14)
    ws.merge_cells('A1:D1')

    ws['B3'] = "Conservative"
    ws['C3'] = "Base"
    ws['D3'] = "Optimistic"
    for col in ['B', 'C', 'D']:
        ws[f'{col}3'].fill = header_fill
        ws[f'{col}3'].font = header_font
        ws[f'{col}3'].alignment = Alignment(horizontal='center')

    # ASSUMPTIONS
    ws['A5'] = "ASSUMPTIONS"
    ws['A5'].fill = section_fill
    ws['A5'].font = section_font

    ws['A6'] = "Churn Pro (%)"
    ws['B6'] = 0.06
    ws['C6'] = '=ChurnPro'
    ws['D6'] = 0.03

    ws['A7'] = "CAC Pro (MXN)"
    ws['B7'] = 400
    ws['C7'] = '=CACPro'
    ws['D7'] = 200

    ws['A8'] = "New Pro/month (M13-24)"
    ws['B8'] = 50
    ws['C8'] = '=Assumptions!$B$33'
    ws['D8'] = 150

    ws['A9'] = "Price Pro (MXN)"
    ws['B9'] = '=PrecioPro'
    ws['C9'] = '=PrecioPro'
    ws['D9'] = '=PrecioPro'

    ws['A10'] = "Margin Pro (%)"
    ws['B10'] = '=MarginPro'
    ws['C10'] = '=MarginPro'
    ws['D10'] = '=MarginPro'

    # RESULTS (formula-driven estimates)
    ws['A12'] = "ESTIMATED RESULTS"
    ws['A12'].fill = section_fill
    ws['A12'].font = section_font

    # Approx total Pro users after 24 months: new_users * sum of retention series
    # Simplified: for steady-state with churn c and monthly adds n, active ~ n/c
    ws['A13'] = "Est. Active Pro Users"
    ws['B13'] = '=IF(B6>0, B8/B6, 0)'
    ws['C13'] = '=IF(C6>0, C8/C6, 0)'
    ws['D13'] = '=IF(D6>0, D8/D6, 0)'

    ws['A14'] = "Est. MRR Pro"
    ws['B14'] = '=B13*B9'
    ws['C14'] = '=C13*C9'
    ws['D14'] = '=D13*D9'

    ws['A15'] = "Est. Gross Margin"
    ws['B15'] = '=B14*B10'
    ws['C15'] = '=C14*C10'
    ws['D15'] = '=D14*D10'

    ws['A16'] = "LTV/CAC"
    ws['B16'] = '=IF(B7>0, (B9*B10/B6)/B7, 0)'
    ws['C16'] = '=IF(C7>0, (C9*C10/C6)/C7, 0)'
    ws['D16'] = '=IF(D7>0, (D9*D10/D6)/D7, 0)'

    # Formatting
    for col in ['B', 'C', 'D']:
        ws[f'{col}6'].number_format = '0%'
        ws[f'{col}7'].number_format = '#,##0'
        ws[f'{col}8'].number_format = '#,##0'
        ws[f'{col}9'].number_format = '$#,##0'
        ws[f'{col}10'].number_format = '0%'
        ws[f'{col}13'].number_format = '#,##0'
        ws[f'{col}14'].number_format = '$#,##0'
        ws[f'{col}15'].number_format = '$#,##0'
        ws[f'{col}16'].number_format = '0.0"x"'

    # ============================================
    # SHEET 7: SENSITIVITY ANALYSIS
    # ============================================
    ws = ws_sensitivity
    ws.column_dimensions['A'].width = 12
    for col in ['B', 'C', 'D', 'E', 'F']:
        ws.column_dimensions[col].width = 12

    ws['A1'] = "SENSITIVITY ANALYSIS: LTV/CAC PLAN PRO"
    ws['A1'].font = Font(bold=True, size=12)
    ws.merge_cells('A1:F1')

    # Headers
    ws['A3'] = "CAC / Churn"
    ws['B3'] = "3%"
    ws['C3'] = "4%"
    ws['D3'] = "5%"
    ws['E3'] = "6%"
    ws['F3'] = "7%"

    for col in ['A', 'B', 'C', 'D', 'E', 'F']:
        ws[f'{col}3'].fill = header_fill
        ws[f'{col}3'].font = header_font
        ws[f'{col}3'].alignment = Alignment(horizontal='center')

    # CAC values
    cac_values = [200, 300, 400, 500]
    churn_values = [0.03, 0.04, 0.05, 0.06, 0.07]

    for idx, cac in enumerate(cac_values, start=4):
        ws[f'A{idx}'] = cac
        ws[f'A{idx}'].fill = section_fill
        ws[f'A{idx}'].font = Font(bold=True)
        ws[f'A{idx}'].alignment = Alignment(horizontal='center')
        ws[f'A{idx}'].number_format = '$#,##0'

        for col_idx, col in enumerate(['B', 'C', 'D', 'E', 'F']):
            # Formula: (Price * Margin) / Churn / CAC
            ws[f'{col}{idx}'] = f'=(PrecioPro*MarginPro)/{churn_values[col_idx]}/{cac}'
            ws[f'{col}{idx}'].number_format = '0.0"x"'

    # Conditional formatting
    ws.conditional_formatting.add(
        'B4:F7',
        CellIsRule(
            operator='greaterThanOrEqual', formula=['3'],
            fill=PatternFill(start_color="C6EFCE", end_color="C6EFCE", fill_type="solid")))
    ws.conditional_formatting.add(
        'B4:F7',
        CellIsRule(
            operator='lessThan', formula=['3'],
            fill=PatternFill(start_color="FFC7CE", end_color="FFC7CE", fill_type="solid")))

    return wb


def create_wubi_model_bytes(params=None):
    """Generate the model and return it as bytes (for web download)."""
    wb = create_wubi_model(params)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def save_wubi_model(params=None, filename="WUBI_Financial_Model.xlsx"):
    """Generate the model and save to disk (CLI usage)."""
    wb = create_wubi_model(params)
    wb.save(filename)
    print(f"Financial model created successfully: {filename}")
    print()
    print("The file includes:")
    print("  1. Assumptions - Dynamic inputs")
    print("  2. User Growth - Growth with churn + chart")
    print("  3. P&L Projection - Income statement + chart")
    print("  4. Unit Economics - LTV/CAC and metrics")
    print("  5. Dashboard - Executive summary with cumulative metrics")
    print("  6. Scenarios - Formula-driven scenario analysis")
    print("  7. Sensitivity - LTV/CAC sensitivity table")
    print()
    print("Change any value in 'Assumptions' and everything recalculates automatically.")
    return filename


def compute_preview(params=None):
    """Compute key metrics server-side for the free preview.

    Returns a dict of metrics that can be displayed before payment.
    """
    p = {**DEFAULT_PARAMS, **(params or {})}

    # Simulate 24 months of user growth
    active_pro = 0.0
    active_proplus = 0.0
    active_family = 0.0

    monthly_data = []

    for month in range(1, 25):
        if month <= 6:
            new_pro = p["new_pro_1_6"]
            new_proplus = p["new_proplus_1_6"]
            new_family = p["new_family_1_6"]
            fixed_cost = p["fixed_cost_1_6"]
        elif month <= 12:
            new_pro = p["new_pro_7_12"]
            new_proplus = p["new_proplus_7_12"]
            new_family = p["new_family_7_12"]
            fixed_cost = p["fixed_cost_7_12"]
        else:
            new_pro = p["new_pro_13_24"]
            new_proplus = p["new_proplus_13_24"]
            new_family = p["new_family_13_24"]
            fixed_cost = p["fixed_cost_13_24"]

        active_pro = active_pro * (1 - p["churn_pro"]) + new_pro
        active_proplus = active_proplus * (1 - p["churn_proplus"]) + new_proplus
        active_family = active_family * (1 - p["churn_family"]) + new_family

        mrr_pro = active_pro * p["price_pro"]
        mrr_proplus = active_proplus * p["price_proplus"]
        mrr_family = active_family * p["price_family"]
        mrr_total = mrr_pro + mrr_proplus + mrr_family

        gross_margin = (
            mrr_pro * p["margin_pro"]
            + mrr_proplus * p["margin_proplus"]
            + mrr_family * p["margin_family"]
        )
        net_profit = gross_margin - fixed_cost

        monthly_data.append({
            "month": month,
            "active_pro": round(active_pro),
            "active_proplus": round(active_proplus),
            "active_family": round(active_family),
            "total_users": round(active_pro + active_proplus + active_family),
            "mrr": round(mrr_total),
            "gross_margin": round(gross_margin),
            "fixed_cost": round(fixed_cost),
            "net_profit": round(net_profit),
        })

    # LTV/CAC
    def ltv_cac(price, margin, churn, cac):
        if churn == 0 or cac == 0:
            return 0
        ltv = price * margin / churn
        return round(ltv / cac, 1)

    def payback(price, margin, cac):
        monthly_margin = price * margin
        if monthly_margin == 0:
            return 0
        return round(cac / monthly_margin, 1)

    m6 = monthly_data[5]
    m12 = monthly_data[11]
    m24 = monthly_data[23]

    return {
        "monthly_data": monthly_data,
        "snapshots": {"6": m6, "12": m12, "24": m24},
        "ltv_cac_pro": ltv_cac(p["price_pro"], p["margin_pro"], p["churn_pro"], p["cac_pro"]),
        "ltv_cac_proplus": ltv_cac(p["price_proplus"], p["margin_proplus"], p["churn_proplus"], p["cac_proplus"]),
        "ltv_cac_family": ltv_cac(p["price_family"], p["margin_family"], p["churn_family"], p["cac_family"]),
        "payback_pro": payback(p["price_pro"], p["margin_pro"], p["cac_pro"]),
        "payback_proplus": payback(p["price_proplus"], p["margin_proplus"], p["cac_proplus"]),
        "payback_family": payback(p["price_family"], p["margin_family"], p["cac_family"]),
    }


if __name__ == "__main__":
    save_wubi_model()

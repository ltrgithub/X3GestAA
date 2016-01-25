using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;
using Microsoft.Office.Interop.Excel;
using CommonDataHelper.GlobalHelper;

namespace ExcelAddIn
{
    class UnitTest_Tables
    {
        // table1 : 2 columns, 4 lines
        String table1_prototype = "[{_name:\"a\", _title: \"A\", _type: \"application/x-string\"}, {_name:\"b\", _title: \"B\", _type: \"application/x-string\"}]";
        //String table1_data = "";
        // table2 : 3 columns, 4 lines
        String table2_prototype = "[{_name:\"a\", _title: \"A\", _type: \"application/x-string\"}, {_name:\"b\", _title: \"B\", _type: \"application/x-string\"}" + 
            ",{_name:\"c\", _title: \"C\", _type: \"application/x-string\"}]";
        //String table2_data = "";
        //
        SageJsonSerializer jsSerializer = new SageJsonSerializer();
        //
        public UnitTest_Tables()
        {
        }

        public bool Execute()
        {
            Worksheet activeWs = (Worksheet)Globals.ThisAddIn.Application.ActiveSheet;
            // insert table1 to the current sheet
            activeWs.Range["A1"].Select();
            SyracuseExcelTable table1 = new SyracuseExcelTable("table1_1", (ExcelTablePrototypeField[])jsSerializer.Deserialize<ExcelTablePrototypeField[]>(table1_prototype));
            if (!table1.ResizeTable(4))
                return false;
            // insert table2 to the current sheet
            activeWs.Range["A6"].Select();
            SyracuseExcelTable table2 = new SyracuseExcelTable("table2_1", (ExcelTablePrototypeField[])jsSerializer.Deserialize<ExcelTablePrototypeField[]>(table2_prototype));
            if (!table2.ResizeTable(4))
                return false;
            // delete one row from table1
            ((Range)activeWs.Rows[3]).Delete(XlDeleteShiftDirection.xlShiftUp);
            // resize table1 must fail in shift cells mode as table2 would brake
            if (table1.ResizeTable(4))
                return false;
            Globals.ThisAddIn.Ribbon.dropDownInsert.SelectedItemIndex = (int)CellsInsertStyle.InsertRows;
            // resize table1 must succeed in insert rows mode
            if (!table1.ResizeTable(4))
                return false;
            // table1 shrink must succeed in shift cells mode but table2 stays in A6
            if (!table1.ResizeTable(3))
                return false;
            // check value of A6 : must be "A"
            if (activeWs.Range["A6"].Value2.ToString() != "A")
                return false;
            // restore table1 size in "do nothing" mode
            Globals.ThisAddIn.Ribbon.dropDownInsert.SelectedItemIndex = (int)CellsInsertStyle.DoNothing;
            if (!table1.ResizeTable(4))
                return false;
            // table1 shrink must succeed in delete rows mode
            Globals.ThisAddIn.Ribbon.dropDownDelete.SelectedItemIndex = (int)CellsDeleteStyle.DeleteRows;
            if (!table1.ResizeTable(3))
                return false;
            // check value of A5 : must be "A"
            if (activeWs.Range["A5"].Value2.ToString() != "A")
                return false;
            //
            return true;
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Office.Interop.Excel;
using System.Web.Script.Serialization;

namespace ExcelAddIn
{
    class ReportingUtils
    {
        public static void createExcelTemplate(Workbook workbook, String layoutAndData)
        {
            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(layoutAndData);
            SyracuseOfficeCustomData customData;

            Globals.ThisAddIn.Application.ScreenUpdating = false;

            try
            {
                if (layout["refreshOnly"].ToString().ToLower().Equals("true"))
                {
                    customData = SyracuseOfficeCustomData.getFromDocument(workbook, false);
                    if (customData != null)
                    {
                        customData.setForceRefresh(false);
                        customData.writeDictionaryToDocument();
                    }

                    Globals.ThisAddIn.Application.ScreenUpdating = true;
                    return;
                }
            }
            catch (Exception) { };

            customData = SyracuseOfficeCustomData.getFromDocument(workbook, false);
            if (customData != null)
            {
                customData.writeDictionaryToDocument();
            }

            Globals.ThisAddIn.Application.ScreenUpdating = true;
        }

        public static bool isSupportedType(Dictionary<String, Object> item)
        {
            try
            {
                string type = item["$type"].ToString();
                ReportingFieldTypes ft = ReportingFieldUtil.getType(type);
                if (ReportingFieldUtil.isSupportedType(ft))
                    return true;
            }
            catch (Exception) { }
            return false;
        }

        public static void fillTemplate(Workbook workbook)
        {
            /*
             * We simply need to perform a data refresh here.
             */
            if (!Globals.ThisAddIn.ActionPanel.connected)
            {
                Globals.ThisAddIn.AutoConnect(workbook);
                return;
            }
            Globals.ThisAddIn.RefreshAll();
        }

        #region placeholderHelper

        public struct Placeholder
        {
            public int row;
            public int column;
            public string name;
        }

        public struct PlaceholderTable
        {
            public int id;
            public Placeholder placeholder;
        }

        private static void addToPlaceholderTableList(List<PlaceholderTable> placeholderTableList, int id, Placeholder placeholder)
        {
            PlaceholderTable placeholderTable;
            placeholderTable.id = id;
            placeholderTable.placeholder = placeholder;
            placeholderTableList.Add(placeholderTable);
        }

        public static List<PlaceholderTable> buildPlaceholderTableList(Worksheet worksheet)
        {
            List<Placeholder> placeholderList = new List<Placeholder>();
            foreach (Name name in Globals.ThisAddIn.Application.ActiveWorkbook.Names)
            {
                try
                {
                    Range range = Globals.ThisAddIn.Application.ActiveWorkbook.ActiveSheet.Range(name.RefersTo);
                    Placeholder placeholder = new Placeholder();
                    placeholder.row = range.Row;
                    placeholder.column = range.Column;
                    placeholder.name = range.Name.Name;
                    placeholderList.Add(placeholder);
                }
                catch (Exception)
                {
                    ;
                }
            }

            /*
             * Create a list of discrete placeholder tables. Each table will then contain one or more placeholders.
             */
            List<PlaceholderTable> placeholderTableList = new List<PlaceholderTable>();

            int id = 0;

            /*
             * Iterate through the rows that placeholders are located on.
             */
            foreach (var row in placeholderList.GroupBy(ph => ph.row).OrderBy(ph => ph.Key).ToList())
            {
                int lastColumn = 0;

                /*
                 * Iterate through each placeholder row in column order.
                 * When a non-contiguous column is found, create a new id for the new table.
                 */
                foreach (Placeholder placeholder in placeholderList.Where(ph => ph.row == row.Key).OrderBy(ph => ph.column).ToList())
                {
                    if (lastColumn == 0)
                    {
                        lastColumn = placeholder.column;
                        addToPlaceholderTableList(placeholderTableList, id, placeholder);
                        continue;
                    }

                    if (placeholder.column == lastColumn + 1)
                    {
                        lastColumn = placeholder.column;
                        addToPlaceholderTableList(placeholderTableList, id, placeholder);
                        continue;
                    }

                    /*
                     * We've found a non-contiguous column
                     */
                    lastColumn = placeholder.column;
                    addToPlaceholderTableList(placeholderTableList, ++id, placeholder);
                }
            }

            return placeholderTableList;
        }

        //public static void test()
        //{
        //    var orderedPlaceholderTableList = buildPlaceholderTableList().GroupBy(x => new { x.id, x.placeholder.row }).ToList();
        //    foreach (var table in orderedPlaceholderTableList)
        //    {
        //        foreach (var x in table)
        //        {
        //            System.Diagnostics.Debug.WriteLine("Table: " + x.placeholder.name);
        //        }
        //        System.Diagnostics.Debug.WriteLine("-------------");
        //    }
        //}

        //public static void addDummyPlaceholders()
        //{
        //    Microsoft.Office.Tools.Excel.NamedRange textInCell;

        //    Worksheet worksheet = Globals.Factory.GetVstoObject(Globals.ThisAddIn.Application.ActiveWorkbook.Worksheets[1]);

        //    Excel.Range cell = worksheet.Range["D4"];
        //    textInCell = worksheet.Controls.AddNamedRange(cell, "title");

        //    cell = worksheet.Range["E4"];
        //    textInCell = worksheet.Controls.AddNamedRange(cell, "firstName");

        //    cell = worksheet.Range["C4"];
        //    textInCell = worksheet.Controls.AddNamedRange(cell, "description");

        //    cell = worksheet.Range["AA6"];
        //    textInCell = worksheet.Controls.AddNamedRange(cell, "address");

        //    cell = worksheet.Range["G5"];
        //    textInCell = worksheet.Controls.AddNamedRange(cell, "surname");

        //    cell = worksheet.Range["H5"];
        //    textInCell = worksheet.Controls.AddNamedRange(cell, "age");
        //}
        #endregion

    }
}

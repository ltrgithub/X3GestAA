using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Office.Interop.Excel;
using System.Web.Script.Serialization;
using System.Windows.Forms;

namespace ExcelAddIn
{
    public class ExcelReportingField
    {
        public string type;
        public int scale;
        public string containerType;
        public string title;
    }

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
                SyracuseCustomData cd = new SyracuseCustomData(Globals.ThisAddIn.Application.ActiveWorkbook);
                cd.StoreCustomDataAtAddress("A5", customData.getDictionary()["datasourcesAddress"].ToString());
                cd.StoreCustomDataAtAddress("A2", customData.getServerUrl());
                customData.writeDictionaryToDocument();

                if (customData.getCreateMode().Equals(TemplateActions.rpt_build_tpl))
                {
                    Globals.ThisAddIn.showReportingFieldsTaskPane(true);
                }
            }

            Globals.ThisAddIn.Application.ScreenUpdating = true;
        }

        public static bool isControlColumn(string columnId)
        {
            return columnId.Contains("$");
        }

        public static bool isSupportedType(Dictionary<String, Object> item)
        {
            try
            {
                if (isControlColumn(item["$bind"].ToString()) == false)
                {
                    string type = item["$type"].ToString();
                    ReportingFieldTypes ft = ReportingFieldUtil.getType(type);
                    if (ReportingFieldUtil.isSupportedType(ft))
                        return true;
                }
            }
            catch (Exception) { }
            return false;
        }

        #region listfacet

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

        #endregion

        #region detailfacet

        public static void fillTemplate(Workbook workbook, String data, BrowserDialog browserDialog)
        {
            ProgressDialog pd = new ProgressDialog();
            pd.Show();
            pd.Refresh();

            try
            {
                Globals.ThisAddIn.Application.ScreenUpdating = false;

                JavaScriptSerializer ser = new JavaScriptSerializer();
                Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(data);

                Dictionary<String, object> entityData = (Dictionary<String, object>)layout["data"];

                Dictionary<String, ExcelReportingField> fieldsInfo = BuildFieldInfo((object[])layout["proto"]);

                string locale = Globals.ThisAddIn.commons.GetDocumentLocale(workbook);
                if (locale != null)
                {
                    ReportingFieldUtil.SetActiveCulture(locale);
                }

                FillNonCollectionControls(workbook, entityData, fieldsInfo, browserDialog);

                FillCollectionControls(workbook, entityData, fieldsInfo, browserDialog, pd);
            }
            finally
            {
                Globals.ThisAddIn.Application.ScreenUpdating = true;
                pd.Close();
            }
            Globals.ThisAddIn.Application.ScreenUpdating = true;
        }

        private static void FillCollectionControls(Workbook workbook, Dictionary<String, object> entityData, Dictionary<String, ExcelReportingField> fieldsInfo, BrowserDialog browserDialog, ProgressDialog pd)
        {
            /*
             * Iterate through the list of placeholder groups. Populate only non-tabular placeholders within each group.
             */
            var orderedPlaceholderTableList = ReportingUtils.buildPlaceholderTableList().GroupBy(x => new { x.id, x.placeholder.row }).ToList();
            foreach (IGrouping<object, PlaceholderTable> orderedPlaceholderTables in orderedPlaceholderTableList)
            {
                String placeholderTableName = orderedPlaceholderTables.First().placeholder.name;
                if (entityData.ContainsKey("$resources"))
                    placeholderTableName = "$resources." + placeholderTableName;

                foreach (var placeholderTable in orderedPlaceholderTables)
                {

                    if (GetTabularFieldsList(fieldsInfo).Count(pair => pair.Key.Equals(placeholderTable.placeholder.name)) > 0)
                    {
                        /*
                         * The placeholder is present in the tabular fields list...
                         */

                        String placeholderName = placeholderTable.placeholder.name;
                        if (entityData.ContainsKey("$resources"))
                            placeholderName = "$resources." + placeholderName;

                        String collection = placeholderTableName.Split('.')[0];
                        if (collection != null && entityData.ContainsKey(collection))
                        {
                            Dictionary<String, object> tabularCollection = (Dictionary<String, object>)entityData[collection];
                            if (tabularCollection.ContainsKey("$items"))
                            {
                                Object[] itemsArray = (Object[])tabularCollection["$items"];
                                pd.SetRowsExpected(itemsArray.Count());

                                /*
                                 * We'll use the first placeholder in the placeholder group to name the  listObject.
                                 * This allows us to split the table into sub-tables.
                                 */
                                if (ListObjectExists(workbook, placeholderTableName) == false)
                                {
                                    new SyracuseExcelTable().createDiscreteTemplateObject(placeholderTableName, orderedPlaceholderTables, itemsArray.Count());
                                }

                                int row = 1;
                                foreach (Object item in itemsArray)
                                {
                                    Dictionary<String, Object> itemsDictionary = (Dictionary<String, Object>)item;
                                    String field = placeholderName.Split('.')[1];
                                    if (field != null && itemsDictionary.ContainsKey(field))
                                    {
                                        Dictionary<String, object> fieldItem = (Dictionary<String, Object>)((Dictionary<String, object>)itemsDictionary[field])["$value"];
                                        String propData = fieldItem.Count() > 0 ? fieldItem.First().Value.ToString() : String.Empty;
                                        PopulatePlaceholderCell(placeholderTable.placeholder, propData, null, row++);
                                    }
                                }
                                pd.SignalRowDone();
                            }
                            else
                            {
                                /*
                                 * We have a placeholder that has no associated data. We therefore need to remove the placeholder.
                                 */
                                clearPlaceholderName(workbook, placeholderTable.placeholder.name);
                            }
                        }
                    }
                    else
                    {
                        /*
                         * We've found a field that isn't in this placeholder table, so break to the next placeholder table...
                         */
                        break;
                    }
                }
            }
        }

        private static void FillNonCollectionControls(Workbook workbook, Dictionary<String, object> entityData, Dictionary<String, ExcelReportingField> fieldsInfo, BrowserDialog browserDialog)
        {
            /*
             * Iterate through the list of placeholder groups. Populate only non-tabular placeholders within each group.
             */
            var orderedPlaceholderTableList = ReportingUtils.buildPlaceholderTableList().GroupBy(x => new { x.id, x.placeholder.row }).ToList();
            foreach (IGrouping<object, PlaceholderTable> placeholderTables in orderedPlaceholderTableList)
            {
                foreach (var placeholderTable in placeholderTables)
                {
                    if (GetNonTabularFieldsList(fieldsInfo).Count(pair => pair.Key.Equals(placeholderTable.placeholder.name)) > 0)
                    {
                        /*
                         * We have a valid non-tabular placeholder, so populate it with the relevant data...
                         */
                        if (entityData.ContainsKey(placeholderTable.placeholder.name))
                        {
                            Dictionary<String, Object> item = (Dictionary<String, Object>)((Dictionary<String, object>)entityData[placeholderTable.placeholder.name])["$value"];
                            String link = null;
                            if (((Dictionary<String, object>)entityData[placeholderTable.placeholder.name]).ContainsKey("$link"))
                                link = (String)((Dictionary<String, object>)entityData[placeholderTable.placeholder.name])["$link"];

                            if (item != null && item.Count() > 0)
                            {
                                String propData = item.First().Value.ToString();
                                PopulatePlaceholderCell(placeholderTable.placeholder, propData, link);
                            }
                            else
                            {
                                /*
                                 * We have a placeholder that has no associated data. We therefore need to remove the placeholder.
                                 */
                                clearPlaceholderName(workbook, placeholderTable.placeholder.name);
                            }
                        }
                        else if (placeholderTable.placeholder.name.Contains('.'))
                        {
                            /*
                             * We have a nested non-tabular field - e.g. locales.code
                             */
                            String collection = placeholderTable.placeholder.name.Split('.')[0];
                            if (collection != null & entityData.ContainsKey(collection))
                            {
                                Dictionary<String, object> nonTabularCollection = (Dictionary<String, object>)entityData[collection];
                                if (nonTabularCollection.ContainsKey("$items"))
                                {
                                    Object[] itemsArray = (Object[])nonTabularCollection.Where(key => key.Key.Equals("$items")).First().Value;
                                    Dictionary<String, object> itemsDictionary = (Dictionary<String, object>)itemsArray[0];

                                    String field = placeholderTable.placeholder.name.Split('.')[1];
                                    if (field != null && itemsDictionary.ContainsKey(field))
                                    {
                                        Dictionary<String, object> item = (Dictionary<String, Object>)((Dictionary<String, object>)itemsDictionary[field])["$value"];

                                        String link = null;
                                        if (((Dictionary<String, object>)itemsDictionary[field]).ContainsKey("$link"))
                                            link = (String)((Dictionary<String, object>)itemsDictionary[field])["$link"];

                                        String propData = item.First().Value.ToString();
                                        PopulatePlaceholderCell(placeholderTable.placeholder, propData, link);
                                    }
                                }
                            }
                        }   
                    }
                }
            }
        }

        private static Dictionary<String, ExcelReportingField> BuildFieldInfo(object[] layout)
        {
            String bind = String.Empty;
            Dictionary<String, ExcelReportingField> fields = new Dictionary<String, ExcelReportingField>();
            foreach (Object o in layout)
            {
                try
                {
                    Dictionary<String, object> container = (Dictionary<String, object>)o;
                    if (container.ContainsKey("$items"))
                    {
                        Dictionary<String, object> items = (Dictionary<String, object>)container["$items"];

                        if (container.ContainsKey("$bind") && container["$bind"].ToString().Equals("$resources") == false)
                            bind = container["$bind"].ToString() + ".";

                        String containerType = String.Empty;
                        if (container.ContainsKey("$container"))
                            containerType = container["$container"].ToString();

                        foreach (KeyValuePair<String, object> i in items)
                        {
                            Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                            if (!isSupportedType(item))
                                continue;

                            String type = item["$type"].ToString();
                            String bind_i = item["$bind"].ToString();
                            int? scale = (int?)item["$scale"];
                            String title = item["$title"].ToString();

                            ExcelReportingField field = new ExcelReportingField();
                            field.type = type;
                            field.scale = scale.GetValueOrDefault(2);
                            field.containerType = containerType;
                            field.title = title;
                            try
                            {
                                fields.Add(bind + bind_i, field);
                            }
                            catch (Exception) { };
                        }
                    }
                    else if (container.ContainsKey("$level"))
                    {
                        int level = Convert.ToInt32(container["$level"].ToString());
                        if (level == 2 && container.ContainsKey("$bind"))
                        {
                            bind = container["$bind"].ToString() + ".";
                        }
                    }
                }
                catch (Exception e) { MessageBox.Show(e.Message + "\n" + e.StackTrace); }
            }
            return fields;
        }

        private static void PopulatePlaceholderCell(Placeholder placeholder, String propData, String link, int rowOffset = 0)
        {
            Range activeCell = Globals.ThisAddIn.Application.ActiveCell;
            Worksheet targetWorksheet = activeCell.Worksheet;

            Range cell = targetWorksheet.Range[targetWorksheet.Cells[placeholder.row + rowOffset, placeholder.column],
                                                targetWorksheet.Cells[placeholder.row + rowOffset, placeholder.column]];
            if (link != null)
                targetWorksheet.Hyperlinks.Add(cell, link);
            cell.Value2 = propData;
        }

        /*
         * Build the list of fields that belong to a table.
         */
        private static List<KeyValuePair<string, ExcelAddIn.ExcelReportingField>> GetTabularFieldsList(Dictionary<String, ExcelReportingField> fieldsInfo)
        {
            List<KeyValuePair<string, ExcelAddIn.ExcelReportingField>> s = fieldsInfo.Where(field => field.Value.containerType.Equals("table")).ToList();
                                //.Where(field => field.Value.containerType.Equals("table")).ToList();
            return s;
        }

        /*
         * Build the list of fields that do not belong to a table.
         */
        private static List<KeyValuePair<string, ExcelAddIn.ExcelReportingField>> GetNonTabularFieldsList(Dictionary<String, ExcelReportingField> fieldsInfo)
        {
            List<KeyValuePair<string, ExcelAddIn.ExcelReportingField>> s = fieldsInfo.Where(field => field.Value.containerType.Equals("table") == false).ToList(); // Where(field => field.Value.containerType.Equals("table") == false).ToList();
            return s;
        }

        public static Boolean ListObjectExists(Workbook workbook, String collection)
        {
            Worksheet activeSheet = workbook.ActiveSheet;
            if (activeSheet != null && activeSheet.ListObjects != null)
            {
                foreach (ListObject listObject in activeSheet.ListObjects)
                {
                    if (listObject.Name.Equals(collection))
                        return true;
                }
            }
            return false;
         }
 
        #endregion
        
        #region placeholderHelper

        public struct Placeholder
        {
            public int row;
            public int column;
            public string name;
            public string title;
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

        public static List<PlaceholderTable> buildPlaceholderTableList()
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

                    if (range.Value2 != null)
                    {
                        String title = range.Value2;
                        if (title.Contains("."))
                        {
                            title = title.Split('.')[1];
                            placeholder.title = title.Substring(0, title.Length - 2);
                        }
                        else
                            placeholder.title = title.Substring(2, title.Length - 4); ;
                    }

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

        public static void clearPlaceholderName(Workbook workbook, string placeholderName, Range activeCell = null)
        {
            /*
             * Clear the text from the old placeholder cell. 
             */
            foreach (Name name in workbook.Names)
            {
                if (name.Name.Equals(placeholderName))
                {
                    Range range = workbook.ActiveSheet.Range(name.RefersTo);
                    workbook.ActiveSheet.Range(name.RefersTo).Value2 = "";
                    break;
                }
            }

            /*
             * Remove existing placeholder from the target cell.
             */
            foreach (Name name in workbook.Names)
            {
                if (activeCell != null)
                {
                    if (workbook.ActiveSheet.Range(name.RefersTo).row == activeCell.Row &&
                        workbook.ActiveSheet.Range(name.RefersTo).column == activeCell.Column)
                    {
                        name.Delete();
                        break;
                    }
                }
                else
                {
                    if (name.Name.Equals(placeholderName))
                    {
                        name.Delete();
                        break;
                    }
                }
            }
        }

        public static Boolean isPlaceholderInTable(IGrouping<object, ExcelAddIn.ReportingUtils.PlaceholderTable> placeholderTable, String placeholderName)
        {
            return placeholderTable.Where(x => x.placeholder.name.Equals(placeholderName)).Count() > 0;
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

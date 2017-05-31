using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Word;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Office.Core;
using System.IO;
using System.Text.RegularExpressions;
using System.Globalization;
using CommonDataHelper.GlobalHelper;
using CommonDialogs.ConnectionProgressDialog;

namespace WordAddIn
{
    public class WordReportingField
    {
        public string type;
        public int scale;
    }
    class ReportingUtils
    {
        public static void createWordTemplate(Document doc, String layoutAndData)
        {
            ConnectionProgressHelper.showConnectionDialog(false);
            SageJsonSerializer ser = new SageJsonSerializer();
            Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(layoutAndData);
            SyracuseOfficeCustomData customData;
            
            Globals.WordAddIn.Application.ScreenUpdating = false;

            try
            {
                if (layout["refreshOnly"].ToString().ToLower().Equals("true"))
                {
                    customData = SyracuseOfficeCustomData.getFromDocument(doc, false);
                    if (customData != null)
                    {
                        customData.setForceRefresh(false);
                        customData.writeDictionaryToDocument();
                    }

                    Globals.WordAddIn.refreshReportingFieldsTaskPane(doc.ActiveWindow);
                    Globals.WordAddIn.Application.ScreenUpdating = true;
                    return;
                }
            }
            catch (Exception) { };

            Object[] boxes = (Object[])layout["layout"];
            String parent = null;
            foreach (Object o in boxes)
            {
                try
                {
                    Dictionary<String, object> box = (Dictionary<String, object>)o;
                    if (box.ContainsKey("$title"))
                    {
                        if (box.ContainsKey("$bind"))
                            parent = box["$bind"].ToString();
                        else
                            parent = null;

                        Range r = doc.Range();
                        r.Collapse(WdCollapseDirection.wdCollapseEnd);
                        r.InsertAfter(box["$title"].ToString());
                        r = doc.Range();
                        r.Collapse(WdCollapseDirection.wdCollapseEnd);
                        r.InsertParagraph();
                    }

                    if (box.ContainsKey("$items"))
                    {
                        Dictionary<String, object> items = (Dictionary<String, object>)box["$items"];
                        String container = "box";
                        if (box.ContainsKey("$container"))
                        {
                            container = box["$container"].ToString();
                        }
                        if (container.Equals("table"))
                        {
                            addTable(doc, box, items);
                        }
                        else
                        {
                            addBox(doc, box, items, parent);
                        }
                    }
                }
                catch (Exception e) { MessageBox.Show(e.Message + "\n" + e.StackTrace);  }
            }

            customData = SyracuseOfficeCustomData.getFromDocument(doc, false);
            if (customData != null)
            {
                customData.setCreateMode(ReportingActions.rpt_is_tpl);
                customData.writeDictionaryToDocument();
            }

            Globals.WordAddIn.refreshReportingFieldsTaskPane(doc.ActiveWindow);
            if (!doc.FormsDesign)
            {
                doc.ToggleFormsDesign();
            }
            Globals.WordAddIn.Application.ScreenUpdating = true;
        }

        private static void addTable(Document doc, Dictionary<String, object> box, Dictionary<String, object> items)
        {
            int colCount = 0;
            foreach (KeyValuePair<String, object> i in items)
            {
                Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                if (!isSupportedType(item))
                    continue;

                String hidden = item["$hidden"].ToString();
                if (!"true".Equals(hidden))
                {
                    colCount++;
                }

                if (colCount > 15)
                {
                    break;
                }
            }

            Range r = doc.Range();
            r.Collapse(WdCollapseDirection.wdCollapseEnd);
            Table t = r.Tables.Add(r, 2, colCount, WdDefaultTableBehavior.wdWord9TableBehavior, WdAutoFitBehavior.wdAutoFitWindow);
            t.Borders.OutsideLineStyle = WdLineStyle.wdLineStyleDot;

            String bind = box["$bind"].ToString();

            int col = 0;
            foreach (KeyValuePair<String, object> i in items)
            {
                Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                if (!isSupportedType(item))
                    continue;

                String hidden = item["$hidden"].ToString();
                if (!"true".Equals(hidden))
                {
                    String title = item["$title"].ToString();

                    col++;
                    if (col <= colCount)
                    {
                        r = t.Cell(1, col).Range;
                        r.Text = title;
                        r = t.Cell(2, col).Range;
                        createContentControl(doc, r, item, bind);
                    }
                }
            }

            r = doc.Range();
            r.Collapse(WdCollapseDirection.wdCollapseEnd);
            r.InsertParagraph();
        }

        private static void addBox(Document doc, Dictionary<String, object> box, Dictionary<String, object> items, String parent)
        {
            foreach (KeyValuePair<String, object> i in items)
            {
                Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                if (!isSupportedType(item))
                    continue;

                String hidden = item["$hidden"].ToString();
                if (!"true".Equals(hidden))
                {
                    Range r = doc.Range();
                    r.Collapse(WdCollapseDirection.wdCollapseEnd);
                    r.Start++;
                    r.End++;
                    createContentControl(doc, r, item, parent);
                    r = doc.Range();
                    r.Collapse(WdCollapseDirection.wdCollapseEnd);
                    r.InsertParagraph();
                }
            }
        }

        public static ContentControl createContentControl(Document doc, Range range, Dictionary<String, Object> item, String parent)
        {
            try
            {
                String type = item["$type"].ToString();
                String title = item["$title"].ToString();
                String bind = item["$bind"].ToString();

                ContentControl c;
                if ("image".Equals(type))
                {
                    c = range.ContentControls.Add(WdContentControlType.wdContentControlPicture);
                }
                else
                {
                    c = range.ContentControls.Add(WdContentControlType.wdContentControlText);
                }

                c.SetPlaceholderText(null, null, title);
                c.Tag = (parent != null ? parent + "." : "") + bind;
                c.Title = type;
                return c;
            } catch (Exception) { };
            return null;
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

        public static void fillTemplate(Document doc, String data, BrowserDialog browserDialog)
        {
            WdViewType vt = doc.ActiveWindow.View.Type;
            bool pagination = doc.Application.Options.Pagination;

            ConnectionProgressHelper.showConnectionDialog(false);
            ProgressDialog pd = new ProgressDialog();
            pd.Show();
            pd.Refresh();
            try
            {
                Selection oldSelection = Globals.WordAddIn.Application.Selection;
                Globals.WordAddIn.Application.ScreenUpdating = false;

                SageJsonSerializer ser = new SageJsonSerializer();
                ser.MaxJsonLength = Int32.MaxValue;
                Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(data);

                Dictionary<String, object> entityData = (Dictionary<String, object>)layout["data"];

                Dictionary<String, WordReportingField> fieldInfo = BuildFieldInfo((object[])layout["proto"]);

                List<ContentControl> allContentControls = ContentControlHelper.GetAllContentControls(doc);

                Globals.WordAddIn.Application.ScreenUpdating = true;
                Globals.WordAddIn.Application.ScreenRefresh();
                Globals.WordAddIn.Application.ScreenUpdating = false;

                doc.ActiveWindow.View.Type = WdViewType.wdNormalView;
                doc.Application.Options.Pagination = false;

                string locale = Globals.WordAddIn.commons.GetDocumentLocale(doc);
                if (locale != null)
                {
                    ReportingFieldUtil.SetActiveCulture(locale);
                }

                FillNonCollectionControls(doc, allContentControls, entityData, fieldInfo, browserDialog);

                //long ticks = DateTime.Now.Ticks;

                FillCollectionControls(doc, entityData, fieldInfo, browserDialog, pd);

                File.Delete(TemplateUtils.getTransparentImage());

                doc.Range().Fields.Update();
                if (oldSelection != null && oldSelection.Range != null)
                {
                    oldSelection.Select();
                }
                //long ticks2 = DateTime.Now.Ticks;
                //long sec = (ticks2-ticks)/10000000;
                //MessageBox.Show("Table fill time: " + sec + " secs.");
            }
            finally
            {
                doc.ActiveWindow.View.Type = vt;
                doc.Application.Options.Pagination = pagination;
                doc.Application.ScreenUpdating = true;
                pd.Close();
            }

            Globals.WordAddIn.Application.ScreenUpdating = true;
        }

        private static Dictionary<String, WordReportingField> BuildFieldInfo(object[] layout)
        {
            Dictionary<String, WordReportingField>  fields = new Dictionary<String, WordReportingField>();
            foreach (Object o in layout)
            {
                try
                {
                    Dictionary<String, object> box = (Dictionary<String, object>)o;
                    if (box.ContainsKey("$items"))
                    {
                        Dictionary<String, object> items = (Dictionary<String, object>)box["$items"];
                        String bind = "";
                        try
                        {
                            bind = box["$bind"].ToString() + ".";
                        }
                        catch (Exception) { }
                        foreach (KeyValuePair<String, object> i in items)
                        {
                            Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                            if (!isSupportedType(item))
                                continue;

                            String type = item["$type"].ToString();
                            String bind_i = item["$bind"].ToString();
                            int? scale = (int?)item["$scale"];

                            WordReportingField field = new WordReportingField();
                            field.type = type;
                            field.scale = scale.GetValueOrDefault(2);
                            try
                            {
                                fields.Add(bind + bind_i, field);
                            }
                            catch (Exception) { };
                        }
                    }
                }
                catch (Exception e) { MessageBox.Show(e.Message + "\n" + e.StackTrace); }
            }

            return fields;
        }

        private static void FillNonCollectionControls(Document doc, List<ContentControl> allContentControls, Dictionary<String, object> entityData, Dictionary<String, WordReportingField> fieldInfo, BrowserDialog browserDialog)
        {
            List<ContentControl> controlsList = new List<ContentControl>();
            List<String> tableCollectionNames = GetTableCollectionList(doc, entityData);
            foreach (ContentControl ctrl in allContentControls)
            {

                TagInfo tag = TagInfo.create(ctrl);
                if (tag == null)
                    continue;
                if (tag.isSimple)
                {
                    /*
                     * Simple properties - no collections                     
                     */
                    if (!controlsList.Contains(ctrl))
                        controlsList.Add(ctrl);
                }
                else if (tableCollectionNames.Contains(tag.collection) == false)
                {
                    /*
                     * We can have nested content that is non-tabular. An example of this can be found with Locales in User details.
                     */
                    if (!controlsList.Contains(ctrl))
                        controlsList.Add(ctrl);
                }
            }

            doc.ActiveWindow.View.ShowFieldCodes = true;
            foreach (ContentControl ctrl in controlsList)
            {
                TagInfo tag = TagInfo.create(ctrl);
                Dictionary<String, object> propData = null;

                if (entityData.ContainsKey(tag.property))
                {
                    propData = (Dictionary<String, object>)entityData[tag.property];
                }
                else if (tag.isSimple == false)
                {
                    propData = GetNonTabularNestedData(entityData, tag);
                }
                ContentControlHelper.setContentControl(doc, ctrl, propData, tag, entityData, fieldInfo, browserDialog, null);
            }
            doc.ActiveWindow.View.ShowFieldCodes = false;
        }

        private static Dictionary<String, object> GetNonTabularNestedData(Dictionary<String, object> entityData, TagInfo tag)
        {
            if (entityData.ContainsKey(tag.collection))
            {
                Dictionary<String, object> nonTabularCollection = (Dictionary<String, object>)entityData[tag.collection];
                if (nonTabularCollection.ContainsKey("$items"))
                {
                    Object[] itemsArray = (Object[])nonTabularCollection.Where(key => key.Key.Equals("$items")).First().Value;
                    if (itemsArray.Length > 0)
                    {
                        Dictionary<String, object> itemsDictionary = (Dictionary<String, object>)itemsArray[0];
                        if (itemsDictionary.ContainsKey(tag.property))
                        {
                            return (Dictionary<String, object>)itemsDictionary[tag.property];
                        }
                    }
                }
            }
            return null;
        }

        private static List<String> GetTableCollectionList(Document doc, Dictionary<String, object> entityData)
        {
            List<Table> ts = GetAllTables(doc);
            List<String> tableCollectionNames = new List<String>();

            foreach (Table table in ts)
            {
                if (table.Range.ContentControls.Count < 0)
                {
                    continue;
                }

                List<Row> templateRows = new List<Row>();
                DetectTableSize(doc, table, templateRows);
                TableInfo tableInfo = GetTableInfo(doc, table, templateRows, entityData);
                if (tableInfo != null)
                    tableCollectionNames.Add(tableInfo.collectionName);
            }

            return tableCollectionNames;
        }

        private static void FillCollectionControls(Document doc, Dictionary<String, object> entityData, Dictionary<String, WordReportingField> fieldInfo, BrowserDialog browserDialog, ProgressDialog pd)
        {
            List<Table> ts = GetAllTables(doc);
            int rowsToFill = 0;
            List<Table> tables = new List<Table>();
            List<TableInfo> tableInfos = new List<TableInfo>();

            foreach (Table table in ts)
            {
                try
                {
                    if (table.Range.ContentControls.Count < 0)
                    {
                        continue;
                    }

                    List<Row> templateRows = new List<Row>();
                    DetectTableSize(doc, table, templateRows);

                    TableInfo tableInfo = GetTableInfo(doc, table, templateRows, entityData);
                    if (tableInfo != null)
                    {
                        tables.Add(table);
                        tableInfos.Add(tableInfo);
                        rowsToFill += tableInfo.numRows;
                    }
                }
                catch (Exception e) { MessageBox.Show(e.Message + ":" + e.StackTrace); };
            }

            int numInfo = 0;
            pd.SetRowsExpected(rowsToFill);
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc, false);
            foreach (Table table in tables)
            {
                try
                {
                    TableInfo tableInfo = tableInfos[numInfo++];
                    FillTableControls(doc, table, tableInfo, fieldInfo, browserDialog, pd);
                }
                catch (Exception e) { MessageBox.Show(e.Message + ":" + e.StackTrace); };
            }
        }

        /// <summary>
        /// Find the rows that contain Content Controls.
        /// For each distinctive row, create a row in templateRows.
        /// </summary>
        /// <param name="doc"></param>
        /// <param name="table"></param>
        /// <param name="templateRows"></param>
        private static void DetectTableSize(Document doc, Table table, List<Row> templateRows)
        {
            List<string> matchedRows = new List<string>();
            List<Row> rowsToRemove = new List<Row>();

            Boolean? directTemplateUsed = null;
            foreach (Row row in table.Rows)
            {
                if (row.Range.ContentControls.Count > 0)
                {
                    List<string> tags = new List<string>();
                    foreach (ContentControl ctrl in row.Range.ContentControls)
                    {
                       TagInfo tag = TagInfo.create(ctrl);
                        if (tag != null)
                        {
                            if (!tag.isSimple)
                            {
                                if (directTemplateUsed == null)
                                {
                                    directTemplateUsed = TemplateHelper.isDirectTemplateRow(doc, row, tag);
                                }
                                tags.Add(ctrl.Tag);
                            }
                        }
                    }
                    if (tags.Count > 0)
                    {
                        tags.Sort();
                        string id = "";
                        foreach (string tag in tags)
                        {
                            id += tag + ";";
                        }
                        if (matchedRows.Contains(id))
                        {
                            rowsToRemove.Add(row);
                        }
                        else
                        {
                            templateRows.Add(row);
                            matchedRows.Add(id);
                        }
                    }
                }
                
                if (directTemplateUsed != null && (bool)directTemplateUsed) // a direct (fast loading) template will only ever have a single template row
                {
                    break;
                }
            }

            foreach (Row row in rowsToRemove)
            {
                row.Delete();
            }
        }

        private static TableInfo GetTableInfo(Document doc, Table table, List<Row> templateRows, Dictionary<String, object> entityData) 
        {
            TableInfo info = new TableInfo();

            info.collectionName = null;
            info.templateRows = templateRows;
            info.items = new object[0];

            foreach (Row row in templateRows)
            {
                foreach (ContentControl c in row.Range.ContentControls)
                {
                    TagInfo t1 = TagInfo.create(c);
                    if (t1 == null)
                        continue;
                    if (t1.isSimple)
                        continue;

                    if (info.collectionName != null && !t1.collection.Equals(info.collectionName))
                    {
                        CommonUtils.ShowErrorMessage(
                            String.Format(global::WordAddIn.Properties.Resources.MSG_ONLY_ONE_COL_PER_TABLE,
                                info.collectionName, t1.collection
                            ));
                        c.Range.Select();
                        return null;
                    }
                    // only treat table as list if a . is found in the tag - otherwise the table is just a
                    // flat representation of a single entity's properties for layouting reasons
                    if (info.collectionName == null && !"".Equals(t1.collection))
                    {
                        if (!entityData.ContainsKey(t1.collection))
                        {
                            // No data for this collection, but remember it anyway so that template lines will be deleted later
                            info.collectionName = t1.collection;
                            continue;
                        }
                        Dictionary<String, object> propData = (Dictionary<String, object>)entityData[t1.collection];
                        if ("application/x-array".Equals(propData["$type"].ToString()))
                        {
                            if (propData.ContainsKey("$items"))
                            {
                                info.items = (object[])propData["$items"];
                            }
                        }
                    }
                    info.collectionName = t1.collection;
                }
            }

            if (info.collectionName == null)
                return null;

            info.numRows = info.items.Length * info.templateRows.Count;
            return info;
        }

        /**
         * Fills all content controls that are in a table and belong to a collection
         */
        private static void FillTableControls(Document doc, Table table, TableInfo info, Dictionary<String, WordReportingField> fieldInfo, BrowserDialog browserDialog, ProgressDialog pd)
        {
            if (info.templateRows.Count <= 0) 
            {
                return;
            }

            ContentControlHelper.clearContentControlStatus();

            // Hide table to make updates faster (ScreenUpdating seems not to work)
            Globals.WordAddIn.Application.ScreenUpdating = true;
            Globals.WordAddIn.Application.ScreenRefresh();
            table.Range.Font.Hidden = 1;
            Globals.WordAddIn.Application.ScreenUpdating = false;

            int numRows = info.items.Length * info.templateRows.Count;
            if (numRows > 0)
            {
                Row precidingRow = info.templateRows[info.templateRows.Count - 1];
                precidingRow.Select();
                
                int startRow = (int)info.templateRows[info.templateRows.Count - 1].Range.Information[WdInformation.wdEndOfRangeRowNumber];
                int rowIndex = startRow;

                if (!TemplateHelper.clearMappedRows(doc, table, info, numRows))
                {
                    doc.Application.Selection.InsertRowsBelow(numRows);
                }

                Row firstRow = table.Rows[startRow + 1];
                Row lastRow = table.Rows[startRow + numRows];
                Range newRowRange = firstRow.Range;
                firstRow.Select();

                int gcCount = 0;
                for (int item = 0; item < info.items.Length; item++)
                {
                    Dictionary<String, object> collectionItem = (Dictionary<String, object>)info.items[item];

                    foreach (Row templateRow in info.templateRows)
                    {
                        rowIndex++;
                        Row newRow = table.Rows[rowIndex];
                        foreach (Cell templateCell in templateRow.Cells)
                        {
                            TemplateHelper.loadCell(doc, table, fieldInfo, newRow, templateCell, collectionItem, info.templateRows.Count, browserDialog);
                            gcCount++;
                        }
                        pd.SignalRowDone();
                    }

                    CommonUtils.doGarbageCollect(ref gcCount);
                }
                TemplateHelper.addMappedRowsCustomData(doc, table, info, startRow, numRows);
            }
            table.Range.Font.Hidden = 0;

            // hide template rows
            foreach (Row templateRow in info.templateRows)
            {
                templateRow.Range.Font.Hidden = 1;
            }
        }

        /**
         * Lists all tables in the document
         * 
         */
        private static List<Table> GetAllTables(Document doc)
        {
            List<Table> list = new List<Table>();
            foreach (Range range in doc.StoryRanges)
            {
                try
                {
                    Range sr = range;
                    do
                    {
                        foreach (Table t in sr.Tables)
                        {
                            if (!list.Contains(t))
                            {
                                list.Add(t);
                            }
                        }
                        foreach (Microsoft.Office.Interop.Word.Shape shape in range.ShapeRange)
                        {
                            foreach (Table t in shape.TextFrame.TextRange.Tables)
                            {
                                if (!list.Contains(t))
                                {
                                    list.Add(t);
                                }
                            }
                        }
                        sr = null;
                    } while (sr != null);
                }
                catch (Exception) { }
            }
            return list;
        }
    }

    public partial class TableInfo
    {
        public string collectionName;
        public object[] items;
        public List<Row> templateRows;
        public int numRows;
    }
}

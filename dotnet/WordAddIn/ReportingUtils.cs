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

namespace WordAddIn
{
    public class WordReportingField
    {
        public string type;
        public int scale;
    }
    class ReportingUtils
    {
        public static CultureInfo decimalFormat = CultureInfo.CreateSpecificCulture("en-US");
        public static Regex sumRegex = new Regex("\\$sum\\((?<exp>.*)\\)");
        private static string transparentImageFile = null;
        private static string officeVersion = Globals.WordAddIn.Application.Version;

        public static void createWordTemplate(Document doc, String layoutAndData)
        {
            JavaScriptSerializer ser = new JavaScriptSerializer();
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
            ProgressDialog pd = new ProgressDialog();
            pd.Show();
            pd.Refresh();
            try
            {
                Selection oldSelection = Globals.WordAddIn.Application.Selection;
                Globals.WordAddIn.Application.ScreenUpdating = false;

                JavaScriptSerializer ser = new JavaScriptSerializer();
                ser.MaxJsonLength = Int32.MaxValue;
                Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(data);

                Dictionary<String, object> entityData = (Dictionary<String, object>)layout["data"];

                Dictionary<String, WordReportingField> fieldInfo = BuildFieldInfo((object[])layout["proto"]);

                List<ContentControl> allContentControls = GetAllContentControls(doc);

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

                File.Delete(getTransparentImage());

                doc.Range().Fields.Update();
                if (oldSelection != null && oldSelection.Range != null)
                {
                    oldSelection.Select();
                }
                Clipboard.Clear();
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

        private static string parseValue(Dictionary<String, object> entity, string type)
        {
            object o = null;
            
            try {
                o = ((Dictionary<String, object>)entity["$value"])["$value"];
            } catch (Exception) {
                return "";
            }
            if (o == null)
            {
                return "";
            }
            if (type != null)
            {

                if (type.Equals("application/x-decimal") && o.GetType() == typeof(String))
                {
                    return Decimal.Parse(o.ToString(), decimalFormat).ToString();
                }
            }
            return o.ToString();
        }

        private static string parseValue(Dictionary<String, object> entity, string type, string display)
        {
            object o = null;

            try
            {
                o = ((Dictionary<String, object>)entity["$value"])[display];
            }
            catch (Exception)
            {
                return "";
            }
            if (o == null)
            {
                return "";
            }
            return o.ToString();
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
                setContentControl(doc, ctrl, propData, tag, entityData, fieldInfo, browserDialog, null);
            }
        }

        private static Dictionary<String, object> GetNonTabularNestedData(Dictionary<String, object> entityData, TagInfo tag)
        {
            if (entityData.ContainsKey(tag.collection))
            {
                Dictionary<String, object> nonTabularCollection = (Dictionary<String, object>)entityData[tag.collection];
                if (nonTabularCollection.ContainsKey("$items"))
                {
                    Object[] itemsArray = (Object[])nonTabularCollection.Where(key => key.Key.Equals("$items")).First().Value;
                    Dictionary<String, object> itemsDictionary = (Dictionary<String, object>)itemsArray[0];
                    if (itemsDictionary.ContainsKey(tag.property))
                    {
                        return (Dictionary<String, object>)itemsDictionary[tag.property];
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

        private static void DetectTableSize(Document doc, Table table, List<Row> templateRows)
        {
            List<string> matchedRows = new List<string>();
            List<Row> rowsToRemove = new List<Row>();

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
                doc.Application.Selection.InsertRowsBelow(numRows);
                int startRow = (int)info.templateRows[info.templateRows.Count - 1].Range.Information[WdInformation.wdEndOfRangeRowNumber];

                Row firstRow = table.Rows[startRow + 1];
                Row lastRow = table.Rows[startRow + numRows];
                Range newRowRange = firstRow.Range;
                firstRow.Select();

                for (int item = 0; item < info.items.Length; item++)
                {
                    Dictionary<String, object> collectionItem = (Dictionary<String, object>)info.items[item];
                    foreach (Row templateRow in info.templateRows)
                    {
                        startRow++;
                        Row newRow = table.Rows[startRow];
                        foreach (Cell cell in templateRow.Cells)
                        {
                            Cell newCell = newRow.Cells[cell.ColumnIndex];
                            copyCellContent(cell, newCell);
                            foreach (ContentControl cc in newCell.Range.ContentControls)
                            {
                                TagInfo t2 = TagInfo.create(cc);
                                if (t2 != null)
                                {
                                    if (t2.isSimple)
                                        continue;
                                    if (collectionItem.ContainsKey(t2.property))
                                    {
                                        Dictionary<String, object> entity = (Dictionary<String, object>)collectionItem[t2.property];
                                        setContentControl(doc, cc, entity, t2, null, fieldInfo, browserDialog, table);
                                    }
                                }
                            }
                        }
                        pd.SignalRowDone();
                    }
                }
            }
            table.Range.Font.Hidden = 0;

            // hide template rows
            foreach (Row templateRow in info.templateRows)
            {
                templateRow.Range.Font.Hidden = 1;
            }
        }

        /**
         * Get all content controls in document
         */
        private static List<ContentControl> GetAllContentControls(Document doc)
        {
            List<ContentControl> list = new List<ContentControl>();
            foreach (Range range in doc.StoryRanges)
            {
                try
                {
                    foreach (ContentControl cc in range.ContentControls)
                    {
                        if (!list.Contains(cc))
                        {
                            list.Add(cc);
                        }
                    }
                    foreach (Microsoft.Office.Interop.Word.Shape shape in range.ShapeRange)
                    {
                        foreach (ContentControl cc in shape.TextFrame.TextRange.ContentControls)
                        {
                            if (!list.Contains(cc))
                            {
                                list.Add(cc);
                            }
                        }
                    }
                }
                catch (Exception) { }
            }
            return list;
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

        private static void setContentControl(Document doc, ContentControl ctrl, Dictionary<String, object> entity, TagInfo ti, Dictionary<String, object> allData, Dictionary<String, WordReportingField> fieldInfo, BrowserDialog browserDialog, Table table)
        {

            WordReportingField field = null;
            try { field = fieldInfo[ti.tag]; }
            catch (Exception) { };
            if (ctrl.Type == WdContentControlType.wdContentControlPicture)
            {
                if ((table != null) && (officeVersion == "15.0"))
                {
                    table.Range.Font.Hidden = 0;
                }
                setContentControlImage(doc, ctrl, entity, ti, allData, browserDialog);
                if ((table != null) && (officeVersion == "15.0"))
                {
                    table.Range.Font.Hidden = 1;
                }
            }
            else if (ctrl.Type == WdContentControlType.wdContentControlText)
            {
                setContentControlText(doc, ctrl, entity, ti, allData, field);
                addLinkToContentControl(doc, ctrl, entity);
            }
        }

        private static void setContentControlText(Document doc, ContentControl ctrl, Dictionary<String, object> entity, TagInfo ti, Dictionary<String, object> allData, WordReportingField field)
        {
            string value = null;
            string type = null;

            if (ti.display == null)
            {
                if (ti.isFormula && "$sum".Equals(ti.formula))
                {
                    value = calculateSum(doc, ctrl, entity, ti, allData, field);
                }
                else
                {
                    try { type = entity["$type"].ToString(); }
                    catch (Exception) { }

                    if (type != null && (type.Contains("x-document") || type.Contains("text/html") || type.Contains("text/rtf") || type.Contains("text/plain")))
                    {
                        setContentControlClob(doc, ctrl, entity, field);
                        return;
                    }

                    value = parseValue(entity, type);
                    value = ReportingFieldUtil.formatValue(value, ReportingFieldUtil.getType(type), field);
                }
            }
            else
            {
                value = parseValue(entity, type, ti.display);
            }
            ctrl.Range.Text = value;
        }

        private static void setContentControlClob(Document doc, ContentControl ctrl, Dictionary<string, object> entity, WordReportingField field)
        {
            object o = null;
            try
            {
                o = ((Dictionary<String, object>)entity["$value"])["$value"];
            }
            catch (Exception) {}
            if (o == null)
            {
                ctrl.Range.Text = "";
                return;
            }
            
            Range r = ctrl.Range;
            String text = o.ToString();
            System.Windows.Forms.RichTextBox rtBox = new System.Windows.Forms.RichTextBox();
            if (text.ToLower().StartsWith("{\\rtf"))
            {
                rtBox.Rtf = text;
                r.Text = rtBox.Text;
            }
            else if (text.ToLower().StartsWith("<html>"))
            {
                // TODO: HTML Does not work at the moment
                r.Text = text;
            }
            else
            {
                r.Text = text;
            }
        }

        private static string calculateSum(Document doc, ContentControl ctrl, Dictionary<String, object> entity, TagInfo ti, Dictionary<String, object> allData, WordReportingField field)
        {
            try
            {
                Dictionary<String, object> propData = (Dictionary<String, object>)allData[ti.collection];
                object[] items = null;
                string proptype = propData["$type"].ToString();
                if ("application/x-array".Equals(proptype))
                {
                    if (propData.ContainsKey("$items"))
                    {
                        items = (object[])propData["$items"];
                    }
                }
                if (items == null)
                {
                    return "<error>";
                }


                int scale = 2;
                if (propData.ContainsKey("$scale"))
                {
                    scale = (int) propData["$scale"];
                }

                string itemtype = ctrl.Title;
                ReportingFieldTypes type = ReportingFieldUtil.getType(itemtype);
                Decimal sumDecimal = 0;
                string sumString = null;
                foreach (object record in items)
                {
                    Dictionary<String, object> item = (Dictionary<String, object>)((Dictionary<String, object>)record)[ti.property];
                    string value = parseValue(item, itemtype);
                    switch (type)
                    {
                        case ReportingFieldTypes.DECIMAL:
                            Decimal d = Decimal.Parse(value);
                            sumDecimal += d;
                            break;
                        case ReportingFieldTypes.INTEGER:
                            Int64 i = Int64.Parse(value);
                            sumDecimal += i;
                            break;
                        default:
                            if (sumString != null)
                            {
                                sumString += ", " + value;
                            }
                            else
                            {
                                sumString = value;
                            }
                            break;
                    }
                }
                switch (type)
                {
                    case ReportingFieldTypes.DECIMAL:
                        return ReportingFieldUtil.formatValue(sumDecimal.ToString(), type, field);
                    case ReportingFieldTypes.INTEGER:
                        return ReportingFieldUtil.formatValue(sumDecimal.ToString(), type);
                    default:
                        return sumString;
                }
            }
            catch (Exception) { };
            return "<error>";
        }

        private static void setContentControlImage(Document doc, ContentControl ctrl, Dictionary<String, object> entity, TagInfo ti, Dictionary<String, object> allData, BrowserDialog browserDialog)
        {
            string type = null;
            string link = null;
            string url = null;

            if (browserDialog == null)
            {
                return;
            }
            try { type = entity["$type"].ToString(); }
            catch (Exception) { }
            try { link = entity["$link"].ToString(); }
            catch (Exception) { }
            try { url = ((Dictionary<String, object>)entity["$value"])["$url"].ToString(); }
            catch (Exception) { }

            bool imageWasSet = false;
            if (ctrl.Type == WdContentControlType.wdContentControlPicture)
            {
                try
                {

                    string imageFile = null;
                    if (url != null)
                    {
                        imageFile = downloadImage(url, browserDialog);
                    }
                    if (imageFile != null && !"".Equals(imageFile))
                    {

                        float width = -1;
                        float height = -1;

                        if (ctrl.Range.InlineShapes.Count > 0)
                        {
                            width = ctrl.Range.InlineShapes[1].Width;
                            height = ctrl.Range.InlineShapes[1].Height;
                            ctrl.Range.InlineShapes[1].Delete();
                        }

                        doc.InlineShapes.AddPicture(imageFile, false, true, ctrl.Range);
                        imageWasSet = true;
                        if (ctrl.Range.InlineShapes.Count > 0 && width > 0 && height > 0)
                        {
                            InlineShape shape = ctrl.Range.InlineShapes[1];
                            // Image should be displayed in original size but not greater than 16 cm
                            float scal = 100;
                            shape.ScaleHeight = scal;
                            shape.ScaleWidth = scal;
                            // maxWith = 160mm
                            // Millimeter 2 Inch = 25.4
                            // Inch 2 Pixel = 72
                            float maxWidth = 454;  // 160 / 25.4 * 72
                            if (ti.display != null)
                            {
                                maxWidth = getMaxWidth(ti.display);
                                if (maxWidth <= 0)
                                {
                                    maxWidth = 454;
                                }
                            }

                            if (shape.Width > maxWidth)
                            {
                                scal = 100 * maxWidth / shape.Width;
                                shape.ScaleHeight = scal;
                                shape.ScaleWidth = scal;
                            }
                        }
                        addLinkToContentControl(doc, ctrl, entity);
                        File.Delete(imageFile);
                    }
                    if (!imageWasSet)
                    {
                        if (ctrl.Range.InlineShapes.Count > 0)
                        {
                            ctrl.Range.InlineShapes[1].Delete();
                        }
                        doc.InlineShapes.AddPicture(getTransparentImage(), false, true, ctrl.Range);
                    }
                }
                catch (Exception) { };
            }
        }

        private static float getMaxWidth(string display)
        {
            try
            {
                return Convert.ToInt32(display);
            } catch (Exception) {
                return -1;
            }
        }

        private static string downloadImage(string url, BrowserDialog browserDialog)
        {
            string imageFile = null;
            try
            {
                // currenty, only syracuse sends protocol, host and port. Add this information for X3 entities
                if (!(url.StartsWith("http:") || url.StartsWith("https:")))
                {
                    url = browserDialog.serverUrl + url;
                }
                byte[] image = browserDialog.readBinaryURLContent(url);
                if (image != null)
                {
                    imageFile = Path.GetTempFileName();
                    using (FileStream stream = new FileStream(imageFile, FileMode.Create))
                    {
                        using (BinaryWriter writer = new BinaryWriter(stream))
                        {
                            writer.Write(image);
                            writer.Close();
                        }
                    }
                }
            }
            catch (Exception) { /*MessageBox.Show(e.Message + ":" + e.StackTrace);*/  };
            return imageFile;
        }

        private static string getTransparentImage()
        {
            if (transparentImageFile != null)
            {
                if (File.Exists(transparentImageFile) == true)
                {
                    return transparentImageFile;
                }
            }
            string imageFile = Path.GetTempFileName();
            using (FileStream stream = new FileStream(imageFile, FileMode.Create))
            {
                using (BinaryWriter writer = new BinaryWriter(stream))
                {
                    writer.Write(global::WordAddIn.Properties.Resources.transparent);
                    writer.Close();
                }
            }
            transparentImageFile = imageFile;
            return imageFile;
        }

        private static void addLinkToContentControl(Document doc, ContentControl c, Dictionary<String, object> entity)
        {
            string link = null;
            try { link = entity["$link"].ToString(); }
            catch (Exception) { }

            if (link == null)
            {
                return;
            }
            Range r = c.Range;
            String tag;
            String title;
            WdContentControlType type = c.Type;
            tag = c.Tag;
            title = c.Title;
            /*
            try
            {
                while (r.Hyperlinks.Count > 0) r.Hyperlinks[1].Delete();
                c.Delete();
            }
            catch (Exception) { };
            try
            {
                //Hyperlink l = r.Hyperlinks.Add(r, link);
                c = doc.ContentControls.Add(type, r);
                c.Tag = tag;
                c.Title = title;
            }
            catch (Exception e) {
                MessageBox.Show(e.Message);
            };
             */
        }

        private static void copyCellContent(Cell src, Cell dest)
        {
            foreach (ContentControl s in src.Range.ContentControls)
            {
                Range dr = dest.Range;
                dr.Collapse(WdCollapseDirection.wdCollapseStart);
                ContentControl d = dr.ContentControls.Add(s.Type);
                d.Tag = s.Tag;
                d.Title = s.Title;
            }
        }
    }

    public partial class TableInfo
    {
        public string collectionName;
        public object[] items;
        public List<Row> templateRows;
        public int numRows;
    }

    // Information extracted from a ContentControl tag-property
    // [display:][<entity>.]<property>
    // <entity>   only when handling collections (Name of collection property of entity)
    // <property> property whos value is to displayed
    // <display>  $title or $value (Display title or value of property) - NOT USED YET
    public class TagInfo
    {
        public string tag;
        public string property;
        public string collection;
        public string display;
        public bool isSimple;
        public bool isFormula;
        public string formula;

        public static TagInfo create(ContentControl c)
        {
            try
            {
                int i;
                TagInfo t = new TagInfo();
                string tag = c.Tag;
                i = tag.IndexOf(":");
                if (i > -1)
                {
                    t.display = tag.Substring(0, i);
                    tag = tag.Substring(i + 1);
                }

                Match m = ReportingUtils.sumRegex.Match(tag);
                if (m.Success)
                {
                    t.isFormula = true;
                    t.formula = "$sum";
                    tag = m.Groups["exp"].Value;
                }
                t.tag = tag;
                i = tag.IndexOf(".");
                if (i > -1)
                {
                    t.collection = tag.Substring(0, i);
                    t.property = tag.Substring(i + 1);
                    t.isSimple = false || t.isFormula;
                }
                else
                {
                    t.collection = "";
                    t.property = tag;
                    t.isSimple = true;
                    t.formula = null;
                    t.isFormula = false;
                }

                return t;
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}

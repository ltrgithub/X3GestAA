using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Word;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Office.Core;
using System.IO;

namespace WordAddIn
{
    class ReportingUtils
    {
        public static void createWordTemplate(Document doc, String layoutAndData)
        {
            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(layoutAndData);
            SyracuseOfficeCustomData customData;

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
                    return;
                }
            }
            catch (Exception) { };

            Object[] boxes = (Object[])layout["layout"];
            foreach (Object o in boxes)
            {
                try
                {
                    Dictionary<String, object> box = (Dictionary<String, object>)o;
                    if (box.ContainsKey("$title"))
                    {
                        int level = Convert.ToInt32(box["$level"].ToString());
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
                            addBox(doc, box, items);
                        }
                    }
                }
                catch (Exception) { }
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
        }

        private static void addTable(Document doc, Dictionary<String, object> box, Dictionary<String, object> items)
        {
            int colCount = 0;
            foreach (KeyValuePair<String, object> i in items)
            {
                Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                String hidden = item["$hidden"].ToString();
                if (!"true".Equals(hidden))
                {
                    colCount++;
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
                String hidden = item["$hidden"].ToString();
                if (!"true".Equals(hidden))
                {
                    String title = item["$title"].ToString();

                    col++;
                    r = t.Cell(1, col).Range;
                    r.Text = title;
                    r = t.Cell(2, col).Range;
                    createContentControl(doc, r, item, bind);
                }
            }

            r = doc.Range();
            r.Collapse(WdCollapseDirection.wdCollapseEnd);
            r.InsertParagraph();
        }

        private static void addBox(Document doc, Dictionary<String, object> box, Dictionary<String, object> items)
        {
            foreach (KeyValuePair<String, object> i in items)
            {
                Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                String hidden = item["$hidden"].ToString();
                if (!"true".Equals(hidden))
                {
                    Range r = doc.Range();
                    r.Collapse(WdCollapseDirection.wdCollapseEnd);
                    createContentControl(doc, r, item, null);
                    r = doc.Range();
                    r.Collapse(WdCollapseDirection.wdCollapseEnd);
                    r.InsertParagraph();
                }
            }
        }

        public static ContentControl createContentControl(Document doc, Range range, Dictionary<String, Object> item, String parent)
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
        }

        public static void fillTemplate(Document doc, String data, BrowserDialog browserDialog)
        {
            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(data);

            Dictionary<String, object> entityData = (Dictionary<String, object>)layout["data"];
            List<ContentControl> ccs = GetAllContentControls(doc);

            foreach (ContentControl c in ccs)
            {
                // Simple properties (no collections)
                TagInfo t = TagInfo.create(c);
                if (t == null)
                    continue;
                if (t.isSimple && entityData.ContainsKey(t.property))
                {
                    Dictionary<String, object> propData = (Dictionary<String, object>)entityData[t.property];
                    setControlContent(doc, c, propData, t, browserDialog);
                }

            }

            Dictionary<String, TableInfo> tables = new Dictionary<String, TableInfo>();
            List<Table> ts = GetAllTables(doc);

            foreach (Table t in ts)
            {
                try
                {
                    object[] items = null;
                    if (t.Range.ContentControls.Count > 0)
                    {
                        string lastCollection = null;
                        foreach (Row r in t.Rows)
                        {
                            foreach (ContentControl c in r.Range.ContentControls)
                            {
                                TagInfo t1 = TagInfo.create(c);
                                if (t1 == null)
                                    continue;
                                if (lastCollection != null && !t1.collection.Equals(lastCollection))
                                {
                                    MessageBox.Show("Two different collections not allowed in one table!");
                                    return;
                                }
                                // only treat table as list if a . is found in the tag - otherwise the table is just a
                                // flat representation of a single entity for layouting reasons
                                if (lastCollection == null && !"".Equals(t1.collection))
                                {
                                    Dictionary<String, object> propData = (Dictionary<String, object>)entityData[t1.collection];
                                    if ("application/x-collection".Equals(propData["$type"].ToString()))
                                    {
                                        if (propData.ContainsKey("$items"))
                                        {
                                            items = (object[])propData["$items"];
                                        }
                                    }
                                }
                                lastCollection = t1.collection;
                            }
                        }

                        List<Row> rowsToRemove = new List<Row>();
                        int rowcount = t.Rows.Count;
                        if (lastCollection != null && !"".Equals(lastCollection))
                        {
                            for (int row = 1; row <= rowcount; row++)
                            {
                                Row r = t.Rows[row];
                                if (r.Range.ContentControls.Count > 0)
                                {
                                    rowsToRemove.Add(r);
                                }
                            }
                        }

                        if (items != null)
                        {
                            for (int item = 0; item < items.Length; item++)
                            {
                                Dictionary<String, object> collectionItem = (Dictionary<String, object>)items[item];
                                for (int row = 1; row <= rowcount; row++)
                                {
                                    Row r = t.Rows[row];
                                    if (r.Range.ContentControls.Count > 0)
                                    {
                                        Row newRow = t.Rows.Add();
                                        foreach (Cell cell in r.Cells)
                                        {
                                            Cell newCell = newRow.Cells[cell.ColumnIndex];
                                            copyCellContent(cell, newCell);
                                            foreach (ContentControl cc in newCell.Range.ContentControls)
                                            {
                                                TagInfo t2 = TagInfo.create(cc);
                                                if (collectionItem.ContainsKey(t2.property))
                                                {
                                                    Dictionary<String, object> entity = (Dictionary<String, object>)collectionItem[t2.property];
                                                    setControlContent(doc, cc, entity, t2, browserDialog);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        foreach (Row r in rowsToRemove)
                        {
                            r.Delete();
                        }
                        rowsToRemove.Clear();
                    }
                }
                catch (Exception e) { MessageBox.Show(e.Message + ":" + e.StackTrace); };
            }
        }

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
                        //sr = sr.NextStoryRange;
                        sr = null;
                    } while (sr != null);
                }
                catch (Exception) { }
            }
            return list;
        }

        private static void setControlContent(Document doc, ContentControl c, Dictionary<String, object> entity, TagInfo ti, BrowserDialog browserDialog)
        {
            string tag = ti.property;
            String value = null;
            String imageFile = null;

            if (c.Type == WdContentControlType.wdContentControlPicture && browserDialog != null)
            {
                String url = null;
                try
                {
                    url = ((Dictionary<String, object>)entity["$value"])["$url"].ToString();
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

                if (imageFile != null)
                {
                    try
                    {
                        float width = -1;
                        float height = -1;

                        if (c.Range.InlineShapes.Count > 0)
                        {
                            width = c.Range.InlineShapes[1].Width;
                            height = c.Range.InlineShapes[1].Height;
                            c.Range.InlineShapes[1].Delete();
                        }
                        // setting url does not work (maybe because of required http login)
                        doc.InlineShapes.AddPicture(imageFile, false, true, c.Range);
                        if (c.Range.InlineShapes.Count > 0 && width > 0 && height > 0)
                        {
                            c.Range.InlineShapes[1].Width = width;
                            c.Range.InlineShapes[1].Height = height;
                        }
                    }
                    catch (Exception e) { MessageBox.Show(e.Message + ":" + e.StackTrace); };
                    File.Delete(imageFile);
                }
                else
                {
                    c.Delete();
                }

            }
            else if (c.Type == WdContentControlType.wdContentControlText)
            {
                String type = "";
                if (entity.ContainsKey("$type"))
                {
                    type = entity["$type"].ToString();
                }

                try
                {
                    if (entity.ContainsKey("$value"))
                    {
                        value = ((Dictionary<String, object>)entity["$value"])["$value"].ToString();
                    }
                }
                catch (Exception) { }

                if (value != null)
                {
                    try
                    {
                        switch (type)
                        {
                            case "application/x-datetime":
                                DateTime dt = DateTime.ParseExact(value, "yyyy MM dd HH:mm:ss.fff", null);
                                value = dt.ToString("G");
                                break;
                            default:
                                break;
                        }
                    }
                    catch (Exception) { }
                }
                else
                {
                    value = " ";
                }
                c.Range.Text = value;
            }
        }

        private static void copyCellContent(Cell src, Cell dest)
        {
            src.Range.Copy();
            dest.Range.Paste();
        }
    }

    public partial class TableInfo
    {
        public List<ContentControl> controls = new List<ContentControl>();
    }

    // Information extracted from a ContentControl tag-property
    // [<entity>.]<property>[:<display>]
    // <entity>   only when handling collections (Name of collection property of entity)
    // <property> property whos value is to displayed
    // <display>  $title or $value (Display title or value of property) - NOT USED YET
    public class TagInfo
    {
        public string property;
        public string collection;
        public string display;
        public Boolean isSimple;

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
                    t.display = tag.Substring(i + 1);
                    tag = tag.Substring(0, i);
                }

                if (!"$title".Equals(t.display))
                {
                    t.display = "$value";
                }

                i = tag.IndexOf(".");
                if (i > -1)
                {
                    t.collection = tag.Substring(0, i);
                    t.property = tag.Substring(i + 1);
                    t.isSimple = false;
                }
                else
                {
                    t.collection = "";
                    t.property = tag;
                    t.isSimple = true;
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

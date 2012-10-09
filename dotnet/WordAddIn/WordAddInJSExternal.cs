using System;
using System.IO;
using System.Collections.Generic;
using Microsoft.Office.Interop.Word;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Office.Core;

// Do not rename, namespace and classname are refered in JS as WordAddIn.WordAddInJSExternal
namespace WordAddIn
{
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
    }

    // The only one class/object to be referenced from javascript 'external'
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class WordAddInJSExternal
    {
        private SyracuseOfficeCustomData customData;
        private BrowserDialog browserDialog;
        private Document doc;

        public WordAddInJSExternal(Document doc, BrowserDialog browserDialog)
        {
            this.doc = doc;
        }

        public WordAddInJSExternal(SyracuseOfficeCustomData customData, BrowserDialog browserDialog)
        {
            this.customData = customData;
            this.browserDialog = browserDialog;
        }

        public SyracuseOfficeCustomData getSyracuseOfficeCustomData() 
        {
            return customData;
        }

        private void createMailMergeDataFile(Dictionary<String, object> mailMergeData)
        {
            Document doc = customData.getWordDoc();
            Document dataDoc;

            String delim = Globals.WordAddIn.Application.International[WdInternationalIndex.wdListSeparator].ToString();

            Object[] columnInfo = (Object[])mailMergeData["columns"];
            int numberOfColumns = columnInfo.Length;
            Object[] rowData = (Object[])mailMergeData["data"];
            int numberOfRows = rowData.Length;

            String headers = "";
            
            for (int col = 0; col < numberOfColumns; col++)
            {
                Dictionary<String, Object> column = (Dictionary<String, Object>)columnInfo[col];
                String columnName = column["_name"].ToString();

                if (col != 0)
                {
                    headers += delim;
                }
                headers += columnName;
            }

            string filename = System.IO.Path.GetTempFileName().Replace(".tmp", ".docx");
            doc.MailMerge.CreateDataSource(filename, Type.Missing, Type.Missing, headers);

            dataDoc = Globals.WordAddIn.Application.Documents.Open(filename);
            for (int row = 0; row < numberOfRows; row++)
            {
                if (row > 0)    // CreateDataSource has already create the first data row
                {
                    dataDoc.Tables[1].Rows.Add();
                }
                Object[] singleRowData = (Object[])rowData[row];

                int cols = singleRowData.Length;
                for (int col = 0; col < cols; col++)
                {
                    Object cellData = singleRowData[col];
                    String text = getStringValue(cellData);
                    dataDoc.Tables[1].Cell(row + 2, col + 1).Range.InsertAfter(text);
                }
            }

            dataDoc.Save();
            ((_Document)dataDoc).Close(false);
        }

        private void createMailMergeFields(Dictionary<String, object> mailMergeData)
        {
            Selection wrdSelection = Globals.WordAddIn.Application.Selection;
            Document doc = customData.getWordDoc();

            MailMergeFields wrdMergeFields = doc.MailMerge.Fields;

            Object[] columnInfo = (Object[])mailMergeData["columns"];
            int numberOfColumns = columnInfo.Length;
            for (int i = 0; i < numberOfColumns; i++)
            {
                Dictionary<String, Object> column = (Dictionary<String, Object>)columnInfo[i];
                String columnName = column["_name"].ToString();

                wrdMergeFields.Add(wrdSelection.Range, columnName);
                wrdSelection.TypeParagraph();
            }
        }

        public void createDatasource(String mailMergeDataJSon)
        {
            Document doc = customData.getWordDoc();
            try
            {
                JavaScriptSerializer ser = new JavaScriptSerializer();
                Dictionary<String, object> mailMergeData = (Dictionary<String, object>)ser.DeserializeObject(mailMergeDataJSon);

                createMailMergeDataFile(mailMergeData);

                if (!customData.getCreateMode().Equals("3"))
                {
                    createMailMergeFields(mailMergeData);
                }

                String xml = removeCustomDataBeforeMerge(doc);

                doc.MailMerge.Destination = WdMailMergeDestination.wdSendToNewDocument;
                if (customData.getCreateMode().Equals("3"))
                {
                    doc.MailMerge.ShowWizard(5);
                }

                if (xml != null)
                {
                    doc.CustomXMLParts.Add(xml);
                }
            }
            catch (Exception e)
            {
                MessageBox.Show(e.ToString() + "\n" + e.StackTrace);
            }

            browserDialog.Hide();
        }

        public String removeCustomDataBeforeMerge(Document doc)
        {
            String xml = null;
            CustomXMLPart match = null;
            foreach (CustomXMLPart part in doc.CustomXMLParts)
            {
                CustomXMLNode node = part.SelectSingleNode("//SyracuseOfficeCustomData");
                if (node != null)
                {
                    match = part;
                    xml = part.XML;
                    break;
                }
            }
            if (match != null)
            {
                match.Delete();
            }
            return xml;
        }

        /*
         * Called from JS to build a basic layout
         Basic layout definition is like:
         [
           {
              "$title":"{@LoginSectionTitle}",
              "$container":"box",
              "$items":{
                 "login":{
                    "$type":"application/x-string",
                    "$title":"Default Account",
                    "$bind":"login"
                 },
                 "active":{
                    "$type":"application/x-boolean",
                    "$title":"Active",
                    "$bind":"active"
                 },
           {
              "$container":"table",
              "$items":{
                 "login":{
                    "$type":"application/x-string",
                    "$title":"User Login",
                    "$bind":"login"
                 },
                 "endpoint":{
                    "$type":"application/x-reference",
                    "$title":"Endpoint",
                    "$bind":"endpoint"
                 }
                }
            }
        ]
         */
        public void createWordTemplate(String layoutData)
        {
            Document doc = customData.getWordDoc();
            if (doc.FormsDesign)
            {
                doc.ToggleFormsDesign();
            }

            customData.setLayoutData(layoutData);
            customData.writeDictionaryToDocument();

            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(layoutData);

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
            Globals.WordAddIn.templatePane.showFields(layoutData);
            if (!doc.FormsDesign)
            {
                doc.ToggleFormsDesign();
            }
            browserDialog.Hide();
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

        public void populateWordTemplate(String data)
        {
            Document doc = customData.getWordDoc();
            Globals.WordAddIn.Application.ScreenUpdating = false;
            fillTemplate(doc, data, browserDialog);
            Globals.WordAddIn.Application.ScreenUpdating = true;

            if (doc.FormsDesign)
            {
                doc.ToggleFormsDesign();
            }
            browserDialog.Hide();
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
                        for (int row = 1; row <= rowcount; row++)
                        {
                            Row r = t.Rows[row];
                            if (r.Range.ContentControls.Count > 0)
                            {
                                rowsToRemove.Add(r);
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
                } catch (Exception e) { MessageBox.Show(e.Message + ":" + e.StackTrace); };
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

                try {
                    if (entity.ContainsKey("$value"))
                    {
                        value = ((Dictionary<String, object>)entity["$value"])["$value"].ToString();
                    }
                } catch (Exception) {  }

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

        private string getStringValue(object cellData)
        {
            if (cellData == null)
            {
                return "";
            }
            Object value = cellData;
            if (cellData.GetType().Equals(typeof(Object[])))
            {
                value = ((Object[])cellData)[0];
            }

            String text = value.ToString();
            return text;
        }

        public string GetDocumentContent()
        {
            // TODO: Original file will be closed, this is wrong
            // find a way to save a copy of the current doc. w/o
            // closing and reopening.
            Document doc = (customData != null) ? customData.getWordDoc() : this.doc;
            if (doc == null)
            {
                MessageBox.Show("Unable to access document");
                return "";
            }

            // Datei schließen, codiert einlesen und wieder öffnen
            String tempFileName = Path.GetTempFileName();
            doc.SaveAs2(tempFileName, WdSaveFormat.wdFormatDocumentDefault);

            Globals.WordAddIn.Application.ActiveWindow.Close();
            byte[] content = System.IO.File.ReadAllBytes(tempFileName);

            String base64string = Convert.ToBase64String(content);

            Globals.WordAddIn.Application.Documents.Open(tempFileName);
            return base64string;
        }

        public void NotifySaveDocumentDone()
        {
            browserDialog.Hide();
            MessageBox.Show("Document has been saved!");
        }

        public String getSyracuseDocumentType()
        {
            Document doc = (customData != null) ? customData.getWordDoc() : this.doc;
            if (doc == null)
            {
                MessageBox.Show("Unable to access document");
                return "word-mailmerge";
            }
            if ("4".Equals(customData.getCreateMode()))
            {
                return "word-report-tpl";
            }
            else if ("5".Equals(customData.getCreateMode()))
            {
                return "word-report";
            }
            return "word-mailmerge";
        }

        public BrowserDialog getBrowserDialog()
        {
            return browserDialog;
        }
        
        // check version 
        public String getAddinVersion()
        {
            return System.Reflection.Assembly.GetExecutingAssembly().GetName().Version.ToString();
        }
    }
}

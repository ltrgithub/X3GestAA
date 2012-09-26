using System;
using System.IO;
using System.Collections.Generic;
using Microsoft.Office.Interop.Word;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using Microsoft.Office.Core;

// Do not rename, namespace and classname are refered in JS as WordAddIn.WordAddInJSExternal
namespace WordAddIn
{
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
            Paragraph p;

            /* Debug: Add layout json */
            p = doc.Paragraphs.Add();
            p.Range.Text = layoutData;
            /* */

            JavaScriptSerializer ser = new JavaScriptSerializer();
            Dictionary<String, object> layout = (Dictionary<String, object>)ser.DeserializeObject(layoutData);

            Object[] boxes = (Object[]) layout["layout"];
            foreach (Object o in boxes) {
                try
                {
                    Dictionary<String, object> box = (Dictionary<String, object>) o;
                    if (box.ContainsKey("$title"))
                    {
                        p = doc.Paragraphs.Add();
                        p.Range.Text = box["$title"].ToString();
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
                            addTable(box, items);
                        }
                        else
                        {
                            addBox(box, items);
                        }
                    }
                }
                catch (Exception) { }
            }
            if (!doc.FormsDesign)
            {
                doc.ToggleFormsDesign();
            }
            browserDialog.Hide();
        }

        private void addTable(Dictionary<String, object> box, Dictionary<String, object> items)
        {
            Document doc = customData.getWordDoc();
            Paragraph p;
            p = doc.Paragraphs.Add();

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

            Table t = doc.Tables.Add(p.Range, 2, colCount, WdDefaultTableBehavior.wdWord9TableBehavior, WdAutoFitBehavior.wdAutoFitWindow);
            t.Borders.OutsideLineStyle = WdLineStyle.wdLineStyleDot;

            int col = 0;
            foreach (KeyValuePair<String, object> i in items)
            {
                Dictionary<String, Object> item = (Dictionary<String, Object>) i.Value;
                String hidden = item["$hidden"].ToString();
                if (!"true".Equals(hidden))
                {
                    String type = item["$type"].ToString();
                    String title = item["$title"].ToString();
                    String bind = item["$bind"].ToString();

                    col++;
                    Range r;
                    r = t.Cell(1, col).Range;
                    r.Text = title;

                    r = t.Cell(2, col).Range;
                    ContentControl c = doc.ContentControls.Add(WdContentControlType.wdContentControlText, r);
                    c.SetPlaceholderText(null, null, title);
                }
            }
        }

        private void addBox(Dictionary<String, object> box, Dictionary<String, object> items)
        {
            Document doc = customData.getWordDoc();
            Paragraph p;

            foreach (KeyValuePair<String, object> i in items)
            {
                Dictionary<String, Object> item = (Dictionary<String, Object>)i.Value;
                String type = item["$type"].ToString();
                String title = item["$title"].ToString();
                String bind = item["$bind"].ToString();
                String hidden = item["$hidden"].ToString();

                if (!"true".Equals(hidden))
                {
                    p = doc.Paragraphs.Add();
                    Range r;
                    r = p.Range;

                    ContentControl c = doc.ContentControls.Add(WdContentControlType.wdContentControlText, r);
                    c.SetPlaceholderText(null, null, title);
                }
            }
        }
        public void populateWordTemplate(String data)
        {
            MessageBox.Show(data);
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
    }
}

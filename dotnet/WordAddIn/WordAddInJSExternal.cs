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
    // The only one class/object to be referenced from javascript 'external'
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class WordAddInJSExternal
    {
        private SyracuseOfficeCustomData customData;
        private BrowserDialog browserDialog;
//        private Document doc;

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
                    object o = singleRowData[col];
                    Dictionary<String, Object> cellData = (Dictionary<String, Object>)o;
                    string value = "";
                    string link = "";
                    if (cellData.ContainsKey("value"))
                        value = cellData["value"] == null ? "" : cellData["value"].ToString();
                    string type = "";
                    if (cellData.ContainsKey("$type"))
                        type = cellData["$type"] == null ? "" : cellData["$type"].ToString();

                    if (cellData.ContainsKey("$link"))
                    {
                        link = cellData["$link"] == null ? "" : cellData["$link"].ToString();
                    }

                    if (cellData.ContainsKey("$url"))
                    {
                        value = cellData["$url"] == null ? "" : cellData["$url"].ToString();
                      
                        byte[] image = browserDialog.readBinaryURLContent(value);

                        if (image != null)
                        {
                            string imageFile = null;
                            imageFile = Path.GetTempFileName();
                            using (FileStream stream = new FileStream(imageFile, FileMode.Create))
                            {
                                using (BinaryWriter writer = new BinaryWriter(stream))
                                {
                                    writer.Write(image);
                                    writer.Close();
                                }
                            }
                            dataDoc.Tables[1].Cell(row + 2, col + 1).Range.InlineShapes.AddPicture(imageFile, false);
                        }
                    }
                    else
                    {
                        String text = ReportingFieldUtil.formatValue(value, ReportingFieldUtil.getType(type));
                        dataDoc.Tables[1].Cell(row + 2, col + 1).Range.InsertAfter(text);

                        if (link.Equals("") != true)
                        {
                                Range r = dataDoc.Tables[1].Cell(row + 2, col + 1).Range;
                                //r.Start--;
                                //r.End++;
                                try
                                {
                                    dataDoc.Hyperlinks.Add(r, link);
                                }
                                catch (Exception e) { MessageBox.Show(e.ToString()); };
                        }
                    }
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

        public void createWordTemplate(String layoutAndData)
        {
            Document doc = customData.getWordDoc();
            if (doc.FormsDesign)
            {
                doc.ToggleFormsDesign();
            }

            customData.setLayoutData(layoutAndData);
            customData.writeDictionaryToDocument();

            ReportingUtils.createWordTemplate(doc, layoutAndData);

            if (!doc.FormsDesign)
            {
                doc.ToggleFormsDesign();
            }
            browserDialog.Hide();
        }

        // Refreshing WordReporting Document
        public void refreshWordDocument(String data)
        {
            Document doc = Globals.WordAddIn.getActiveDocument();
            if (doc == null)
            {
                return;
            }
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }

            string templateUrl = customData.getDocumentTemplateUrl();
            if ((templateUrl == null) || (templateUrl == ""))
            {
                return;
            }
            templateUrl = templateUrl.Replace("?representation=msoReportTemplate.$details", "/content");

            string documentUrl = customData.getDocumentUrl();
            string documentTitle = customData.getDocumentTitle();
            string locale = Globals.WordAddIn.commons.GetDocumentLocale(doc);
            string resourceUrl = customData.getResourceUrl();

            byte[] content = browserDialog.readBinaryURLContent(templateUrl);
            if (content == null)
            {
                return;
            }

            string newDocumentFile = null;
            newDocumentFile = Path.GetTempFileName();

            using (FileStream stream = new FileStream(newDocumentFile, FileMode.Create))
            {
                using (BinaryWriter writer = new BinaryWriter(stream))
                {
                    writer.Write(content);
                    writer.Close();
                }
            }

            object doNotSaveChanges = WdSaveOptions.wdDoNotSaveChanges;

            Globals.WordAddIn.Application.ActiveWindow.Close(ref doNotSaveChanges);
            Globals.WordAddIn.Application.Documents.Open(newDocumentFile);
            doc = Globals.WordAddIn.getActiveDocument();
            if (doc == null)
            {
                return;
            }

            
            customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }
            

            Globals.WordAddIn.commons.SetDocumentLocale(doc, locale);
            Globals.WordAddIn.commons.DisplayDocumentLocale(doc);
            customData.setDocumentTemplateUrl(templateUrl);
            customData.setDocumentTitle(documentTitle);
            customData.setDocumentUrl(documentUrl);
            customData.setResourceUrl(resourceUrl);
            customData.writeDictionaryToDocument();

            browserDialog.Hide();
            Globals.WordAddIn.Application.ScreenUpdating = false;
            ReportingUtils.fillTemplate(doc, data, browserDialog);
            Globals.WordAddIn.Application.ScreenUpdating = true;

            Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = true;
            Globals.Ribbons.Ribbon.buttonPreview.Enabled = false;
            customData.setCreateMode("rpt_fill_tpl");
            customData.writeDictionaryToDocument();
        }

        public void populateWordTemplate(String data)
        {
            Document doc = customData.getWordDoc();
            if (doc.FormsDesign)
            {
                doc.ToggleFormsDesign();
            }
            browserDialog.Hide();
            Globals.WordAddIn.Application.ScreenUpdating = false;
            ReportingUtils.fillTemplate(doc, data, browserDialog);
            Globals.WordAddIn.Application.ScreenUpdating = true;
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
            Document doc = (customData != null) ? customData.getWordDoc() : null; // this.doc;
            if (doc == null)
            {
                CommonUtils.ShowErrorMessage(global::WordAddIn.Properties.Resources.MSG_ERROR_NO_DOC);
                return "";
            }

            // MailMerge-Query entfernen
            doc.MailMerge.MainDocumentType = WdMailMergeMainDocType.wdNotAMergeDocument;
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
            CommonUtils.ShowInfoMessage(global::WordAddIn.Properties.Resources.MSG_SAVE_DOC_DONE, global::WordAddIn.Properties.Resources.MSG_SAVE_DOC_DONE_TITLE);
        }

        public String getSyracuseDocumentType()
        {
            Document doc = (customData != null) ? customData.getWordDoc() : null; // : this.doc;
            if (doc == null)
            {
                CommonUtils.ShowErrorMessage(global::WordAddIn.Properties.Resources.MSG_ERROR_NO_DOC);
                return "word-mailmerge";
            }
            string mode = customData.getCreateMode();
            if (ReportingActions.rpt_build_tpl.Equals(mode))
            {
                return "word-report-tpl";
            }
            else if (ReportingActions.rpt_fill_tpl.Equals(mode))
            {
                return "word-report";
            }
            else if (ReportingActions.rpt_is_tpl.Equals(mode))
            {
                return "word-report-tpl-refresh";
            }
            else if (ReportingActions.rpt_refresh_tpl.Equals(mode))
            {
                return "word-report-refresh";
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

        public string getDocumentLocale()
        {
            Document doc = (customData != null) ? customData.getWordDoc() : null;
            if (doc == null)
            {
                return "";
            }
            return Globals.WordAddIn.commons.GetDocumentLocale(doc);
        }
    }
}

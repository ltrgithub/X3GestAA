using System;
using System.IO;
using System.Collections.Generic;
using Microsoft.Office.Interop.Word;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Microsoft.Office.Core;
using System.Security.AccessControl;

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

            WdWindowState ws = doc.Application.WindowState;
            // if maximized -> minimize to see ProgressDialog
            if (ws == WdWindowState.wdWindowStateMaximize)
            {
                doc.Application.WindowState = WdWindowState.wdWindowStateMinimize;
            }

            ProgressDialog pd = new ProgressDialog();
            pd.Show();
            pd.Refresh(); // to see the label (and not a white bar)
            pd.SetRowsExpected(numberOfRows);

            doc.Application.ScreenUpdating = false;

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
                pd.SignalRowDone();
            }
            pd.Close();

            dataDoc.Save();
            ((_Document)dataDoc).Close(false);
            doc.Application.ScreenUpdating = true;
            if (ws == WdWindowState.wdWindowStateMaximize)
            {
                doc.Application.WindowState = ws;
            }
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
            if (checkReadOnly())
            {
                return;
            }

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
            if (checkReadOnly())
            {
                return;
            }

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

        public void populateWordTemplate(String data)
        {

            if (checkReadOnly())
            {
                return;
            }

            Document doc = customData.getWordDoc();
            if (doc.FormsDesign)
            {
                doc.ToggleFormsDesign();
            }
            browserDialog.Hide();
            ReportingUtils.fillTemplate(doc, data, browserDialog);
        }

        public String getSyracuseRole()
        {
            return customData.getSyracuseRole(); 
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
            // Word can't read an open file (locked)!
            Document doc = (customData != null) ? customData.getWordDoc() : null; // this.doc;
            if (doc == null)
            {
                CommonUtils.ShowErrorMessage(global::WordAddIn.Properties.Resources.MSG_ERROR_NO_DOC);
                return "";
            }

            /*
             * Force the focus to the current document to ensure that the current document is indeed the active document.
             */
            doc.ActiveWindow.SetFocus();

            // MailMerge-Query entfernen
            doc.MailMerge.MainDocumentType = WdMailMergeMainDocType.wdNotAMergeDocument;
            // Datei schließen, codiert einlesen und wieder öffnen
            String tempFileName;
            if (doc.Path != "")
            {
                tempFileName = doc.FullName;
            }
            else
            {
                tempFileName = Path.GetTempFileName();
            }
            doc.SaveAs2(tempFileName, WdSaveFormat.wdFormatDocumentDefault);

            Boolean formsDesign = doc.FormsDesign;  
           
            Globals.WordAddIn.Application.ActiveWindow.Close();

            byte[] content = System.IO.File.ReadAllBytes(tempFileName);

            String base64string = Convert.ToBase64String(content);

            Globals.WordAddIn.Application.Documents.Open(tempFileName);
            if (formsDesign)
            {
                doc = Globals.WordAddIn.getActiveDocument();
                doc.ToggleFormsDesign();
            }
            Globals.Ribbons.Ribbon.RibbonUI.ActivateTabMso("TabAddIns");
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
            else if ("v6_doc_download".Equals(mode))
            {
                return "word-v6-download";
            }
            else if ("v6_doc".Equals(mode))
            {
                return "word-v6-upload";
            }
            return "word-mailmerge";
        }

        public BrowserDialog getBrowserDialog()
        {
            return browserDialog;
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

        public string getDocumentFilename()
        {
            Document doc = Globals.WordAddIn.getActiveDocument();
            if (doc == null)
            {
                return "";
            }
            return doc.Name;
        }

        public void signalError(bool closeBrowser, string errorText)
        {
            if (browserDialog != null && closeBrowser)
            {
                browserDialog.Hide();
            }
            MessageBox.Show(errorText, global::WordAddIn.Properties.Resources.MSG_ERROR_TITLE);
        }

        // check version
        public String GetAddinVersion()
        {
            //return System.Reflection.Assembly.GetExecutingAssembly().GetName().Version.ToString();
            return Globals.WordAddIn.getInstalledAddinVersion();
        }
        public void expectedVersion(String neededVersion)
        {
            string[] needed = neededVersion.Split('.');
            int neddedBinary = (Convert.ToInt32(needed[0]) << 24);
            neddedBinary += (Convert.ToInt32(needed[1]) << 16);
            neddedBinary += Convert.ToInt32(needed[2]);

            if (neddedBinary > Globals.WordAddIn.versionNumberBinary)
            {
                if (Globals.WordAddIn.newVersionMessage == false)
                {
                    DialogResult result = MessageBox.Show(new Form() { TopMost = true }, global::WordAddIn.Properties.Resources.MSG_NEW_VERSION, global::WordAddIn.Properties.Resources.MSG_NEW_VERSION_TITLE, MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button1);
                    Globals.WordAddIn.newVersionMessage = true;
                    if (result == DialogResult.Yes)
                    {
                        Globals.WordAddIn.commons.updateAddin();
                    }
                    else
                    {
                        Globals.Ribbons.Ribbon.buttonUpdate.Enabled = true;
                    }
                }
            }
        }

        // Neccessary for Firefox and Office2013
        private Boolean checkReadOnly()
        {
            Document doc = customData.getWordDoc();
            Boolean readOnly = false;

            FileInfo filePath = new FileInfo(doc.FullName);
            string fileName = filePath.ToString();

            if (File.Exists(fileName))
            {
                FileAttributes attributes = File.GetAttributes(fileName);
                if ((attributes & FileAttributes.ReadOnly) == FileAttributes.ReadOnly)
                {
                    // Make the file RW
                    attributes = RemoveAttribute(attributes, FileAttributes.ReadOnly);
                    File.SetAttributes(fileName, attributes);

                    ((Microsoft.Office.Interop.Word._Document)doc).Close(WdSaveOptions.wdDoNotSaveChanges);
                    doc = Globals.WordAddIn.Application.Documents.Open(filePath.FullName);
                    readOnly = true;
                }
            }
            return readOnly;
        }

        private static FileAttributes RemoveAttribute(FileAttributes attributes, FileAttributes attributesToRemove)
        {
            return attributes & ~attributesToRemove;
        }

    }
}

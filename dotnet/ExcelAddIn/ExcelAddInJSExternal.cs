using System;
using System.IO;
using Microsoft.Office.Interop.Excel;
using System.Windows.Forms;

// Do not rename, namespace and classname are refered in JS as WordAddIn.ExcelAddInJSExternal
namespace ExcelAddIn
{
    // The only one class/object to be referenced from javascript 'external'
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class ExcelAddInJSExternal
    {
        private SyracuseOfficeCustomData customData;
        private BrowserDialog browserDialog;

        public ExcelAddInJSExternal(SyracuseOfficeCustomData customData, BrowserDialog browserDialog)
        {
            this.customData = customData;
            this.browserDialog = browserDialog;
        }

        public SyracuseOfficeCustomData getSyracuseOfficeCustomData() 
        {
            return customData;
        }
        
        public void createExcelTemplate(String layoutAndData)
        {
            if (checkReadOnly())
            {
                return;
            }

            Workbook workbook = customData.getExcelWorkbook();
            if (workbook == null)
            {
                CommonUtils.ShowErrorMessage(global::ExcelAddIn.Properties.Resources.MSG_ERROR_NO_DOC);
                return;
            }

            customData.setLayoutData(layoutAndData);
            customData.writeDictionaryToDocument();

            ReportingUtils.createExcelTemplate(workbook, layoutAndData);

            browserDialog.Hide();
        }

        public void populateExcelTemplate(String data)
        {
            if (checkReadOnly())
            {
                return;
            }

            Workbook workbook = customData.getExcelWorkbook();
            if (workbook == null)
            {
                CommonUtils.ShowErrorMessage(global::ExcelAddIn.Properties.Resources.MSG_ERROR_NO_DOC);
                return;
            }

            browserDialog.Hide();

            if (new TemplateActions(null).isExcelDetailFacetType(workbook))
                ReportingUtils.fillTemplate(workbook, data, browserDialog);
            else
                ReportingUtils.fillTemplate(workbook); 
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

        private string rawDecode(string input)
        {
            string output = string.Empty;

            int chr1, chr2, chr3;
            int enc1, enc2, enc3, enc4;
            var i = 0;

            System.Text.RegularExpressions.Regex rgx = new System.Text.RegularExpressions.Regex(@"/[^A-Za-z0-9\+\/\=]/g");
            input = rgx.Replace(input, "");

            string _keyStr = @"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

            while (i < input.Length)
            {
                enc1 = _keyStr.IndexOf(input[i++]);
                enc2 = _keyStr.IndexOf(input[i++]);
                enc3 = _keyStr.IndexOf(input[i++]);
                enc4 = _keyStr.IndexOf(input[i++]);

                chr1 = (enc1 << 2) | (enc2 >> 4);
                chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
                chr3 = ((enc3 & 3) << 6) | enc4;

                output = output + char.ConvertFromUtf32(chr1);

                if (enc3 != 64)
                {
                    output = output + char.ConvertFromUtf32(chr2);
                }
                if (enc4 != 64)
                {
                    output = output + char.ConvertFromUtf32(chr3);
                }
            }
            return output;
        }

        public byte[] GetDocumentContent()
        {
            Workbook workbook = (customData != null) ? customData.getExcelWorkbook() : null; // this.doc;
            if (workbook == null)
            {
                CommonUtils.ShowErrorMessage(global::ExcelAddIn.Properties.Resources.MSG_ERROR_NO_DOC);
                return null;
            }

            String tempFileName = Path.GetTempFileName();
            workbook.SaveCopyAs(tempFileName);
            byte[] content = System.IO.File.ReadAllBytes(tempFileName);
            String base64string = Convert.ToBase64String(content);
            workbook.Save();
            return System.Text.Encoding.UTF8.GetBytes(rawDecode(base64string));
        }

        public void NotifySaveDocumentDone()
        {
            browserDialog.Hide();
            CommonUtils.ShowInfoMessage(global::ExcelAddIn.Properties.Resources.MSG_SAVE_DOC_DONE, global::ExcelAddIn.Properties.Resources.MSG_SAVE_DOC_DONE_TITLE);
            Globals.Ribbons.Ribbon.buttonSave.Enabled = false;
        }

        public String getSyracuseDocumentType()
        {
            Workbook workbook = (customData != null) ? customData.getExcelWorkbook() : null; 
            if (workbook == null)
            {
                CommonUtils.ShowErrorMessage(global::ExcelAddIn.Properties.Resources.MSG_ERROR_NO_DOC);
                return "excel-report";
            }
            string mode = customData.getCreateMode();
            if (TemplateActions.rpt_build_tpl.Equals(mode))
            {
                return "excel-report-tpl";
            }
            else if (TemplateActions.rpt_fill_tpl.Equals(mode))
            {
                return "excel-report";
            }
            else if (TemplateActions.rpt_is_tpl.Equals(mode))
            {
                return "excel-report-tpl-refresh";
            }
            else if ("v6_doc_download".Equals(mode))
            {
                return "word-v6-download";
            }
            else if ("v6_doc".Equals(mode))
            {
                return "word-v6-upload";
            }
            return "excel-report";
        }

        public BrowserDialog getBrowserDialog()
        {
            return browserDialog;
        }
        
        public string getDocumentLocale()
        {
            Workbook workbook = (customData != null) ? customData.getExcelWorkbook() : null;
            if (workbook == null)
            {
                return "";
            }
            return  Globals.ThisAddIn.commons.GetDocumentLocale(workbook);
        }

        public string getDocumentFilename()
        {
            Workbook workbook = Globals.ThisAddIn.getActiveWorkbook();
            if (workbook == null)
            {
                return "";
            }
            return workbook.Name;
        }

        public void signalError(bool closeBrowser, string errorText)
        {
            if (browserDialog != null && closeBrowser)
            {
                browserDialog.Hide();
            }
            MessageBox.Show(errorText, global::ExcelAddIn.Properties.Resources.MSG_ERROR_TITLE);
        }

        public String GetAddinVersion()
        {
            return Globals.ThisAddIn.getInstalledAddinVersion();
        }

        public void expectedVersion(String neededVersion)
        {
            Workbook workbook = (customData != null) ? customData.getExcelWorkbook() : null;
            if (workbook != null)
            {
                string mode = customData.getCreateMode();
                if (TemplateActions.rpt_fill_tpl.Equals(mode))
                {
                    /*
                     * If we're populating a template, we don't need to test for an expected version here - this is being tested by the original excel functionality.
                     */
                    return;
                }
            }

            string[] needed = neededVersion.Split('.');
            int neddedBinary = (Convert.ToInt32(needed[0]) << 24);
            neddedBinary += (Convert.ToInt32(needed[1]) << 16);
            neddedBinary += Convert.ToInt32(needed[2]);

            if (neddedBinary > Globals.ThisAddIn.versionNumberBinary)
            {
                if (Globals.ThisAddIn.newVersionMessage == false)
                {
                    DialogResult result = MessageBox.Show(new Form() { TopMost = true }, global::ExcelAddIn.Properties.Resources.MSG_NEW_VERSION, global::ExcelAddIn.Properties.Resources.MSG_NEW_VERSION_TITLE, MessageBoxButtons.YesNo, MessageBoxIcon.Question, MessageBoxDefaultButton.Button1);
                    Globals.ThisAddIn.newVersionMessage = true;
                    if (result == DialogResult.Yes)
                    {
                        Globals.ThisAddIn.commons.updateAddin();
                    }
                    else
                    {
                        Globals.Ribbons.Ribbon.buttonUpdate.Enabled = true;
                    }
                }
            }
        }

        private Boolean checkReadOnly()
        {
            Workbook workbook = customData.getExcelWorkbook();
            Boolean readOnly = false;

            FileInfo filePath = new FileInfo(workbook.FullName);
            string fileName = filePath.ToString();

            if (File.Exists(fileName))
            {
                FileAttributes attributes = File.GetAttributes(fileName);
                if ((attributes & FileAttributes.ReadOnly) == FileAttributes.ReadOnly)
                {
                    // Make the file RW
                    attributes = RemoveAttribute(attributes, FileAttributes.ReadOnly);
                    File.SetAttributes(fileName, attributes);

                    ((Microsoft.Office.Interop.Excel._Workbook)workbook).Close(false); // don't save the changes.
                    workbook = Globals.ThisAddIn.Application.Workbooks.Open(filePath.FullName);
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

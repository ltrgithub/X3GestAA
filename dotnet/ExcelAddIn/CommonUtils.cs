using System;
using System.Windows.Forms;
using Microsoft.Office.Interop.Excel;
using Rb = Microsoft.Office.Tools.Ribbon;
using System.IO;

namespace ExcelAddIn
{
    public class CommonUtils
    {
        public BrowserDialog browserDialog = null;

        private const string DOC_LOCALE_PROPERTY = "X3-Locale";

        public CommonUtils(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        // Save a document that has already been published
        public void Save(Workbook workbook)
        {
            // A document that has not been published yet cannot be saved using the save button, the user must use Save as...
            // The button should not be active in this case, this is just for safety reasons
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData == null)
            {
                ShowInfoMessage(global::ExcelAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED, global::ExcelAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED_TITLE);
                SaveAs(workbook);
                return;
            }
            if ("".Equals(customData.getDocumentUrl()))
            {
                ShowInfoMessage(global::ExcelAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED, global::ExcelAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED_TITLE);
                SaveAs(workbook);
                return;
            }

            browserDialog.loadPage("/msoffice/lib/excel/ui/save.html?url=%3Frepresentation%3Dexceltemplatesave.%24dashboard", customData);
        }

        // Save a document as new document (e.g. create a copy of a already published document or save a not yet published doc.)
        public void SaveAs(Workbook workbook)
        {
            SyracuseOfficeCustomData customData = PrepareToSaveNewDoc(workbook);
            browserDialog.loadPage("/msoffice/lib/excel/ui/save.html?url=%3Frepresentation%3Dexceltemplatesave.%24dashboard", customData);
        }

        private static SyracuseOfficeCustomData PrepareToSaveNewDoc(Workbook workbook)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData == null)
            {
                customData = SyracuseOfficeCustomData.getFromDocument(workbook, true);
                customData.setCreateMode("plain_doc");
                customData.setForceRefresh(false);
            }
            else
            {
                // Since we want to save a new independent doc to collab. space, an eventually set URL has to be removed first
                customData.setDocumentUrl("");
                customData.setDocumentTitle("");
                customData.setForceRefresh(false);
            }
            customData.writeDictionaryToDocument();
            return customData;
        }

        public static void ShowErrorMessage(string text)
        {
            MessageBox.Show(text, global::ExcelAddIn.Properties.Resources.MSG_ERROR_TITLE, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        public static void ShowInfoMessage(string text, string title)
        {
            MessageBox.Show(text, title, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        public void SetDocumentLocale(Workbook workbook, string locale)
        {
            Microsoft.Office.Core.DocumentProperty cp = null;
            try
            {
                if (locale == null || "".Equals(locale))
                    return;
                cp = workbook.CustomDocumentProperties[DOC_LOCALE_PROPERTY];
            }
            catch (Exception) { }

            try
            {
                if (cp == null)
                {
                    workbook.CustomDocumentProperties.Add(DOC_LOCALE_PROPERTY, false, Microsoft.Office.Core.MsoDocProperties.msoPropertyTypeString, locale);
                    cp = workbook.CustomDocumentProperties[DOC_LOCALE_PROPERTY];
                }
                cp.Value = locale;
            }
            catch (Exception) { }
        }

        public string GetDocumentLocale(Workbook workbook)
        {
            try
            {
                Microsoft.Office.Core.DocumentProperty cp = workbook.CustomDocumentProperties[DOC_LOCALE_PROPERTY];
                if (cp != null)
                {
                    return cp.Value;
                }
            }
            catch (Exception) { }
            return null;
        }

        public void SetSupportedLocales(SyracuseCustomData customData)
        {
            Globals.Ribbons.Ribbon.dropDownLocale.Items.Clear();
            Globals.Ribbons.Ribbon.dropDownLocale.Items.Add(Globals.Factory.GetRibbonFactory().CreateRibbonDropDownItem());
            Globals.Ribbons.Ribbon.dropDownLocale.Items[0].Label = "";
            if (customData == null)
            {
                Globals.Ribbons.Ribbon.dropDownLocale.Enabled = false;
                return;
            }

            try
            {
                foreach (Locale locale in (customData.getSupportedLocales()))
                {
                    Rb.RibbonDropDownItem item = Globals.Factory.GetRibbonFactory().CreateRibbonDropDownItem();
                    item.Label = locale.name + " - " + locale.nativeName;
                    item.Tag = locale.name;
                    Globals.Ribbons.Ribbon.dropDownLocale.Items.Add(item);
                }
            }
            catch (Exception e) { MessageBox.Show(e.Message + "\n" + e.StackTrace); }
            Globals.Ribbons.Ribbon.dropDownLocale.Enabled = true;
        }

        public void SetSupportedLocales(SyracuseOfficeCustomData customData)
        {
            Globals.Ribbons.Ribbon.dropDownLocale.Items.Clear();
            Globals.Ribbons.Ribbon.dropDownLocale.Items.Add(Globals.Factory.GetRibbonFactory().CreateRibbonDropDownItem());
            Globals.Ribbons.Ribbon.dropDownLocale.Items[0].Label = "";
            if (customData == null)
            {
                Globals.Ribbons.Ribbon.dropDownLocale.Enabled = false;
                return;
            }
            try
            {
                foreach (Locale locale in customData.getSupportedLocales())
                {
                    Rb.RibbonDropDownItem item = Globals.Factory.GetRibbonFactory().CreateRibbonDropDownItem();
                    item.Label = locale.name + " - " + locale.nativeName;
                    item.Tag = locale.name;
                    Globals.Ribbons.Ribbon.dropDownLocale.Items.Add(item);
                }
            }
            catch (Exception e) { MessageBox.Show(e.Message + "\n" + e.StackTrace); }
            Globals.Ribbons.Ribbon.dropDownLocale.Enabled = true;
        }

        public void DisplayDocumentLocale(Workbook workbook)
        {
            string locale = GetDocumentLocale(workbook);
            if (locale == null)
            {
                Globals.Ribbons.Ribbon.dropDownLocale.SelectedItemIndex = 0;
                return;
            }
            for (int i = 1; i < Globals.Ribbons.Ribbon.dropDownLocale.Items.Count; i++)
            {
                if (Globals.Ribbons.Ribbon.dropDownLocale.Items[i].Tag.Equals(locale))
                {
                    Globals.Ribbons.Ribbon.dropDownLocale.SelectedItemIndex = i;
                    return;
                }
            }
            Globals.Ribbons.Ribbon.dropDownLocale.SelectedItemIndex = 0;
        }

        public void ExtractV6Document(Workbook workbook, SyracuseOfficeCustomData customData)
        {
            String documentUrl = customData.getDocumentUrl();
            String serverUrl = customData.getServerUrl();

            string tempFile = workbook.FullName;
            byte[] content = Convert.FromBase64String(customData.getDocContent());
            if (content == null)
            {
                ((Microsoft.Office.Interop.Excel._Workbook)workbook).Close(XlSaveAction.xlDoNotSaveChanges); //WdSaveOptions.wdDoNotSaveChanges);
                TryDeleteFile(tempFile);
                return;
            }
            ((Microsoft.Office.Interop.Excel._Workbook)workbook).Close(XlSaveAction.xlDoNotSaveChanges); //WdSaveOptions.wdDoNotSaveChanges);

            // Sometimes the browser seems to lock the file a litte bit too long, so do some retries
            // if it fails, a new file name is generated later
            TryDeleteFile(tempFile);
            string ext = ".xls";
            if (content[0] == 0x50 && content[1] == 0x4b && content[2] == 0x03 && content[3] == 0x04)
            {
                ext = ".xlsx";
            }

            string newDocumentFile = tempFile;
            int tryWrite = 0;
            while (tryWrite < 2)
            {
                FileInfo fi = new FileInfo(tempFile);
                newDocumentFile = tempFile;

                // This is for not overwriting existing files
                int count = 0;
                while (File.Exists(newDocumentFile))
                {
                    count++;
                    newDocumentFile = fi.Directory.FullName + "\\" + fi.Name + " (" + count + ")" + fi.Extension;
                }

                tryWrite++;
                try
                {
                    newDocumentFile = newDocumentFile.Replace(".xlsx", ext);
                    using (FileStream stream = new FileStream(newDocumentFile, FileMode.Create))
                    {
                        using (BinaryWriter writer = new BinaryWriter(stream))
                        {
                            writer.Write(content);
                            writer.Close();
                            tryWrite = 2;
                        }
                    }
                }
                catch (Exception)
                {
                    // This is because during the first try, we may have tried to write to an directory w/o write access, so change path here
                    tempFile = Path.GetTempPath() + "\\" + fi.Name + fi.Extension;
                }
            }

            workbook = Globals.ThisAddIn.Application.Workbooks.Open(newDocumentFile);
            if (workbook == null)
            {
                return;
            }
            customData = SyracuseOfficeCustomData.getFromDocument(workbook, true);
            if (customData == null)
            {
                return;
            }
            customData.setServerUrl(serverUrl);
            customData.setDocumentUrl(documentUrl);
            customData.setForceRefresh(false);
            customData.setCreateMode("v6_doc");
            customData.writeDictionaryToDocument();

            // Save document after metadata was added
            if (ext == "xlsx")
            {
                workbook.Save();
            }
            else
            {
                // convert to xlsx if not yet done
                tempFile = newDocumentFile;
                newDocumentFile = newDocumentFile.Replace(ext, ".xlsx");
                while (File.Exists(newDocumentFile))
                {
                    newDocumentFile = "_" + newDocumentFile;
                }
                workbook.ActiveSheet.Application.DisplayAlerts = false;
                workbook.SaveAs(newDocumentFile, XlFileFormat.xlOpenXMLWorkbook);
                workbook.ActiveSheet.Application.DisplayAlerts = true;
                ((Microsoft.Office.Interop.Excel._Workbook)workbook).Close();
                TryDeleteFile(tempFile);
                workbook = Globals.ThisAddIn.Application.Workbooks.Open(newDocumentFile);
            }

            //Globals.Ribbons.Ribbon.buttonSave.Enabled = true;
            //Globals.Ribbons.Ribbon.buttonSaveAs.Enabled = true;
        }

        private void TryDeleteFile(string file)
        {
            int tries = 0;
            while (tries++ < 3 && File.Exists(file))
            {
                try
                {
                    File.Delete(file);
                }
                catch (Exception)
                {
                    System.Threading.Thread.Sleep(500);
                }
                break;
            }
        }

        public SyracuseOfficeCustomData getSyracuseCustomData()
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(Globals.ThisAddIn.getActiveWorkbook());
            if (customData == null)
                customData = PrepareToSaveNewDoc(Globals.ThisAddIn.getActiveWorkbook());

            return customData;
        }

        public void check4updateAddin()
        {
        }

        public void updateAddin()
        {
            MessageBox.Show(global::ExcelAddIn.Properties.Resources.MSG_RESTART, global::ExcelAddIn.Properties.Resources.MSG_RESTART_TITLE);
            Microsoft.Office.Interop.Excel.Workbook workbook = Globals.ThisAddIn.getActiveWorkbook();
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData == null)
            {
                return;
            }
            browserDialog.loadPage("/msoffice/lib/general/addIn/SyracuseOfficeAddinsSetup.EXE", customData);
            Globals.Ribbons.Ribbon.buttonUpdate.Enabled = false;
            browserDialog.Hide();
        }
    }
}

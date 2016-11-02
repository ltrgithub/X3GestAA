﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Microsoft.Office.Interop.Word;
using Rb = Microsoft.Office.Tools.Ribbon;
using System.IO;
using System.Globalization;
using CommonDataHelper;
using CommonDataHelper.HttpHelper;

namespace WordAddIn
{
    public class CommonUtils
    {
        public BrowserDialog browserDialog = null;

        private const string DOC_LOCALE_PROPERTY = "X3-Locale";

        public CommonUtils(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }
    
        private static SyracuseOfficeCustomData PrepareToSaveNewDoc(Document doc)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                customData = SyracuseOfficeCustomData.getFromDocument(doc, true);
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
            MessageBox.Show(text, global::WordAddIn.Properties.Resources.MSG_ERROR_TITLE, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        public static void ShowInfoMessage(string text, string title)
        {
            MessageBox.Show(text, title, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }

        public void SetDocumentLocale(Document doc, string locale)
        {
            Microsoft.Office.Core.DocumentProperty cp = null;
            try
            {
                if (locale == null || "".Equals(locale))
                    return;
                cp = doc.CustomDocumentProperties[DOC_LOCALE_PROPERTY];
            }
            catch (Exception) { }

            try
            {
                if (cp == null)
                {
                    doc.CustomDocumentProperties.Add(DOC_LOCALE_PROPERTY, false, Microsoft.Office.Core.MsoDocProperties.msoPropertyTypeString, locale);
                    cp = doc.CustomDocumentProperties[DOC_LOCALE_PROPERTY];
                }
                cp.Value = locale;
            }
            catch (Exception) { }
        }

        public string GetDocumentLocale(Document doc)
        {
            try
            {
                Microsoft.Office.Core.DocumentProperty cp = doc.CustomDocumentProperties[DOC_LOCALE_PROPERTY];
                if (cp != null)
                {
                    return cp.Value;
                }
            }
            catch (Exception) { }

            return null;
        }

        public void SetSupportedLocales(SyracuseOfficeCustomData customData)
        {
            if (Globals.Ribbons.Ribbon.dropDownLocale.Items.Count > 0)
                return; 

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

        public void DisplayDocumentLocale(Document doc)
        {
            string locale = GetDocumentLocale(doc);
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

        public void SetDocumentLanguageID(Document doc)
        {
            /*
             * The document language ID is only set during template creation, and sets the language ID for the whole document.
             */
            String documentLocale = GetDocumentLocale(doc);
            if (documentLocale == null)
            {
                /*
                 * We don't have a document locale set, so set the language ID to the default language. 
                 */
                Globals.WordAddIn.Application.ActiveDocument.Content.LanguageID = (Microsoft.Office.Interop.Word.WdLanguageID)System.Threading.Thread.CurrentThread.CurrentCulture.LCID;

                /*
                 * Now set the dropdown to the default language.
                 */
                for (int i = 1; i < Globals.Ribbons.Ribbon.dropDownLocale.Items.Count; i++)
                {
                    if (Globals.Ribbons.Ribbon.dropDownLocale.Items[i].Tag.Equals(System.Threading.Thread.CurrentThread.CurrentCulture.Name))
                    {
                        Globals.Ribbons.Ribbon.dropDownLocale.SelectedItemIndex = i;
                        SetDocumentLocale(doc, Globals.Ribbons.Ribbon.dropDownLocale.Items[i].Tag.ToString());
                        break;
                    }
                }
            }
            else
            {
                /*
                 * If we have a document locale already set, use it to set the language ID of the document.
                 */
                CultureInfo cultureInfo = new CultureInfo(GetDocumentLocale(doc), false);
                if (cultureInfo != null)
                {
                    Globals.WordAddIn.Application.ActiveDocument.Content.LanguageID = (Microsoft.Office.Interop.Word.WdLanguageID)cultureInfo.LCID;
                }
            }
        }

        public void ExtractV6Document(Document doc, SyracuseOfficeCustomData customData)
        {
            String documentUrl = customData.getDocumentUrl();
            String serverUrl = customData.getServerUrl();

            string tempFile = doc.FullName;
            byte[] content = Convert.FromBase64String(customData.getDocContent());
            if (content == null)
            {
                ((Microsoft.Office.Interop.Word._Document)doc).Close(WdSaveOptions.wdDoNotSaveChanges);
                TryDeleteFile(tempFile);
                return;
            }
            ((Microsoft.Office.Interop.Word._Document)doc).Close(WdSaveOptions.wdDoNotSaveChanges);

            // Sometimes the browser seems to lock the file a litte bit too long, so do some retries
            // if it fails, a new file name is generated later
            TryDeleteFile(tempFile);
            string ext = ".doc";
            if (content[0] == 0x50 && content[1] == 0x4b && content[2] == 0x03 && content[3] == 0x04)
            {
                ext = ".docx";
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
                    newDocumentFile = newDocumentFile.Replace(".docx", ext);
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
                catch (Exception) {
                    // This is because during the first try, we may have tried to write to an directory w/o write access, so change path here
                    tempFile = Path.GetTempPath() + "\\" + fi.Name + fi.Extension;
                }
            }
            
            doc = Globals.WordAddIn.Application.Documents.Open(newDocumentFile);
            if (doc == null)
            {
                return;
            }
            customData = SyracuseOfficeCustomData.getFromDocument(doc, true);
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
            if (ext == "docx")
            {
                doc.Save();
            }
            else
            {
                // convert to docx if not yet done
                tempFile = newDocumentFile;
                newDocumentFile = newDocumentFile.Replace(ext, ".docx");
                while (File.Exists(newDocumentFile))
                {
                    newDocumentFile = "_" + newDocumentFile;
                }
                doc.SaveAs2(newDocumentFile, WdSaveFormat.wdFormatDocumentDefault);
                ((Microsoft.Office.Interop.Word._Document)doc).Close();
                TryDeleteFile(tempFile);
                doc = Globals.WordAddIn.Application.Documents.Open(newDocumentFile);
            }

            Globals.Ribbons.Ribbon.buttonPublish.Enabled = true;
            Globals.Ribbons.Ribbon.galleryPublishAs.Enabled = true;
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

        public void check4updateAddin()
        {
        }

        public void updateAddin()
        {
            MessageBox.Show(global::WordAddIn.Properties.Resources.MSG_RESTART, global::WordAddIn.Properties.Resources.MSG_RESTART_TITLE);
            Microsoft.Office.Interop.Word.Document doc = Globals.WordAddIn.getActiveDocument();
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }
            browserDialog.loadPage("/msoffice/lib/general/addIn/SyracuseOfficeAddinsSetup.EXE", customData);
            Globals.Ribbons.Ribbon.buttonUpdate.Enabled = false;
            browserDialog.Hide();
        }

        public SyracuseOfficeCustomData getSyracuseCustomData()
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(Globals.WordAddIn.getActiveDocument());
            if (customData == null)
                customData = PrepareToSaveNewDoc(Globals.WordAddIn.getActiveDocument());

            return customData;
        }

        public void DisplayServerLocations(bool force = false)
        {
            Globals.Ribbons.Ribbon.comboBoxServerLocation.Items.Clear();
            Globals.Ribbons.Ribbon.comboBoxServerLocation.Text = BaseUrlHelper.BaseUrl.ToString();
            List<Uri> _urls = null;
            if (force)
                PrefUrlHelper.readUserPreferenceFile(ref _urls);
            else
                _urls = PrefUrlHelper.getBaseUrlsFromUserPreferenceFile;
            foreach (Uri _uri in _urls)
            {
                Rb.RibbonDropDownItem item = Globals.Factory.GetRibbonFactory().CreateRibbonDropDownItem();
                item.Label = _uri.ToString();
                Globals.Ribbons.Ribbon.comboBoxServerLocation.Items.Add(item);
            }

            if (force)
            {
                if (Globals.Ribbons.Ribbon.comboBoxServerLocation.Items.OfType<Rb.RibbonDropDownItem>().Any(cbi => cbi.Label.Equals(BaseUrlHelper.BaseUrl.ToString())) == false)
                {
                    Globals.Ribbons.Ribbon.comboBoxServerLocation.Text = String.Empty;
                }
            }
        }

        public static void doGarbageCollect(ref int gcCount)
        {
            if (gcCount > 200)
            {
                GC.Collect();
                GC.WaitForPendingFinalizers();
                gcCount = 0;
            }
        }
    }
}


using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Microsoft.Office.Interop.PowerPoint;
using CommonDataHelper;
using CommonDataHelper.OwnerHelper;
using CommonDialogs.PublishDocumentTemplateDialog;
using CommonDataHelper.EndpointHelper;
using CommonDataHelper.PublisherHelper.Model.Common;
using System.Net;
using System.Reflection;
using Rb = Microsoft.Office.Tools.Ribbon;

namespace PowerPointAddIn
{
    public class CommonUtils
    {
        public BrowserDialog browserDialog = null;

        public CommonUtils(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        // Save a document that has already been published
        public void Save(Presentation pres)
        {
            // A document that has not been published yet cannot be saved using the save button, the user must use Save as...
            // The button should not be active in this case, this is just for safety reasons
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(pres);

            if (customData == null)
            {
                ShowInfoMessage(global::PowerPointAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED, global::PowerPointAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED_TITLE);
                SaveAs(pres);
                return;
            }
            if ("".Equals(customData.getDocumentUrl()))
            {
                ShowInfoMessage(global::PowerPointAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED, global::PowerPointAddIn.Properties.Resources.MSG_DOC_NOT_PUBLISHED_TITLE);
                SaveAs(pres);
                return;
            }
            // ---

            browserDialog.loadPage("/msoffice/lib/ppt/ui/save.html?url=%3Frepresentation%3Dpptsave.%24dashboard", customData);
        }

        // Save a document as new document (e.g. create a copy of a already published document or save a not yet published doc.)
        public void SaveAs(Presentation pres)
        {
            SyracuseOfficeCustomData customData = PrepareToSaveNewDoc(pres);
            browserDialog.loadPage("/msoffice/lib/ppt/ui/save.html?url=%3Frepresentation%3Dpptsave.%24dashboard", customData);
        }

        private static SyracuseOfficeCustomData PrepareToSaveNewDoc(Presentation pres)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(pres);
            if (customData == null)
            {
                customData = SyracuseOfficeCustomData.getFromDocument(pres, true);
                customData.setActionType("plain_doc");
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
            MessageBox.Show(text, global::PowerPointAddIn.Properties.Resources.MSG_ERROR_TITLE, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        public static void ShowInfoMessage(string text, string title)
        {
            MessageBox.Show(new Form() { TopMost = true }, text, title, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        public void updateAddin()
        {
            MessageBox.Show(global::PowerPointAddIn.Properties.Resources.MSG_RESTART, global::PowerPointAddIn.Properties.Resources.MSG_RESTART_TITLE);
            Presentation pres = Globals.PowerPointAddIn.Application.ActiveWindow.Presentation;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(pres);
            if (customData == null)
            {
                customData = SyracuseOfficeCustomData.getFromDocument(pres, true);
                if (customData == null)
                {
                    return;
                }
            }
            browserDialog.loadPage("/msoffice/lib/general/addIn/SyracuseOfficeAddinsSetup.EXE", customData);
            Globals.Ribbons.Ribbon.buttonUpdate.Enabled = false;
            browserDialog.Hide();
        }
    
        public SyracuseOfficeCustomData getSyracuseCustomData()
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(Globals.PowerPointAddIn.Application.ActiveWindow.Presentation);
            if (customData == null)
                customData = PrepareToSaveNewDoc(Globals.PowerPointAddIn.Application.ActiveWindow.Presentation);

            return customData;
        }

        public void DisplayServerLocations()
        {
            Globals.Ribbons.Ribbon.comboBoxServerLocation.Items.Clear();
            Globals.Ribbons.Ribbon.comboBoxServerLocation.Text = BaseUrlHelper.BaseUrl.ToString();
            List<Uri> _urls = BaseUrlHelper.getBaseUrlsFromUserPreferenceFile;
            foreach (Uri _uri in _urls)
            {
                Rb.RibbonDropDownItem item = Globals.Factory.GetRibbonFactory().CreateRibbonDropDownItem();
                item.Label = _uri.ToString();
                Globals.Ribbons.Ribbon.comboBoxServerLocation.Items.Add(item);
            }
        }
    }
}

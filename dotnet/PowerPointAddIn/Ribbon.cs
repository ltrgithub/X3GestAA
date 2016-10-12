using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Tools.Ribbon;
using Microsoft.Office.Tools;
using System.Threading;
using System.Globalization;
using CommonDataHelper;
using CommonDataHelper.PublisherHelper;
using Microsoft.Office.Interop.PowerPoint;
using CommonDialogs.ServerLocationDialog;
using System.Diagnostics;

namespace PowerPointAddIn
{
    public partial class Ribbon
    {
        private void Ribbon_Load(object sender, RibbonUIEventArgs e)
        {
            installedVersion.Label = VersionHelper.getInstalledAddinVersion();
        }

        private void buttonRefresh_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.PowerPointAddIn.pptActions.RefreshChartsCurrentSlide();
        }

        private void buttonRefreshAll_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.PowerPointAddIn.pptActions.RefreshChartsAllSlides();
        }

        private void buttonUpdate_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.PowerPointAddIn.common.updateAddin();
        }

        private void buttonPublish_Click(object sender, RibbonControlEventArgs e)
        {
            // disable eventhandler for BeforeSave, because it for publishing it must be saved to read the document content
            Globals.PowerPointAddIn.Application.PresentationBeforeSave -= new EApplication_PresentationBeforeSaveEventHandler(Globals.PowerPointAddIn.on_PresentationBeforeSave);
            
            new PublisherHelper().publishDocument(Globals.PowerPointAddIn.common.getSyracuseCustomData());
            
            Globals.PowerPointAddIn.Application.PresentationBeforeSave += new EApplication_PresentationBeforeSaveEventHandler(Globals.PowerPointAddIn.on_PresentationBeforeSave);
        }

        private void galleryPublishAs_Click(object sender, RibbonControlEventArgs e)
        {
            // disable eventhandler for BeforeSave, because it for publishing it must be saved to read the document content
            Globals.PowerPointAddIn.Application.PresentationBeforeSave -= new EApplication_PresentationBeforeSaveEventHandler(Globals.PowerPointAddIn.on_PresentationBeforeSave);
            
            Presentation pres = Globals.PowerPointAddIn.Application.ActivePresentation;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(pres, true);
            if (customData != null)
            {
                customData.setServerUrl(BaseUrlHelper.BaseUrl.ToString());
                customData.writeDictionaryToDocument();
                new PublisherDialogHelper().showPublisherDocumentDialog("saveNewDocumentPrototype", customData);
                customData = SyracuseOfficeCustomData.getFromDocument(pres);
                string documentUrl = customData.getDocumentUrl();
                if (!string.IsNullOrEmpty(documentUrl))
                {
                    if (!(new RequestHelper().getDocumentIsReadOnly(documentUrl)))
                    {
                        Globals.Ribbons.Ribbon.buttonPublish.Enabled = true;
                    }
                    else
                    {
                        Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;
                    }
                }
            }
            Globals.PowerPointAddIn.Application.PresentationBeforeSave += new EApplication_PresentationBeforeSaveEventHandler(Globals.PowerPointAddIn.on_PresentationBeforeSave);
        }

        private void comboBoxServerLocation_TextChanged(object sender, RibbonControlEventArgs e)
        {
            Uri url = new Uri(((RibbonComboBox)sender).Text);
            BaseUrlHelper.BaseUrl = url;
            CookieHelper.CookieContainer = null;
            buttonPublish.Enabled = false;
        }

        private void buttonDisconnect_Click(object sender, RibbonControlEventArgs e)
        {
            new ConnectionDialog().disconnectFromServer();
        }

        private void serverLocationsButton_Click(object sender, RibbonControlEventArgs e)
        {
            new serverLocationsDialog(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData) + "\\Microsoft\\Office\\" + Process.GetCurrentProcess().ProcessName + ".X3.settings",
                CommonDataHelper.HttpHelper.PrefUrlHelper.readUserPreferenceFile,
                CommonDataHelper.HttpHelper.PrefUrlHelper.updateUserPreferenceFile,
                Globals.PowerPointAddIn.common.DisplayServerLocations).ShowDialog();
        }
    }
}

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

namespace PowerPointAddIn
{
    public partial class Ribbon
    {
        private void Ribbon_Load(object sender, RibbonUIEventArgs e)
        {
            installedVersion.Label = Globals.PowerPointAddIn.getInstalledAddinVersion();
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
            new PublisherHelper().publishDocument(Globals.PowerPointAddIn.common.getSyracuseCustomData());
        }

        private void galleryPublishAs_Click(object sender, RibbonControlEventArgs e)
        {
            Presentation pres = Globals.PowerPointAddIn.Application.ActivePresentation;
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(pres, true);
            customData.setServerUrl(BaseUrlHelper.BaseUrl.ToString());
            customData.writeDictionaryToDocument();
            new PublisherDialogHelper().showPublisherDocumentDialog("saveNewDocumentPrototype", customData);
        }

        private void comboBoxServerLocation_TextChanged(object sender, RibbonControlEventArgs e)
        {
            Uri url = new Uri(((RibbonComboBox)sender).Text);
            BaseUrlHelper.BaseUrl = url;
            CookieHelper.CookieContainer = null;
            buttonPublish.Enabled = false;
        }
    }
}

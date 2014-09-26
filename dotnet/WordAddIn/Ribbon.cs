using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Office.Tools.Ribbon;
using Microsoft.Office.Tools;
using System.Threading;
using System.Globalization;
using Word = Microsoft.Office.Interop.Word;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Win32;
using CommonDataHelper;
using CommonDataHelper.PublisherHelper;

namespace WordAddIn
{
    public partial class Ribbon
    {
        private void Ribbon_Load(object sender, RibbonUIEventArgs e)
        {
            installedVersion.Label = Globals.WordAddIn.getInstalledAddinVersion();
        }

        private void buttonSaveAs_Click(object sender, RibbonControlEventArgs e)
        {
            Word.Document doc = Globals.WordAddIn.Application.ActiveDocument;
            if (doc != null)
            {
                Globals.WordAddIn.commons.SaveAs(doc);
            }
        }
        private void checkBoxShowTemplatePane_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.showReportingFieldsTaskPane(checkBoxShowTemplatePane.Checked);
        }

        private void buttonPreview_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.reporting.CreateWordReportPreview();
        }

        private void buttonRefreshReport_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.reporting.RefreshReport();
        }

        private void dropDownLocale_SelectionChanged(object sender, RibbonControlEventArgs e)
        {
            Word.Document doc = Globals.WordAddIn.getActiveDocument();
            if (doc != null)
            {
                string locale = Globals.Ribbons.Ribbon.dropDownLocale.SelectedItem.Tag.ToString();
                Globals.WordAddIn.commons.SetDocumentLocale(doc, locale);
            }
        }

        private void toggleMakeSum_Click(object sender, RibbonControlEventArgs e)
        {
            Word.Document doc = Globals.WordAddIn.getActiveDocument();
            if (doc != null)
            {
                Globals.WordAddIn.reporting.ToggleMakeSum(doc);
            }
        }

        private void buttonUpdate_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.commons.updateAddin();
        }

        private void buttonCleanup_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.WordAddIn.reporting.CleanupReportTemplateData();
        }

        private void gallery1_Click(object sender, RibbonControlEventArgs e)
        {
            Word.Document doc = Globals.WordAddIn.Application.ActiveDocument;
            if (doc != null)
            {
                int index = ((RibbonGallery)sender).SelectedItemIndex;
                switch (index)
                {
                    case 0:
                        new PublisherDialogHelper().showPublisherDocumentDialog("saveNewDocumentPrototype", Globals.WordAddIn.commons.getSyracuseCustomData());
                        break;
                    case 1:
                        new PublisherDialogHelper().showPublisherTemplateDialog("saveMailMergeTemplatePrototype", Globals.WordAddIn.commons.getSyracuseCustomData());
                        break;
                    case 2:
                        new PublisherDialogHelper().showPublisherTemplateDialog("saveReportTemplatePrototype", Globals.WordAddIn.commons.getSyracuseCustomData());
                        break;
                }
            }
        }

        private void comboBoxServerLocation_TextChanged(object sender, RibbonControlEventArgs e)
        {
            Uri url = new Uri(((RibbonComboBox)sender).Text);
            BaseUrlHelper.BaseUrl = url;
            CookieHelper.CookieContainer = null;
        }

        private void buttonPublish_Click(object sender, RibbonControlEventArgs e)
        {
            new PublisherHelper().publishDocument(Globals.WordAddIn.commons.getSyracuseCustomData());
        }
    }
}

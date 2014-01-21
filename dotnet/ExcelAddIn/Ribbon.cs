using Microsoft.Office.Tools.Ribbon;
using Excel = Microsoft.Office.Interop.Excel;

namespace ExcelAddIn
{
    public partial class Ribbon
    {
        private void Ribbon_Load(object sender, RibbonUIEventArgs e)
        {
            Globals.ThisAddIn.ReadPreferences();
            actionPanelCheckBox.Checked = Globals.ThisAddIn.GetPrefShowPanel();
            installedVersion.Label = Globals.ThisAddIn.getInstalledAddinVersion();
        }

        private void checkBoxShowPane_Click(object sender, RibbonControlEventArgs e)
        {
        }

        private void buttonConnect_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.Connect();
        }

        private void buttonServer_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.SetupServerUrl();
        }

        private void buttonSettings_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.ShowSettingsForm();
        }

        private void buttonRefreshAll_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.RefreshAll();
        }

        //private void buttonRefreshAll_Click(object sender, RibbonControlEventArgs e)
        //{
        //    Globals.ThisAddIn.RefreshAll();
        //}

        private void buttonPublish_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.SaveDocumentToSyracuse();
        }

        private void buttonUpdate_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.ActionPanel.updateAddin();
        }

        private void buttonSave_Click(object sender, RibbonControlEventArgs e)
        {
            Excel.Workbook workbook = Globals.ThisAddIn.Application.ActiveWorkbook;
            if (workbook != null)
            {
                if (new TemplateActions(null).isExcelTemplate(workbook))
                    Globals.ThisAddIn.commons.Save(workbook);
                else
                    Globals.ThisAddIn.SaveDocumentToSyracuse();
            }
        }

        private void buttonSaveAs_Click(object sender, RibbonControlEventArgs e)
        {
            Excel.Workbook workbook = Globals.ThisAddIn.Application.ActiveWorkbook;
            if (workbook != null)
            {
                Globals.ThisAddIn.commons.SaveAs(workbook);
            } 
        }

        private void buttonRefreshReport_Click(object sender, RibbonControlEventArgs e)
        {
            Excel.Workbook workbook = Globals.ThisAddIn.Application.ActiveWorkbook;
            if (workbook != null)
            {
                if (new TemplateActions(null).isExcelTemplateType(workbook))
                    Globals.ThisAddIn.templateActions.RefreshExcelReport();
                else
                    Globals.ThisAddIn.RefreshAll();
            }
        }

        private void buttonPreview_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.templateActions.CreateExcelPreview();
        }

        private void checkBoxShowTemplatePane_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.showReportingFieldsTaskPane(checkBoxShowTemplatePane.Checked);
        }

        private void actionPanelCheckBox_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.ShowActionPanel(actionPanelCheckBox.Checked);
        }

        private void buttonCleanup_Click(object sender, RibbonControlEventArgs e)
        {
            Globals.ThisAddIn.templateActions.CleanupReportTemplateData();
        }
    }
}

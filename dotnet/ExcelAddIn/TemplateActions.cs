using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Excel = Microsoft.Office.Interop.Excel;
using Microsoft.Office.Tools.Ribbon;

namespace ExcelAddIn
{
    public class TemplateActions
    {
        public const string rpt_build_tpl = "rpt_build_tpl";
        public const string rpt_is_tpl = "rpt_is_tpl";
        public const string rpt_fill_tpl = "rpt_fill_tpl";
        public const string rpt_refresh_tpl = "rpt_refresh_tpl";

        private const String sageERPX3JsonTagName = "SyracuseOfficeCustomData";
        private const String sageERPX3JsonTagXPath = "//" + sageERPX3JsonTagName;
        public BrowserDialog browserDialog = null;

        public TemplateActions(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        public Boolean isExcelTemplate(Excel.Workbook workbook)
        {
            /*
             * Extract the custom data from the workbook...
             */
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData != null)
            {
                return customData.getCreateMode() != null;
            }
            return false;
        }

        public void showRibbonTemplate(Boolean show )
        {
            Globals.Ribbons.Ribbon.Tabs.Where(t => t.Name.Equals("syracuseTab")).First<RibbonTab>().Visible = false;
            Globals.Ribbons.Ribbon.Tabs.Where(t => t.Name.Equals("syracuseTemplateTab")).First<RibbonTab>().Visible = show;
            
            /*
             * If we're hiding the template ribbon, hide the reporting fields pane as well.
             */
            if (!show)
                Globals.ThisAddIn.showReportingFieldsTaskPane(false);
        }

        public void ConfigureTemplateRibbon(string mode, Boolean existing)
        {
            if ("rpt_build_tpl".Equals(mode))
            {
                Globals.Ribbons.Ribbon.buttonPreview.Enabled = true;
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = true;
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = false;
                Globals.ThisAddIn.showReportingFieldsTaskPane(Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked);

            }
            else if ("rpt_fill_tpl".Equals(mode))
            {
                Globals.Ribbons.Ribbon.buttonPreview.Enabled = false;
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = false;
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = true;
                Globals.ThisAddIn.showReportingFieldsTaskPane(false);
                Globals.Ribbons.Ribbon.buttonSave.Enabled = existing;
            }
            else if ("rpt_is_tpl".Equals(mode))
            {
                Globals.Ribbons.Ribbon.buttonPreview.Enabled = true;
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = true;
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = false;
                Globals.ThisAddIn.showReportingFieldsTaskPane(Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked);
                Globals.Ribbons.Ribbon.buttonSave.Enabled = true;
            }
        }

        public void ProcessExcelTemplate(Excel.Workbook workbook)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData != null) 
            {
                Globals.Ribbons.Ribbon.buttonPreview.Enabled = false;
                Globals.Ribbons.Ribbon.buttonSave.Enabled = false;
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = false;
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = false;
                Globals.Ribbons.Ribbon.buttonCleanup.Enabled = false;
                
                showRibbonTemplate(true);

                String mode = customData.getCreateMode();
                if ("rpt_build_tpl".Equals(mode))
                {
                    CreateNewExcelTemplate(customData);

                    Globals.Ribbons.Ribbon.buttonPreview.Enabled = true;
                    Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = true;
                }
                else if ("rpt_fill_tpl".Equals(mode))
                {
                    if (customData.isForceRefresh())
                    {
                        PopulateExcelTemplate(customData, true);
                    }
                }
                else if ("rpt_is_tpl".Equals(mode))
                {
                    /*
                     * We're modifying a template...
                     */
                    if (customData.isForceRefresh())
                    {
                        RefreshExcelTemplate(customData);
                    }

                    Globals.Ribbons.Ribbon.buttonPreview.Enabled = true;
                    Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = true;
                    Globals.Ribbons.Ribbon.buttonCleanup.Enabled = true;
                }

                if (rpt_fill_tpl.Equals(mode))
                {
                    Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = true;
                }
                else
                {
                    Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = false;
                }
            }
        }
        
        public void CreateNewExcelTemplate(SyracuseOfficeCustomData customData)
        {
            customData.setForceRefresh(false);
            customData.writeDictionaryToDocument();
            browserDialog.loadPage("/msoffice/lib/excel/ui/main.html?url=%3Frepresentation%3Dexceltemplatehome.%24dashboard", customData);
        }

        public void RefreshExcelTemplate(SyracuseOfficeCustomData customData)
        {
            customData.setForceRefresh(false);
            customData.writeDictionaryToDocument();
            browserDialog.loadPage("/msoffice/lib/excel/ui/main.html?url=%3Frepresentation%3Dexceltemplatehome.%24dashboard", customData);
        }

        public void RefreshExcelReport()
        {
            Excel.Workbook workbook = Globals.ThisAddIn.getActiveWorkbook();
            if (workbook == null)
            {
                return;
            }
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData == null)
            {
                return;
            }
            PopulateExcelTemplate(customData, false);
        }

        public void CreateExcelPreview()
        {
            Excel.Workbook workbook = Globals.ThisAddIn.getActiveWorkbook();
            if (workbook == null)
            {
                return;
            }
            
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData == null)
            {
                return;
            }

            String mode = customData.getCreateMode();
            if (rpt_is_tpl.Equals(mode) || rpt_build_tpl.Equals(mode))
            {
                if (workbook.Names.Count > 0)
                {
                    Excel.Workbook oldWb = workbook;
                    workbook = Globals.ThisAddIn.Application.Workbooks.Add();

                    foreach (Excel.Worksheet sheet in oldWb.Worksheets)
                    {
                        if (sheet.Name.Equals("Sage.X3.ReservedSheet"))
                        {
                            Excel.Worksheet newHiddenWorksheet = workbook.Worksheets[1];
                            sheet.Copy(newHiddenWorksheet);
                        }
                    }

                    /*
                     * Copy the workbook's names
                     */
                    foreach (Excel.Name name in oldWb.Names)
                    {
                        workbook.Names.Add(name.Name, name.RefersTo);
                    }

                    ConfigureTemplateRibbon(rpt_fill_tpl, false);

                    SyracuseOfficeCustomData customDataPreview = SyracuseOfficeCustomData.getFromDocument(workbook, true);
                    customDataPreview.setForceRefresh(false);
                    customDataPreview.setResourceUrl(customData.getResourceUrl());
                    customDataPreview.setServerUrl(customData.getServerUrl());
                    customDataPreview.writeDictionaryToDocument();
                    customDataPreview.setCreateMode(rpt_fill_tpl);

                    PopulateExcelTemplate(customDataPreview, false);
                }
            }
        }

        public void PopulateExcelTemplate(SyracuseOfficeCustomData customData, Boolean delUrl)
        {
            // Remove document URL, this has to be done because a template opened from collab. space has already an url stored inside the
            // document. But after the population of the template it is a new independent document!
            if (delUrl)
            {
                customData.setDocumentUrl("");
            }

            customData.setDocumentTitle("");
            customData.setForceRefresh(false);
            customData.writeDictionaryToDocument();
            browserDialog.loadPage("/msoffice/lib/excel/ui/main.html?url=%3Frepresentation%3Dexceltemplatehome.%24dashboard", customData);
        }
    }
}

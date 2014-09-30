using System;
using System.Linq;
using Excel = Microsoft.Office.Interop.Excel;
using System.Collections.Generic;

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

        public Boolean isExcelTemplateType(Excel.Workbook workbook)
        {
            /*
             * Extract the custom data from the workbook...
             */
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData != null)
            {
                return (customData.getCreateMode() != null && customData.getCreateMode() != "" && customData.getCreateMode() != "plain_doc");
            }
            return false;
        }

        public Boolean isExcelTemplate(Excel.Workbook workbook)
        {
            /*
             * Extract the customisExcelDetailFacetType data from the workbook...
             */
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData != null)
            {
                String mode = customData.getCreateMode();
                return mode != null && (mode.Equals("rpt_build_tpl") || mode.Equals("rpt_is_tpl"));
            }
            return false;
        }

        public Boolean isExcelDetailFacetType (Excel.Workbook workbook)
        {
            /*
             * Extract the custom data from the workbook...
             */
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData != null)
            {
                return customData.getResourceUrl() != null && customData.getResourceUrl().Contains(".$details") != false;
            }
            return false;
        }

        public Boolean isV6EmbeddedDocument(Excel.Workbook workbook)
        {
            /*
             * Extract the custom data from the workbook...
             */
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData != null)
            {
                String mode = customData.getCreateMode();
                return mode != null && mode.Equals("v6_doc_embedded");
            }
            return false;
        }

        public Boolean isV6Document(Excel.Workbook workbook)
        {
            /*
             * Extract the custom data from the workbook...
             */
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData != null)
            {
                String mode = customData.getCreateMode();
                return mode != null && mode.Equals("v6_doc");
            }
            return false;
        }

        public void ConfigureTemplateRibbon(Excel.Workbook workbook, string mode, Boolean existing)
        {
            Globals.Ribbons.Ribbon.installedVersion.Label = Globals.ThisAddIn.getInstalledAddinVersion();
            if ("rpt_build_tpl".Equals(mode))
            {
                Globals.Ribbons.Ribbon.actionPanelCheckBox.Enabled = false;
                Globals.Ribbons.Ribbon.dropDownInsert.Enabled = false;
                Globals.Ribbons.Ribbon.dropDownDelete.Enabled = false;
                Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;
                Globals.ThisAddIn.ShowActionPanel(false);

                Globals.Ribbons.Ribbon.buttonPreview.Enabled = true;
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = true;
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = false;
                Globals.Ribbons.Ribbon.galleryPublishAs.Enabled = true;
                Globals.ThisAddIn.showReportingFieldsTaskPane(Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked);
            }
            else if ("rpt_fill_tpl".Equals(mode))
            {
                Globals.Ribbons.Ribbon.buttonPreview.Enabled = false;
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = false;
                Globals.ThisAddIn.showReportingFieldsTaskPane(false);
                Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;

                Boolean isDetailFacetType = isExcelDetailFacetType(workbook);
                Globals.Ribbons.Ribbon.actionPanelCheckBox.Enabled = isDetailFacetType == false;
                Globals.Ribbons.Ribbon.dropDownInsert.Enabled = isDetailFacetType == false;
                Globals.Ribbons.Ribbon.dropDownDelete.Enabled = isDetailFacetType == false;
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = true;
                Globals.Ribbons.Ribbon.galleryPublishAs.Enabled = true;
            }
            else if ("rpt_is_tpl".Equals(mode))
            {
                Globals.Ribbons.Ribbon.actionPanelCheckBox.Enabled = false;
                Globals.Ribbons.Ribbon.dropDownInsert.Enabled = false;
                Globals.Ribbons.Ribbon.dropDownDelete.Enabled = false;
                Globals.ThisAddIn.ShowActionPanel(false);
                Globals.Ribbons.Ribbon.buttonPublish.Enabled = false; 

                Globals.Ribbons.Ribbon.buttonPreview.Enabled = true;
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = true;
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = false;
                Globals.ThisAddIn.showReportingFieldsTaskPane(Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked);
                Globals.Ribbons.Ribbon.galleryPublishAs.Enabled = true;
            }
            else if ("v6_doc".Equals(mode))
            {
                Globals.Ribbons.Ribbon.buttonPublish.Enabled = true;
                Globals.Ribbons.Ribbon.galleryPublishAs.Enabled = true;
            }
        }

        public void DisableTemplateButtons()
        {
            Globals.Ribbons.Ribbon.buttonPreview.Enabled = false;
            Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = false;
            Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;
            Globals.ThisAddIn.showReportingFieldsTaskPane(Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked);
        }

        public void ProcessExcelTemplate(Excel.Workbook workbook)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(workbook);
            if (customData != null) 
            {
                Globals.Ribbons.Ribbon.buttonPreview.Enabled = false;
                Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;
                Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = false;
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = false;
                Globals.Ribbons.Ribbon.buttonCleanup.Enabled = false;
                
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

                    Globals.ThisAddIn.Application.ActiveWorkbook.Saved = true;

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

            Globals.ThisAddIn.Application.ScreenUpdating = false;

            String mode = customData.getCreateMode();
            if (rpt_is_tpl.Equals(mode) || rpt_build_tpl.Equals(mode))
            {
                if (workbook.Names.Count > 0)
                {
                    Excel.Workbook oldWb = workbook;
                    workbook = Globals.ThisAddIn.Application.Workbooks.Add();

                    /*
                     * Create a list of worksheets in the template worksheet.
                     */
                    List<Excel.Worksheet> worksheetList = new List<Excel.Worksheet>();
                    foreach (Excel.Worksheet sheet in oldWb.Worksheets)
                    {
                        if (sheet.Name.Equals("Sage.X3.ReservedSheet"))
                        {
                            Excel.Worksheet reservedSheet = workbook.Worksheets[1];
                            /*
                             * Copy the reserved sheet into the new workbook.
                             */
                            sheet.Copy(reservedSheet);
                        }
                        else
                        {
                            worksheetList.Add(sheet);
                        }
                    }
                    
                    /*
                     * Remove the worksheets from the new workbook, keeping the reserved sheet.
                     * At least one sheet must be visible, so make the reserved sheeet visible.
                     */
                    foreach (Excel.Worksheet sheet in workbook.Worksheets)
                    {
                        if (sheet.Name.Equals("Sage.X3.ReservedSheet"))
                        {
                            sheet.Visible = Excel.XlSheetVisibility.xlSheetVisible;
                        }
                        else
                        {
                            sheet.Application.DisplayAlerts = false;
                            sheet.Delete();
                        }
                    }

                    /*
                     * Now copy the list of worksheets after the reserved sheet.
                     */
                    foreach (Excel.Worksheet sheet in worksheetList.OrderByDescending(s => s.Name))
                    {
                        sheet.Copy(Type.Missing, workbook.Worksheets["Sage.X3.ReservedSheet"]);
                        sheet.Application.DisplayAlerts = true;
                    }

                    workbook.Worksheets[worksheetList.ElementAt(0).Name].Select();
                    workbook.Worksheets["Sage.X3.ReservedSheet"].Visible = Excel.XlSheetVisibility.xlSheetHidden;

                    /*
                     * Copy the workbook's names
                     */
                    foreach (Excel.Name name in oldWb.Names)
                    {
                        workbook.Names.Add(name.Name, name.RefersTo);
                    }

                    SyracuseOfficeCustomData customDataPreview = SyracuseOfficeCustomData.getFromDocument(workbook, true);
                    customDataPreview.setForceRefresh(false);
                    customDataPreview.setResourceUrl(customData.getResourceUrl());
                    customDataPreview.setServerUrl(customData.getServerUrl());
                    customDataPreview.writeDictionaryToDocument();
                    customDataPreview.setCreateMode(rpt_fill_tpl);

                    ConfigureTemplateRibbon(workbook, rpt_fill_tpl, false);

                    PopulateExcelTemplate(customDataPreview, false);
                }
            }
            Globals.ThisAddIn.Application.ScreenUpdating = true;
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

        public void CleanupReportTemplateData()
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

            customData.setServerUrl("");
            customData.setDocumentUrl("");
            customData.writeDictionaryToDocument();

            Globals.Ribbons.Ribbon.buttonPreview.Enabled = false;
            Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;
        }
    }
}

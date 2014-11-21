﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using Microsoft.Office.Interop.Word;
using System.Windows.Forms;
using System.Text.RegularExpressions;
using CommonDataHelper;

namespace WordAddIn
{
    public class ReportingActions
    {
        public const string rpt_build_tpl   = "rpt_build_tpl";
        public const string rpt_is_tpl      = "rpt_is_tpl";
        public const string rpt_fill_tpl    = "rpt_fill_tpl";
        public const string rpt_refresh_tpl = "rpt_refresh_tpl";

        public BrowserDialog browserDialog = null;

        public ReportingActions(BrowserDialog browserDialog)
        {
            this.browserDialog = browserDialog;
        }

        public static Boolean isReportingDocument(Document doc)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData != null)
            {
                String mode = customData.getCreateMode();
                if (rpt_build_tpl.Equals(mode) || rpt_fill_tpl.Equals(mode) || rpt_is_tpl.Equals(mode))
                {
                    return true;
                }
            }
            return false;
        }

        public void ActivationsForReportTemplate()
        {
            Globals.Ribbons.Ribbon.RibbonUI.ActivateTabMso("TabAddIns");
            Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = true;
            Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked = true;
            Globals.WordAddIn.showReportingFieldsTaskPane(Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked);
        }
        public void ActiveDocumentChanged(Document doc)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData != null) // Document generated by X3 and supplied with additional data
            {
                BaseUrlHelper.CustomData = customData;
                if (string.IsNullOrEmpty(customData.getCookie()) == false)
                {
                    CookieHelper.setCookies(customData.getCookie());
                    if (CookieHelper.CookieContainer.Count != 0)
                    {
                        new ConnectionDialog().connectToServer();
                    }
                }

                String mode = customData.getCreateMode();
                if (rpt_build_tpl.Equals(mode))
                {
                    if (customData.isForceRefresh())
                    {
                        CreateWordReportTemplate(doc, customData);
                        ActivationsForReportTemplate();
                    }
                    Globals.Ribbons.Ribbon.buttonPreview.Enabled = true;
                    Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = true;
                    new CommonUtils(browserDialog).SetDocumentLanguageID(doc);
                }
                else if (rpt_fill_tpl.Equals(mode))
                {
                    if (customData.isForceRefresh())
                    {
                        PopulateWordReportTemplate(doc, customData, true);
                        Globals.Ribbons.Ribbon.RibbonUI.ActivateTabMso("TabAddIns");
                    }
                }
                else if (rpt_is_tpl.Equals(mode))
                {
                    if (customData.isForceRefresh())
                    {
                        RefreshWordReportTemplate(doc, customData);
                        ActivationsForReportTemplate();
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

        public void CreateWordReportTemplate(Document doc, SyracuseOfficeCustomData customData)
        {
            customData.setForceRefresh(false);
            customData.writeDictionaryToDocument();
            browserDialog.loadPage("msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard", customData);
        }

        public void RefreshWordReportTemplate(Document doc, SyracuseOfficeCustomData customData)
        {
            customData.setForceRefresh(false);
            customData.writeDictionaryToDocument();
            browserDialog.loadPage("msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard", customData);
        }

        public void PopulateWordReportTemplate(Document doc, SyracuseOfficeCustomData customData, Boolean delUrl)
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
            browserDialog.loadPage("msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard", customData);
        }

        public void RefreshReport()
        {
            Document doc = Globals.WordAddIn.getActiveDocument();
            if (doc == null)
            {
                return;
            }
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }
            PopulateWordReportTemplate(doc, customData, false);
        }

        public void CreateWordReportPreview()
        {
            Document doc = Globals.WordAddIn.getActiveDocument();
            if (doc == null)
            {
                return;
            }
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }
            String mode = customData.getCreateMode();
            if (!rpt_is_tpl.Equals(mode))
            {
                return;
            }

            doc.Range().Copy();
            doc = Globals.WordAddIn.Application.Documents.Add();
            doc.Range().Paste();
            
            SyracuseOfficeCustomData customDataPreview = SyracuseOfficeCustomData.getFromDocument(doc, true);
            customDataPreview.setForceRefresh(false);
            customDataPreview.setResourceUrl(customData.getResourceUrl());
            customDataPreview.setServerUrl(customData.getServerUrl());
            customDataPreview.writeDictionaryToDocument();
            customDataPreview.setCreateMode(rpt_fill_tpl);

            PopulateWordReportTemplate(doc, customDataPreview, false);
        }

        public void CheckForContentControl(Selection Sel)
        {
            Globals.Ribbons.Ribbon.toggleMakeSum.Checked = false;
            Globals.Ribbons.Ribbon.toggleMakeSum.Enabled = false;
            Range r = Sel.Range;
            r.Collapse(WdCollapseDirection.wdCollapseEnd);
            ContentControl cc = r.ParentContentControl;
            if (cc == null)
            {
                return;
            }
            ReportingFieldTypes rft = ReportingFieldUtil.getType(cc.Title);
            if (rft != ReportingFieldTypes.DECIMAL && rft != ReportingFieldTypes.INTEGER)
            {
                return;
            }
            if (cc.Tag.IndexOf(".") < 0)
            {
                return;
            }
            Globals.Ribbons.Ribbon.toggleMakeSum.Enabled = true;
            Match m = ReportingUtils.sumRegex.Match(cc.Tag);
            if (m.Success)
            {
                Globals.Ribbons.Ribbon.toggleMakeSum.Checked = true;
            }
            else
            {
                Globals.Ribbons.Ribbon.toggleMakeSum.Checked = false;
            }
        }

        public void ToggleMakeSum(Document doc)
        {
            Range r = Globals.WordAddIn.Application.Selection.Range;
            r.Collapse(WdCollapseDirection.wdCollapseEnd);
            ContentControl cc = r.ParentContentControl;
            if (cc == null)
            {
                return;
            }
            Match m = ReportingUtils.sumRegex.Match(cc.Tag);
            if (m.Success)
            {
                cc.Tag = m.Groups["exp"].Value;
                Globals.Ribbons.Ribbon.toggleMakeSum.Checked = false;
            }
            else
            {
                if (cc.Tag.IndexOf(".") < 0)
                {
                    return;
                }
                cc.Tag = "$sum(" + cc.Tag + ")";
                Globals.Ribbons.Ribbon.toggleMakeSum.Checked = true;
            }
        }

        public void CleanupReportTemplateData()
        {
            Document doc = Globals.WordAddIn.getActiveDocument();
            if (doc == null)
            {
                return;
            }
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
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

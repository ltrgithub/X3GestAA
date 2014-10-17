using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml.Linq;
using Microsoft.Office.Interop.Word;
using Office = Microsoft.Office.Core;
using System.Windows.Forms;
using Microsoft.Win32;
using CommonDataHelper;

namespace WordAddIn
{
    public partial class WordAddIn
    {
        private BrowserDialog browserDialog = null;

        public ReportingActions reporting = null;
        public MailMergeActions mailmerge = null;
        public CommonUtils commons = null;
        public Boolean newVersionMessage = false;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            browserDialog = new BrowserDialog();

            reporting = new ReportingActions(browserDialog);
            mailmerge = new MailMergeActions(browserDialog);
            commons = new CommonUtils(browserDialog);

            this.Application.DocumentChange += new ApplicationEvents4_DocumentChangeEventHandler(on_document_changed);
            this.Application.WindowActivate += new ApplicationEvents4_WindowActivateEventHandler(on_window_activate);
            this.Application.WindowDeactivate += new ApplicationEvents4_WindowDeactivateEventHandler(on_window_deactivate);
            this.Application.WindowSelectionChange += new ApplicationEvents4_WindowSelectionChangeEventHandler(on_window_selection_changed);
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {

        }

        public void on_window_activate(Document doc, Window win)
        {
            addReportingFieldsTaskPane(win);
            
        }

        public void on_window_deactivate(Document doc, Window win)
        {
        }

        // Called when ever a document is opend by word or one is activated
        public void on_document_changed()
        {
            Globals.Ribbons.Ribbon.buttonPreview.Enabled = false;
            Globals.Ribbons.Ribbon.buttonPublish.Enabled = false;
            Globals.Ribbons.Ribbon.buttonRefreshReport.Enabled = false;
            Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Enabled = false;
            Globals.Ribbons.Ribbon.buttonCleanup.Enabled = false;

            Document doc = getActiveDocument();
            if (doc == null)
            {
                Globals.Ribbons.Ribbon.galleryPublishAs.Enabled = false;
                return;
            }

            // Enable save buttons as soon as there is a document
            // It is ok to save ANY kind of document also as template, because
            // the template can be modified later
            Globals.Ribbons.Ribbon.galleryPublishAs.Enabled = true;
            if (MailMergeActions.isMailMergeDocument(doc))
            {
                mailmerge.ActiveDocumentChanged(doc);
            }
            else if (ReportingActions.isReportingDocument(Application.ActiveDocument))
            {
                reporting.ActiveDocumentChanged(doc);
            }

            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData != null)
            {
                BaseUrlHelper.CustomData = customData;

                String mode = customData.getCreateMode();
                if ("v6_doc_embedded".Equals(mode))
                {
                    commons.ExtractV6Document(doc, customData);
                }
   
                if (!string.IsNullOrEmpty(customData.getDocumentUrl()))
                {
                    Globals.Ribbons.Ribbon.buttonPublish.Enabled = true;
                }
            }
            commons.SetSupportedLocales(customData);
            commons.DisplayDocumentLocale(doc);
            commons.DisplayServerLocations();
        }

        void on_window_selection_changed(Selection Sel)
        {
            Document doc = getActiveDocument();
            if (doc == null)
            {
                Globals.Ribbons.Ribbon.toggleMakeSum.Checked = false;
                Globals.Ribbons.Ribbon.toggleMakeSum.Enabled = false;
                return;
            }
            reporting.CheckForContentControl(Sel);
        }

        private void ReportingFieldsPane_VisibleChanged(object sender, EventArgs e)
        {
            Microsoft.Office.Tools.CustomTaskPane taskPane = sender as Microsoft.Office.Tools.CustomTaskPane;
            if (taskPane != null)
            {
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked = taskPane.Visible;
            }
            else
            {
                Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked = false;
            }
        }

        public void refreshReportingFieldsTaskPane(Window win)
        {
            Microsoft.Office.Tools.CustomTaskPane pane = addReportingFieldsTaskPane(win);
            if (pane != null)
            {
                ReportingTemplatePane t = (ReportingTemplatePane)pane.Control;
                t.showFields(win.Document);
            }
        }

        private Microsoft.Office.Tools.CustomTaskPane addReportingFieldsTaskPane(Window win)
        {
            try
            {
                foreach (Microsoft.Office.Tools.CustomTaskPane pane in CustomTaskPanes)
                {
                    if (pane.Control is ReportingTemplatePane && pane.Window == win)
                        return pane;
                }
            }
            catch (Exception) { }

            Microsoft.Office.Tools.CustomTaskPane p;
            p = CustomTaskPanes.Add(new ReportingTemplatePane(), "Template fields", win);
            p.VisibleChanged += ReportingFieldsPane_VisibleChanged;
            return p;
        }

   
        public void showReportingFieldsTaskPane(bool visible)
        {
            Document adoc = getActiveDocument();
            Microsoft.Office.Tools.CustomTaskPane pane = addReportingFieldsTaskPane(Application.ActiveWindow);
            pane.Visible = visible;
            ReportingTemplatePane t = (ReportingTemplatePane)pane.Control;
            t.showFields(adoc);
        }

        public Document getActiveDocument()
        {
            if (this.Application == null)
                return null;

            if (this.Application.Documents.Count <= 0)
                return null;
            return Application.ActiveDocument;
        }

        #region Von VSTO generierter Code

        /// <summary>
        /// Erforderliche Methode für die Designerunterstützung.
        /// Der Inhalt der Methode darf nicht mit dem Code-Editor geändert werden.
        /// </summary>
        private void InternalStartup()
        {
            this.Startup += new System.EventHandler(ThisAddIn_Startup);
            this.Shutdown += new System.EventHandler(ThisAddIn_Shutdown);
        }
        
        #endregion
    }
}

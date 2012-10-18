using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Xml.Linq;
using Microsoft.Office.Interop.Word;
using Office = Microsoft.Office.Core;
//using Microsoft.Office.Tools.Word;
using System.Windows.Forms;

namespace WordAddIn
{
    public partial class WordAddIn
    {
        public SyracuseTemplatePane templatePane;
        public Microsoft.Office.Tools.CustomTaskPane customTemplatePane;

        private BrowserDialog browserDialog = null;

        public ReportingActions reporting = null;
        public MailMergeActions mailmerge = null;
        public CommonUtils commons = null;

        private void ThisAddIn_Startup(object sender, System.EventArgs e)
        {
            browserDialog = new BrowserDialog();

            reporting = new ReportingActions(browserDialog);
            mailmerge = new MailMergeActions(browserDialog);
            commons = new CommonUtils(browserDialog);

            this.templatePane = new SyracuseTemplatePane();
            this.customTemplatePane = this.CustomTaskPanes.Add(templatePane, "Template fields");
            this.customTemplatePane.VisibleChanged += SyracuseTemplatePane_VisibleChanged;

            this.Application.DocumentChange += new ApplicationEvents4_DocumentChangeEventHandler(on_document_changed);
        }

        private void ThisAddIn_Shutdown(object sender, System.EventArgs e)
        {

        }

        // Called when ever a document is opend by word or one is activated
        public void on_document_changed()
        {
            if (this.Application == null)
                return;

            if (this.Application.Documents.Count <= 0)
                return;

            Document doc = Application.ActiveDocument;
            if (MailMergeActions.isMailMergeDocument(doc))
            {
                mailmerge.ActiveDocumentChanged(doc);
            }
            else if (ReportingActions.isReportingDocument(Application.ActiveDocument))
            {
                reporting.ActiveDocumentChanged(doc);
            }

            // Always refresh on doc change, pane will be empty in worst case
            reporting.RefreshTemplatePane(doc, templatePane);
        }

        private void SyracuseTemplatePane_VisibleChanged(object sender, EventArgs e)
        {
            Microsoft.Office.Tools.CustomTaskPane taskPane = sender as Microsoft.Office.Tools.CustomTaskPane;
            if (taskPane != null)
            {
                if (taskPane.Visible)
                {
                    Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked = true;
                }
                else
                {
                    Globals.Ribbons.Ribbon.checkBoxShowTemplatePane.Checked = false;
                }
            }
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

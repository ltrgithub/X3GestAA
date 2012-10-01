using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Word = Microsoft.Office.Interop.Word;
using Office = Microsoft.Office.Core;
using Microsoft.Office.Tools.Word;

namespace WordAddIn
{
    public partial class BrowserDialog : Form
    {
        public string serverUrl;
        private Boolean hideOnCompletion = false;

        public BrowserDialog()
        {
            InitializeComponent();

            webBrowser.DocumentCompleted += new WebBrowserDocumentCompletedEventHandler(webBrowser_DocumentCompleted);

        }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                Hide();
            }
            base.OnFormClosing(e);
        }

        private void webBrowser_DocumentCompleted(object sender, WebBrowserDocumentCompletedEventArgs e)
        {
            if (hideOnCompletion == true)
            {
//                this.Hide();
            }
            hideOnCompletion = false;
        }

        public void Connect(String serverUrl)
        {
            this.webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard");
            this.serverUrl = serverUrl;
        }

        public void CreateMailMergeDocument(Word.Document doc)
        {
            Uri uri = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard&attachDatasource=true");

            this.Show();
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                // Create new custom data for document
                customData = SyracuseOfficeCustomData.getFromDocument(doc, true);
                customData.setCreateMode("1"); // New empty doc, add all mail merge fields
                uri = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dmailmergeds.%24dashboard&attachDatasource=true");
            }

            this.webBrowser.ObjectForScripting = new WordAddInJSExternal(customData, this);
            this.webBrowser.Url = uri;
        }

        public void CreateWordReportTemplate(Word.Document doc)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }
            Uri uri = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard");

            this.Show();
            this.webBrowser.ObjectForScripting = new WordAddInJSExternal(customData, this);
            this.webBrowser.Url = uri;
        }

        public void PopulateWordReportTemplate(Word.Document doc)
        {
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                return;
            }
            Uri uri = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard");

            this.Show();
            this.webBrowser.ObjectForScripting = new WordAddInJSExternal(customData, this);
            this.webBrowser.Url = uri;
        }

        public void SaveDocumentToX3(Word.Document doc)
        {
            Uri uri = new Uri(serverUrl +"/msoffice/lib/word/ui/save.html?url=%3Frepresentation%3Dwordsave.%24dashboard");

            this.Show();
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                customData = SyracuseOfficeCustomData.getFromDocument(doc, true);
                customData.setCreateMode("3");
                customData.setForceRefresh(false); 
            }
            this.webBrowser.ObjectForScripting = new WordAddInJSExternal(customData, this);
            this.webBrowser.Url = uri;
        }
    }
}

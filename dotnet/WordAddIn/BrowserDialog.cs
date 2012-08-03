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

        private void webBrowser_DocumentCompleted(object sender, WebBrowserDocumentCompletedEventArgs e)
        {
            if (hideOnCompletion == true)
            {
                this.Hide();
            }
            hideOnCompletion = false;
        }

        public void connect(String serverUrl)
        {
            hideOnCompletion = true;
            this.webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard");
            this.serverUrl = serverUrl;
            hideOnCompletion = false;
        }

        public void createMailMergeDocument(Word.Document doc)
        {
            Uri uri = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard");

            this.Show();
            SyracuseOfficeCustomData customData = SyracuseOfficeCustomData.getFromDocument(doc);
            if (customData == null)
            {
                // Create new custom data for document
                customData = SyracuseOfficeCustomData.getFromDocument(doc, true);
                customData.setCreateMode("1"); // New empty doc, add all mail merge fields
                uri = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dmailmergeds.%24dashboard");
            }

            this.webBrowser.ObjectForScripting = new WordAddInJSExternal(customData, this);
            this.webBrowser.Url = uri;
        }
    }
}

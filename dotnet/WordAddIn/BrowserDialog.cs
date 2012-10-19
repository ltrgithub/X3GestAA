using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using Microsoft.Office.Interop.Word;
using Microsoft.Office.Tools.Word;

namespace WordAddIn
{
    public partial class BrowserDialog : Form
    {
        public string serverUrl = "";
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

        public bool connectToServer(SyracuseOfficeCustomData customData)
        {
            return connectToServer(customData.getServerUrl());
        }
        
        private bool connectToServer(String serverUrl)
        {
            if (!this.serverUrl.Equals(serverUrl)) 
            {
                this.webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard");
                this.serverUrl = serverUrl;
            }
            return true;
        }

        public void loadPage(String urlPart, SyracuseOfficeCustomData customData)
        {
            WordAddInJSExternal external = new WordAddInJSExternal(customData, this);
            loadPage(urlPart, external);
        }

        public void loadPage(String urlPart, WordAddInJSExternal scriptingObj)
        {
            try
            {
                if (!connectToServer(scriptingObj.getSyracuseOfficeCustomData().getServerUrl()))
                    return;

                Uri uri = new Uri(serverUrl + urlPart);
                this.Show();
                this.webBrowser.ObjectForScripting = scriptingObj;
                this.webBrowser.Url = uri;
            }
            catch (Exception e)
            {
                MessageBox.Show(e.Message + "\n" + e.StackTrace);
            }
        }

        /*
        public void CreateMailMergeDocument(Document doc)
        {
            Uri uri = new Uri(serverUrl + "/msoffice/lib/word/ui/main.html?url=%3Frepresentation%3Dwordhome.%24dashboard");

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

        public void SaveTemplateToX3(Word.Document doc)
        {
            Uri uri = new Uri(serverUrl + "/msoffice/lib/word/ui/save.html?url=%3Frepresentation%3Dwordsave.%24dashboard");

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
        */

        public byte[] readBinaryURLContent(String url)
        {
            try
            {
                Object ret = this.webBrowser.Document.InvokeScript("readBinaryURLContentIE", new object[] { url });
                byte[] bytes = (byte[]) ret;
                return bytes;
            }
            catch (Exception e) { MessageBox.Show(e.Message + "\n" + e.StackTrace);  };
            return null;
        }
    }
}

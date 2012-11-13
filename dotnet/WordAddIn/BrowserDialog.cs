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
            if (serverUrl == null || "".Equals(serverUrl))
            {
                ServerSettings settings = new ServerSettings(serverUrl);
                if (settings.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                {
                    serverUrl = settings.getServerUrl();
                }
            }
            if (serverUrl == null || "".Equals(serverUrl))
                return false;
            customData.setServerUrl(serverUrl);
            return connectToServer(serverUrl);
        }
        
        private bool connectToServer(String serverUrl)
        {
            this.Text = serverUrl;
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
                if (!connectToServer(scriptingObj.getSyracuseOfficeCustomData()))
                    return;

                Uri uri = new Uri(serverUrl + urlPart);
                this.Show();
                this.webBrowser.ObjectForScripting = scriptingObj;
                this.webBrowser.Url = uri;
            }
            catch (Exception e) { MessageBox.Show(e.Message + "\n" + e.StackTrace);          }
        }
        public string getServerUrl()
        {
            return serverUrl;
        }
        public byte[] readBinaryURLContent(String url)
        {
            try
            {
                Object ret = this.webBrowser.Document.InvokeScript("readBinaryURLContentIE", new object[] { url });
                byte[] bytes = (byte[]) ret;
                return bytes;
            }
            catch (Exception) { };
            return null;
        }
    }
}

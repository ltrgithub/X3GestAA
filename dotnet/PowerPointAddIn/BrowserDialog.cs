using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace PowerPointAddIn
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

        public bool connectToServer(PptCustomData customData)
        {
            string serverUrl = customData.getServerUrl();
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
                this.TopLevel = true;
                this.webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/ppt/ui/main.html?url=%3Frepresentation%3Dppthome.%24dashboard");
                this.serverUrl = serverUrl;
            }
            return true;
        }

        public void loadPage(String urlPart, PptCustomData customData, PptCustomXlsData customXlsData = null)
        {
            PptAddInJSExternal external = new PptAddInJSExternal(customData, customXlsData, this);
            loadPage(urlPart, external);
        }

        public void loadPage(String urlPart, PptAddInJSExternal scriptingObj)
        {
            try
            {
                if (!connectToServer(scriptingObj.getPptCustomData()))
                    return;

                Uri uri = new Uri(serverUrl + urlPart);
                this.Show();
                this.webBrowser.ObjectForScripting = scriptingObj;
                this.TopLevel = true;
                this.webBrowser.Url = uri;
            }
            catch (Exception e) { MessageBox.Show(e.Message + "\n" + e.StackTrace); }
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

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
                //this.Hide();
            }
            hideOnCompletion = false;

            try
            {
                HtmlDocument doc = ((WebBrowser)sender).Document;
                String title = doc.GetElementsByTagName("title")[0].InnerText;

                /*
                 * Under certain circumstances, the document title is different from that contained in the document text.
                 * We therefore need to test for both if the title is not equal to Syracuse.
                 */
                if (!(title != null && (title.Equals("Syracuse") || ((WebBrowser)sender).DocumentText.Contains("<title>Syracuse</title>"))))
                {
                    this.Hide();
                    CommonUtils.ShowInfoMessage(global::PowerPointAddIn.Properties.Resources.MSG_INVALID_SERVER_URL, global::PowerPointAddIn.Properties.Resources.MSG_INVALID_SERVER_URL_TITLE);
                }
            }
            catch (Exception) { }
        }

        public bool connectToServer(PptCustomData customData, string extraServerUrl = null)
        {
            string serverUrl = extraServerUrl;
            if (String.IsNullOrEmpty(serverUrl))
            {
                serverUrl = customData.getServerUrl();
                if (String.IsNullOrEmpty(serverUrl))
                {
                    serverUrl = getServerUrl();
                    if (String.IsNullOrEmpty(serverUrl))
                    {
                        ServerSettings settings = new ServerSettings(serverUrl);
                        if (settings.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                        {
                            serverUrl = settings.getServerUrl();
                            if (String.IsNullOrEmpty(serverUrl))
                                return false;
                        }
                    }
                }
            }
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

        public void loadPage(String urlPart, PptCustomData customData, PptCustomXlsData customXlsData = null, string serverUrl = null)
        {
            PptAddInJSExternal external = new PptAddInJSExternal(customData, customXlsData, this);
            loadPage(urlPart, external, serverUrl);
        }

        public void loadPage(String urlPart, PptAddInJSExternal scriptingObj, string extraServerUrl = null)
        {
            try
            {
                if (!connectToServer(scriptingObj.getPptCustomData(), extraServerUrl))
                    return;

                Uri uri = new Uri(serverUrl + urlPart);
                this.Show();
                this.webBrowser.ObjectForScripting = scriptingObj;
              
                this.TopLevel = true;
                this.webBrowser.Url = uri;
            }
            catch (Exception e) { MessageBox.Show(e.Message + "\n" + e.StackTrace); }
        }
        public PptAddInJSExternal getExternal()
        {
            return (PptAddInJSExternal) webBrowser.ObjectForScripting;
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

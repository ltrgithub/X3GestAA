using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Windows.Forms;
using CommonDialogs;
using CommonDataHelper;

namespace PowerPointAddIn
{
    public partial class BrowserDialog : Form
    {
        public string serverUrl = "";
        bool? _useOldPathAndQuery;

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
            if (_useOldPathAndQuery == null && ((WebBrowser)sender).DocumentTitle.Equals("Sage Office") == false && string.IsNullOrEmpty(_oldUrlPart) == false)
            {
                _useOldPathAndQuery = true;
                webBrowser.Url = new Uri(BaseUrlHelper.BaseUrl, _oldUrlPart);
            }
        }

        public bool connectToServer(SyracuseOfficeCustomData customData, string extraServerUrl = null)
        {
            string serverUrl = extraServerUrl;
            if (String.IsNullOrEmpty(serverUrl))
            {
                serverUrl = customData.getServerUrl();
                if (String.IsNullOrEmpty(serverUrl))
                {
                    serverUrl = BaseUrlHelper.BaseUrl.ToString();
                    if (String.IsNullOrEmpty(serverUrl))
                    {
                        return false;
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
                new CommonDataHelper.ConnectionDialog().connectToServer();
                this.serverUrl = serverUrl;
            }
            return true;
        }

        public void loadPage(String urlPart, SyracuseOfficeCustomData customData, PptCustomXlsData customXlsData = null, string serverUrl = null)
        {
            PptAddInJSExternal external = new PptAddInJSExternal(customData, customXlsData, this);
            loadPage(urlPart, external, serverUrl);
        }

        String _oldUrlPart;
        public void loadPage(String urlPart, String oldUrlPart, SyracuseOfficeCustomData customData, PptCustomXlsData customXlsData = null, string serverUrl = null)
        {
            _oldUrlPart = oldUrlPart;
            PptAddInJSExternal external = new PptAddInJSExternal(customData, customXlsData, this);
            if (_useOldPathAndQuery == true)
            {
                loadPage(_oldUrlPart, external);
            }
            else
            {
                loadPage(urlPart, external);
            }
        }

        public void loadPage(String urlPart, String oldUrlPart, PptAddInJSExternal scriptingObj, string extraServerUrl = null)
        {
            _oldUrlPart = oldUrlPart;
            if (_useOldPathAndQuery == true)
            {
                loadPage(_oldUrlPart, scriptingObj);
            }
            else
            {
                loadPage(urlPart, scriptingObj);
            }
        }

        public void loadPage(String urlPart, PptAddInJSExternal scriptingObj, string extraServerUrl = null)
        {
            try
            {
                if (!connectToServer(scriptingObj.getPptCustomData(), extraServerUrl))
                    return;

                Uri uri = new Uri(new Uri(serverUrl), urlPart);
                this.Show();
                this.webBrowser.ObjectForScripting = scriptingObj;
              
                this.TopLevel = true;
                this.webBrowser.Url = uri;
                Globals.Ribbons.Ribbon.buttonDisconnect.Enabled = true;
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

    // The only one class/object to be referenced from javascript 'external'
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class PowerPointDownloadData
    {
        public byte[] data;
        public string errorText;
        public void setData(byte[] data)
        {
            this.data = data;
        }
        public void setErrorText(string errorText)
        {
            this.errorText = errorText;
        }
    }
}

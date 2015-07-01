using System;
using System.Windows.Forms;
using CommonDataHelper;

namespace ExcelAddIn
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

        public bool connectToServer(SyracuseOfficeCustomData customData)
        {
            new ConnectionDialog().connectToServer();

            string serverUrl = customData.getServerUrl();
            if (serverUrl != null)
            {
                BaseUrlHelper.BaseUrl = new Uri(serverUrl);
            }
            else
            {
                serverUrl = BaseUrlHelper.BaseUrl.ToString();
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
                this.webBrowser.Url = new Uri(new Uri(serverUrl), "/msoffice/lib/excel/html/main.html?url=%3Frepresentation%3Dexceltemplate.%24query");
                this.serverUrl = serverUrl;
            }
            return true;
        }

        public void loadPage(String urlPart, SyracuseOfficeCustomData customData)
        {
            ExcelAddInJSExternal external = new ExcelAddInJSExternal(customData, this);
            loadPage(urlPart, external);
        }

        String _oldUrlPart;
        public void loadPage(String urlPart, String oldUrlPart, SyracuseOfficeCustomData customData)
        {
            _oldUrlPart = oldUrlPart;
            ExcelAddInJSExternal external = new ExcelAddInJSExternal(customData, this);
            if (_useOldPathAndQuery == true)
            {
                loadPage(_oldUrlPart, external);
            }
            else
            {
                loadPage(urlPart, external);
            }
        }

        public void loadPage(String urlPart, String oldUrlPart, ExcelAddInJSExternal scriptingObj)
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

        public void loadPage(String urlPart, ExcelAddInJSExternal scriptingObj)
        {
            try
            {
                if (!connectToServer(scriptingObj.getSyracuseOfficeCustomData()))
                    return;

                Uri uri = new Uri(new Uri(serverUrl), urlPart);
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
            ExcelDownloadData data = new ExcelDownloadData();
            try
            {
                object ret = this.webBrowser.Document.InvokeScript("readBinaryURLContentIE", new object[] { url, data});
                byte[] bytes = data.data;

                if (bytes != null)
                {
                    return bytes;
                }
            } catch (Exception) { };
            string error = "?";
            if (data.errorText != null)
                error = data.errorText;

            if (error == "NOTFOUND")
                return null;

            MessageBox.Show(String.Format(global::ExcelAddIn.Properties.Resources.MSG_ERROR_DOWNLOAD, new object[] { error, url }),
                global::ExcelAddIn.Properties.Resources.MSG_ERROR_TITLE, MessageBoxButtons.OK, MessageBoxIcon.Error);

            return null;
        }
    }
    // The only one class/object to be referenced from javascript 'external'
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public class ExcelDownloadData
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

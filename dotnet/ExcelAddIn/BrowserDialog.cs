using System;
using System.Windows.Forms;
using CommonDataHelper;

namespace ExcelAddIn
{
    public partial class BrowserDialog : Form
    {
        public string serverUrl = "";

        public BrowserDialog()
        {
            InitializeComponent();
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

        public bool connectToServer(SyracuseOfficeCustomData customData)
        {
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
                this.webBrowser.Url = new Uri(serverUrl + "/msoffice/lib/excel/ui/main.html?url=%3Frepresentation%3Dexceltemplatehome.%24dashboard");
                this.serverUrl = serverUrl;
            }
            return true;
        }

        public void loadPage(String urlPart, SyracuseOfficeCustomData customData)
        {
            ExcelAddInJSExternal external = new ExcelAddInJSExternal(customData, this);
            loadPage(urlPart, external);
        }

        public void loadPage(String urlPart, ExcelAddInJSExternal scriptingObj)
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

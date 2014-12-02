using System;
using System.Windows.Forms;
using CommonDataHelper;

namespace ExcelAddIn
{
    public partial class DatasourceMngtForm : Form
    {
        public DatasourceMngtForm()
        {
            InitializeComponent();
        }

        public void Connect(String serverUrl)
        {
            if (!new ConnectionDialog().connectToServer())
            {
                CookieHelper.CookieContainer = null;
                Close();
                return;
            }

            webBrowser.Document.Cookie = CookieHelper.CookieContainer.GetCookieHeader(BaseUrlHelper.BaseUrl);

            webBrowser.ObjectForScripting = new External();
            ((External)webBrowser.ObjectForScripting).onLogonHandler = delegate()
            {
                if(!Globals.ThisAddIn.ActionPanel.connected)
                 Globals.ThisAddIn.ActionPanel.Connect("");
            };

            if (!serverUrl.EndsWith("/")) serverUrl += "/";
            webBrowser.Url = new Uri(serverUrl + "msoffice/lib/excel/html/config.html?url=%3Frepresentation%3Dexcelconfig.%24dashboard");
        }

        private void DatasourceMngtForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            Globals.ThisAddIn.SettingsFormDestroyed();
        }

        internal void RefreshBrowser()
        {
            webBrowser.Refresh();
        }

        private void DatasourceMngtForm_Load(object sender, EventArgs e)
        {

        }
    }
}

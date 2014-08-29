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

namespace CommonDataHelper
{
    public partial class ConnectionDialog : Form
    {
        public ConnectionDialog()
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

        public void connectToServer(Uri url)
        {
            Text = BaseUrlHelper.BaseUrl.ToString();

            webBrowser.Url = url;
            if (webBrowser.Document != null)
            {
                webBrowser.Document.Cookie = CookieHelper.CookieContainer.GetCookieHeader(BaseUrlHelper.BaseUrl);
            }

            /*
             * We need this to be synchronous...
             */
            while (webBrowser.ReadyState != WebBrowserReadyState.Complete)
                Application.DoEvents();

            CookieHelper.setCookies(webBrowser.Document.Cookie);
        }
    }
}

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

        public bool connectToServer()
        {
            Text = BaseUrlHelper.BaseUrl.ToString();

            Uri url = new Uri(BaseUrlHelper.BaseUrl, @"syracuse-main/html/main.html");

            webBrowser.Navigate(url, "", null, "If-None-Match: 0");
            if (webBrowser.Document != null)
            {
                webBrowser.Document.Cookie = CookieHelper.CookieContainer.GetCookieHeader(BaseUrlHelper.BaseUrl);
            }

            /*
             * We need this to be synchronous...
             */
            while (webBrowser.ReadyState != WebBrowserReadyState.Complete)
                Application.DoEvents();

            /*
             * In the absence of an http response code, we'll check against the document title.
             */
            if (string.IsNullOrEmpty(webBrowser.DocumentTitle) == false && (webBrowser.DocumentTitle.Equals("Syracuse") || webBrowser.DocumentTitle.Equals("Sage ERP X3")))
            {
                CookieHelper.setCookies(webBrowser.Document.Cookie);
                return true;
            }

            return false;
        }
    }
}

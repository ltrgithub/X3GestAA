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
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public partial class ConnectionDialog : Form
    {
        Boolean loggedIn = false;
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

            Show();
            loggedIn = false;
     
            webBrowser.ObjectForScripting = this;

            Uri url = new Uri(BaseUrlHelper.BaseUrl, @"syracuse-main/html/main_notify.html");

            webBrowser.Navigate(url, "", null, "If-None-Match: 0");
            if (webBrowser.Document != null)
            {
                webBrowser.Document.Cookie = CookieHelper.CookieContainer.GetCookieHeader(BaseUrlHelper.BaseUrl);
            }

            /*
             * We need this to be synchronous...
             */

            while (webBrowser.ReadyState != WebBrowserReadyState.Complete)
            {
                Application.DoEvents();
            }

            // e.g. if URL is wrong or server not available
            if (string.IsNullOrEmpty(webBrowser.DocumentTitle) == false && !webBrowser.DocumentTitle.Equals("Syracuse") && !webBrowser.DocumentTitle.Equals("Sage ERP X3"))
            {
                Hide();
                return false;
            }

            while (!loggedIn)
            {
                Application.DoEvents();
            }

            /*
             * In the absence of an http response code, we'll check against the document title.
             */
            if (string.IsNullOrEmpty(webBrowser.DocumentTitle) == false && (webBrowser.DocumentTitle.Equals("Syracuse") || webBrowser.DocumentTitle.Equals("Sage ERP X3")))
            {
                if (webBrowser.Document.Cookie != null)
                {
                    CookieHelper.setCookies(webBrowser.Document.Cookie);
                }
                return true;
            }

            return false;
        }

        public void onLoginOk()
        {
            loggedIn = true;
            Hide();
        }
    }
}

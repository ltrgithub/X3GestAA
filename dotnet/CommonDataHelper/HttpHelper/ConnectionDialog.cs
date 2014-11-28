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
using System.Runtime.InteropServices;
using System.Net;

namespace CommonDataHelper
{
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public partial class ConnectionDialog : Form
    {
        private Boolean _loggedIn = false;
        private Boolean _canceled = false;

        public ConnectionDialog()
        {
            InitializeComponent();
        }
        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (e.CloseReason == CloseReason.UserClosing)
            {
                e.Cancel = true;
                _canceled = true;
                Hide();
            }
            base.OnFormClosing(e);
        }

        public bool connectToServer()
        {
            _loggedIn = false;
            DateTime dummy = DateTime.Now;
            Text = BaseUrlHelper.BaseUrl.ToString();

            Uri url = new Uri(BaseUrlHelper.BaseUrl, @"syracuse-main/html/main.html?dummy=" + dummy.ToString());

            HttpStatusCode statusCode = HttpStatusCode.Unauthorized;
            HttpWebResponse response = null;
            Boolean rememberMeLogin = true;
            try
            {
                response = new WebHelper().getInitialConnectionJson(url.ToString(), out statusCode);

            }
            catch (WebException)
            {
                CookieHelper.CookieContainer = null;
                rememberMeLogin = false;
            }

            if (rememberMeLogin)
            {
                if (statusCode == HttpStatusCode.TemporaryRedirect)
                {
                    url = new Uri(BaseUrlHelper.BaseUrl, @"syracuse-main/html/main_notify.html?dummy=" + dummy.ToString());
                }
                else if (statusCode == HttpStatusCode.OK)
                {
                    CookieHelper.CookieContainer = new CookieContainer();

                    foreach (Cookie c in response.Cookies)
                    {
                        CookieHelper.CookieContainer.Add(c);
                    }
                    return true;
                }

                Show();
            }

            webBrowser.ObjectForScripting = this;

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

            // New Addins against old login
            if (!rememberMeLogin && string.IsNullOrEmpty(webBrowser.DocumentTitle) == false && (webBrowser.DocumentTitle.Equals("Syracuse") || webBrowser.DocumentTitle.Equals("Sage ERP X3")))
            {
                CookieHelper.setCookies(webBrowser.Document.Cookie);
                return true;
            }
            
            // e.g. if URL is wrong or server not available
            if (string.IsNullOrEmpty(webBrowser.DocumentTitle) == false && !webBrowser.DocumentTitle.Equals("Syracuse") && !webBrowser.DocumentTitle.Equals("Sage ERP X3"))
            {
                Hide();
                return false;
            }

            if (rememberMeLogin)
            {
                while (!_loggedIn)
                {
                    Application.DoEvents();
                    if (_canceled) return false;
                }

                CookieHelper.setCookies(new WebHelper().GetUriCookieContainer(url.ToString()).GetCookieHeader(url));
            }

            Hide();
            return true;
        }

        public void onLoginOk()
        {
            _loggedIn = true;
            Hide();
        }
    }
}

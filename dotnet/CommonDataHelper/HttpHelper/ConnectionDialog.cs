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
using System.Threading;

namespace CommonDataHelper
{
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public partial class ConnectionDialog : Form
    {
        private String _loginPart = @"/auth/login/page";
        private String _mainPart = @"/syracuse-main/html/main.html";
        private bool? _connected = null;
        private Boolean _canceled = false;

        public ConnectionDialog()
        {
            InitializeComponent();
        }
        
        private void documentCompleted(object sender, WebBrowserDocumentCompletedEventArgs e)
        {
            if (!e.Url.Equals(webBrowser.Url))
                return;

            if (webBrowser.ReadyState != WebBrowserReadyState.Complete)
                return;

            if (e.Url.LocalPath.Equals(_loginPart))
            {
                /*
                 * We've arrived at the new login page, so don't do anything.
                 */
                return;
            }

            if (e.Url.LocalPath.Equals(_mainPart))
            {
                HttpStatusCode statusCode = HttpStatusCode.InternalServerError;
                try
                {   
                    WebHelper webHelper = new WebHelper();
                    webHelper.getInitialConnectionJson(new Uri(BaseUrlHelper.BaseUrl, _mainPart).ToString(), out statusCode);
                    if (statusCode == HttpStatusCode.OK)
                    {
                        CookieHelper.CookieContainer = webHelper.GetUriCookieContainer();
                        _connected = true;
                        return;
                    }
                }
                catch (WebException ex)
                {
                    if (((HttpWebResponse)ex.Response).StatusCode == HttpStatusCode.Unauthorized)
                    {
                        _connected = false;
                        return;
                    }
                }

                return;
            }
        }

        public bool connectToServer()
        {
            WebHelper webHelper = new WebHelper();
            CookieHelper.CookieContainer = webHelper.GetUriCookieContainer();

            HttpStatusCode statusCode = HttpStatusCode.InternalServerError;
            HttpWebResponse response = null;

            Uri mainUrl = new Uri(BaseUrlHelper.BaseUrl, _mainPart);

            try
            {
                response = webHelper.getInitialConnectionJson(mainUrl.ToString(), out statusCode);
                if (statusCode == HttpStatusCode.TemporaryRedirect)
                {
                    if (String.IsNullOrEmpty(response.Headers["Location"]) == false && response.Headers["Location"].Equals(_loginPart))
                    {
                        /*
                         * We've been redirected to the new-style login page, so we have to display the page in the browser.
                         */
                        Show();

                        webBrowser.DocumentCompleted += new WebBrowserDocumentCompletedEventHandler(documentCompleted);

                        Uri loginUri = new Uri(BaseUrlHelper.BaseUrl, _loginPart);
                        webBrowser.Navigate(loginUri, "", null, @"If-None-Match: 0"); 

                        /*
                         * We need this to be synchronous...
                         */
                        while (_connected == null)
                        {
                            Application.DoEvents();
                            if (webBrowser.ReadyState == WebBrowserReadyState.Complete)
                            {
                                if (_canceled)
                                {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
            catch (WebException ex)
            {
                if (((HttpWebResponse)ex.Response).StatusCode == HttpStatusCode.Unauthorized)
                {
                    /*
                     * We will get here when accessing an old-style Syracuse server.
                     * As Syraucse.Sid is a session cookie, it's not in the normal cookie cache, 
                     * so we can't obtain it with InternetGetCookie or InternetGetCookieEx.
                     * We therefore have little choice but to force a login...
                     */
                    webBrowser.Navigate(mainUrl, "", null, @"If-None-Match: 0");

                    /*
                     * We need this to be synchronous...
                     */
                    while (webBrowser.ReadyState != WebBrowserReadyState.Complete)
                    {
                        Application.DoEvents();
                        if (_canceled)
                        {
                            Close();
                            return false;
                        }
                    }

                    statusCode = HttpStatusCode.OK;
                    CookieHelper.setCookies(webBrowser.Document.Cookie);
                }
                else
                {
                    throw (ex);
                }
            }

            if (statusCode == HttpStatusCode.OK)
            {
                _connected = true;
            }
            
            Close();
            return (bool)_connected;
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
    }
}

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
using CommonDataHelper.HttpHelper;
using System.Runtime.InteropServices;
using System.Net;
using System.Threading;

namespace CommonDataHelper
{
    [System.Runtime.InteropServices.ComVisibleAttribute(true)]
    public partial class ConnectionDialog : Form
    {
        private String _loginPart = @"/auth/login/page";
        private String _mainPartOld = @"/syracuse-main/html/main.html";
        private String _mainPart = @"/syracuse-main/html/main.html";
        private String _logoutPart = @"/auth/forgetMe/page";
        private bool? _connected = null;
        private Boolean _canceled = false;
        private Boolean _retry = false;

        public ConnectionDialog()
        {
            InitializeComponent();
        }

        private void documentCompleted(object sender, WebBrowserDocumentCompletedEventArgs e)
        {
            this.Text = ((WebBrowser)sender).DocumentTitle;
            if (!e.Url.Equals(webBrowser.Url))
                return;

            if (webBrowser.ReadyState != WebBrowserReadyState.Complete)
                return;

            if (e.Url.LocalPath.StartsWith(_loginPart) || e.Url.LocalPath.Equals(_logoutPart))
            {
                /*
                 * We've arrived at the new login page, so don't do anything.
                 */
                return;
            }

            if (e.Url.LocalPath.Equals(_mainPartOld) || e.Url.LocalPath.Equals(_mainPart))
            {
                HttpStatusCode statusCode = HttpStatusCode.InternalServerError;
                try
                {
                    WebHelper webHelper = new WebHelper();
                    webHelper.getInitialConnectionJson(new Uri(BaseUrlHelper.BaseUrl, _retry ? _mainPartOld : _mainPart).ToString(), out statusCode);
                    if (statusCode == HttpStatusCode.OK)
                    {
                        CookieHelper.CookieContainer = CookieHelper.GetUriCookieContainer();
                        _connected = true;
                    }
                }
                catch (WebException ex)
                {
                    if (((HttpWebResponse)ex.Response).StatusCode == HttpStatusCode.Unauthorized)
                    {
                        _connected = false;
                    }
                }

                CommonDataHelper.HttpHelper.RibbonHelper.toggleButtonDisconnect();
                Hide();
                return;

            }
        }

        private bool _externalRedirect = false;
        public bool connectToServer()
        {
            WebHelper webHelper = new WebHelper();
            CookieHelper.CookieContainer = CookieHelper.GetUriCookieContainer();

            HttpStatusCode statusCode = HttpStatusCode.InternalServerError;
            HttpWebResponse response = null;

            Uri mainUrl = new Uri(BaseUrlHelper.BaseUrl, _retry ? _mainPartOld : _mainPart);

            try
            {
                response = webHelper.getInitialConnectionJson(mainUrl.ToString(), out statusCode);

                _retry = false;

                if (statusCode == HttpStatusCode.OK)
                {
                    CookieCollection cachedCookieCollection = CookieHelper.GetUriCookieContainer().GetCookies(BaseUrlHelper.BaseUrl);
                    CookieCollection responseCookieCollection = response.Cookies;
                    foreach (Cookie responseCookie in responseCookieCollection)
                    {
                        if (cachedCookieCollection[responseCookie.Name] == null || cachedCookieCollection[responseCookie.Name].Value != responseCookie.Value)
                        {
                            CookieHelper.cacheCookie(BaseUrlHelper.BaseUrl.ToString(), responseCookie.Name, responseCookie.Value);
                            CookieHelper.CookieContainer.Add(responseCookie);
                        }
                    }
                }
                else if (statusCode == HttpStatusCode.TemporaryRedirect)
                {
                    if (String.IsNullOrEmpty(response.Headers["Location"]) == false)
                    {
                        String location = response.Headers["Location"];
                        
                        webBrowser.DocumentCompleted += new WebBrowserDocumentCompletedEventHandler(documentCompleted);

                        if (_externalRedirect || location.StartsWith(_loginPart))
                        {
                            /*
                             * We've been redirected to the new-style login page, so we have to display the page in the browser.
                             */
                            Show();

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
                        else
                        {
                            /*
                             * We've got a temporary redirection that is not to the login screen.
                             * 
                             * One potential cause of this is the presence of an external Web Proxy.
                             * This causes issues with HttpWebRequest when AllowAutoRedirect is enabled. 
                             * In this scenario, the web proxy is unable retrieve the client's NTLM credentials.
                             * Consequently, the web proxy does not provide the required redirection to allow the setting of
                             * the authentication cookie to allow passage through the web proxy.
                             * 
                             * We'll therefore use the webBrowser component to handle the redirection and NTLM authentication.
                             */

                            webBrowser.Navigate(mainUrl, "", null, @"If-None-Match: 0");

                            /*
                             * Keep this synchronous...
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

                            if (!_externalRedirect)
                            {
                                _externalRedirect = true;
                                return connectToServer();
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
                CommonDataHelper.HttpHelper.RibbonHelper.toggleButtonDisconnect();
            }

            if (!_externalRedirect)
            {
                Close();
            }
            _externalRedirect = false;

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

        public bool disconnectFromServer()
        {
            WebHelper webHelper = new WebHelper();
            CookieHelper.CookieContainer = CookieHelper.GetUriCookieContainer();

            HttpStatusCode statusCode = HttpStatusCode.InternalServerError;
            HttpWebResponse response = null;

            Uri mainUrl = new Uri(BaseUrlHelper.BaseUrl, "/logout");

            try
            {
                response = webHelper.getInitialPostConnectionJson(mainUrl.ToString(), out statusCode);
                if (statusCode == HttpStatusCode.OK)
                {
                    Show();

                    webBrowser.DocumentCompleted += new WebBrowserDocumentCompletedEventHandler(documentCompleted);

                    Uri logoutUri = new Uri(BaseUrlHelper.BaseUrl, _loginPart);
                    webBrowser.Navigate(logoutUri, "", null, @"If-None-Match: 0");
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
                }
                else
                {
                    throw (ex);
                }
            }


            if (statusCode == HttpStatusCode.OK)
            {
                while (webBrowser.ReadyState != WebBrowserReadyState.Complete)
                {
                    Application.DoEvents();
                    if (_canceled)
                    {
                        break;
                    }
                }
                _connected = false;
                CookieHelper.CookieContainer = null;
                CommonDataHelper.HttpHelper.RibbonHelper.toggleButtonDisable();
            }

            return (bool)_connected;
        }
    }
}

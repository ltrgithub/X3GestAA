﻿using System;
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
        private String _mainPart = @"/syracuse-main/html/main.html";
        private String _logoutPart = @"/auth/forgetMe/page";
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

            if (e.Url.LocalPath.Equals(_loginPart) || e.Url.LocalPath.Equals(_logoutPart))
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
                if (statusCode == HttpStatusCode.OK)
                {
                    CookieCollection cc = response.Cookies;
                    foreach (Cookie c in cc)
                    {
                        CookieHelper.cacheCookie(BaseUrlHelper.BaseUrl.ToString(), c.ToString());
                    }
                }
                else if (statusCode == HttpStatusCode.TemporaryRedirect)
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
                CommonDataHelper.HttpHelper.RibbonHelper.toggleButtonDisconnect();
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

        public bool disconnectFromServer()
        {
            //System.Diagnostics.Debugger.Launch();
            //Show();
            /*
            WebHelper webHelper = new WebHelper();
            webHelper.
            webHelper.logout();
            //RibbonHelper.toggleButtonDisconnect();            
             */


            WebHelper webHelper = new WebHelper();
            CookieHelper.CookieContainer = webHelper.GetUriCookieContainer();

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
                CommonDataHelper.HttpHelper.RibbonHelper.toggleButtonDisconnect();
            }

            //Close();

            return (bool)_connected;
        
        
        }
    }
}

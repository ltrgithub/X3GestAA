using System;
using System.IO;
using System.Net;
using Newtonsoft.Json;
using CommonDialogs;
using System.Windows.Forms;
using System.Net.Cache;
using System.Web;
using System.Collections.Specialized;
using System.Text;
using System.Runtime.InteropServices;
using CommonDataHelper.HttpHelper;


namespace CommonDataHelper
{
    public class WebHelper
    {
        public string getServerJson(string uri, out HttpStatusCode statusCode)
        {
            string responseJson = null;
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(uri);
            if (HttpWebRequest.DefaultWebProxy != null)
            {
                request.Proxy = HttpWebRequest.DefaultWebProxy;
                request.Proxy.Credentials = CredentialCache.DefaultCredentials;
            }
            
            
            checkCookie();

            request.ContentType = @"application/json";
            request.Accept = @"application/json;vnd.sage=syracuse; charset=utf-8";
            request.Referer = uri.ToString();
            request.UserAgent = @"Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko";

            request.CookieContainer = CookieHelper.CookieContainer;

            request.Timeout = 20000; 

            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            using (StreamReader sr = new StreamReader(response.GetResponseStream()))
            {
                responseJson = sr.ReadToEnd();
            }
            statusCode = HttpStatusCode.OK;

            return responseJson;
        }

        public string setServerJson(Uri uri, string method, string data, out HttpStatusCode statusCode)
        {
            string responseJson = null;
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(uri);
            if (HttpWebRequest.DefaultWebProxy != null)
            {
                request.Proxy = HttpWebRequest.DefaultWebProxy;
                request.Proxy.Credentials = CredentialCache.DefaultCredentials;
            }            

            checkCookie();
            
            request.Method = method;
            request.ContentLength = data.Length;
            request.ContentType = "application/json";
            request.UserAgent = @"Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko";

            request.Headers[HttpRequestHeader.AcceptLanguage] = CookieHelper.Locale;

            request.CookieContainer = CookieHelper.CookieContainer;

            request.Timeout = 10000; 

            StreamWriter writer = new StreamWriter(request.GetRequestStream());
            writer.Write(data);
            writer.Close();

            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            using (StreamReader sr = new StreamReader(response.GetResponseStream()))
            {
                responseJson = sr.ReadToEnd();
            }
            statusCode = HttpStatusCode.OK;

            return responseJson;
        }

        public string uploadFile(Uri uri, string method, byte[] data, out HttpStatusCode statusCode, string fileName = null)
        {

            string responseJson = null;
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(uri);
            if (HttpWebRequest.DefaultWebProxy != null)
            {
                request.Proxy = HttpWebRequest.DefaultWebProxy;
                request.Proxy.Credentials = CredentialCache.DefaultCredentials;
            }          

            checkCookie();
            
            request.Method = method;
            request.ContentLength = data.Length;

            request.CookieContainer = CookieHelper.CookieContainer;
            request.Accept = "application/json;vnd.sage=syracuse";
            request.Headers.Add(HttpRequestHeader.AcceptEncoding, "gzip, deflate");
            request.UserAgent = @"Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko";

            request.Headers.Add(HttpRequestHeader.AcceptLanguage, "en-gb");
            request.KeepAlive = true;
            request.Expect = null;
            request.Headers.Add(HttpRequestHeader.Pragma, "no-cache");
            
            request.Referer = uri.ToString();
            request.Headers.Add("X-Content-Type-Override", getContentType());

            request.Timeout = 10000; 

            if (string.IsNullOrEmpty(fileName) == false)
                request.Headers.Add("x-file-name", getFileNameAndExtension(fileName));

            BinaryWriter writer = new BinaryWriter(request.GetRequestStream());
            writer.Write(data);
            writer.Close();

            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            using (StreamReader sr = new StreamReader(response.GetResponseStream()))
            {
                responseJson = sr.ReadToEnd();
            }
            statusCode = HttpStatusCode.OK;

            return responseJson;
        }

        public HttpWebResponse getInitialConnectionJson(string uri, out HttpStatusCode statusCode)
        {
            string responseJson = null;
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(uri);
            if (HttpWebRequest.DefaultWebProxy != null)
            {
                request.Proxy = HttpWebRequest.DefaultWebProxy;
                request.Proxy.Credentials = CredentialCache.DefaultCredentials;
            }
                        
            request.AllowAutoRedirect = false;
            request.Accept = @"text/html, application/xhtml+xml, */*";
            request.Referer = uri.ToString();
            request.UserAgent = @"Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko";
            request.KeepAlive = true;

            request.CookieContainer = CookieHelper.GetUriCookieContainer();

            request.Timeout = 20000;

            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            using (StreamReader sr = new StreamReader(response.GetResponseStream()))
            {
                responseJson = sr.ReadToEnd();
            }
            statusCode = response.StatusCode;

            return response;
        }

        public HttpWebResponse getInitialPostConnectionJson(string uri, out HttpStatusCode statusCode)
        {
            string responseJson = null;
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(uri);
            if (HttpWebRequest.DefaultWebProxy != null)
            {
                request.Proxy = HttpWebRequest.DefaultWebProxy;
                request.Proxy.Credentials = CredentialCache.DefaultCredentials;
            }
                        
            request.AllowAutoRedirect = false;
            request.Accept = @"text/html, application/xhtml+xml, */*";
            request.Referer = uri.ToString();
            request.UserAgent = @"Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; rv:11.0) like Gecko";
            request.KeepAlive = true;
            request.Method = "POST";

            request.CookieContainer = CookieHelper.GetUriCookieContainer();

            request.Timeout = 20000;

            HttpWebResponse response = (HttpWebResponse)request.GetResponse();
            using (StreamReader sr = new StreamReader(response.GetResponseStream()))
            {
                responseJson = sr.ReadToEnd();
            }
            statusCode = response.StatusCode;

            return response;
        }
        
        private string getContentType()
        {
            string applicationName = System.AppDomain.CurrentDomain.FriendlyName;
            string contentType = @"text/plain";

            if (applicationName.StartsWith(@"Sage.Syracuse.WordAddIn"))
            {
                contentType = @"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            }
            else if (applicationName.StartsWith(@"Sage.Syracuse.ExcelAddIn"))
            {
                contentType = @"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            }
            else if (applicationName.StartsWith(@"Sage.Syracuse.PowerPointAddIn"))
            {
                contentType = @"application/vnd.openxmlformats-officedocument.presentationml.presentation";
            }
            return contentType;
        }

        private string getFileNameAndExtension(string fileName)
        {
            string applicationName = System.AppDomain.CurrentDomain.FriendlyName;
            string fileNameAndExtension = fileName;

            if (applicationName.StartsWith(@"Sage.Syracuse.WordAddIn"))
            {
                fileNameAndExtension = fileName.EndsWith(".docx") ? fileName : fileName + ".docx";
            }
            else if (applicationName.StartsWith(@"Sage.Syracuse.ExcelAddIn"))
            {
                fileNameAndExtension = fileName.EndsWith(".xlsx") ? fileName : fileName + ".xlsx";
            }
            else if (applicationName.StartsWith(@"Sage.Syracuse.PowerPointAddIn"))
            {
                fileNameAndExtension = fileName.EndsWith(".pptx") ? fileName : fileName + ".pptx";
            }
            return fileNameAndExtension;
        }

        private void checkCookie()
        {
            if (CookieHelper.CookieContainer == null)
            {
                /*
                 * We're not logged on, so use the ConnectionDialog to force a logon.
                 * We need this mechanism in order to obtain the cookie. 
                 * We'll then maintain these cookie details in the CookieHelper.
                 */

                /*
                 * We need to force a 401 here...
                 */
                if (new ConnectionDialog().connectToServer() == false)
                {
                    throw (new WebException(global::CommonDataHelper.Properties.Resources.MSG_CANNOT_CONNECT_TO_SERVER));
                }
            }
            CommonDataHelper.HttpHelper.RibbonHelper.toggleButtonDisconnect();
        }
        
        public void logout()
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return;
            }

            string page = baseUrl.ToString() + @"logout";
            if (CookieHelper.CookieContainer != null)
            {
                HttpStatusCode httpStatusCode;
                string responseJson = getServerJson(page, out httpStatusCode);
                if (httpStatusCode == HttpStatusCode.InternalServerError)
                {
                    return;
                }

                if (httpStatusCode == HttpStatusCode.OK && responseJson != null)
                {
                    CookieHelper.CookieContainer = null;
                }
            }
            return;
        }
    }    
}

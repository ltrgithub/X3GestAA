using System;
using System.IO;
using System.Net;
using Newtonsoft.Json;
using CommonDialogs;
using System.Windows.Forms;
using CommonDialogs.CredentialsDialog;
using System.Net.Cache;
using System.Web;
using System.Collections.Specialized;
using System.Text;


namespace CommonDataHelper
{
    public class WebHelper
    {
        public string getServerJson(string uri, out HttpStatusCode statusCode)
        {
            string responseJson = null;
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(uri);

            if (CookieHelper.CookieContainer == null)
            {
                /*
                 * We're not logged on, so use the ConnectionDialog to force a logon.
                 * We need this mechanism in order to obtain the cookie. 
                 * We'll then maintain these cookie details in the CookieHelper.
                 */

                /*
                 * Really messy, but we need to force a 401 here...
                 */
                new ConnectionDialog().connectToServer(new Uri(BaseUrlHelper.BaseUrl, @"syracuse-main/html/main.html" + "?officeLogon=" + Guid.NewGuid()));
            }

            request.ContentType = @"application/json";
            request.Accept = @"application/json;vnd.sage=syracuse; charset=utf-8";
            request.Referer = uri.ToString();

            request.CookieContainer = CookieHelper.CookieContainer;

            try
            {
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                using (StreamReader sr = new StreamReader(response.GetResponseStream()))
                {
                    responseJson = sr.ReadToEnd();
                }
                statusCode = HttpStatusCode.OK;
            }
            catch (Exception ex)
            {
                HttpWebResponse wre = ((HttpWebResponse)(((WebException)ex).Response));
                if (wre == null)
                {
                    statusCode = HttpStatusCode.InternalServerError;
                    CredentialsHelper.clear(); // No point in trying different credentials if we can't even connect!
                }
                else
                {
                    statusCode = wre.StatusCode;
                    if (wre.StatusCode == HttpStatusCode.Unauthorized || wre.StatusCode == HttpStatusCode.Forbidden)
                    {
                        if (CredentialsHelper.Retries > 0)
                        {
                            CredentialsHelper.Retries--;

                            /*
                             * Clear the cookie cache. This will force a re-login.
                             */
                            CookieHelper.CookieContainer = null;

                            return getServerJson(uri, out statusCode);
                        }
                        statusCode = wre.StatusCode;
                    }
                }
                MessageBox.Show(ex.Message);
            }

            return responseJson;
        }

        public string setServerJson(Uri uri, string method, string data, out HttpStatusCode statusCode)
        {
            string responseJson = null;
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(uri);

            request.Method = method;
            request.ContentLength = data.Length;
            request.ContentType = "application/json";

            request.CookieContainer = CookieHelper.CookieContainer;

            StreamWriter writer = new StreamWriter(request.GetRequestStream());
            writer.Write(data);
            writer.Close();
            try
            {
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                using (StreamReader sr = new StreamReader(response.GetResponseStream()))
                {
                    responseJson = sr.ReadToEnd();
                }
                statusCode = HttpStatusCode.OK;
            }
            catch (Exception ex)
            {
                HttpWebResponse wre = ((HttpWebResponse)(((WebException)ex).Response));
                if (wre == null)
                {
                    statusCode = HttpStatusCode.InternalServerError;
                    CredentialsHelper.clear(); // No point in trying different credentials if we can't even connect!
                }
                else
                {
                    statusCode = wre.StatusCode;
                    if (wre.StatusCode == HttpStatusCode.Unauthorized || wre.StatusCode == HttpStatusCode.Forbidden)
                    {
                        if (CredentialsHelper.Retries > 0)
                        {
                            CredentialsHelper.Retries--;

                            /*
                             * Clear the cookie cache. This will force a re-login.
                             */
                            CookieHelper.CookieContainer = null;

                            return setServerJson(uri, method, data, out statusCode);
                        }
                        statusCode = wre.StatusCode;
                    }
                    MessageBox.Show(ex.Message);
                }
            }
            return responseJson;
        }

        public string uploadFile(Uri uri, string method, byte[] data, out HttpStatusCode statusCode, string fileName = null)
        {
            string responseJson = null;
            HttpWebRequest request = (HttpWebRequest)HttpWebRequest.Create(uri);

            request.Method = method;
            request.ContentLength = data.Length;

            request.CookieContainer = CookieHelper.CookieContainer;
            request.Accept = "application/json;vnd.sage=syracuse";
            request.Headers.Add(HttpRequestHeader.AcceptEncoding, "gzip, deflate");

            request.Headers.Add(HttpRequestHeader.AcceptLanguage, "en-gb");
            request.KeepAlive = true;
            request.Expect = null;
            request.Headers.Add(HttpRequestHeader.Pragma, "no-cache");
            
            request.Referer = uri.ToString();
            request.Headers.Add("X-Content-Type-Override", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

            if (string.IsNullOrEmpty(fileName) == false)
                request.Headers.Add("x-file-name", fileName.EndsWith(".docx") ? fileName : fileName + ".docx");

            BinaryWriter writer = new BinaryWriter(request.GetRequestStream());
            writer.Write(data);
            writer.Close();
            try
            {
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                using (StreamReader sr = new StreamReader(response.GetResponseStream()))
                {
                    responseJson = sr.ReadToEnd();
                }
                statusCode = HttpStatusCode.OK;
            }
            catch (Exception ex)
            {
                HttpWebResponse wre = ((HttpWebResponse)(((WebException)ex).Response));
                if (wre == null)
                {
                    statusCode = HttpStatusCode.InternalServerError;
                    CredentialsHelper.clear(); // No point in trying different credentials if we can't even connect!
                }
                else
                {
                    statusCode = wre.StatusCode;
                    if (wre.StatusCode == HttpStatusCode.Unauthorized || wre.StatusCode == HttpStatusCode.Forbidden)
                    {
                        if (CredentialsHelper.Retries > 0)
                        {
                            CredentialsHelper.Retries--;

                            /*
                             * Clear the cookie cache. This will force a re-login.
                             */
                            CookieHelper.CookieContainer = null;

                            return uploadFile(uri, method, data, out statusCode);
                        }
                        statusCode = wre.StatusCode;
                    }
                    MessageBox.Show(ex.Message);
                }
            }
            return responseJson;
        }
    }    
}

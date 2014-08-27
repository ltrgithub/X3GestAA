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
                CookieHelper.InitialiseCookies();
                if (CredentialsHelper.Retries == 0)
                {
                    /*
                     * We've cancelled the entry of credentials, so just return an error condition.
                     */
                    statusCode = HttpStatusCode.InternalServerError;
                    return responseJson;
                }
            }

            NetworkCredential nc = CredentialsHelper.UserCredentials;
            if (nc == null && CredentialsHelper.Retries == 0)
            {
                /*
                 * We've cancelled the entry of credentials, so just return an error condition.
                 */
                statusCode = HttpStatusCode.InternalServerError;
                return responseJson;
            }

            request.Credentials = nc;
            
            request.CookieContainer = CookieHelper.CookieContainer;

            try
            {
                HttpWebResponse response = (HttpWebResponse)request.GetResponse();
                using (StreamReader sr = new StreamReader(response.GetResponseStream()))
                {
                    responseJson = sr.ReadToEnd();
                }
                statusCode = HttpStatusCode.OK;

                /*
                 * We've had a successfull connection, so do a do a one-time only fetch of the cookie
                 */
                CookieHelper.setCookies(request, response);
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
                        CredentialsHelper.UserCredentials = null;

                        if (CredentialsHelper.Retries > 0)
                        {
                            CredentialsHelper.Retries--;
                            nc = CredentialsHelper.UserCredentials;

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

            NetworkCredential nc = CredentialsHelper.UserCredentials;
            if (nc == null && CredentialsHelper.Retries == 0)
            {
                /*
                 * We've cancelled the entry of credentials, so just return an error condition.
                 */
                statusCode = HttpStatusCode.InternalServerError;
                return responseJson;
            }

            request.Credentials = nc;

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
                            nc = CredentialsHelper.UserCredentials;

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

            NetworkCredential nc = CredentialsHelper.UserCredentials;
            if (nc == null && CredentialsHelper.Retries == 0)
            {
                /*
                 * We've cancelled the entry of credentials, so just return an error condition.
                 */
                statusCode = HttpStatusCode.InternalServerError;
                return responseJson;
            }

            request.Credentials = nc;

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
                            nc = CredentialsHelper.UserCredentials;

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

using System;
using System.IO;
using System.Net;
using Newtonsoft.Json;
using CommonDialogs;
using System.Windows.Forms;
using CommonDialogs.CredentialsDialog;


namespace CommonDataHelper
{
    public class WebHelper
    {
        public string getServerJson(string uri, out HttpStatusCode statusCode)
        {
            string responseJson = null;
            HttpWebRequest http = (HttpWebRequest)HttpWebRequest.Create(uri);

            NetworkCredential nc = CredentialsHelper.UserCredentials;
            if (nc == null && CredentialsHelper.Retries == 0)
            {
                /*
                 * We've cancelled the entry of credentials, so just return an error condition.
                 */
                statusCode = HttpStatusCode.InternalServerError;
                return responseJson;
            }

            http.Credentials = nc;

            try
            {
                HttpWebResponse response = (HttpWebResponse)http.GetResponse();
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
            HttpWebRequest http = (HttpWebRequest)HttpWebRequest.Create(uri);

            NetworkCredential nc = CredentialsHelper.UserCredentials;
            if (nc == null && CredentialsHelper.Retries == 0)
            {
                /*
                 * We've cancelled the entry of credentials, so just return an error condition.
                 */
                statusCode = HttpStatusCode.InternalServerError;
                return responseJson;
            }

            http.Credentials = nc;

            http.Method = method;
            http.ContentLength = data.Length;
            http.ContentType = "application/json";
            StreamWriter writer = new StreamWriter(http.GetRequestStream());
            writer.Write(data);
            writer.Close();
            try
            {
                HttpWebResponse response = (HttpWebResponse)http.GetResponse();
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

        //    public string setServerJson(string uri, string data, NetworkCredential nc)
        //    {
        //        string responseJson = "-1";
        //        HttpWebRequest http = (HttpWebRequest)HttpWebRequest.Create(uri);

        //        if (nc == null)
        //        {
        //            nc = CredentialsHelper.UserCredentials;
        //        }

        //        if (nc != null)
        //        {
        //            http.Credentials = nc;
        //        }

        //        http.Method = WebRequestMethods.Http.Post;
        //        http.ContentLength = data.Length;
        //        http.ContentType = "application/json";
        //        StreamWriter writer = new StreamWriter(http.GetRequestStream());
        //        writer.Write(data);
        //        writer.Close();
        //        try
        //        {
        //            HttpWebResponse response = (HttpWebResponse)http.GetResponse();
        //            using (StreamReader sr = new StreamReader(response.GetResponseStream()))
        //            {
        //                responseJson = sr.ReadToEnd();
        //            }
        //        }
        //        catch (Exception ex)
        //        {
        //            HttpWebResponse wre = ((HttpWebResponse)(((WebException)ex).Response));
        //            if (wre.StatusCode == HttpStatusCode.Unauthorized || wre.StatusCode == HttpStatusCode.Forbidden)
        //            {
        //                //Credentials cred = new Credentials();
        //                //if (cred.ShowDialog() == System.Windows.Forms.DialogResult.OK)
        //                //{
        //                    //nc = cred.getCredentials();
        //                    nc = CredentialsHelper.UserCredentials;
        //                    return setServerJson(uri, data, nc);
        //                //}
        //            }

        //            MessageBox.Show(ex.Message);
        //        }
        //        return responseJson;
        //    }
        //}

    }    
}

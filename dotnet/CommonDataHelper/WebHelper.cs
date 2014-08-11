﻿using System;
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

        public string setServerJson(string uri, string data, NetworkCredential nc)
        {
            string responseJson = "-1";
            HttpWebRequest http = (HttpWebRequest)HttpWebRequest.Create(uri);

            if (nc == null)
            {
                nc = CredentialsHelper.UserCredentials;
            }

            if (nc != null)
            {
                http.Credentials = nc;
            }

            http.Method = WebRequestMethods.Http.Post;
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
            }
            catch (Exception ex)
            {
                HttpWebResponse wre = ((HttpWebResponse)(((WebException)ex).Response));
                if (wre.StatusCode == HttpStatusCode.Unauthorized || wre.StatusCode == HttpStatusCode.Forbidden)
                {
                    //Credentials cred = new Credentials();
                    //if (cred.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                    {
                        //nc = cred.getCredentials();
                        nc = CredentialsHelper.UserCredentials;
                        return setServerJson(uri, data, nc);
                    }
                }

                MessageBox.Show(ex.Message);
            }
            return responseJson;
        }
    }
    public class SyracuseTeams
    {
        //SyracuseTeam[] _team;
    }

    public class SyracuseTeam
    {
        [JsonProperty("$uuid")]
        public string uuid;
        [JsonProperty("description")]
        public string description;
        [JsonProperty("isPublic")]
        public Boolean isPublic;
    }
    public class Team
    {
        public string description;
        public Boolean isPublic;
    }
    public class SyracuseDocument
    {
        public string description;
        public string documentType;
        public DateTime documentDate;
        public string fileName;
        public Boolean isReadOnly;
        public string content;
        public string className;
        public string x3Keys;
        public string representationName;
        public string volume;

        //{"$etag":3,"$uuid":"45e4e189-ca80-48cd-a778-9c11b7d06a11","fileName":"abc.pdf","description":"111","isReadOnly":false,"volume":{"$uuid":"a5c514ce-fcbf-4291-95be-bfc6fe94b2b0"},"content":{"$uuid":"c8aa4a18-cda7-466a-85a1-d2c9a57cc195","$url":"http://localhost:8124/sdata/syracuse/collaboration/syracuse/$workingCopies('1e4236db-5338-4ff7-8f35-6e5e7b7b4175')/content?representation=document.$edit&role=e97358dd-21b2-426b-871f-b928bc4d4aa3&trackingId=1e4236db-5338-4ff7-8f35-6e5e7b7b4175","$type":"binary","$contentType":"application/pdf","$fileName":"abc.pdf","$length":54698},"owner":{"$uuid":"36cf3c41-14c8-459e-9ccc-6f97f1223247"},"documentType":"application/pdf","documentDate":"2014-07-30","$actions":{"$save":{"$isRequested":true}},"$url":"http://localhost:8124/sdata/syracuse/collaboration/syracuse/$workingCopies('1e4236db-5338-4ff7-8f35-6e5e7b7b4175')?representation=document.$edit&role=e97358dd-21b2-426b-871f-b928bc4d4aa3&trackingId=1e4236db-5338-4ff7-8f35-6e5e7b7b4175"}        

    }
}

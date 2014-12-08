using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDataHelper.PublisherHelper.Model.Common;
using System.Net;
using System.Web;
using System.Text.RegularExpressions;

namespace CommonDataHelper.PublisherHelper
{
    public class RequestHelper
    {
        public DocumentPrototypesModel getSaveNewDocumentPrototypes(string officeApplication)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            StringBuilder urlPart = new StringBuilder(@"/sdata/syracuse/collaboration/syracuse/$prototypes('");
            urlPart.Append(officeApplication);
            urlPart.Append(".$query')");
            Uri pageUrl = new Uri(baseUrl, urlPart.ToString());

            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;

            string prototypeJson = webHelper.getServerJson(pageUrl.ToString(), out httpStatusCode);

            if (httpStatusCode == HttpStatusCode.OK)
                return Newtonsoft.Json.JsonConvert.DeserializeObject<DocumentPrototypesModel>(prototypeJson);

            return null;
        }

        public WorkingCopyPrototypeModel getWorkingCopyPrototype(string url, string method)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            WebHelper webHelper = new WebHelper();

            HttpStatusCode httpStatusCode;
            string workingCopyPrototypeJson = webHelper.setServerJson(new Uri(baseUrl, url), method, String.Empty, out httpStatusCode);

            if (httpStatusCode == HttpStatusCode.OK)
                return Newtonsoft.Json.JsonConvert.DeserializeObject<WorkingCopyPrototypeModel>(workingCopyPrototypeJson);

            return null;
        }

        public Uri addUrlQueryParameters(string url, string trackingId, ISyracuseOfficeCustomData syracuseCustomData, string data)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            string templateClass = syracuseCustomData.getDocumentRepresentation();
            string locale = String.Empty;
            string volumeCode = "STD";

            Uri resourceUri = new Uri(baseUrl, syracuseCustomData.getResourceUrl());
            string representationName = HttpUtility.ParseQueryString(resourceUri.Query).Get("representation");

            string[] urlSegments = resourceUri.Segments.Select(segment => segment.TrimEnd('/')).ToArray();

            string className = urlSegments[urlSegments.Length - 1];

            string x3Keys = String.Empty; // TODO: see _setLinkingProperties for more details.
            if (urlSegments.Count<string>() > 1)
            {
                string classNameKeys = urlSegments[urlSegments.Count<string>() -1].Split('?')[0];
                className = classNameKeys.Split('(')[0];
                MatchCollection matches = Regex.Matches(classNameKeys, @"\('(.*)'\)");
                if (matches.Count > 0)
                {
                    Match match = matches[0];
                    string keys = match.Value;
                    keys = keys.Replace("('", String.Empty).Replace("')", String.Empty);
                    x3Keys = keys;
                }
            }

            string officeEndpoint = urlSegments.Count<string>() > 4 ? urlSegments[4] : null;

            StringBuilder queryParameters = new StringBuilder(url);

            queryParameters.Append("&templateClass=");
            queryParameters.Append(templateClass);

            if (locale == null)
            {
                queryParameters.Append("&templateLocale=");
                queryParameters.Append(locale);
            }

            queryParameters.Append("&volumeCode=");
            queryParameters.Append(volumeCode);

            queryParameters.Append("&representationName=");
            queryParameters.Append(representationName);

            queryParameters.Append("&className=");
            queryParameters.Append(className);

            queryParameters.Append("&x3Keys=");
            queryParameters.Append(x3Keys);

            queryParameters.Append("&officeEndpoint=");
            queryParameters.Append(officeEndpoint);

            queryParameters.Append("&trackingId=");
            queryParameters.Append(trackingId);

            return new Uri(baseUrl, queryParameters.ToString());
        }
    
        public Boolean getDocumentIsReadOnly(string documentUrl)
        {
            if (documentUrl == String.Empty)
            {
                return false;
            }

            documentUrl = documentUrl.Replace("/content" , String.Empty);

            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;

            string prototypeJson = webHelper.getServerJson(documentUrl, out httpStatusCode);

            if (httpStatusCode == HttpStatusCode.OK)
            {
                var document = Newtonsoft.Json.JsonConvert.DeserializeObject<PublishDocumentModel>(prototypeJson);
                return document.isReadOnly;
            }

            return false;
        }

    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDataHelper.PublisherHelper.Model.Word;
using System.Net;
using System.Web;
using System.Collections.Specialized;
using Newtonsoft.Json;

namespace CommonDataHelper.PublisherHelper
{
    public class PublisherHelper : IDocumentPublisher
    {
        public void PublishDocument(ISyracuseOfficeCustomData syracuseCustomData)
        {
            WordSavePrototype wordSaveNewDocumentPrototype = getWordSaveDocumentPrototypes().links.wordSaveNewDocumentPrototype;

            WordWorkingCopyPrototype wordWorkingCopyPrototype = getWordWorkingCopyPrototype(wordSaveNewDocumentPrototype);

            publishDocument(wordSaveNewDocumentPrototype, wordWorkingCopyPrototype, syracuseCustomData);
        }

        private void publishDocument(WordSavePrototype wordSaveNewDocumentPrototype, WordWorkingCopyPrototype wordWorkingCopyPrototype, ISyracuseOfficeCustomData syracuseCustomData)
        {
            string workingCopyInitialisationResponse = initialiseWorkingCopy(wordSaveNewDocumentPrototype, wordWorkingCopyPrototype, syracuseCustomData);
            if (string.IsNullOrEmpty(workingCopyInitialisationResponse))
                return;

            WordWorkingCopyPrototype workingCopyResponseJson = Newtonsoft.Json.JsonConvert.DeserializeObject<WordWorkingCopyPrototype>(workingCopyInitialisationResponse);

            /*
             * To do:
             * 
             * Update working copy:
             * PUT /sdata/syracuse/collaboration/syracuse/$workingCopies('126ef1f4-60ef-4896-9f07-56af2df15a85')?representation=msoWordDocument.$edit&templateClass=user.%24query&volumeCode=STD&representationName=user.%24bulk&className=users&x3Keys=&officeEndpoint=syracuse&trackingId=126ef1f4-60ef-4896-9f07-56af2df15a85 HTTP/1.1
             * 
             * Update working copy (on save):
             * PUT /sdata/syracuse/collaboration/syracuse/$workingCopies('126ef1f4-60ef-4896-9f07-56af2df15a85')?representation=msoWordDocument.$edit&templateClass=user.%24query&volumeCode=STD&representationName=user.%24bulk&className=users&x3Keys=&officeEndpoint=syracuse&trackingId=126ef1f4-60ef-4896-9f07-56af2df15a85 HTTP/1.1
             * 
             * Save to document:
             * PUT /sdata/syracuse/collaboration/syracuse/$workingCopies('126ef1f4-60ef-4896-9f07-56af2df15a85')/content 
             * JSON - Content_Types + base64 representation of document
             */

            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return;
            }

            HttpStatusCode httpStatusCode;
            if (string.IsNullOrEmpty(workingCopyResponseJson.url) == false)
            {
                WebHelper webHelper = new WebHelper();
                WordPublishDocumentJson wordPublishDocumentJson = new WordPublishDocumentJson();
                wordPublishDocumentJson.etag = workingCopyResponseJson.etag;
                wordPublishDocumentJson.url = workingCopyResponseJson.url;
                wordPublishDocumentJson.uuid = workingCopyResponseJson.uuid;

                wordPublishDocumentJson.description = "yyy";

                string json = JsonConvert.SerializeObject(wordPublishDocumentJson, Formatting.Indented);

                string test = webHelper.setServerJson(new Uri(workingCopyResponseJson.url), "PUT", json, out httpStatusCode);
            }
        }

        private WordDocumentPrototypes getWordSaveDocumentPrototypes()
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            Uri pageUrl = new Uri(baseUrl, @"/sdata/syracuse/collaboration/syracuse/$prototypes('msoWordDocument.$query')");

            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;

            string prototypeJson = webHelper.getServerJson(pageUrl.ToString(), out httpStatusCode);

            if (httpStatusCode == HttpStatusCode.OK)
                return Newtonsoft.Json.JsonConvert.DeserializeObject<WordDocumentPrototypes>(prototypeJson);

            return null;
        }

        private WordWorkingCopyPrototype getWordWorkingCopyPrototype(WordSavePrototype wordSaveNewDocumentPrototype)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            WebHelper webHelper = new WebHelper();

            HttpStatusCode httpStatusCode;
            string wordWorkingCopyPrototypeJson = webHelper.setServerJson(new Uri(baseUrl, wordSaveNewDocumentPrototype.url), wordSaveNewDocumentPrototype.method, String.Empty, out httpStatusCode);

            if (httpStatusCode == HttpStatusCode.OK)
                return Newtonsoft.Json.JsonConvert.DeserializeObject<WordWorkingCopyPrototype>(wordWorkingCopyPrototypeJson);

            return null;
        }

        private string initialiseWorkingCopy(WordSavePrototype wordSaveNewDocumentPrototype, WordWorkingCopyPrototype wordWorkingCopyPrototype, ISyracuseOfficeCustomData syracuseCustomData)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return string.Empty;
            }

            string templateClass = syracuseCustomData.getDocumentRepresentation(); //"user.$query";
            string locale = String.Empty;
            string volumeCode = "STD";
 
            Uri resourceUri = new Uri(baseUrl, syracuseCustomData.getResourceUrl());
            string representationName = HttpUtility.ParseQueryString(resourceUri.Query).Get("representation"); // "user.$bulk"; 

            string[] urlSegments = resourceUri.Segments.Select( segment => segment.TrimEnd('/')).ToArray();

            string className = urlSegments[urlSegments.Length - 1]; //"users";

            string x3Keys = String.Empty; // TODO: see _setLinkingProperties for more details.

            string officeEndpoint = urlSegments[4]; //  "syracuse";
            string trackingId = wordWorkingCopyPrototype.trackingId;

            StringBuilder queryParameters = new StringBuilder(wordSaveNewDocumentPrototype.url);

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

            WebHelper webHelper = new WebHelper();

            HttpStatusCode httpStatusCode;
            return webHelper.setServerJson(new Uri(baseUrl, queryParameters.ToString()), "POST", String.Empty, out httpStatusCode);
        }
    }
}

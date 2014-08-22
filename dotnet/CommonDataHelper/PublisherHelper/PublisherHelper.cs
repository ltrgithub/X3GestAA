using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDataHelper.PublisherHelper.Model.Word;
using System.Net;
using System.Web;
using System.Collections.Specialized;
using Newtonsoft.Json;
using CommonDialogs.PublishDocumentDialog;
using CommonDataHelper.PublisherHelper.Model.Common;
using CommonDataHelper.TagHelper;

namespace CommonDataHelper.PublisherHelper
{
    public class PublisherHelper : IDocumentPublisher
    {
        public void PublishDocument(byte[] base64DocumentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            WordSavePrototype wordSaveNewDocumentPrototype = getWordSaveDocumentPrototypes().links.wordSaveNewDocumentPrototype;

            WordWorkingCopyPrototype wordWorkingCopyPrototype = getWordWorkingCopyPrototype(wordSaveNewDocumentPrototype);

            publishDocument(base64DocumentContent, wordSaveNewDocumentPrototype, wordWorkingCopyPrototype, syracuseCustomData, publishDocumentParameters);
        }

        private void publishDocument(byte[] base64DocumentContent, WordSavePrototype wordSaveNewDocumentPrototype, WordWorkingCopyPrototype wordWorkingCopyPrototype, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            string workingCopyInitialisationResponse = initialiseWorkingCopy(wordSaveNewDocumentPrototype, wordWorkingCopyPrototype, syracuseCustomData);
            if (string.IsNullOrEmpty(workingCopyInitialisationResponse))
                return;

            WordWorkingCopyPrototype workingCopyResponseJson = Newtonsoft.Json.JsonConvert.DeserializeObject<WordWorkingCopyPrototype>(workingCopyInitialisationResponse);

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

                wordPublishDocumentJson.description = publishDocumentParameters.Description;

                SyracuseUuid storageVolumeUuid = new SyracuseUuid();
                storageVolumeUuid.uuid = publishDocumentParameters.StorageVolume;
                wordPublishDocumentJson.storageVolume = storageVolumeUuid;

                SyracuseUuid ownerUuid = new SyracuseUuid();
                ownerUuid.uuid = publishDocumentParameters.Owner;
                wordPublishDocumentJson.owner = ownerUuid;

//              foreach (TagItem tagItem in publishDocumentParameters.Tag)
                //{
                //}


                string workingCopyUpdateRequestJson = JsonConvert.SerializeObject(wordPublishDocumentJson, Formatting.Indented);

                string workingCopyUpdateResponseJson = webHelper.setServerJson(new Uri(workingCopyResponseJson.url), "PUT", workingCopyUpdateRequestJson, out httpStatusCode);
                if (httpStatusCode == HttpStatusCode.OK && string.IsNullOrEmpty(workingCopyUpdateResponseJson) == false)
                {
                    /*
                     * We've updated the working copy, so we can now save the document...
                     * Save to document:
                     * PUT /sdata/syracuse/collaboration/syracuse/$workingCopies('126ef1f4-60ef-4896-9f07-56af2df15a85')/content 
                     * JSON - Content_Types + base64 representation of document
                     */

                    string workingCopyUrlPath = new Uri(workingCopyResponseJson.url).GetLeftPart(UriPartial.Path);
                    Uri contentUrl = new Uri(workingCopyUrlPath + "/content");

                    //string x = Convert.FromBase64CharArray(base64DocumentContent);

                   // string test = webHelper.setServerJson(contentUrl, "PUT", /*base64DocumentContent*/"", out httpStatusCode);

                    //webHelper.UploadFilesToRemoteUrl(contentUrl.ToString(), @"c:\temp\user.docx");


                    //NameValueCollection nvc = new NameValueCollection();
                    //nvc.Add("id", "TTR");
                    //nvc.Add("btn-submit-photo", "Upload");
                    //webHelper.HttpUploadFile(contentUrl.ToString(), @"c:\temp\user.docx", "file", "image/jpeg", nvc);
                }
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

            string officeEndpoint = urlSegments.Count<string>() > 4 ? urlSegments[4] : null;
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

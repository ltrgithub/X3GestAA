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
using System.IO;
using System.Text.RegularExpressions;
using CommonDialogs.PublishDocumentTemplateDialog;

namespace CommonDataHelper.PublisherHelper
{
    public class PublisherHelper : IDocumentPublisher, IDocumentTemplatePublisher
    {
        public void publishDocument(byte[] documentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            WordSavePrototypeModel wordSaveNewDocumentPrototypeModel = getWordSaveDocumentPrototypes().links.wordSaveNewDocumentPrototype;

            WordWorkingCopyPrototypeModel wordWorkingCopyPrototypeModel = getWordWorkingCopyPrototype(wordSaveNewDocumentPrototypeModel);

            publishDocument(documentContent, wordSaveNewDocumentPrototypeModel, wordWorkingCopyPrototypeModel, syracuseCustomData, publishDocumentParameters);
        }

        public void publishDocument(byte[] documentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocumentTemplate publishDocumentParameters)
        {
        }

        private void publishDocument(byte[] documentContent, WordSavePrototypeModel wordSaveNewDocumentPrototype, WordWorkingCopyPrototypeModel wordWorkingCopyPrototype, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            string workingCopyInitialisationResponse = initialiseWorkingCopy(wordSaveNewDocumentPrototype, wordWorkingCopyPrototype, syracuseCustomData);
            if (string.IsNullOrEmpty(workingCopyInitialisationResponse))
                return;

            WordWorkingCopyPrototypeModel workingCopyResponseModel = Newtonsoft.Json.JsonConvert.DeserializeObject<WordWorkingCopyPrototypeModel>(workingCopyInitialisationResponse);

            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return;
            }

            HttpStatusCode httpStatusCode;
            if (string.IsNullOrEmpty(workingCopyResponseModel.url) == false)
            {
                WebHelper webHelper = new WebHelper();

                SyracuseUuidModel storageVolumeUuid = new SyracuseUuidModel()
                {
                    uuid = publishDocumentParameters.StorageVolume
                };

                SyracuseUuidModel ownerUuid = new SyracuseUuidModel
                {
                    uuid = publishDocumentParameters.Owner
                };

                WordPublishDocumentModel wordPublishDocument = new WordPublishDocumentModel
                {
                    etag = workingCopyResponseModel.etag,
                    url = workingCopyResponseModel.url,
                    uuid = workingCopyResponseModel.uuid,
                    description = publishDocumentParameters.Description,
                    storageVolume = storageVolumeUuid,
                    owner = ownerUuid
                };

                string workingCopyUpdateRequestJson = JsonConvert.SerializeObject(wordPublishDocument, Formatting.Indented);

                string workingCopyUpdateResponseJson = webHelper.setServerJson(new Uri(workingCopyResponseModel.url), "PUT", workingCopyUpdateRequestJson, out httpStatusCode);
                if (httpStatusCode == HttpStatusCode.OK && string.IsNullOrEmpty(workingCopyUpdateResponseJson) == false)
                {
                    string contentUrl = new Uri(workingCopyResponseModel.url).GetLeftPart(UriPartial.Path) + "/content";

                    string contentResponseJson = webHelper.uploadFile(new Uri(contentUrl), "PUT", documentContent, out httpStatusCode, publishDocumentParameters.Description);

                    if (httpStatusCode == HttpStatusCode.OK && string.IsNullOrEmpty(contentResponseJson) == false)
                    {
                        /*
                         * The document has been uploaded successfully, so complete the save operation...
                         */
                        SaveDocumentModel saveDocumentModel = new SaveDocumentModel
                        {
                            etag = wordPublishDocument.etag + 1,
                            url = wordPublishDocument.url,
                            uuid = wordPublishDocument.uuid,
                            actions = new SaveActionModel
                            {
                                saveRequest = new SaveRequestModel
                                {
                                    isRequested = true
                                }
                            }
                        };

                        string saveDocumentJson = JsonConvert.SerializeObject(saveDocumentModel, Formatting.Indented);
                        string test = webHelper.setServerJson(new Uri(workingCopyResponseModel.url), "PUT", saveDocumentJson, out httpStatusCode);
                    }
                }
            }
        }

        private WordDocumentPrototypesModel getWordSaveDocumentPrototypes()
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
                return Newtonsoft.Json.JsonConvert.DeserializeObject<WordDocumentPrototypesModel>(prototypeJson);

            return null;
        }

        private WordWorkingCopyPrototypeModel getWordWorkingCopyPrototype(WordSavePrototypeModel wordSaveNewDocumentPrototype)
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
                return Newtonsoft.Json.JsonConvert.DeserializeObject<WordWorkingCopyPrototypeModel>(wordWorkingCopyPrototypeJson);

            return null;
        }

        private string initialiseWorkingCopy(WordSavePrototypeModel wordSaveNewDocumentPrototype, WordWorkingCopyPrototypeModel wordWorkingCopyPrototype, ISyracuseOfficeCustomData syracuseCustomData)
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return string.Empty;
            }

            string templateClass = syracuseCustomData.getDocumentRepresentation(); 
            string locale = String.Empty;
            string volumeCode = "STD";
 
            Uri resourceUri = new Uri(baseUrl, syracuseCustomData.getResourceUrl());
            string representationName = HttpUtility.ParseQueryString(resourceUri.Query).Get("representation");

            string[] urlSegments = resourceUri.Segments.Select( segment => segment.TrimEnd('/')).ToArray();

            string className = urlSegments[urlSegments.Length - 1]; 

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

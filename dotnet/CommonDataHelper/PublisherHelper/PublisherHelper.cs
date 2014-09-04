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
        // document
        public void publishDocument(byte[] documentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            WordSavePrototypeModel wordSaveNewDocumentPrototypeModel = new RequestHelper().getWordSaveDocumentPrototypes().links.wordSaveNewDocumentPrototype;

            WorkingCopyPrototypeModel wordWorkingCopyPrototypeModel = new RequestHelper().getWorkingCopyPrototype(wordSaveNewDocumentPrototypeModel.url, wordSaveNewDocumentPrototypeModel.method);

            publishDocument(documentContent, wordSaveNewDocumentPrototypeModel, wordWorkingCopyPrototypeModel, syracuseCustomData, publishDocumentParameters);
        }

        // ReportTemplate
        public void publishDocument(byte[] documentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocumentTemplate publishDocumentParameters)
        {
            WordSavePrototypeModel wordSaveNewDocumentPrototypeModel = new RequestHelper().getWordSaveDocumentPrototypes().links.wordSaveReportTemplatePrototype;

            WorkingCopyPrototypeModel wordWorkingCopyPrototypeModel = new RequestHelper().getWorkingCopyPrototype(wordSaveNewDocumentPrototypeModel.url, wordSaveNewDocumentPrototypeModel.method);

            publishDocumentTemplate(documentContent, wordSaveNewDocumentPrototypeModel, wordWorkingCopyPrototypeModel, syracuseCustomData, publishDocumentParameters);
        }

        private void publishDocument(byte[] documentContent, WordSavePrototypeModel wordSaveNewDocumentModel, WorkingCopyPrototypeModel wordWorkingCopyModel, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            Uri workingCopyUrl = new RequestHelper().addUrlQueryParameters(wordSaveNewDocumentModel.url, wordWorkingCopyModel.trackingId, syracuseCustomData, string.Empty);

            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;
            string workingCopyResponseJson = webHelper.setServerJson(workingCopyUrl, "POST", string.Empty, out httpStatusCode);

            if (string.IsNullOrEmpty(workingCopyResponseJson))
                return;

            WorkingCopyPrototypeModel workingCopyResponseModel = Newtonsoft.Json.JsonConvert.DeserializeObject<WorkingCopyPrototypeModel>(workingCopyResponseJson);

            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return;
            }

            if (string.IsNullOrEmpty(workingCopyResponseModel.url) == false)
            {
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
        private void publishDocumentTemplate(byte[] documentContent, WordSavePrototypeModel wordSaveNewDocumentModel, WorkingCopyPrototypeModel wordWorkingCopyModel, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocumentTemplate publishDocumentParameters)
        {
            Uri workingCopyUrl = new RequestHelper().addUrlQueryParameters(wordSaveNewDocumentModel.url, wordWorkingCopyModel.trackingId, syracuseCustomData, string.Empty);

            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;
            string workingCopyResponseJson = webHelper.setServerJson(workingCopyUrl, "POST", string.Empty, out httpStatusCode);

            if (string.IsNullOrEmpty(workingCopyResponseJson))
                return;

            WorkingCopyPrototypeModel workingCopyResponseModel = Newtonsoft.Json.JsonConvert.DeserializeObject<WorkingCopyPrototypeModel>(workingCopyResponseJson);

            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return;
            }

            if (string.IsNullOrEmpty(workingCopyResponseModel.url) == false)
            {
                /*
                SyracuseUuidModel storageVolumeUuid = new SyracuseUuidModel()
                {
                    uuid = publishDocumentParameters.StorageVolume
                };
                 */

                SyracuseUuidModel ownerUuid = new SyracuseUuidModel
                {
                    uuid = publishDocumentParameters.Owner
                };

                WordPublishTemplateModel wordPublishDocument = new WordPublishTemplateModel
                {
                    code = publishDocumentParameters.Code,
                    etag = workingCopyResponseModel.etag,
                    url = workingCopyResponseModel.url,
                    uuid = workingCopyResponseModel.uuid,
                    description = publishDocumentParameters.Description,
                    //storageVolume = storageVolumeUuid,
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
    }
}

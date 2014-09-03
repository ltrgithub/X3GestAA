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
using System.Windows.Forms;
using CommonDialogs;

namespace CommonDataHelper.PublisherHelper
{
    public class PublisherHelper : IDocumentPublisher, IDocumentTemplatePublisher
    {
        public void publishDocument(byte[] documentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            try
            {
                Cursor.Current = Cursors.WaitCursor;

                WordSavePrototypeModel wordSaveNewDocumentPrototypeModel = new RequestHelper().getWordSaveDocumentPrototypes().links.wordSaveNewDocumentPrototype;

                WorkingCopyPrototypeModel wordWorkingCopyPrototypeModel = new RequestHelper().getWorkingCopyPrototype(wordSaveNewDocumentPrototypeModel.url, wordSaveNewDocumentPrototypeModel.method);

                publishDocument(documentContent, wordSaveNewDocumentPrototypeModel, wordWorkingCopyPrototypeModel, syracuseCustomData, publishDocumentParameters);
            }
            finally
            {
                Cursor.Current = Cursors.Default;
            }
        }

        public void publishDocument(byte[] documentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocumentTemplate publishDocumentParameters)
        {
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

            if (string.IsNullOrEmpty(workingCopyResponseModel.url) == false)
            {
                WordPublishDocumentModel wordPublishDocument = new WordPublishDocumentModel
                {
                    etag = workingCopyResponseModel.etag,
                    url = workingCopyResponseModel.url,
                    uuid = workingCopyResponseModel.uuid,
                    description = publishDocumentParameters.Description,
                    storageVolume = new SyracuseUuidModel() { uuid = publishDocumentParameters.StorageVolume },
                    owner = new SyracuseUuidModel { uuid = publishDocumentParameters.Owner }
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
                        string saveDocumentResponseJson = webHelper.setServerJson(new Uri(workingCopyResponseModel.url), "PUT", saveDocumentJson, out httpStatusCode);
                        if (httpStatusCode == HttpStatusCode.OK && !string.IsNullOrEmpty(saveDocumentResponseJson))
                            InfoMessageBox.ShowInfoMessage(global::CommonDataHelper.Properties.Resources.MSG_PUBLISH_DOC_DONE, global::CommonDataHelper.Properties.Resources.MSG_PUBLISH_DOC_DONE_TITLE);
                    }
                }
            }
        }
    }
}

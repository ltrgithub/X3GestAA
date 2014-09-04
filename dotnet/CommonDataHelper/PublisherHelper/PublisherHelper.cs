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
        public void publishDocument(byte[] documentContent, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocumentTemplate publishDocumentParameters)
        {
        }

        public void publishDocument(byte[] documentContent, WorkingCopyPrototypeModel workingCopyResponseModel, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            try
            {
                WebHelper webHelper = new WebHelper();
                HttpStatusCode httpStatusCode;

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
            finally
            {
                Cursor.Current = Cursors.Default;
            }
        }
    }
}

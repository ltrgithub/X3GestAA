using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using System.Web;
using System.Collections.Specialized;
using Newtonsoft.Json;
using CommonDialogs.PublishDocumentDialog;
using CommonDataHelper.PublisherHelper.Model.Common;
using CommonDataHelper.TagHelper;
using CommonDataHelper.TeamHelper;
using CommonDataHelper.SyracuseTagHelper.Model;
using CommonDataHelper.SyracuseTeamHelper.Model;
using System.IO;
using System.Text.RegularExpressions;
using CommonDialogs.PublishDocumentTemplateDialog;
using System.Windows.Forms;
using CommonDialogs;

namespace CommonDataHelper.PublisherHelper
{
    public class PublisherHelper : IDocumentPublisher, IDocumentTemplatePublisher
    {
        public void publishDocument(byte[] documentContent, WorkingCopyPrototypeModel workingCopyResponseModel, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            try
            {
                WebHelper webHelper = new WebHelper();
                HttpStatusCode httpStatusCode;

                if (string.IsNullOrEmpty(workingCopyResponseModel.url) == false)
                {
                    PublishDocumentModel publishDocument = new PublishDocumentModel
                    {
                        etag = workingCopyResponseModel.etag,
                        url = workingCopyResponseModel.url,
                        uuid = workingCopyResponseModel.uuid,
                        description = publishDocumentParameters.Description,
                        storageVolume = new SyracuseUuidModel() { uuid = publishDocumentParameters.StorageVolume },
                        teams = publishDocumentParameters.Team.OfType<TeamItem>().Select(s => { return new SyracuseUuidModel() { uuid = JsonConvert.DeserializeObject<TeamModel>(s.TeamJson).uuid }; }).ToList<SyracuseUuidModel>(),
                        tags = publishDocumentParameters.Tag.OfType<TagItem>().Select(s => { return new SyracuseUuidModel() { uuid = JsonConvert.DeserializeObject<TagModel>(s.TagJson).uuid }; }).ToList<SyracuseUuidModel>(),
                        owner = new SyracuseUuidModel { uuid = publishDocumentParameters.Owner }
                    };

                    string workingCopyUpdateRequestJson = JsonConvert.SerializeObject(publishDocument, Formatting.Indented);

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
                                etag = publishDocument.etag + 1,
                                url = publishDocument.url,
                                uuid = publishDocument.uuid,
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
            catch (WebException webEx)
            {
                MessageBox.Show(webEx.Message);
            }
            finally
            {
                Cursor.Current = Cursors.Default;
            }
        }
               
        public void publishDocument(byte[] documentContent, WorkingCopyPrototypeModel workingCopyResponseModel, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocumentTemplate publishDocumentParameters)
        {
            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;
            try
            {
                if (string.IsNullOrEmpty(workingCopyResponseModel.url) == false)
                {
                    if (string.IsNullOrEmpty(workingCopyResponseModel.url) == false)
                    {
                        PublishTemplateModel publishTemplate = new PublishTemplateModel
                        {
                            code = publishDocumentParameters.Code,
                            etag = workingCopyResponseModel.etag,
                            url = workingCopyResponseModel.url,
                            uuid = workingCopyResponseModel.uuid,
                            description = publishDocumentParameters.Description,
                            owner = new SyracuseUuidModel { uuid = publishDocumentParameters.Owner },
                            leg = publishDocumentParameters.Legislation,
                            cpy = publishDocumentParameters.Company,
                            activ = publishDocumentParameters.ActivityCode,
                            teams = publishDocumentParameters.Team.OfType<TeamItem>().Select(s => { return new SyracuseUuidModel() { uuid = JsonConvert.DeserializeObject<TeamModel>(s.TeamJson).uuid }; }).ToList<SyracuseUuidModel>(),
                            tags = publishDocumentParameters.Tag.OfType<TagItem>().Select(s => { return new SyracuseUuidModel() { uuid = JsonConvert.DeserializeObject<TagModel>(s.TagJson).uuid }; }).ToList<SyracuseUuidModel>(),
                            templatePurpose = publishDocumentParameters.Purpose,
                            endpoint = new SyracuseUuidModel { uuid = publishDocumentParameters.Endpoint }
                        };

                        string workingCopyUpdateRequestJson = JsonConvert.SerializeObject(publishTemplate, Formatting.Indented);

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
                                    etag = publishTemplate.etag + 1,
                                    url = publishTemplate.url,
                                    uuid = publishTemplate.uuid,
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
            catch (WebException webEx)
            {
                MessageBox.Show(webEx.Message);
            }
            finally
            {
                Cursor.Current = Cursors.Default;
            }
        }
    }
}

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
        public bool publishDocument(ISyracuseOfficeCustomData syracuseCustomData)
        {
            bool success = false;
            try
            {
                Cursor.Current = Cursors.WaitCursor;
                success = doPublishDocument(syracuseCustomData);
                if (success)
                {
                    InfoMessageBox.ShowInfoMessage(global::CommonDataHelper.Properties.Resources.MSG_PUBLISH_DOC_DONE, global::CommonDataHelper.Properties.Resources.MSG_PUBLISH_DOC_DONE_TITLE);
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
            return success;
        }

        public bool doPublishDocument(ISyracuseOfficeCustomData syracuseCustomData)
        {
            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;
            bool success = false;
            
            String docUrl = syracuseCustomData.getDocumentUrl();
            if (docUrl.StartsWith("http"))
            {
                docUrl = new Uri(docUrl).AbsolutePath;
            }

            // fix old document url to new value
            if (!docUrl.EndsWith("/content"))
            {
                docUrl += "/content";
            }
    
            syracuseCustomData.setDocumentUrl(docUrl);
            syracuseCustomData.setServerUrl(BaseUrlHelper.BaseUrl.ToString());
            syracuseCustomData.writeDictionaryToDocument();
            
            byte[] documentContent = syracuseCustomData.GetDocumentContent();

            string contentResponseJson = webHelper.uploadFile(new Uri(BaseUrlHelper.BaseUrl, docUrl), "PUT", documentContent, out httpStatusCode, syracuseCustomData.getDocumentTitle());

            success = httpStatusCode == HttpStatusCode.OK;

            return success;
        }

        public bool publishDocumentAs(WorkingCopyPrototypeModel workingCopyResponseModel, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocument publishDocumentParameters)
        {
            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;
            bool success = false;

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
                    isReadOnly = publishDocumentParameters.IsReadOnly,
                    owner = new SyracuseUuidModel { uuid = publishDocumentParameters.Owner }
                };

                string workingCopyUpdateRequestJson = JsonConvert.SerializeObject(publishDocument, Formatting.Indented);

                string workingCopyUpdateResponseJson = webHelper.setServerJson(new Uri(workingCopyResponseModel.url), "PUT", workingCopyUpdateRequestJson, out httpStatusCode);
                if (httpStatusCode == HttpStatusCode.OK && string.IsNullOrEmpty(workingCopyUpdateResponseJson) == false)
                {
                    syracuseCustomData.setServerUrl(BaseUrlHelper.BaseUrl.ToString());
                    syracuseCustomData.setDocumentUrl(getDocumentUrl(new Uri(workingCopyResponseModel.url), workingCopyResponseModel.uuid, publishDocumentParameters.DocumentType));
                    syracuseCustomData.setDocumentUrlAddress(getDocumentUrlAddress(new Uri(workingCopyResponseModel.url), workingCopyResponseModel.uuid, publishDocumentParameters.DocumentType));
                    syracuseCustomData.setDocumentTitleAddress(publishDocumentParameters.Description);
                    syracuseCustomData.writeDictionaryToDocument();

                    string contentUrl = new Uri(workingCopyResponseModel.url).GetLeftPart(UriPartial.Path) + "/content";

                    byte[] documentContent = syracuseCustomData.GetDocumentContent();

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
                        success = httpStatusCode == HttpStatusCode.OK && !string.IsNullOrEmpty(saveDocumentResponseJson);
                    }
                }
            }
            return success;
        }
               
        public bool publishDocumentAs(WorkingCopyPrototypeModel workingCopyResponseModel, ISyracuseOfficeCustomData syracuseCustomData, IPublishDocumentTemplate publishDocumentParameters)
        {
            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;
            bool success = false;

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
                        templateClass = syracuseCustomData.getDocumentRepresentation(),
                        isReadOnly = publishDocumentParameters.IsReadOnly,
                        endpoint = new SyracuseUuidModel { uuid = publishDocumentParameters.Endpoint }
                    };

                    string workingCopyUpdateRequestJson = JsonConvert.SerializeObject(publishTemplate, Formatting.Indented);

                    string workingCopyUpdateResponseJson = webHelper.setServerJson(new Uri(workingCopyResponseModel.url), "PUT", workingCopyUpdateRequestJson, out httpStatusCode);
                    if (httpStatusCode == HttpStatusCode.OK && string.IsNullOrEmpty(workingCopyUpdateResponseJson) == false)
                    {
                        string filter = @"code eq '" + publishTemplate.code + @"'";
                        syracuseCustomData.setDocumentUrl(getDocumentUrlFromFilter(new Uri(workingCopyResponseModel.url), filter, publishDocumentParameters.DocumentType));
                        syracuseCustomData.setServerUrl(BaseUrlHelper.BaseUrl.ToString());
                        syracuseCustomData.writeDictionaryToDocument();

                        string contentUrl = new Uri(workingCopyResponseModel.url).GetLeftPart(UriPartial.Path) + "/content";

                        byte[] documentContent = syracuseCustomData.GetDocumentContent();

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
                            success = httpStatusCode == HttpStatusCode.OK && !string.IsNullOrEmpty(saveDocumentResponseJson);
                        }
                    }
                }
            }
            return success;
        }

        public string getDocumentUrlFromFilter(Uri uri, string filter, string documentType)
        {
            StringBuilder url = new StringBuilder(@"/sdata/syracuse/collaboration/syracuse/");
            url.Append(getRepository(documentType));
            url.Append("(");
            url.Append(filter);
            url.Append(@")/content");

            return url.ToString();
        }

        public string getDocumentUrl(Uri uri, string uuid, string documentType)
        {
            StringBuilder url = new StringBuilder(@"/sdata/syracuse/collaboration/syracuse/");
            url.Append(getRepository(documentType));
            url.Append("('");
            url.Append(uuid);
            url.Append(@"')/content");

            return url.ToString();
        }

        private string getDocumentUrlAddress(Uri uri, string uuid, string documentType)
        {
            StringBuilder url = new StringBuilder(uri.GetLeftPart(UriPartial.Authority));
            url.Append(@"/sdata/syracuse/collaboration/syracuse/");
            url.Append(getRepository(documentType));
            url.Append("('");
            url.Append(uuid);
            string [] rep = HttpUtility.ParseQueryString(uri.Query).Get("representation").Split(new Char [] {'.'});
            url.Append(@"')?representation=" + rep[0]);

            return url.ToString();
        }

        private string getRepository(string documentType)
        {
            string applicationName = System.AppDomain.CurrentDomain.FriendlyName;
            string repository = "documents"; 

            if (applicationName.StartsWith(@"Sage.Syracuse.WordAddIn"))
            {
                if (documentType.Equals("saveMailMergeTemplatePrototype") || documentType.Equals("saveReportTemplatePrototype"))
                    repository = "msoWordTemplateDocuments";
                else
                    repository = "documents";
            }
            else if (applicationName.StartsWith(@"Sage.Syracuse.ExcelAddIn"))
            {
                if (documentType.Equals("saveReportTemplatePrototype"))
                    repository = "msoExcelTemplateDocuments";
                else
                    repository = "documents";
            }
            else if (applicationName.StartsWith(@"Sage.Syracuse.PowerPointAddIn"))
            {
                repository = "documents";
            }

            return repository;
        }
    }
}

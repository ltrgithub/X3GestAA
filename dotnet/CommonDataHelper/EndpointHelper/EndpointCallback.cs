using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDataHelper.PublisherHelper.Model.Word;
using System.Net;
using CommonDataHelper.PublisherHelper;
using CommonDataHelper.PublisherHelper.Model.Common;
using Newtonsoft.Json;
using CommonDataHelper.EndpointHelper.Model;
using CommonDataHelper.ActivityCodeHelper;
using CommonDialogs.PublishDocumentTemplateDialog;
using CommonDataHelper.LegislationHelper;
using CommonDataHelper.CompanyHelper;
using System.Windows.Forms;

namespace CommonDataHelper.EndpointHelper
{
    public static class EndpointCallback
    {
        public static void buildEndpointDependencies(string uuid, object syracuseCustomData, object publishTemplateDialog )
        {
            if (!string.IsNullOrEmpty(uuid))
            {
                try
                {
                    Cursor.Current = Cursors.WaitCursor;

                    SavePrototypeModel wordSaveNewDocumentPrototypeModel = new RequestHelper().getWordSaveDocumentPrototypes().links.wordSaveReportTemplatePrototype;

                    WorkingCopyPrototypeModel workingCopyPrototypeModel = new RequestHelper().getWorkingCopyPrototype(wordSaveNewDocumentPrototypeModel.url, wordSaveNewDocumentPrototypeModel.method);

                    RequestHelper requestHelper = new RequestHelper();
                    Uri workingCopyUrl = requestHelper.addUrlQueryParameters(wordSaveNewDocumentPrototypeModel.url, workingCopyPrototypeModel.trackingId, (ISyracuseOfficeCustomData)syracuseCustomData, string.Empty);

                    WebHelper webHelper = new WebHelper();
                    HttpStatusCode httpStatusCode;
                    string workingCopyResponseJson = webHelper.setServerJson(workingCopyUrl, "POST", string.Empty, out httpStatusCode);

                    if (string.IsNullOrEmpty(workingCopyResponseJson))
                    {
                        return;
                    }

                    WorkingCopyPrototypeModel workingCopyResponseModel = Newtonsoft.Json.JsonConvert.DeserializeObject<WorkingCopyPrototypeModel>(workingCopyResponseJson);

                    EndpointRequestModel endpointRequestModel = new EndpointRequestModel
                    {
                        etag = workingCopyPrototypeModel.etag,
                        url = workingCopyResponseModel.url,
                        uuid = workingCopyResponseModel.key,
                        endpointUuid = new SyracuseUuidModel
                        {
                            uuid = uuid
                        }
                    };

                    string endPointRequestJson = JsonConvert.SerializeObject(endpointRequestModel, Formatting.Indented);
                    string endpointJson = new WebHelper().setServerJson(new Uri(workingCopyResponseModel.url), "PUT", endPointRequestJson, out httpStatusCode);

                    ((IPublishDocumentTemplateDialog)publishTemplateDialog).ActivityCodeList = new ActivityCodeList().createActivityCodeList(Newtonsoft.Json.JsonConvert.DeserializeObject<EndpointModel>(endpointJson), out httpStatusCode);
                    if (httpStatusCode == HttpStatusCode.OK)
                    {
                        ((IPublishDocumentTemplateDialog)publishTemplateDialog).LegislationList = new LegislationList().createLegislationList(Newtonsoft.Json.JsonConvert.DeserializeObject<EndpointModel>(endpointJson), out httpStatusCode);
                        if (httpStatusCode == HttpStatusCode.OK)
                        {
                            ((IPublishDocumentTemplateDialog)publishTemplateDialog).CompanyList = new CompanyList().createCompanyList(Newtonsoft.Json.JsonConvert.DeserializeObject<EndpointModel>(endpointJson), out httpStatusCode);
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
}

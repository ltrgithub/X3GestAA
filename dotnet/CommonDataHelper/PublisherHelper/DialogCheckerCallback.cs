using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.PublishDocumentTemplateDialog;
using System.Net;
using Newtonsoft.Json;
using System.Windows.Forms;
using CommonDataHelper.PublisherHelper.Model.Common;

namespace CommonDataHelper.PublisherHelper
{
    public static class DialogCheckerCallback
    {
        public static bool checkPublishTemplateDialog(string field, object workingCopyResponseModel, object publishDocumentParameters, out string errorMessage)
        {
            errorMessage = string.Empty;

            bool isUnique = true;
            try
            {
                isUnique = doCheckPublishTemplateDialog(field, (WorkingCopyPrototypeModel)workingCopyResponseModel, (IPublishDocumentTemplate)publishDocumentParameters, out errorMessage);
            }
            catch (WebException webEx)
            {
                MessageBox.Show(webEx.Message);
            }
            return isUnique;
        }

        public static bool doCheckPublishTemplateDialog(string field, WorkingCopyPrototypeModel workingCopyResponseModel, IPublishDocumentTemplate publishDocumentParameters, out string errorMessage)
        {
            bool isUnique = true;
            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;

            errorMessage = string.Empty;
                
            if (string.IsNullOrEmpty(workingCopyResponseModel.url) == false)
            {
                CommonDataHelper.PublisherHelper.Model.Common.PublishTemplateModel publishTemplate = new CommonDataHelper.PublisherHelper.Model.Common.PublishTemplateModel
                {
                    etag = workingCopyResponseModel.etag++,
                    url = workingCopyResponseModel.url,
                    uuid = workingCopyResponseModel.uuid,
                    code = publishDocumentParameters.Code,
                    description = publishDocumentParameters.Description
                };

                string workingCopyUpdateRequestJson = JsonConvert.SerializeObject(publishTemplate, Formatting.Indented);

                string workingCopyUpdateResponseJson = webHelper.setServerJson(new Uri(workingCopyResponseModel.url), "PUT", workingCopyUpdateRequestJson, out httpStatusCode);
                if (httpStatusCode == HttpStatusCode.OK && string.IsNullOrEmpty(workingCopyUpdateResponseJson) == false)
                {
                    if (workingCopyUpdateResponseJson.IndexOf("$diagnoses") > -1)
                    {
                        var diagnoses = Newtonsoft.Json.JsonConvert.DeserializeObject<CommonDataHelper.PublisherHelper.Model.FieldValidation.PublishTemplateModel>(workingCopyUpdateResponseJson);

                        if (field.Equals("code"))
                        {
                            isUnique = diagnoses.properties.code.diagnoses.Count == 0;
                            if (!isUnique)
                                errorMessage = diagnoses.properties.code.diagnoses[0].message;
                        }
                        else
                        {
                            isUnique = diagnoses.properties.description.diagnoses.Count == 0;
                            if (!isUnique)
                                errorMessage = diagnoses.properties.description.diagnoses[0].message;
                        }
                    }
                }
            }
            return isUnique;
        }
    }
}

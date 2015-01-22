using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.PublishDocumentDialog;
using System.Net;
using Newtonsoft.Json;
using System.Windows.Forms;
using CommonDataHelper.PublisherHelper.Model.Common;
using CommonDialogs;

namespace CommonDataHelper.PublisherHelper
{
    public static class DocumentCheckerCallback
    {
        public static bool checkPublishDocumentDialog(string field, object workingCopyResponseModel, object publishDocumentParameters, out string errorMessage)
        {
            errorMessage = string.Empty;

            bool isUnique = true;
            try
            {
                isUnique = doCheckPublishDocumentDialog(field, (WorkingCopyPrototypeModel)workingCopyResponseModel, (IPublishDocument)publishDocumentParameters, out errorMessage);
            }
            catch (WebException webEx)
            {
                MessageBox.Show(webEx.Message);
            }
            return isUnique;
        }

        public static bool doCheckPublishDocumentDialog(string field, WorkingCopyPrototypeModel workingCopyResponseModel, IPublishDocument publishDocumentParameters, out string errorMessage)
        {
            bool isUnique = true;
            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;

            errorMessage = string.Empty;
                
            if (string.IsNullOrEmpty(workingCopyResponseModel.url) == false)
            {
                StringBuilder page = new StringBuilder(BaseUrlHelper.BaseUrl.ToString());
                page.Append(@"sdata/syracuse/collaboration/syracuse/documents?representation=document.$query&count=50&startIndex=1");
                page.Append(@"&where=(description eq '" +  publishDocumentParameters.Description + "')");

                string responseJson = webHelper.getServerJson(page.ToString(), out httpStatusCode);
                if (httpStatusCode == HttpStatusCode.InternalServerError)
                {
                    return isUnique;
                }

                if (httpStatusCode == HttpStatusCode.OK && !string.IsNullOrEmpty(responseJson))
                {
                    var result = Newtonsoft.Json.JsonConvert.DeserializeObject<CommonDataHelper.PublisherHelper.Model.Common.DocumentModel>(responseJson);
                    if (result.totalResults > 0)
                    {
                        errorMessage = global::CommonDataHelper.Properties.Resources.MSG_DOCUMENT_ALREADY_EXISTS;
                        InfoMessageBox.ShowInfoMessage(global::CommonDataHelper.Properties.Resources.MSG_DOCUMENT_ALREADY_EXISTS, global::CommonDataHelper.Properties.Resources.MSG_DOCUMENT_ALREADY_EXISTS_TITLE);
                        isUnique = false;
                    }
                }
            }
            return isUnique;
        }
    }
}

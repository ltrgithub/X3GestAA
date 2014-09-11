using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.PublishDocumentDialog;
using CommonDataHelper.PublisherHelper.Model.Common;
using CommonDataHelper.StorageVolumeHelper;
using System.Windows.Forms;
using System.ComponentModel;
using CommonDataHelper.OwnerHelper;
using CommonDataHelper.TagHelper;
using System.Net;
using CommonDialogs.PublishDocumentTemplateDialog;
using CommonDataHelper.EndpointHelper;

namespace CommonDataHelper.PublisherHelper
{
    public class PublisherDialogHelper
    {
        public void showPublisherDocumentDialog(string officeApplication, string documentType, ISyracuseOfficeCustomData customData, byte[] documentContent)
        {
            try
            {
                CredentialsHelper.resetRetries();

                IPublishDocumentDialog publishDocumentDialog = new PublishDocumentDialog();

                WorkingCopyPrototypeModel workingCopyPrototypeModel = initialiseWorkingCopy(officeApplication, documentType, customData);

                List<StorageVolumeItem> storageVolumeList = new StorageVolumeList().createStorageVolumeList();

                Cursor.Current = Cursors.WaitCursor;

                publishDocumentDialog.StorageVolumeList = new BindingList<StorageVolumeItem>(storageVolumeList);
                publishDocumentDialog.StorageVolume = "STD";

                List<OwnerItem> ownerList = new OwnerList().createOwnerList();
                publishDocumentDialog.OwnerList = new BindingList<OwnerItem>(ownerList);
                if (ownerList.Where(owner => owner.Uuid == CookieHelper.UserUuid).Count() > 0)
                    publishDocumentDialog.Owner = ownerList.Single(owner => owner.Uuid == CookieHelper.UserUuid).Login;

                publishDocumentDialog.TagList = new TagList().createTagList();
                publishDocumentDialog.TeamList = new TeamList().createTeamList();

                publishDocumentDialog.Publisher(new PublisherDocumentDelegate(publisher), workingCopyPrototypeModel, customData, documentContent);

                publishDocumentDialog.ShowDialog();
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

        public void showPublisherTemplateDialog(string officeApplication, string documentType, ISyracuseOfficeCustomData customData, byte[] documentContent)
        {
            try
            {
                CredentialsHelper.resetRetries();

                IPublishDocumentTemplateDialog publishDocumentTemplateDialog = new PublishDocumentTemplateDialog();

                WorkingCopyPrototypeModel workingCopyPrototypeModel = initialiseWorkingCopy(officeApplication, documentType, customData);

                List<OwnerItem> ownerList = new OwnerList().createOwnerList();

                Cursor.Current = Cursors.WaitCursor;

                publishDocumentTemplateDialog.OwnerList = new BindingList<OwnerItem>(ownerList);
                if (ownerList.Where(owner => owner.Uuid == CookieHelper.UserUuid).Count() > 0)
                    publishDocumentTemplateDialog.Owner = ownerList.Single(owner => owner.Uuid == CookieHelper.UserUuid).Login;

                publishDocumentTemplateDialog.TagList = new TagList().createTagList();
                publishDocumentTemplateDialog.TeamList = new TeamList().createTeamList();

                publishDocumentTemplateDialog.PurposeList = new PurposeList().createPurposeList(customData.getDocumentRepresentation());
                publishDocumentTemplateDialog.EndpointList = new EndpointList().createEndpointList(customData.getDocumentRepresentation(), workingCopyPrototypeModel.trackingId);
                publishDocumentTemplateDialog.setEndpointDelegate(new EndpointDelegate(EndpointCallback.buildEndpointDependencies), officeApplication, documentType);

                publishDocumentTemplateDialog.Publisher(new PublisherDocumentTemplateDelegate(publisher), workingCopyPrototypeModel, customData, documentContent);

                publishDocumentTemplateDialog.ShowDialog();
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

        public void publisher(IPublishDocument publishDocumentParameters, object workingCopyPrototypeModel, object customData, byte[] documentContent)
        {
            new PublisherHelper().publishDocument(documentContent, (WorkingCopyPrototypeModel)workingCopyPrototypeModel, (ISyracuseOfficeCustomData)customData, publishDocumentParameters);
        }

        public void publisher(IPublishDocumentTemplate publishDocumentParameters, object workingCopyPrototypeModel, object customData, byte[] documentContent)
        {
            new PublisherHelper().publishDocument(documentContent, (WorkingCopyPrototypeModel)workingCopyPrototypeModel, (ISyracuseOfficeCustomData)customData, publishDocumentParameters);
        }

        private WorkingCopyPrototypeModel initialiseWorkingCopy(string officeApplication, string savePrototypeName, ISyracuseOfficeCustomData customData)
        {
            RequestHelper requestHelper = new RequestHelper();
            SavePrototypesModel savePrototypesModel = requestHelper.getSaveNewDocumentPrototypes(officeApplication).links;

            SavePrototypeModel saveNewDocumentPrototypeModel = (SavePrototypeModel)savePrototypesModel.GetType().GetProperty(savePrototypeName).GetValue(savePrototypesModel, null);

            WorkingCopyPrototypeModel workingCopyPrototypeModel = new RequestHelper().getWorkingCopyPrototype(saveNewDocumentPrototypeModel.url, saveNewDocumentPrototypeModel.method);

            Uri workingCopyUrl = new RequestHelper().addUrlQueryParameters(saveNewDocumentPrototypeModel.url, workingCopyPrototypeModel.trackingId, customData, string.Empty);

            WebHelper webHelper = new WebHelper();
            HttpStatusCode httpStatusCode;

            string workingCopyResponseJson = webHelper.setServerJson(workingCopyUrl, "POST", string.Empty, out httpStatusCode);

            WorkingCopyPrototypeModel workingCopyResponseModel = Newtonsoft.Json.JsonConvert.DeserializeObject<WorkingCopyPrototypeModel>(workingCopyResponseJson);

            return workingCopyResponseModel;
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.PublishDocumentDialog;
using CommonDialogs;
using System.Net;
using CommonDataHelper.StorageVolumeHelper;
using CommonDataHelper.StorageVolumeHelper.Model;

namespace CommonDataHelper
{
    public class StorageVolumeList
    {
        public List<StorageVolumeItem> createStorageVolumeList()
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            string page = baseUrl.ToString() + @"sdata/syracuse/collaboration/syracuse/storageVolumes?representation=storageVolumes.$query&count=1000";

            List<StorageVolumeItem> storageVolumeList = new List<StorageVolumeItem>();
            WebHelper webHelper = new WebHelper();

            HttpStatusCode httpStatusCode;

            string responseJson = webHelper.getServerJson(page, out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            if (httpStatusCode == HttpStatusCode.OK && responseJson != null)
            {
                var storageVolumes = Newtonsoft.Json.JsonConvert.DeserializeObject<StorageVolumesModel>(responseJson);

                foreach (StorageVolumeModel storageVolume in storageVolumes.storageVolumes)
                {
                    storageVolumeList.Add(new StorageVolumeItem(storageVolume.code, storageVolume.uuid));
                }
            }
            return storageVolumeList;
        }
    }
}

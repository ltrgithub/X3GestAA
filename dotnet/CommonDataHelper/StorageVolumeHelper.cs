using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CommonDialogs.PublishDocumentDialog;
using CommonDialogs;
using System.Web.Script.Serialization;
using System.Net;

namespace CommonDataHelper
{
    public class StorageVolumeHelper
    {
        public List<string> createStorageVolumeList()
        {
            string page = 
                
                "http://localhost:8124/sdata/syracuse/collaboration/syracuse/storageVolumes?representation=storageVolumes.$query&count=200";

            List<string> storageVolumeList = new List<string>();
            WebHelper cd = new WebHelper();
            JavaScriptSerializer ser = new JavaScriptSerializer();

            HttpStatusCode httpStatusCode;

            string responseJson = cd.getServerJson(page, out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            if (httpStatusCode == HttpStatusCode.OK)
            {
                Dictionary<String, object> data = (Dictionary<String, object>)ser.DeserializeObject(responseJson);
                Object[] listData = (Object[])data["$resources"];

                foreach (Object rowData in listData)
                {
                    try
                    {
                        Dictionary<String, object> rowDataArray = (Dictionary<String, object>)rowData;
                        foreach (Object key in rowDataArray.Keys)
                        {
                            if (key.ToString() == "code")
                            {
                                storageVolumeList.Add(rowDataArray["code"].ToString());
                            }
                        }
                    }
                    catch { }
                }
            }
            return storageVolumeList; 
        }
    }
}

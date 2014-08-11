using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Web.Script.Serialization;
using System.Net;

namespace CommonDataHelper
{
    public class OwnerHelper
    {
        public List<string> createOwnerList()
        {
            string page = "http://localhost:8124/sdata/syracuse/collaboration/syracuse/users?representation=user.$query&count=200";

            List<string> ownerList = new List<string>();
            WebHelper cd = new WebHelper();
            JavaScriptSerializer ser = new JavaScriptSerializer();

            HttpStatusCode httpStatusCode;
            string responseJson = cd.getServerJson(page, out httpStatusCode);
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
                            if (key.ToString() == "login")
                            {
                                ownerList.Add(rowDataArray["login"].ToString());
                            }
                        }

                    }
                    catch { }
                }
            }
            return ownerList;
        }
    }
}

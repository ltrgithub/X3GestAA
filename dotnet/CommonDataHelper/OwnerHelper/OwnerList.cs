using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Net;
using CommonDataHelper.OwnerHelper.Model;
using CommonDataHelper.OwnerHelper;

namespace CommonDataHelper
{
    public class OwnerList
    {
        public List<OwnerItem> createOwnerList()
        {
            Uri baseUrl = BaseUrlHelper.BaseUrl;
            if (baseUrl == null)
            {
                return null;
            }

            string page = baseUrl.ToString() + @"sdata/syracuse/collaboration/syracuse/users?representation=user.$query&count=1000";

            List<OwnerItem> ownerList = new List<OwnerItem>();
            WebHelper cd = new WebHelper();

            HttpStatusCode httpStatusCode;
            string responseJson = cd.getServerJson(page, out httpStatusCode);
            if (httpStatusCode == HttpStatusCode.InternalServerError)
            {
                return null;
            }

            if (httpStatusCode == HttpStatusCode.OK && responseJson != null)
            {
                var owners = Newtonsoft.Json.JsonConvert.DeserializeObject<OwnersModel>(responseJson);

                foreach (OwnerModel owner in owners.owners)
                {
                    ownerList.Add(new OwnerItem(owner.login, owner.uuid, owner.firstName, owner.lastName));
                }
            }
            return ownerList;
        }
    }
}
